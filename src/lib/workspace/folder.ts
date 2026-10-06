// A workspace linked to a real folder on disk (File System Access API: Chrome, Edge).
// The folder handle is remembered in IndexedDB; edits are written into the folder a moment after each change.
import { deleteValue, getValue, putValue } from './persist';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type DirHandle = any;
export type FolderState = 'none' | 'linked' | 'needs-permission';

const KEY = 'folder-handle';

export const canLinkFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const rememberFolder = (handle: DirHandle) => putValue(KEY, handle);
export const recallFolder = () => getValue<DirHandle>(KEY);
export const forgetFolder = () => deleteValue(KEY);

/** Read/write permission on a folder. `ask` needs a user gesture (a click). */
export async function folderPermission(handle: DirHandle, ask: boolean): Promise<boolean> {
  try {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission?.(opts)) === 'granted') return true;
    return ask ? (await handle.requestPermission?.(opts)) === 'granted' : false;
  } catch {
    return false;
  }
}

/** Opens the picker for a folder to link. Null = cancelled. */
export async function pickLinkFolder(): Promise<DirHandle | null> {
  try {
    return await (window as any).showDirectoryPicker({ id: 'certflow-workspace', mode: 'readwrite' });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return null;
    throw e;
  }
}

async function dirOf(root: DirHandle, parts: string[], create: boolean): Promise<DirHandle | null> {
  let dir = root;
  for (const p of parts) {
    try { dir = await dir.getDirectoryHandle(p, { create }); } catch { return null; }
  }
  return dir;
}

export async function writeFileAt(root: DirHandle, path: string, data: Blob | string | Uint8Array) {
  const parts = path.split('/');
  if (parts.some((p) => p === '..' || p === '.' || p === '')) throw new Error(`Unsafe path: ${path}`);
  const name = parts.pop()!;
  const dir = (await dirOf(root, parts, true))!;
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function removeFileAt(root: DirHandle, path: string) {
  const parts = path.split('/');
  const name = parts.pop()!;
  const dir = await dirOf(root, parts, false);
  try { await dir?.removeEntry(name); } catch { /* already gone */ }
}

export async function readTextAt(root: DirHandle, path: string): Promise<string | null> {
  const parts = path.split('/');
  const name = parts.pop()!;
  const dir = await dirOf(root, parts, false);
  try { return await (await (await dir?.getFileHandle(name))?.getFile())?.text() ?? null; } catch { return null; }
}

/**
 * Keeps a folder equal to the workspace's files by writing only what changed since the last sync.
 * Files it did not write itself (and that were not primed) are never deleted.
 */
export class FolderSync {
  #text = new Map<string, string>();
  #blobs = new Map<string, Blob>();

  /** These files are already in the folder with this content (right after opening it): do not rewrite them. */
  prime(files: [string, Blob | string][], existing: Set<string>) {
    this.#text.clear();
    this.#blobs.clear();
    for (const [path, data] of files) {
      if (!existing.has(path)) continue;
      if (typeof data === 'string') this.#text.set(path, data);
      else this.#blobs.set(path, data);
    }
  }

  /** Writes new and changed files, removes the ones it wrote before that are gone. Returns how many files were written. */
  async sync(root: DirHandle, files: [string, Blob | string][]): Promise<number> {
    const now = new Set(files.map(([p]) => p));
    let written = 0;
    for (const [path, data] of files) {
      if (typeof data === 'string' ? this.#text.get(path) === data : this.#blobs.get(path) === data) continue;
      await writeFileAt(root, path, data);
      written++;
      if (typeof data === 'string') { this.#text.set(path, data); this.#blobs.delete(path); }
      else { this.#blobs.set(path, data); this.#text.delete(path); }
    }
    for (const path of [...this.#text.keys(), ...this.#blobs.keys()]) {
      if (now.has(path)) continue;
      await removeFileAt(root, path);
      this.#text.delete(path);
      this.#blobs.delete(path);
    }
    return written;
  }

  forget() {
    this.#text.clear();
    this.#blobs.clear();
  }
}

/** The names directly inside a folder (hidden ones left out). */
export async function listTop(root: DirHandle): Promise<string[]> {
  const out: string[] = [];
  for await (const [name] of root.entries()) if (!name.startsWith('.')) out.push(name);
  return out;
}

/** The files (names only, nothing is read) in some folders: the set of "folder/name" paths. */
export async function listFilesIn(root: DirHandle, dirs: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (const d of dirs) {
    const handle = await dirOf(root, d.split('/').filter(Boolean), false);
    if (!handle) continue;
    for await (const [name, entry] of handle.entries()) if (entry.kind === 'file') out.add(d ? `${d}/${name}` : name);
  }
  return out;
}
