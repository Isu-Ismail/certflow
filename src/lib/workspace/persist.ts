// Autosave in IndexedDB (no 5 MB limit, survives closing the tab). Every call fails soft.
//
// Layout of the `kv` store:
//   "workspace"      -> SavedMeta: the small stuff (name, data rows, designs, flow). Rewritten on every save.
//   "file:<name>"    -> one Blob per file under files/. Written only when that file is new or changed,
//                       so editing a design never re-writes megabytes of images.
// The connection is opened once and reused, so a save can start synchronously (important while the page unloads).
import type { FlowGraph } from '$lib/flow/types';
import type { Marker } from './marker';
import type { CombineStep, DesignFile, Sheet, Step, WorkFile } from './types';

export interface SavedMeta {
  name: string;
  step: Step;
  sources?: Sheet[];
  combine?: CombineStep[];
  designData?: Record<string, string>;
  genConfig?: Record<string, unknown> | null;
  marker?: Marker | null;
  /** older saves: the one data file */
  sheet?: Sheet | null;
  designs: DesignFile[];
  flowJson: string | null;
  fieldMap: Record<string, string>;
  flow?: FlowGraph | null;
  fileNames: string[]; // order of files/
}

const DB = 'certflow';
const STORE = 'kv';
const META = 'workspace';
const FILE = 'file:';

let db: IDBDatabase | null = null;
let opening: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (db) return Promise.resolve(db);
  opening ??= new Promise((resolve) => {
    const fail = (e?: unknown) => { console.warn('CertFlow autosave unavailable:', e); opening = null; resolve(null); };
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        db = req.result;
        db.onversionchange = () => { db?.close(); db = null; opening = null; };
        db.onclose = () => { db = null; opening = null; };
        resolve(db);
      };
      req.onerror = () => fail(req.error);
      req.onblocked = () => fail('blocked');
    } catch (e) {
      fail(e);
    }
  });
  return opening;
}

/** Opens the database early, so the first save does not have to wait for it. */
export const warmUp = () => void openDb();

/**
 * Writes the workspace. `persisted` = the files already in the database (by reference): only new or
 * replaced files are written, removed ones are deleted. Resolves true once the transaction has committed.
 */
export function saveAll(meta: SavedMeta, files: WorkFile[], persisted: Map<string, Blob>): Promise<boolean> {
  const write = (d: IDBDatabase | null) =>
    new Promise<boolean>((resolve) => {
      if (!d) return resolve(false);
      try {
        const tx = d.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.put(meta, META);
        const keep = new Set<string>();
        for (const f of files) {
          keep.add(f.name);
          if (persisted.get(f.name) !== f.blob) store.put(f.blob, FILE + f.name);
        }
        for (const name of persisted.keys()) if (!keep.has(name)) store.delete(FILE + name);
        tx.oncomplete = () => resolve(true);
        tx.onabort = tx.onerror = () => { console.warn('CertFlow autosave failed:', tx.error); resolve(false); };
      } catch (e) {
        console.warn('CertFlow autosave failed:', e);
        resolve(false);
      }
    });
  return db ? write(db) : openDb().then(write); // already open: the transaction starts right now
}

export async function loadAll(): Promise<{ meta: SavedMeta; files: WorkFile[] } | null> {
  const d = await openDb();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const store = d.transaction(STORE, 'readonly').objectStore(STORE);
      const range = IDBKeyRange.bound(FILE, FILE + '￿');
      const metaReq = store.get(META);
      const keysReq = store.getAllKeys(range);
      const valuesReq = store.getAll(range);
      valuesReq.onsuccess = () => {
        const meta = metaReq.result as (SavedMeta & { files?: WorkFile[] }) | undefined;
        if (!meta) return resolve(null);
        // older saves kept the files inside the main record
        if (Array.isArray(meta.files)) return resolve({ meta, files: meta.files });
        const byName = new Map<string, Blob>();
        (keysReq.result as string[]).forEach((k, i) => byName.set(k.slice(FILE.length), valuesReq.result[i] as Blob));
        const order = meta.fileNames ?? [...byName.keys()];
        const files = order.filter((n) => byName.has(n)).map((name) => ({ name, blob: byName.get(name)! }));
        resolve({ meta, files });
      };
      valuesReq.onerror = () => resolve(null);
    } catch (e) {
      console.warn('CertFlow could not read the autosave:', e);
      resolve(null);
    }
  });
}

export async function clearAll(): Promise<void> {
  const d = await openDb();
  if (!d) return;
  await new Promise<void>((resolve) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
  });
}

/** Other values kept next to the workspace (the linked folder's handle, the generate job). Removed by clearAll. */
export async function putValue(key: string, value: unknown): Promise<boolean> {
  const d = await openDb();
  if (!d) return false;
  return new Promise((resolve) => {
    try {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = tx.onabort = () => resolve(false);
    } catch { resolve(false); }
  });
}

export async function getValue<T>(key: string): Promise<T | null> {
  const d = await openDb();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function deleteValue(key: string): Promise<void> {
  const d = await openDb();
  if (!d) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
    } catch { resolve(); }
  });
}
