import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS, addAccountNode, allocate, defaultTree, findAccountNode, syncCatalog } from './model';
import { idbClearAll, idbGet, idbSet, snapshotAdd, snapshotDelete, snapshotList } from './idb';
import type { Snapshot } from './idb';
import type { Income, State } from './types';

const KEY = 'darakhti:v2';
const SAVED_KEY = 'darakhti:savedAt';
const BACKUP_KEY = 'darakhti:lastbackup';
const DAY = 86_400_000;
const KEEP_SNAPSHOTS = 7;

/** Маълумоти хондашуда ҳангоми кушодани барнома (аз IndexedDB ё localStorage). */
let bootRaw: string | null = null;
/** Оё браузер хотираро «доимӣ» қайд кард (худаш нест намекунад). */
export let persisted: boolean | null = null;
const OLD_KEY = 'incomes';

export const emptyState = (): State => ({
  accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a })),
  tree: defaultTree(),
  incomes: [],
  expenses: [],
  debts: [],
  loans: [],
  categories: [],
  incomeSources: [],
  dreams: [],
  transfers: [],
  goals: {},
});

export function loadState(): State {
  const state = readState();
  syncCatalog(state);
  return state;
}

/** Рангҳои «Old Money» (агар пештар захира шуда бошанд) → рангҳои пешфарзи пештара. */
const NEW_TO_OLD: Record<string, [string, string]> = {
  charity: ['#a07f4f', '#b7791f'], parents: ['#8a5a4a', '#b24a6c'], future: ['#4b6b55', '#2f857b'],
  fun: ['#8c6d8f', '#7a5bb8'], debt: ['#9a4a3c', '#b3453b'], capital: ['#2f4a6b', '#1f6fa3'],
  bigDream: ['#5f6f3f', '#2f7d55'], smallDream: ['#4f7c86', '#2f8fb5'], living: ['#3b4a66', '#46688f'],
};

function readState(): State {
  try {
    const raw = bootRaw ?? localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State> & { settings?: typeof DEFAULT_SETTINGS };
      const base = emptyState();
      // Версияи кӯҳна: ҳисобҳо ва дарахт бо фоизҳои сабтшуда сохта мешаванд
      let tree = s.tree ?? defaultTree({ ...DEFAULT_SETTINGS, ...(s.settings ?? {}) });
      const accounts = (s.accounts ?? base.accounts).map(a =>
        (NEW_TO_OLD[a.id] && a.color === NEW_TO_OLD[a.id][0] ? { ...a, color: NEW_TO_OLD[a.id][1] } : a));
      // «Пардохти қарз» ҳиссаи худро (10%) дар дарахт дорад
      if (!findAccountNode(tree, 'debt') && accounts.some(a => a.id === 'debt' && !a.archived)) {
        tree = addAccountNode(tree, 'root', 'debt', 10);
      }
      const { settings: _legacy, ...rest } = s;
      return { ...base, ...rest, accounts, tree };
    }
    // Гузариш аз версияи кӯҳна (рӯйхати оддии даромад)
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]') as Omit<Income, 'alloc'>[];
    const state = emptyState();
    syncCatalog(state);
    state.incomes = old.map(i => ({ ...i, alloc: allocate(i.amount, state.tree, false) }));
    return state;
  } catch {
    return emptyState();
  }
}

/** Пас аз ҳар навиштани ҳолат (барои синхронизатсияи абрӣ). */
export const savedListeners = new Set<() => void>();

let idbTimer: ReturnType<typeof setTimeout> | undefined;
let pending: string | null = null;

function flushIdb() {
  if (idbTimer) clearTimeout(idbTimer);
  idbTimer = undefined;
  if (pending === null) return;
  const raw = pending;
  pending = null;
  idbSet('state', raw).then(() => idbSet('savedAt', Date.now())).catch(() => { /* localStorage мемонад */ });
}

