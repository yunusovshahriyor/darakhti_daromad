import { useSyncExternalStore } from 'react';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { BOT_API, EMBEDDED_CONFIG, GOOGLE_CLIENT_ID } from './firebaseConfig';
import {
  localRaw, makeBackup, parseBackup, restoreRaw, savedListeners, stateHasData,
} from './storage';

/**
 * Синхронизатсияи абрӣ бо Firebase (Auth + Firestore).
 * Модел: `users/{uid}/sync/meta` {rev, chunks, size, updatedAt, device} + `users/{uid}/sync/chunk_N` {i, part}.
 * Ҳолат (нусхаи пурраи JSON) ба порчаҳои ≤ 250 000 аломат тақсим мешавад (ҳудуди ҳуҷҷат 1 МБ).
 * Навсозӣ танҳо тавассути транзаксия бо санҷиши `rev` (ҳифз аз навиштани ихтилофӣ).
 * Қоида: маълумоти ҳисоб (сервер) ҳамеша афзалият дорад. Ҳангоми воридшавӣ ва ҳангоми тағйироти дастгоҳи дигар
 * маълумоти сервер бор мешавад; нусхаи маълумоти ин дастгоҳ пеш аз иваз дар «Нусхаҳои худкор» нигоҳ дошта мешавад.
 */
const CFG_KEY = 'darakhti:cloud-cfg'; // танзимоти дастӣ (агар дар код нест)
const FLAG_KEY = 'darakhti:cloud-on'; // корбар пештар ворид шуда буд: SDK-ро ҳангоми кушодан бор мекунем
const EMAIL_KEY = 'darakhti:cloud-email';
const NAME_KEY = 'darakhti:cloud-name';
const PHOTO_KEY = 'darakhti:cloud-photo';
const BASE_KEY = 'darakhti:cloud-base'; // rev-и сервер дар синхронизатсияи охирин
const SYNCED_KEY = 'darakhti:cloud-synced'; // ҳэши мазмуни маҳаллӣ дар синхронизатсияи охирин
const LAST_KEY = 'darakhti:cloud-last';
const NOTICE_KEY = 'darakhti:cloud-notice'; // паём, ки пас аз бор шудани маълумоти сервер нишон дода мешавад
const EMU_KEY = 'darakhti:cloud-emu'; // танҳо дар localhost: Firebase Emulator барои санҷиш
const DEVICE_KEY = 'darakhti:cloud-device';
const CHUNK = 250_000;
const PUSH_DELAY = 3000;

export type SyncStatus = 'off' | 'signedout' | 'idle' | 'syncing' | 'offline' | 'error';
export interface SyncSnap {
  status: SyncStatus;
  email: string;
  /** Номи ҳисоби Google (агар бошад). */
  name: string;
  /** Акси ҳисоби Google (агар бошад). */
  photo: string;
  lastSyncAt: number;
  error: string;
  configured: boolean;
  /** Танзимот дар код (оммавӣ) ё дастӣ. */
  embedded: boolean;
}

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export function getConfig(): FirebaseOptions | null {
  if (EMBEDDED_CONFIG) return EMBEDDED_CONFIG;
  try { return JSON.parse(ls.get(CFG_KEY) ?? 'null') as FirebaseOptions | null; } catch { return null; }
}

let authReady = false;
let curUser: { uid: string; email: string; name: string; photo: string } | null = null;
let snap: SyncSnap = build('idle');
const listeners = new Set<() => void>();
let notifier: ((msg: string) => void) | null = null;

