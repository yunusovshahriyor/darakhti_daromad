import { useSyncExternalStore } from 'react';
import {
  addSnapshot, localRaw, makeBackup, parseBackup, restoreRaw, savedListeners, stateHasData, summarize,
} from './storage';

/**
 * Синхронизатсияи абрӣ бо Supabase (бе китобхона, бо fetch).
 * Ҷадвал: `user_state(user_id, data jsonb, updated_at)` — як сатр барои ҳар корбар (RLS).
 * Ихтилоф: агар ҳам сервер ва ҳам ин дастгоҳ аз синхронизатсияи охирин тағйир ёфта бошанд, корбар интихоб мекунад.
 */
const CFG_KEY = 'darakhti:sbcfg';
const SESS_KEY = 'darakhti:sbsess';
const BASE_KEY = 'darakhti:sbbase'; // updated_at-и сервер дар синхронизатсияи охирин
const SYNCED_KEY = 'darakhti:sbsynced'; // ҳэши мазмуни маҳаллӣ дар синхронизатсияи охирин
const LAST_KEY = 'darakhti:sblast';
const PUSH_DELAY = 3000;

export interface SyncConfig { url: string; key: string }
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string };
}
export type SyncStatus = 'off' | 'signedout' | 'idle' | 'syncing' | 'offline' | 'error' | 'conflict';
export interface Conflict {
  remoteRaw: string;
  remotePrefs: Record<string, string>;
  remoteAt: string;
  remoteCounts: ReturnType<typeof summarize>;
  localCounts: ReturnType<typeof summarize>;
}
export interface SyncSnap {
  status: SyncStatus;
  email: string;
  lastSyncAt: number;
  error: string;
  conflict: Conflict | null;
  configured: boolean;
}

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const readJson = <T,>(k: string): T | null => {
  try { return JSON.parse(ls.get(k) ?? 'null') as T | null; } catch { return null; }
};

export const getConfig = () => readJson<SyncConfig>(CFG_KEY);
const getSession = () => readJson<Session>(SESS_KEY);

let snap: SyncSnap = build('idle');
const listeners = new Set<() => void>();
let notifier: ((msg: string) => void) | null = null;

function build(status?: SyncStatus, extra: Partial<SyncSnap> = {}): SyncSnap {
  const cfg = getConfig();
  const sess = getSession();
  const st: SyncStatus = !cfg ? 'off' : !sess ? 'signedout' : status ?? 'idle';
  return {
    status: st, email: sess?.user.email ?? '', lastSyncAt: Number(ls.get(LAST_KEY) ?? 0),
    error: '', conflict: null, configured: !!cfg, ...extra,
  };
}
function set(status?: SyncStatus, extra: Partial<SyncSnap> = {}) {
  snap = build(status, extra);
  listeners.forEach(fn => fn());
}

export const setSyncNotifier = (fn: ((msg: string) => void) | null) => { notifier = fn; };
export const useSync = () => useSyncExternalStore(
  fn => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  () => snap,
);

// ---------- Шабака ----------
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call(cfg: SyncConfig, path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(`${cfg.url}${path}`, {
    ...rest,
    headers: {
      apikey: cfg.key,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { Authorization: `Bearer ${cfg.key}` }),
      ...(rest.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const b = body as { error_description?: string; msg?: string; message?: string; error?: string } | null;
    throw new HttpError(res.status, b?.error_description ?? b?.msg ?? b?.message ?? b?.error ?? `HTTP ${res.status}`);
  }
  return body;
}

const isOffline = (e: unknown) => e instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false);

export function normalizeUrl(u: string): string | null {
  const t = u.trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^\s/]+$/.test(t) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(t)) return null;
  return t;
}

/** Танзимот: суроға ва калиди «anon» (оммавӣ). Пайвастро месанҷем. */
export async function configure(url: string, key: string): Promise<void> {
  const u = normalizeUrl(url);
  if (!u) throw new Error('Суроға бояд бо https:// сар шавад (масалан, https://abcd.supabase.co)');
  const k = key.trim();
  if (k.length < 20) throw new Error('Калиди «anon public» нодуруст аст');
  if (k.split('.').length === 3) {
    try {
      const role = (JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }).role;
      if (role === 'service_role') throw new Error('Ин калиди «service_role» аст (махфӣ). Калиди «anon public»-ро истифода баред.');
    } catch (e) {
      if (e instanceof Error && e.message.includes('service_role')) throw e;
    }
  }
  try {
    await call({ url: u, key: k }, '/auth/v1/settings');
  } catch (e) {
    if (e instanceof HttpError) throw new Error('Supabase калидро қабул накард: суроға ё калидро санҷед');
    throw new Error('Пайваст нашуд: интернет ё суроғаро санҷед');
  }
  ls.set(CFG_KEY, JSON.stringify({ url: u, key: k }));
  set('signedout');
}

