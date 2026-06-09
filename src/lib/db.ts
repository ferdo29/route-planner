import type { RouteDraft } from "../types";

// A tiny, dependency-free IndexedDB layer. IndexedDB works fully client-side,
// which is exactly what we need for a static GitHub Pages deployment — no server.
//
// Store layout: a single object store "routes" keyed by `id`.
//   - id === "current"  -> the autosaved working route (always present)
//   - any other id      -> a named snapshot the user explicitly saved

const DB_NAME = "route-planner";
const DB_VERSION = 1;
const STORE = "routes";
export const CURRENT_ID = "current";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export function putRoute(route: RouteDraft): Promise<void> {
  return tx<IDBValidKey>("readwrite", (store) => store.put(route)).then(() => undefined);
}

export async function getRoute(id: string): Promise<RouteDraft | undefined> {
  return tx<RouteDraft | undefined>("readonly", (store) => store.get(id));
}

export async function getCurrent(): Promise<RouteDraft | undefined> {
  return getRoute(CURRENT_ID);
}

export function saveCurrent(route: RouteDraft): Promise<void> {
  return putRoute({ ...route, id: CURRENT_ID, updatedAt: Date.now() });
}

export async function listSavedRoutes(): Promise<RouteDraft[]> {
  const all = await tx<RouteDraft[]>("readonly", (store) => store.getAll());
  return all
    .filter((r) => r.id !== CURRENT_ID)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteRoute(id: string): Promise<void> {
  return tx<undefined>("readwrite", (store) => store.delete(id)).then(() => undefined);
}