function build(status?: SyncStatus, extra: Partial<SyncSnap> = {}): SyncSnap {
  const cfg = getConfig();
  const email = curUser?.email ?? ls.get(EMAIL_KEY) ?? '';
  const loggedIn = !!curUser || (ls.get(FLAG_KEY) === '1' && !authReady);
  const st: SyncStatus = !cfg ? 'off' : !loggedIn ? 'signedout' : status ?? 'idle';
  return {
    status: st, email: loggedIn ? email : '',
    name: loggedIn ? curUser?.name ?? ls.get(NAME_KEY) ?? '' : '',
    photo: loggedIn ? curUser?.photo ?? ls.get(PHOTO_KEY) ?? '' : '',
    lastSyncAt: Number(ls.get(LAST_KEY) ?? 0),
    error: '', configured: !!cfg, embedded: !!EMBEDDED_CONFIG, ...extra,
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

// ---------- Танзимот ----------
export function saveConfig(text: string): void {
  let cfg: FirebaseOptions;
  try {
    // Ҳам JSON ва ҳам объекти JavaScript-ро қабул мекунем: { apiKey: "...", ... }
    const cleaned = text.trim().replace(/^(const|let|var)\s+\w+\s*=\s*/, '').replace(/;\s*$/, '')
      .replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"');
    cfg = JSON.parse(cleaned) as FirebaseOptions;
  } catch {
    throw new Error('Матнро хонда нашуд. Объекти firebaseConfig-ро пурра нусха кунед ({ apiKey: …, projectId: … }).');
  }
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) throw new Error('Дар танзимот apiKey, projectId ва appId лозиманд');
  ls.set(CFG_KEY, JSON.stringify(cfg));
  fb = null;
  set('signedout');
}

export function clearConfig() {
  [CFG_KEY, FLAG_KEY, EMAIL_KEY, NAME_KEY, PHOTO_KEY, BASE_KEY, SYNCED_KEY, LAST_KEY].forEach(ls.del);
  stopWatch();
  fb = null;
  curUser = null;
  set('off');
}

// ---------- Firebase (бор кардани танбал) ----------
interface Fb {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  authM: typeof import('firebase/auth');
  fsM: typeof import('firebase/firestore');
}

let fb: Promise<Fb | null> | null = null;

async function load(): Promise<Fb | null> {
  const cfg = getConfig();
  if (!cfg) return null;
  if (!fb) {
    fb = (async () => {
      const [appM, authM, fsM] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
      const app = appM.getApps()[0] ?? appM.initializeApp(cfg);
      const auth = authM.getAuth(app);
      const db = fsM.initializeFirestore(app, { localCache: fsM.memoryLocalCache() });
      if (location.hostname === 'localhost' && ls.get(EMU_KEY) === '1') {
        authM.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        fsM.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      }
      authM.onAuthStateChanged(auth, onAuth);
      authM.getRedirectResult(auth).catch(e => set('error', { error: authMessage(e) }));
      return { app, auth, db, authM, fsM };
    })().catch(e => { fb = null; throw e; });
  }
  return fb;
}

function onAuth(u: User | null) {
  authReady = true;
  if (u) {
    curUser = { uid: u.uid, email: u.email ?? (u.uid.startsWith('tg_') || u.providerData.length === 0 ? 'Telegram' : ''), name: u.displayName ?? '', photo: u.photoURL ?? '' };
    ls.set(FLAG_KEY, '1');
    ls.set(EMAIL_KEY, curUser.email);
    ls.set(NAME_KEY, curUser.name);
    ls.set(PHOTO_KEY, curUser.photo);
    set('idle');
    void startWatch();
    schedule(300);
  } else {
    curUser = null;
    ls.del(FLAG_KEY);
    [EMAIL_KEY, NAME_KEY, PHOTO_KEY, BASE_KEY, SYNCED_KEY].forEach(ls.del);
    stopWatch();
    set('signedout');
  }
}

const authMessage = (e: unknown): string => {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Почта ё рамз нодуруст аст',
    'auth/wrong-password': 'Почта ё рамз нодуруст аст',
    'auth/user-not-found': 'Ин почта сабт нашудааст',
    'auth/email-already-in-use': 'Ин почта аллакай сабт шудааст: «Даромадан»-ро пахш кунед',
    'auth/weak-password': 'Рамз заиф аст (на камтар аз 6 аломат)',
    'auth/invalid-email': 'Суроғаи почта нодуруст аст',
    'auth/too-many-requests': 'Кӯшишҳо зиёд шуд: каме баъдтар такрор кунед',
    'auth/network-request-failed': 'Пайваст нашуд: интернетро санҷед',
    'auth/popup-closed-by-user': 'Равзанаи Google пӯшида шуд',
    'auth/cancelled-popup-request': 'Равзанаи Google пӯшида шуд',
    'auth/unauthorized-domain': 'Ин сайт дар Firebase иҷозат нашудааст: Authentication → Settings → Authorized domains',
    'auth/operation-not-allowed': 'Ин усули воридшавӣ дар Firebase фаъол нест (Authentication → Sign-in method)',
    'auth/requires-recent-login': 'Барои ин амал аз нав ворид шавед ва такрор кунед',
    'auth/invalid-api-key': 'apiKey нодуруст аст',
    'auth/internal-error': 'Хатои дохилии Firebase: интернетро санҷед ва аз нав кӯшиш кунед',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Хатои номаълум');
};

export async function signIn(email: string, password: string): Promise<void> {
  const f = await load();
  if (!f) throw new Error('Аввал Firebase-ро танзим кунед');
  try { await f.authM.signInWithEmailAndPassword(f.auth, email, password); } catch (e) { throw new Error(authMessage(e)); }
}

export async function signUp(email: string, password: string): Promise<void> {
  const f = await load();
  if (!f) throw new Error('Аввал Firebase-ро танзим кунед');
  try {
    const cred = await f.authM.createUserWithEmailAndPassword(f.auth, email, password);
    void f.authM.sendEmailVerification(cred.user).catch(() => { /* ихтиёрӣ */ });
  } catch (e) { throw new Error(authMessage(e)); }
}

interface GoogleId {
  initialize: (o: Record<string, unknown>) => void;
  prompt: (cb?: (n: { isNotDisplayed?: () => boolean; isSkippedMoment?: () => boolean; isDismissedMoment?: () => boolean; getDismissedReason?: () => string }) => void) => void;
  cancel: () => void;
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

const clientId = () => GOOGLE_CLIENT_ID || (location.hostname === 'localhost' ? ls.get('darakhti:cloud-gid') ?? '' : '');

let gisLoad: Promise<GoogleId> | null = null;
function loadGis(): Promise<GoogleId> {
  if (!gisLoad) {
    gisLoad = new Promise<GoogleId>((resolve, reject) => {
      const ready = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('gis')));
      if (window.google?.accounts?.id) return ready();
      const el = document.createElement('script');
      el.src = 'https://accounts.google.com/gsi/client';
      el.async = true;
      el.onload = ready;
      el.onerror = () => reject(new Error('gis'));
      document.head.appendChild(el);
      setTimeout(() => reject(new Error('gis timeout')), 8000);
    }).catch(e => { gisLoad = null; throw e; });
  }
  return gisLoad;
}

