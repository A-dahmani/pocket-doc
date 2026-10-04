import { AppSnapshot } from "./types";

/** Local persistence boundary. Medical data never leaves this browser in the default build. */
export interface LocalStore {
  load(): Promise<AppSnapshot | null>;
  save(snapshot: AppSnapshot): Promise<void>;
}

const DB_NAME = "pocket-doc-local";
const STORE_NAME = "snapshots";
const LOCAL_KEY = "pocket-doc.snapshot.v1";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB is not available")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local database"));
    request.onblocked = () => reject(new Error("Local database is blocked"));
  });
}

function withTransaction<T>(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local database request failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local database transaction aborted"));
  });
}

export const localStore: LocalStore = {
  async load() {
    try {
      const db = await openDatabase();
      const value = await withTransaction<AppSnapshot | undefined>(db, "readonly", store => store.get("pocket-doc"));
      db.close();
      if (value) return value;
    } catch { /* Unsupported/blocked IndexedDB: use the same local-only snapshot in localStorage. */ }
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) as AppSnapshot : null;
    } catch { return null; }
  },
  async save(snapshot) {
    let idbSaved = false;
    try {
      const db = await openDatabase();
      await withTransaction<IDBValidKey>(db, "readwrite", store => store.put(snapshot));
      db.close(); idbSaved = true;
    } catch { /* Continue to localStorage below. */ }
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(snapshot)); }
    catch (error) {
      if (!idbSaved) throw new Error("This browser could not save Pocket Doc locally. Try enabling site storage and reload.", { cause: error });
    }
  },
};