export function disconnect() {
  [CFG_KEY, SESS_KEY, BASE_KEY, SYNCED_KEY, LAST_KEY].forEach(ls.del);
  set('off');
}

function storeSession(body: unknown): Session {
  const b = body as { access_token: string; refresh_token: string; expires_in?: number; user: { id: string; email: string } };
  const sess: Session = {
    access_token: b.access_token, refresh_token: b.refresh_token,
    expires_at: Date.now() + (b.expires_in ?? 3600) * 1000, user: { id: b.user.id, email: b.user.email },
  };
  ls.set(SESS_KEY, JSON.stringify(sess));
  return sess;
}

export async function signIn(email: string, password: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg) throw new Error('Аввал Supabase-ро пайваст кунед');
  try {
    storeSession(await call(cfg, '/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }));
  } catch (e) {
    if (e instanceof HttpError) throw new Error(e.message.includes('Invalid login') ? 'Почта ё рамз нодуруст аст' : e.message);
    throw new Error('Пайваст нашуд: интернетро санҷед');
  }
  ls.del(BASE_KEY);
  ls.del(SYNCED_KEY);
  set('idle');
  void syncNow();
}

/** Сабти ном. Агар «Confirm email» фаъол бошад, ҳисоб тасдиқ мешавад ва `false` бармегардад. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg) throw new Error('Аввал Supabase-ро пайваст кунед');
  try {
    const body = await call(cfg, '/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) }) as { access_token?: string };
    if (!body?.access_token) return false;
    storeSession(body);
  } catch (e) {
    if (e instanceof HttpError) throw new Error(e.message);
    throw new Error('Пайваст нашуд: интернетро санҷед');
  }
  ls.del(BASE_KEY);
  ls.del(SYNCED_KEY);
  set('idle');
  void syncNow();
  return true;
}

export function signOut() {
  ls.del(SESS_KEY);
  ls.del(BASE_KEY);
  ls.del(SYNCED_KEY);
  set('signedout');
}

async function token(cfg: SyncConfig): Promise<Session> {
  let sess = getSession();
  if (!sess) throw new HttpError(401, 'signedout');
  if (sess.expires_at - 60_000 < Date.now()) {
    try {
      sess = storeSession(await call(cfg, '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: sess.refresh_token }),
      }));
    } catch (e) {
      if (e instanceof HttpError) { ls.del(SESS_KEY); throw new HttpError(401, 'signedout'); }
      throw e;
    }
  }
  return sess;
}

// ---------- Маълумот ----------
interface Remote { data: unknown; updated_at: string }

async function getRemote(cfg: SyncConfig, sess: Session): Promise<Remote | null> {
  const rows = await call(cfg, `/rest/v1/user_state?select=data,updated_at&user_id=eq.${sess.user.id}`, { token: sess.access_token }) as Remote[];
  return rows[0] ?? null;
}

/** Ҳэши кӯтоҳи сатр (cyrb53): барои муайян кардани «мазмун тағйир ёфтааст?», на вақт. */
function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
}
const localHash = () => hash(localRaw() ?? '');

/** Маълумоти ҳозира барои фиристодан + ҳэши ҳамон мазмун. */
function payload() {
  const file = makeBackup().file;
  return { file, sent: hash(JSON.stringify(file.state)) };
}

async function insert(cfg: SyncConfig, sess: Session): Promise<boolean> {
  const { file, sent } = payload();
  try {
    const rows = await call(cfg, '/rest/v1/user_state', {
      method: 'POST', token: sess.access_token, headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ user_id: sess.user.id, data: file }),
    }) as { updated_at: string }[];
    if (!rows[0]) return false;
    markSynced(rows[0].updated_at, sent);
    return true;
  } catch (e) {
    if (e instanceof HttpError && (e.status === 409 || e.message.includes('duplicate'))) return false;
    throw e;
  }
}