async function popupGoogle(f: Fb): Promise<void> {
  const provider = new f.authM.GoogleAuthProvider();
  try {
    await f.authM.signInWithPopup(f.auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await f.authM.signInWithRedirect(f.auth, provider);
      return;
    }
    throw new Error(authMessage(e));
  }
}

/**
 * Воридшавӣ бо Google. Агар Client ID дода шуда бошад: «One Tap» (FedCM): равзанаи интихоби ҳисоб дар болои барнома.
 * Агар One Tap нишон дода нашуд (масалан, ҳисобҳо нест ё корбар чанд бор пӯшид), равзанаи оддии Google кушода мешавад.
 */
export async function signInGoogle(): Promise<void> {
  const f = await load();
  if (!f) throw new Error('Аввал Firebase-ро танзим кунед');
  const id = clientId();
  if (!id) return popupGoogle(f);

  let gis: GoogleId;
  try { gis = await loadGis(); } catch { return popupGoogle(f); }

  await new Promise<void>((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => { if (!done) { done = true; fn(); } };
    gis.initialize({
      client_id: id,
      use_fedcm_for_prompt: true,
      auto_select: false,
      cancel_on_tap_outside: false,
      callback: (resp: { credential?: string }) => {
        if (!resp.credential) return finish(() => reject(new Error('Google ҷавоб надод')));
        const cred = f.authM.GoogleAuthProvider.credential(resp.credential);
        f.authM.signInWithCredential(f.auth, cred)
          .then(() => finish(resolve))
          .catch(e => finish(() => reject(new Error(authMessage(e)))));
      },
    });
    gis.prompt(n => {
      try {
        if (n.isNotDisplayed?.() || n.isSkippedMoment?.()) finish(() => { popupGoogle(f).then(resolve, reject); });
        else if (n.isDismissedMoment?.() && n.getDismissedReason?.() !== 'credential_returned') finish(() => reject(new Error('Равзанаи Google пӯшида шуд')));
      } catch { /* усули кӯҳна: интизор мешавем */ }
    });
    setTimeout(() => finish(() => { gis.cancel(); popupGoogle(f).then(resolve, reject); }), 45_000);
  });
}

