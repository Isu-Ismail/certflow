import { readConfigs } from './config';
import { DATA_FILE, type Problem } from './inspect';
import { MARKER_PATH, makeMarker, type Marker } from './marker';
import { parseSheetFile } from './parseSheet';
import type { FlowGraph } from '$lib/flow/types';
import type { CombineStep, FolderContents, LoadedWorkspace, Sheet } from './types';

/** The folder cannot be used: what is wrong, file by file. */
export class WorkspaceProblems extends Error {
  constructor(public items: Problem[]) {
    super(items.map((i) => `${i.where}: ${i.text}`).join('\n'));
  }
}

// ---- the older layout (everything in the folder's root, one flow.json) ------------------------------------

/** `flow` key of flow.json, if it looks like a graph. */
function graphFromFlow(flowJson: string | null): FlowGraph | null {
  try {
    const g = JSON.parse(flowJson ?? '{}').flow;
    return g && Array.isArray(g.nodes) && Array.isArray(g.edges) && g.nodes.some((n: { type?: string }) => n.type === 'start') ? g : null;
  } catch {
    return null;
  }
}

/** `data.combine` of flow.json: the extra data files and how they are merged. */
function combineFromFlow(flowJson: string | null): { file: string; step: CombineStep }[] {
  try {
    const list = JSON.parse(flowJson ?? '{}').data?.combine;
    if (!Array.isArray(list)) return [];
    return list.flatMap((c: { file?: string; mode?: string; leftKey?: string; rightKey?: string; keep?: string; rename?: Record<string, string> }) => {
      if (!c || typeof c.file !== 'string') return [];
      const rename = c.rename && typeof c.rename === 'object' ? c.rename : undefined;
      const step: CombineStep =
        c.mode === 'join' ? { mode: 'join', leftKey: String(c.leftKey ?? ''), rightKey: String(c.rightKey ?? ''), keep: c.keep === 'matched' ? 'matched' : 'all', rename }
        : c.mode === 'separate' || c.mode === 'side' ? { mode: 'separate' }
        : { mode: 'stack' };
      return [{ file: c.file, step }];
    });
  } catch {
    return [];
  }
}

/** design -> data list, keeping only lists that exist. */
function designDataFrom(map: unknown, sources: Sheet[]): Record<string, string> {
  if (!map || typeof map !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [design, key] of Object.entries(map)) {
    if (typeof key !== 'string') continue;
    if (key === 'combined') out[design] = key;
    else if (key === 'data.csv' && sources[0] && !sources.some((s) => s.fileName === key)) out[design] = sources[0].fileName;
    else if (sources.some((s) => s.fileName === key)) out[design] = key;
  }
  return out;
}

const legacyJson = (text: string | null): Record<string, any> => { try { return JSON.parse(text ?? '{}') ?? {}; } catch { return {}; } };

/**
 * Reads a folder into a workspace. The layout is
 *   data/<files>.csv|xlsx   designs/<Name>.cert.html   files/*   config/*.json
 * (an older folder with everything in its root, and one flow.json, still loads). Throws WorkspaceProblems when a
 * file cannot be used.
 */
export async function classify(folder: FolderContents): Promise<LoadedWorkspace> {
  const entries = folder.entries;
  const current = entries.some((e) => e.path === MARKER_PATH);
  const direct = (dir: string) => entries.filter((e) => (dir ? e.path.startsWith(dir + '/') && !e.path.slice(dir.length + 1).includes('/') : !e.path.includes('/')));
  const dataEntries = current ? direct('data').filter((e) => DATA_FILE.test(e.path)) : direct('').filter((e) => /\.(csv|tsv|xlsx|xls)$/i.test(e.path));
  const designEntries = (current ? direct('designs') : direct('')).filter((e) => /\.cert\.html$/i.test(e.path));
  const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

  const cfg = await readConfigs(entries);
  const legacyText = !current ? await entries.find((e) => e.path.toLowerCase() === 'flow.json')?.file.text() ?? null : null;
  const old = legacyJson(legacyText);

  // the main data file: the one the config names, else data.csv/xlsx, else the first spreadsheet
  const wanted: string | undefined = cfg.data?.files[0]?.file ?? (typeof old.data?.main === 'string' ? old.data.main : undefined);
  const mainEntry =
    (wanted ? dataEntries.find((e) => nameOf(e.path) === wanted) : undefined) ??
    dataEntries.find((e) => /^data\.(csv|tsv|xlsx|xls)$/i.test(nameOf(e.path))) ??
    dataEntries[0];

  const problems: Problem[] = [];
  const read = async (entry: FolderContents['entries'][number]): Promise<Sheet | null> => {
    try {
      return await parseSheetFile(new File([entry.file], nameOf(entry.path)));
    } catch (e) {
      problems.push({ where: entry.path, text: `It cannot be read as a table (${e instanceof Error ? e.message : String(e)}).` });
      return null;
    }
  };

  const sources: Sheet[] = [];
  const combine: CombineStep[] = [];
  const main = mainEntry ? await read(mainEntry) : null;
  if (main) {
    sources.push(main);
    const extras = cfg.data ? cfg.data.files.slice(1).map((f) => ({ file: f.file, step: f.merge ?? ({ mode: 'stack' } as CombineStep) })) : combineFromFlow(legacyText);
    for (const c of extras) {
      const entry = dataEntries.find((e) => nameOf(e.path) === c.file && e !== mainEntry);
      if (!entry) continue; // listed but missing from the folder
      const sheet = await read(entry);
      if (sheet) { sources.push(sheet); combine.push(c.step); }
    }
  }

  const designs: { name: string; html: string }[] = [];
  for (const e of designEntries) designs.push({ name: nameOf(e.path).replace(/\.cert\.html$/i, ''), html: await e.file.text() });
  if (problems.length) throw new WorkspaceProblems(problems);

  const files = entries.filter((e) => e.path.startsWith('files/') && e.path.length > 6).map((e) => ({ name: e.path.slice(6), blob: e.file as Blob }));

  // the identity column of each data file
  const identity: Record<string, string> = {};
  if (cfg.data) { for (const f of cfg.data.files) if (f.identity) identity[f.file] = f.identity; }
  else Object.assign(identity, old.data?.identity ?? {});
  for (const s of sources) { const col = identity[s.fileName]; if (typeof col === 'string' && s.columns.includes(col)) s.identity = col; }

  let marker: Marker | null = null;
  if (current) {
    try { marker = JSON.parse(await entries.find((e) => e.path === MARKER_PATH)!.file.text()); } catch { /* checked before */ }
  } else marker = await makeMarker(); // an older folder becomes a workspace the first time it is saved

  return {
    name: folder.name,
    sources,
    combine,
    designData: cfg.design ? designDataFrom(cfg.design.data, sources) : designDataFrom(old.data?.designs, sources),
    designs,
    flowJson: null,
    fieldMap: cfg.design ? cfg.design.fields : (old.fields && typeof old.fields === 'object' ? old.fields : {}),
    flow: cfg.flow ?? graphFromFlow(legacyText),
    genConfig: cfg.generate,
    marker,
    files,
  };
}
