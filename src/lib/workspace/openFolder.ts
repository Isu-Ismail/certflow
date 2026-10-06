import type { FolderContents } from './types';

// File System Access API (Chrome / Edge). Other browsers use the <input webkitdirectory> fallback.
type DirHandle = { name: string; entries(): AsyncIterable<[string, any]> };

export const canPickFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

const hidden = (name: string) => name.startsWith('.');
/** The folder of finished PDFs: not part of the workspace's data, and it can hold thousands of files. */
const skipped = (prefix: string, name: string) => prefix === '' && name === 'output';

async function walk(dir: DirHandle, prefix: string, out: FolderContents['entries']) {
  for await (const [name, handle] of dir.entries()) {
    if (hidden(name) || skipped(prefix, name)) continue;
    if (handle.kind === 'file') out.push({ path: prefix + name, file: await handle.getFile() });
    else if (prefix.split('/').length < 3) await walk(handle, `${prefix}${name}/`, out); // 2 levels is enough
  }
}

/** Opens the native folder picker. Returns null if the user cancels. */
export async function pickFolder(): Promise<FolderContents | null> {
  try {
    const handle: DirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    const entries: FolderContents['entries'] = [];
    await walk(handle, '', entries);
    return { name: handle.name, handle, entries };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return null;
    throw e;
  }
}

/** Fallback for browsers without the picker: files from <input webkitdirectory>. */
export function fromFileList(list: FileList): FolderContents {
  const files = [...list];
  const rel = (f: File) => ((f as any).webkitRelativePath as string) || f.name;
  const name = rel(files[0] ?? ({ name: 'workspace' } as File)).split('/')[0] || 'workspace';
  const entries = files
    .map((file) => ({ path: rel(file).split('/').slice(1).join('/'), file }))
    .filter((e) => e.path && !e.path.split('/').some(hidden) && !e.path.startsWith('output/'));
  return { name, handle: null, entries };
}