export async function resetPassword(email: string): Promise<void> {
  const f = await load();
  if (!f) throw new Error('Аввал Firebase-ро танзим кунед');
  try { await f.authM.sendPasswordResetEmail(f.auth, email); } catch (e) { throw new Error(authMessage(e)); }
}

export async function signOut(): Promise<void> {
  const f = await load();
  if (f) await f.authM.signOut(f.auth);
  else onAuth(null);
}

/** Ҳисоб ва маълумоти он дар сервер нест мешавад. Маълумоти маҳаллӣ мемонад. */
export async function deleteAccount(): Promise<void> {
  const f = await load();
  const u = f?.auth.currentUser;
  if (!f || !u) throw new Error('Аввал ворид шавед');
  try {
    const { doc, getDoc, writeBatch } = f.fsM;
    const metaRef = doc(f.db, 'users', u.uid, 'sync', 'meta');
    const meta = await getDoc(metaRef);
    const batch = writeBatch(f.db);
    const n = meta.exists() ? (meta.data().chunks as number) : 0;
    for (let i = 0; i < n; i++) batch.delete(doc(f.db, 'users', u.uid, 'sync', `chunk_${i}`));
    batch.delete(metaRef);
    await batch.commit();
    await f.authM.deleteUser(u);
  } catch (e) { throw new Error(authMessage(e)); }
}

// ---------- Маълумот (Firestore) ----------
class ConflictError extends Error {}

const deviceId = () => {
  let d = ls.get(DEVICE_KEY);
  if (!d) { d = Math.random().toString(36).slice(2, 10); ls.set(DEVICE_KEY, d); }
  return d;
};

interface Remote { rev: number; data: unknown }

async function getRemote(f: Fb, uid: string): Promise<Remote | null> {
  const { doc, runTransaction } = f.fsM;
  return runTransaction(f.db, async tx => {
    const meta = await tx.get(doc(f.db, 'users', uid, 'sync', 'meta'));
    if (!meta.exists()) return null;
    const n = meta.data().chunks as number;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => tx.get(doc(f.db, 'users', uid, 'sync', `chunk_${i}`))));
    const json = parts.map(p => (p.data()?.part as string | undefined) ?? '').join('');
    return { rev: meta.data().rev as number, data: JSON.parse(json) as unknown };
  });
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

function markSynced(rev: number, contentHash: string) {
  ls.set(BASE_KEY, String(rev));
  ls.set(SYNCED_KEY, contentHash);
  ls.set(LAST_KEY, String(Date.now()));
}

/** Навсозӣ танҳо агар `rev`-и сервер ҳанӯз баробари `base` бошад; дар акс ConflictError. */
async function push(f: Fb, uid: string, base: number): Promise<void> {
  const file = makeBackup().file;
  const sent = hash(JSON.stringify(file.state));
  const json = JSON.stringify(file);
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK));
  const { doc, runTransaction, serverTimestamp } = f.fsM;
  const rev = await runTransaction(f.db, async tx => {
    const metaRef = doc(f.db, 'users', uid, 'sync', 'meta');
    const meta = await tx.get(metaRef);
    const cur = meta.exists() ? (meta.data().rev as number) : 0;
    if (cur !== base) throw new ConflictError('rev');
    const old = meta.exists() ? (meta.data().chunks as number) : 0;
    chunks.forEach((part, i) => tx.set(doc(f.db, 'users', uid, 'sync', `chunk_${i}`), { i, part }));
    for (let i = chunks.length; i < old; i++) tx.delete(doc(f.db, 'users', uid, 'sync', `chunk_${i}`));
    tx.set(metaRef, { rev: cur + 1, chunks: chunks.length, size: json.length, updatedAt: serverTimestamp(), device: deviceId() });
    return cur + 1;
  });
  markSynced(rev, sent);
}

