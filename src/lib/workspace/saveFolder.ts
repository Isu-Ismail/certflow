import { configFiles } from './config';
import { sheetToCsv, sheetToXlsx } from './parseSheet';
import type { LoadedWorkspace } from './types';

export const DATA_DIR = 'data';
export const DESIGN_DIR = 'designs';

/** The file name of every data file inside data/: its own name, with its own kind of extension (.csv or .xlsx), made unique. */
function dataFiles(w: LoadedWorkspace) {
  const used = new Set<string>();
  return w.sources.map((sheet, index) => {
    const stem = sheet.fileName.replace(/\.[^.]+$/, '') || `data ${index + 1}`;
    const xlsx = sheet.format === 'xlsx' ? sheetToXlsx(sheet) : null; // null while the Excel library is still loading
    const ext = xlsx ? 'xlsx' : 'csv';
    let file = `${stem}.${ext}`;
    for (let n = 2; used.has(file.toLowerCase()); n++) file = `${stem} ${n}.${ext}`;
    used.add(file.toLowerCase());
    return { file, sheet, index, content: xlsx ?? sheetToCsv(sheet) };
  });
}

/**
 * Every file the workspace folder should contain, as [relative path, content]:
 *   data/<files>.csv|xlsx, designs/<Name>.cert.html, files/*, config/{workspace,data,design,flow,generate}.*.json
 */
export function workspaceFiles(w: LoadedWorkspace): [string, Blob | string][] {
  const out: [string, Blob | string][] = [];
  const data = dataFiles(w);
  for (const d of data) out.push([`${DATA_DIR}/${d.file}`, d.content]);
  for (const d of w.designs) out.push([`${DESIGN_DIR}/${d.name}.cert.html`, d.html]);
  // file name of each data list inside data/
  const fileOf = (key: string) => (key === 'combined' ? key : (data.find((e) => e.sheet.fileName === key)?.file ?? key));
  out.push(...configFiles(w, data, fileOf));
  for (const f of w.files) out.push([`files/${f.name}`, f.blob]);
  return out;
}

export async function downloadZip(w: LoadedWorkspace) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const folder = zip.folder(w.name.replace(/[\\/:*?"<>|]/g, '-') || 'workspace')!;
  for (const [path, data] of workspaceFiles(w)) folder.file(path, data);
  const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `${w.name || 'workspace'}.zip` });
  a.click();
  URL.revokeObjectURL(url);
}