/** Ҳамеша ҳарду ҷо: localStorage фавран (барои пӯшидани барнома), IndexedDB бо таъхири кӯтоҳ. */
export function saveState(state: State) {
  const raw = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, raw);
    localStorage.setItem(SAVED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  pending = raw;
  if (idbTimer) clearTimeout(idbTimer);
  idbTimer = setTimeout(flushIdb, 400);
  savedListeners.forEach(fn => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushIdb);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushIdb();
  });
}

const hasData = (raw: string | null) => {
  if (!raw) return false;
  try {
    const s = JSON.parse(raw) as Partial<State>;
    return [s.incomes, s.expenses, s.debts, s.loans, s.dreams, s.transfers].some(a => Array.isArray(a) && a.length > 0);
  } catch {
    return false;
  }
};

export function summarize(raw: string) {
  try {
    const s = JSON.parse(raw) as Partial<State>;
    const n = (a: unknown) => (Array.isArray(a) ? a.length : 0);
    return { incomes: n(s.incomes), expenses: n(s.expenses), debts: n(s.debts) + n(s.loans), dreams: n(s.dreams) };
  } catch {
    return { incomes: 0, expenses: 0, debts: 0, dreams: 0 };
  }
}

/**
 * Пеш аз рендер: маълумотро аз IndexedDB мехонем (агар аз localStorage навтар бошад),
 * хотираи доимиро талаб мекунем ва нусхаи рӯзонаи худкор мегирем.
 */
export async function initStorage(): Promise<void> {
  const lsRaw = localStorage.getItem(KEY);
  const lsAt = Number(localStorage.getItem(SAVED_KEY) ?? 0);
  try {
    const idbRaw = (await idbGet<string>('state')) ?? null;
    const idbAt = Number((await idbGet<number>('savedAt')) ?? 0);
    if (idbRaw && (!lsRaw || idbAt > lsAt)) bootRaw = idbRaw;
    else bootRaw = lsRaw;
    // Яке аз ду ҷо холӣ шудааст: аз дигараш пур мекунем
    if (bootRaw && (!idbRaw || bootRaw !== idbRaw)) await idbSet('state', bootRaw).then(() => idbSet('savedAt', Date.now()));
    if (bootRaw && !lsRaw) localStorage.setItem(KEY, bootRaw);
  } catch {
    bootRaw = lsRaw;
  }
  try {
    persisted = (await navigator.storage?.persisted?.()) ?? null;
    if (persisted === false) persisted = (await navigator.storage?.persist?.()) ?? false;
  } catch {
    persisted = null;
  }
  try {
    if (hasData(bootRaw)) {
      const snaps = await snapshotList();
      if (!snaps[0] || Date.now() - snaps[0].ts > DAY) {
        await snapshotAdd({ ts: Date.now(), raw: bootRaw! });
        for (const old of snaps.slice(KEEP_SNAPSHOTS - 1)) await snapshotDelete(old.ts);
      }
    }
  } catch {
    /* ignore */
  }
}

export const listSnapshots = (): Promise<Snapshot[]> => snapshotList().catch(() => []);

export const lastBackupAt = (): number => {
  try { return Number(localStorage.getItem(BACKUP_KEY) ?? 0); } catch { return 0; }
};
export const markBackup = () => {
  try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch { /* ignore */ }
};
export const stateHasData = () => {
  try { return hasData(localStorage.getItem(KEY)); } catch { return false; }
};

/** Танзимоти хурди барнома (ном, ҷамъшавӣ ва ғ.), ки ба нусхаи эҳтиётӣ медароянд. */
const PREF_SKIP = new Set([KEY, SAVED_KEY, BACKUP_KEY, 'darakhti:nudge', 'darakhti:duenudge', 'darakhti:backupnudge']);
const readPrefs = (): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('darakhti:') && !k.startsWith('darakhti:cloud') && !PREF_SKIP.has(k)) out[k] = localStorage.getItem(k) ?? '';
    }
  } catch { /* ignore */ }
  return out;
};