function remoteInfo(remote: Remote) {
  const parsed = parseBackup(JSON.stringify(remote.data));
  return parsed ? { raw: parsed.raw, prefs: parsed.prefs } : null;
}

/** Маълумоти сервер ҷои маълумоти маҳаллиро мегирад (нусхаи маҳаллӣ худкор нигоҳ дошта мешавад). */
async function applyRemote(remote: Remote, firstLogin: boolean) {
  const info = remoteInfo(remote);
  if (!info) throw new Error('Маълумоти сервер хонда нашуд');
  const hadLocal = stateHasData() && localHash() !== hash(info.raw);
  await restoreRaw(info.raw, info.prefs, () => {
    markSynced(remote.rev, hash(info.raw));
    ls.set(NOTICE_KEY, firstLogin
      ? (hadLocal
        ? '☁️ Маълумоти ҳисоби шумо бор шуд. Маълумоти пештараи ин дастгоҳ ҳамчун нусха нигоҳ дошта шуд.'
        : '☁️ Маълумоти ҳисоби шумо бор шуд')
      : '☁️ Маълумот аз дастгоҳи дигар навсозӣ шуд');
  });
}

/** Паёми дар боло сабтшударо як маротиба мегирад (аз App.tsx пас аз кушодани барнома). */
export function takeNotice(): string {
  const m = ls.get(NOTICE_KEY) ?? '';
  if (m) ls.del(NOTICE_KEY);
  return m;
}

let busy = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let unwatch: (() => void) | null = null;

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), ms);
}

/** Тағйироти фаврии дигар дастгоҳҳо: ба ҳуҷҷати `meta` гӯш медиҳем (Firestore realtime). */
async function startWatch() {
  stopWatch();
  const f = await load();
  if (!f || !curUser) return;
  const { doc, onSnapshot } = f.fsM;
  unwatch = onSnapshot(
    doc(f.db, 'users', curUser.uid, 'sync', 'meta'),
    s => {
      if (s.metadata.hasPendingWrites || busy) return;
      const rev = s.exists() ? (s.data().rev as number) : 0;
      if (String(rev) !== (ls.get(BASE_KEY) ?? '0')) schedule(400);
    },
    () => { /* бе интернет ё иҷозат: syncNow ҳолатро нишон медиҳад */ },
  );
}
function stopWatch() {
  unwatch?.();
  unwatch = null;
}

const isOffline = (e: unknown) =>
  (e as { code?: string })?.code === 'unavailable' || (typeof navigator !== 'undefined' && navigator.onLine === false);

/** Як давраи пурраи синхронизатсия: гирифтан, муқоиса, фиристодан ё ихтилоф. */
export async function syncNow(): Promise<void> {
  if (!getConfig() || !curUser) return;
  if (busy) { again = true; return; }
  busy = true;
  set('syncing');
  try {
    const f = await load();
    if (!f || !curUser) return;
    const uid = curUser.uid;
    const remote = await getRemote(f, uid);
    const hasLocal = stateHasData();
    const base = ls.get(BASE_KEY);
    const dirty = localHash() !== ls.get(SYNCED_KEY);

    if (!remote) {
      if (hasLocal) {
        try { await push(f, uid, 0); } catch (e) { if (e instanceof ConflictError) again = true; else throw e; }
      }
      ls.set(LAST_KEY, String(Date.now()));
      set('idle');
      return;
    }
    if (base !== null && String(remote.rev) === base) {
      if (dirty) {
        try { await push(f, uid, remote.rev); } catch (e) { if (e instanceof ConflictError) again = true; else throw e; }
      }
      ls.set(LAST_KEY, String(Date.now()));
      set('idle');
      return;
    }
    // Сервер аз синхронизатсияи охирин тағйир ёфтааст (ё ин аввалин воридшавӣ): маълумоти ҳисоб бор мешавад
    await applyRemote(remote, base === null);
  } catch (e) {
    if (isOffline(e)) set('offline');
    else {
      const code = (e as { code?: string })?.code;
      const msg = code === 'permission-denied'
        ? 'Иҷозат нест: қоидаҳои Firestore (firestore.rules) нашр нашудаанд'
        : e instanceof Error ? e.message : 'Хатои номаълум';
      set('error', { error: msg });
    }
  } finally {
    busy = false;
    if (again) { again = false; schedule(500); }
  }
}

