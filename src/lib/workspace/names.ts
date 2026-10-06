/** A design name (no extension) that is safe as a file name. */
export const cleanName = (s: string) => s.replace(/\.cert\.html$/i, '').replace(/[\\/:*?"<>|]/g, '-').trim();

/** A file name for files/ — no path characters and no spaces (spaces break unquoted CSS url()). */
export const cleanFileName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').trim().replace(/^\.{1,2}$/, '-');

/** `base`, or `base 2`, `base 3`… when the name is taken (case-insensitive). */
export function uniqueName(base: string, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  const root = base || 'Untitled';
  let name = root;
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${root} ${n}`;
  return name;
}

/** `logo.png`, or `logo-2.png`, `logo-3.png`… when taken (case-insensitive), keeping the extension. */
export function uniqueFileName(name: string, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  let out = name;
  for (let n = 2; used.has(out.toLowerCase()); n++) out = `${stem}-${n}${ext}`;
  return out;
}
