// What a workspace remembers, one file per area, in the folder `config/`:
//   data.config.json      the data files, how they are merged, the identity column of each
//   design.config.json    which data each design uses, and the field -> column mapping
//   flow.config.json      the flow (nodes and connections)
//   generate.config.json  the options of the Generate step
//   generate.stat.json    the progress of a run (written by Generate, see lib/generate/job.ts)
import type { FlowGraph } from '$lib/flow/types';
import { MARKER_PATH } from './marker';
import type { CombineStep, FolderContents, LoadedWorkspace, Sheet } from './types';

export const CONFIG_DIR = 'config';
export const DATA_CONFIG = `${CONFIG_DIR}/data.config.json`;
export const DESIGN_CONFIG = `${CONFIG_DIR}/design.config.json`;
export const FLOW_CONFIG = `${CONFIG_DIR}/flow.config.json`;
export const GENERATE_CONFIG = `${CONFIG_DIR}/generate.config.json`;
export const GENERATE_STAT = `${CONFIG_DIR}/generate.stat.json`;

const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

/** The config files to write for a workspace. `fileOf` turns a data list key into the file name used in the folder. */
export function configFiles(w: LoadedWorkspace, data: { file: string; sheet: Sheet; index: number }[], fileOf: (key: string) => string): [string, string][] {
  const out: [string, string][] = [];
  if (w.marker) out.push([MARKER_PATH, json(w.marker)]);
  if (data.length) {
    out.push([DATA_CONFIG, json({
      version: 1,
      files: data.map((d) => ({
        file: d.file,
        ...(d.sheet.identity ? { identity: d.sheet.identity } : {}),
        ...(d.index > 0 ? { merge: w.combine[d.index - 1] ?? { mode: 'stack' } } : {}),
      })),
    })]);
  }
  const designs = Object.fromEntries(Object.entries(w.designData).filter(([d]) => w.designs.some((x) => x.name === d)).map(([d, k]) => [d, fileOf(k)]));
  if (Object.keys(w.fieldMap).length || Object.keys(designs).length) out.push([DESIGN_CONFIG, json({ version: 1, fields: w.fieldMap, data: designs })]);
  if (w.flow) {
    const nodes = w.flow.nodes.map((n) => (n.type === 'start' && n.source ? { ...n, source: fileOf(n.source) } : n));
    out.push([FLOW_CONFIG, json({ version: 1, flow: { ...w.flow, nodes } })]);
  }
  if (w.genConfig) out.push([GENERATE_CONFIG, json({ version: 1, ...w.genConfig })]);
  return out;
}

export interface ReadConfig {
  data: { files: { file: string; identity?: string; merge?: CombineStep }[] } | null;
  design: { fields: Record<string, string>; data: Record<string, string> } | null;
  flow: FlowGraph | null;
  generate: Record<string, unknown> | null;
}

async function readJson(entries: FolderContents['entries'], path: string): Promise<Record<string, any> | null> {
  const e = entries.find((x) => x.path === path);
  if (!e) return null;
  try {
    const v = JSON.parse(await e.file.text());
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null; // not valid JSON: ignored
  }
}

const step = (m: any): CombineStep =>
  m?.mode === 'join'
    ? { mode: 'join', leftKey: String(m.leftKey ?? ''), rightKey: String(m.rightKey ?? ''), keep: m.keep === 'matched' ? 'matched' : 'all', rename: m.rename && typeof m.rename === 'object' ? m.rename : undefined }
    : m?.mode === 'separate' || m?.mode === 'side' ? { mode: 'separate' } : { mode: 'stack' };

/** Reads the config files of a folder (any of them may be missing). */
export async function readConfigs(entries: FolderContents['entries']): Promise<ReadConfig> {
  const [d, de, f, g] = await Promise.all([readJson(entries, DATA_CONFIG), readJson(entries, DESIGN_CONFIG), readJson(entries, FLOW_CONFIG), readJson(entries, GENERATE_CONFIG)]);
  const graph = f?.flow;
  const { version: _v, ...generate } = g ?? {};
  return {
    data: d && Array.isArray(d.files)
      ? { files: d.files.filter((x: any) => x && typeof x.file === 'string').map((x: any) => ({ file: x.file, identity: typeof x.identity === 'string' ? x.identity : undefined, merge: x.merge ? step(x.merge) : undefined })) }
      : null,
    design: de ? { fields: de.fields && typeof de.fields === 'object' ? de.fields : {}, data: de.data && typeof de.data === 'object' ? de.data : {} } : null,
    flow: graph && Array.isArray(graph.nodes) && Array.isArray(graph.edges) && graph.nodes.some((n: any) => n.type === 'start') ? graph : null,
    generate: g ? generate : null,
  };
}