/** Аз main.tsx пеш аз рендер: гӯш кардани тағйирот, баргашт ба барнома ва шабака. */
export function initSync() {
  // Тозакунии калидҳои Supabase-и кӯҳна
  ['darakhti:sbcfg', 'darakhti:sbsess', 'darakhti:sbbase', 'darakhti:sbsynced', 'darakhti:sblast'].forEach(ls.del);
  savedListeners.add(() => { if (getConfig() && curUser) schedule(PUSH_DELAY); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && curUser) schedule(800); });
  window.addEventListener('online', () => { if (curUser) schedule(500); });
  snap = build('idle');
  // Агар пештар ворид шуда бошед: SDK-ро бор мекунем, то воридшавӣ барқарор шавад
  if (getConfig() && ls.get(FLAG_KEY) === '1') void load().catch(() => set('offline'));
}

/** Барои саҳифаи Профил: SDK-ро пешакӣ бор мекунем. */
export const preload = () => { if (getConfig()) void load().catch(() => { /* ignore */ }); };

// ---------- Акси профил (Firebase Storage) ----------
const storageMessage = (e: unknown): string => {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'storage/unauthorized': 'Иҷозат нест: қоидаҳои Storage (storage.rules) нашр нашудаанд ё ворид нашудаед',
    'storage/bucket-not-found': 'Storage дар Firebase фаъол нест (Build → Storage → Get started)',
    'storage/project-not-found': 'Storage дар Firebase фаъол нест',
    'storage/quota-exceeded': 'Ҷойи Storage пур шудааст',
    'storage/retry-limit-exceeded': 'Бор нашуд: интернетро санҷед ва аз нав кӯшиш кунед',
    'storage/canceled': 'Бор кардан бекор шуд',
    'storage/unknown': 'Хатои номаълуми Storage: фаъол будани Storage ва нақшаи Blaze-ро санҷед',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Хатои номаълум');
};

let storageEmuConnected = false;

/**
 * Акси профилро иваз мекунад (`image`) ё нест мекунад (`null`).
 * Тартиб: аввал аксҳои нав бор мешавад, баъд профил нав мешавад ва дар охир аксҳои кӯҳна нест мешаванд,
 * то дар Storage ҳамеша танҳо як акс монад ва ҷой пур нашавад.
 */