export interface BackupFile {
  app: 'darakhti';
  version: 1;
  exportedAt: string;
  state: unknown;
  prefs: Record<string, string>;
}

export function makeBackup(): { file: BackupFile; name: string } {
  const raw = localStorage.getItem(KEY) ?? JSON.stringify(emptyState());
  const file: BackupFile = { app: 'darakhti', version: 1, exportedAt: new Date().toISOString(), state: JSON.parse(raw), prefs: readPrefs() };
  const d = new Date().toLocaleDateString('sv-SE');
  return { file, name: `darakhti-backup-${d}.json` };
}

/** Файлро месанҷем ва ба сатри JSON-и ҳолат табдил медиҳем (бо хатогӣ — `null`). */
export function parseBackup(text: string): { raw: string; prefs: Record<string, string> } | null {
  try {
    const f = JSON.parse(text) as Partial<BackupFile>;
    const st = f.state as Partial<State> | undefined;
    if (f.app !== 'darakhti' || !st || typeof st !== 'object') return null;
    if (!Array.isArray(st.incomes) || !Array.isArray(st.expenses) || !Array.isArray(st.debts)) return null;
    return { raw: JSON.stringify(st), prefs: f.prefs && typeof f.prefs === 'object' ? f.prefs : {} };
  } catch {
    return null;
  }
}

/** Ҳолатро иваз мекунем (аввал нусхаи ҷорӣ ба нусхаҳои худкор меравад) ва саҳифаро аз нав мебор мекунем. */
export async function restoreRaw(raw: string, prefs: Record<string, string> = {}, onWritten?: () => void): Promise<void> {
  pending = null; // навиштани таъхирдодашудаи ҳолати кӯҳна ҳолати барқароршударо нест накунад
  if (idbTimer) clearTimeout(idbTimer);
  const current = localStorage.getItem(KEY);
  if (hasData(current)) await snapshotAdd({ ts: Date.now(), raw: current! }).catch(() => {});
  localStorage.setItem(KEY, raw);
  localStorage.setItem(SAVED_KEY, String(Date.now()));
  for (const [k, v] of Object.entries(prefs)) {
    if (k.startsWith('darakhti:') && !k.startsWith('darakhti:cloud') && !PREF_SKIP.has(k)) localStorage.setItem(k, v);
  }
  onWritten?.();
  await idbSet('state', raw).then(() => idbSet('savedAt', Date.now())).catch(() => {});
  location.reload();
}

export const getSavedAt = (): number => {
  try { return Number(localStorage.getItem(SAVED_KEY) ?? 0); } catch { return 0; }
};
export const addSnapshot = (raw: string) => snapshotAdd({ ts: Date.now(), raw }).catch(() => {});
export const localRaw = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const makeBackupText = () => JSON.stringify(makeBackup().file);


/**
 * Ҳамаи маълумоти корбар аз ин дастгоҳ нест мешавад (ҳолат, нусхаҳои худкор, танзимот): то корбари дигар
 * маълумоти аккаунти пештараро набинад. Танҳо `keep` (танзимоти техникии дастгоҳ) мемонад.
 */
export async function wipeAllLocal(keep: string[] = []): Promise<void> {
  pending = null; // навиштани таъхирдодашуда маълумоти кӯҳнаро бозгардонида наметавонад
  if (idbTimer) clearTimeout(idbTimer);
  idbTimer = undefined;
  try {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('darakhti:') || k === OLD_KEY) && !keep.includes(k)) drop.push(k);
    }
    drop.forEach(k => localStorage.removeItem(k));
  } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
  await idbClearAll().catch(() => {});
}

/** Оё ҳолати додашуда (аз сервер) маълумот дорад? */
export const stateObjHasData = (state: unknown): boolean => hasData(JSON.stringify(state ?? null));
