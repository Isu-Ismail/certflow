// The state of a generate run (`generate_data.json`) and where its files go.
import { deleteValue, getValue, putValue } from '$lib/workspace/persist';
import { readTextAt, removeFileAt, writeFileAt, type DirHandle } from '$lib/workspace/folder';
import type { GenSettings, Part } from './plan';

import { GENERATE_STAT } from '$lib/workspace/config';

export const JOB_FILE = GENERATE_STAT; // config/generate.stat.json
const OLD_JOB_FILE = 'generate_data.json'; // before the config folder existed
const JOB_KEY = 'generate-job';
const PAGE_KEY = 'genpage:';

/** What is saved of a run. Student data is NOT in here: it is read from the workspace again when the run continues. */
export interface Job {
  version: 1;
  id: string;
  startedAt: number;
  updatedAt: number;
  /** changes when the data, a design, the flow or the settings changed since the run began */
  fingerprint: string;
  settings: GenSettings;
  batches: { n: number; parts: Part[]; done: number; state: 'waiting' | 'running' | 'done' }[];
  /** certificate key -> its file path inside output/ */
  paths: Record<string, string>;
  /** certificate key -> why it could not be made */
  failed: Record<string, string>;
  finished: boolean;
}

export const jobTotal = (j: Job) => j.batches.reduce((n, b) => n + b.parts.reduce((m, p) => m + p.keys.length, 0), 0);
export const batchKeys = (b: Job['batches'][number]) => b.parts.flatMap((p) => p.keys);
export const jobDone = (j: Job) => j.batches.reduce((n, b) => n + b.done, 0);

export async function saveJob(job: Job, folder: DirHandle | null, alsoFile: boolean) {
  job.updatedAt = Date.now();
  await putValue(JOB_KEY, job);
  if (alsoFile && folder) {
    try { await writeFileAt(folder, JOB_FILE, JSON.stringify(job, null, 2) + '\n'); } catch { /* the folder may be gone: the browser copy is enough */ }
  }
}

/** The saved run: the browser's copy, else the one in the folder. */
export async function loadJob(folder: DirHandle | null): Promise<Job | null> {
  const mine = await getValue<Job>(JOB_KEY);
  if (mine?.version === 1) return mine;
  if (folder) {
    try {
      const text = (await readTextAt(folder, JOB_FILE)) ?? (await readTextAt(folder, OLD_JOB_FILE));
      const job = text ? (JSON.parse(text) as Job) : null;
      if (job?.version === 1 && Array.isArray(job.batches)) return job;
    } catch { /* not valid: ignore */ }
  }
  return null;
}

export async function clearJob(folder: DirHandle | null) {
  await deleteValue(JOB_KEY);
  await clearPages();
  if (folder) { await removeFileAt(folder, JOB_FILE); await removeFileAt(folder, OLD_JOB_FILE); }
}

// ---- the pages of a half-finished combined PDF -----------------------------------------------------------------

const pageKeys = new Set<string>();
export const putPage = async (batch: number, index: number, bytes: Uint8Array) => {
  const key = `${PAGE_KEY}${batch}:${index}`;
  pageKeys.add(key);
  await putValue(key, bytes);
};
export const getPage = (batch: number, index: number) => getValue<Uint8Array>(`${PAGE_KEY}${batch}:${index}`);
export async function dropPages(batch: number, count: number) {
  for (let i = 0; i < count; i++) { const key = `${PAGE_KEY}${batch}:${i}`; await deleteValue(key); pageKeys.delete(key); }
}
async function clearPages() {
  for (const key of pageKeys) await deleteValue(key);
  pageKeys.clear();
}

// ---- a short hash of everything the run depends on -------------------------------------------------------------

export function hashStrings(parts: string[]): string {
  let h = 0x811c9dc5;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) { h ^= part.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= 0xff; h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// ---- where the files go -----------------------------------------------------------------------------------------

export interface Sink {
  kind: 'folder' | 'zip';
  /** Saves one finished PDF (path inside output/). */
  write(path: string, bytes: Uint8Array): Promise<void>;
  /** A batch is complete (the zip sink downloads it now). */
  batchDone(n: number, label: string): Promise<void>;
}

export function folderSink(root: DirHandle): Sink {
  return {
    kind: 'folder',
    write: (path, bytes) => writeFileAt(root, `output/${path}`, bytes),
    batchDone: async () => {},
  };
}

/** For browsers that cannot write into a folder: each finished batch is downloaded as one zip. */
export async function zipSink(workspaceName: string): Promise<Sink> {
  const { default: JSZip } = await import('jszip');
  let zip = new JSZip();
  return {
    kind: 'zip',
    write: async (path, bytes) => { zip.file(path, bytes); },
    batchDone: async (_n, label) => {
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }); // PDFs are compressed already
      zip = new JSZip();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `${workspaceName} - ${label}.zip` });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },
  };
}