export async function setAvatar(image: Blob | null): Promise<void> {
  const f = await load();
  const u = f?.auth.currentUser;
  if (!f || !u) throw new Error('Аввал ворид шавед');
  try {
    const st = await import('firebase/storage');
    const storage = st.getStorage(f.app);
    if (location.hostname === 'localhost' && ls.get(EMU_KEY) === '1' && !storageEmuConnected) {
      st.connectStorageEmulator(storage, '127.0.0.1', 9199);
      storageEmuConnected = true;
    }
    const folder = st.ref(storage, `users/${u.uid}/avatar`);
    let keep = '';
    let url = '';
    if (image) {
      keep = `${Date.now()}.jpg`;
      const target = st.ref(folder, keep);
      await st.uploadBytes(target, image, { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000' });
      url = await st.getDownloadURL(target);
    }
    await f.authM.updateProfile(u, { photoURL: url });
    // Аксҳои кӯҳнаро нест мекунем (хатои нест кардан муҳим нест: акс аллакай иваз шуд)
    const all = await st.listAll(folder).catch(() => ({ items: [] as { name: string }[] }));
    await Promise.all(all.items.filter(i => i.name !== keep).map(i => st.deleteObject(i as never).catch(() => undefined)));
    curUser = curUser ? { ...curUser, photo: url } : curUser;
    ls.set(PHOTO_KEY, url);
    set('idle');
  } catch (e) {
    throw new Error(storageMessage(e));
  }
}

// ---------- Telegram-бот ----------
export interface TelegramLink { linkedAt: string }

/** Рамзи пайвастшавӣ: 10 аломат бе 0/1/I/O (барои хондан осон), аз crypto. */
const makeCode = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(b, x => A[x % A.length]).join('');
};

/** Firebase бор мешавад ва мунтазир мешавем, то воридшавии захирашуда барқарор шавад (то 10 сония). */
async function loadAuthed(): Promise<Fb | null> {
  const f = await load();
  if (!f) return null;
  for (let i = 0; i < 100 && !authReady; i++) await new Promise(r => setTimeout(r, 100));
  return f;
}

export async function telegramStatus(): Promise<TelegramLink | null> {
  const f = await loadAuthed();
  if (!f || !curUser) return null;
  const { doc, getDoc } = f.fsM;
  const s = await getDoc(doc(f.db, 'users', curUser.uid, 'bot', 'link'));
  return s.exists() ? { linkedAt: String(s.data().linkedAt ?? '') } : null;
}

/** Рамзи нав месозад; ба бот фиристода мешавад ва то 15 дақиқа эътибор дорад. */
export async function telegramCreateCode(): Promise<string> {
  const f = await loadAuthed();
  if (!f || !curUser) throw new Error('Аввал ба аккаунт ворид шавед');
  const { doc, setDoc, serverTimestamp } = f.fsM;
  const code = makeCode();
  await setDoc(doc(f.db, 'botLinks', code), { uid: curUser.uid, createdAt: serverTimestamp() });
  return code;
}

export async function telegramUnlink(): Promise<void> {
  const f = await load();
  if (!f || !curUser) return;
  const { doc, deleteDoc } = f.fsM;
  await deleteDoc(doc(f.db, 'users', curUser.uid, 'bot', 'link'));
}


// ---------- Воридшавӣ бо Telegram ----------
async function botPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BOT_API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 401 ? 'Telegram маълумотро тасдиқ накард' : 'Сервер ҷавоб надод: баъдтар кӯшиш кунед');
  return (await r.json()) as T;
}

async function signInWithToken(token: string, name: string): Promise<void> {
  const f = await load();
  if (!f) throw new Error('Аввал Firebase-ро танзим кунед');
  const cred = await f.authM.signInWithCustomToken(f.auth, token);
  if (name && !cred.user.displayName) {
    try {
      await f.authM.updateProfile(cred.user, { displayName: name });
      if (curUser) { curUser = { ...curUser, name }; ls.set(NAME_KEY, name); set(); }
    } catch { /* ном ихтиёрӣ аст */ }
  }
}

/** Mini App: агар корбар ворид нашуда бошад, бо initData-и имзошудаи Telegram худкор ворид мешавад. */
export async function telegramAutoLogin(initData: string): Promise<void> {
  if (!BOT_API || !initData) return;
  const f = await loadAuthed();
  if (!f || curUser) return;
  const r = await botPost<{ token: string; name: string }>('/auth/telegram', { initData });
  await signInWithToken(r.token, r.name);
}

/** Браузер: кодро месозад; корбар дар бот тасдиқ мекунад. */
export async function telegramLoginStart(): Promise<{ code: string; url: string }> {
  return botPost('/auth/start', {});
}

/** `true` — ворид шуд; `false` — ҳанӯз интизор; хато — дархост кӯҳна шуд. */
export async function telegramLoginPoll(code: string): Promise<boolean> {
  const r = await botPost<{ status: 'pending' | 'gone' | 'ok'; token?: string; name?: string }>('/auth/poll', { code });
  if (r.status === 'gone') throw new Error('Дархост кӯҳна шуд. Аз нав кӯшиш кунед');
  if (r.status !== 'ok' || !r.token) return false;
  await signInWithToken(r.token, r.name ?? '');
  return true;
}
