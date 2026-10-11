/** IndexedDB: хотираи асосии маълумот (калид → қимат) ва нусхаҳои худкор. Бе китобхона. */
const DB = 'darakhti';
const KV = 'kv';
const SNAP = 'snapshots';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(SNAP)) db.createObjectStore(SNAP, { keyPath: 'ts' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const idbGet = <T = unknown>(key: string) => tx<T | undefined>(KV, 'readonly', s => s.get(key));
export const idbSet = (key: string, value: unknown) => tx(KV, 'readwrite', s => s.put(value, key));

export interface Snapshot {
  ts: number;
  raw: string;
}

export const snapshotAdd = (snap: Snapshot) => tx(SNAP, 'readwrite', s => s.put(snap));
export const snapshotList = () => tx<Snapshot[]>(SNAP, 'readonly', s => s.getAll()).then(l => l.sort((a, b) => b.ts - a.ts));
export const snapshotDelete = (ts: number) => tx(SNAP, 'readwrite', s => s.delete(ts));