/** Танҳо агар сервер ҳанӯз ҳамон `base` дошта бошад (ҳифзи навиштани ихтилофӣ). */
async function update(cfg: SyncConfig, sess: Session, base: string): Promise<boolean> {
  const { file, sent } = payload();
  const rows = await call(cfg, `/rest/v1/user_state?user_id=eq.${sess.user.id}&updated_at=eq.${encodeURIComponent(base)}`, {
    method: 'PATCH', token: sess.access_token, headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ data: file }),
  }) as { updated_at: string }[];
  if (!rows[0]) return false;
  markSynced(rows[0].updated_at, sent);
  return true;
}

function remoteInfo(remote: Remote) {
  const parsed = parseBackup(JSON.stringify(remote.data));
  return parsed ? { raw: parsed.raw, prefs: parsed.prefs } : null;
}

function markSynced(updatedAt: string, contentHash: string) {
  ls.set(BASE_KEY, updatedAt);
  ls.set(SYNCED_KEY, contentHash);
  ls.set(LAST_KEY, String(Date.now()));
}

async function applyRemote(remote: Remote) {
  const info = remoteInfo(remote);
  if (!info) throw new Error('Маълумоти сервер хонда нашуд');
  await restoreRaw(info.raw, info.prefs, () => markSynced(remote.updated_at, hash(info.raw)));
}

let busy = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Як давраи пурраи синхронизатсия: гирифтан, муқоиса, фиристодан ё ихтилоф. */
export async function syncNow(): Promise<void> {
  const cfg = getConfig();
  if (!cfg || !getSession()) return;
  if (busy) { again = true; return; }
  busy = true;
  set('syncing');
  try {
    const sess = await token(cfg);
    const remote = await getRemote(cfg, sess);
    const hasLocal = stateHasData();
    const base = ls.get(BASE_KEY);
    const dirty = localHash() !== ls.get(SYNCED_KEY);

    if (!remote) {
      if (hasLocal && !(await insert(cfg, sess))) again = true; // сервер дар ҳамин вақт сатр сохт
      set('idle');
      return;
    }
    if (remote.updated_at === base) {
      if (dirty && !(await update(cfg, sess, base))) again = true; // дар ҳамин вақт тағйир ёфт: аз нав месанҷем
      set('idle');
      return;
    }
    // Сервер аз синхронизатсияи охирин тағйир ёфтааст
    if (!hasLocal || (base && !dirty)) {
      await applyRemote(remote);
      return;
    }
    const info = remoteInfo(remote);
    if (!info) throw new Error('Маълумоти сервер хонда нашуд');
    set('conflict', {
      conflict: {
        remoteRaw: info.raw, remotePrefs: info.prefs, remoteAt: remote.updated_at,
        remoteCounts: summarize(info.raw), localCounts: summarize(localRaw() ?? '{}'),
      },
    });
    notifier?.('☁️ Ихтилофи маълумот: Профил → Синхронизатсия');
  } catch (e) {
    if (e instanceof HttpError && e.message === 'signedout') {
      set('signedout');
      notifier?.('☁️ Аз ҳисоб баромадед: аз нав ворид шавед');
    } else if (isOffline(e)) {
      set('offline');
    } else {
      set('error', { error: e instanceof Error ? e.message : 'Хатои номаълум' });
    }
  } finally {
    busy = false;
    if (again) { again = false; schedule(500); }
  }
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

/** Ихтилофро ҳал мекунем: 'remote' — аз сервер гирифтан, 'local' — маълумоти ин дастгоҳро фиристодан. */
export async function resolveConflict(choice: 'remote' | 'local'): Promise<void> {
  const c = snap.conflict;
  const cfg = getConfig();
  if (!c || !cfg) return;
  busy = true;
  set('syncing');
  try {
    const sess = await token(cfg);
    if (choice === 'remote') {
      await applyRemote({ data: { app: 'darakhti', version: 1, state: JSON.parse(c.remoteRaw), prefs: c.remotePrefs }, updated_at: c.remoteAt });
      return;
    }
    await addSnapshot(c.remoteRaw); // нусхаи сервер дар дастгоҳ мемонад
    await update(cfg, sess, c.remoteAt);
    set('idle');
  } catch (e) {
    set(isOffline(e) ? 'offline' : 'error', { error: e instanceof Error ? e.message : 'Хатои номаълум' });
  } finally {
    busy = false;
  }
}

/** Пеш аз рендер аз main.tsx даъват мешавад: гӯш кардани тағйирот, баргашт ба барнома ва шабака. */
export function initSync() {
  snap = build('idle');
  savedListeners.add(() => { if (getConfig() && getSession() && snap.status !== 'conflict') schedule(PUSH_DELAY); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(800); });
  window.addEventListener('online', () => schedule(500));
  if (getConfig() && getSession()) schedule(300);
}
