// Is this folder a CertFlow workspace, and are its files good enough to use? Checked before anything is loaded.
import { DATA_CONFIG, DESIGN_CONFIG, FLOW_CONFIG, GENERATE_CONFIG } from './config';
import { MARKER_PATH, markerProblem, type Marker } from './marker';
import type { FolderContents } from './types';

export interface Problem { where: string; text: string }
/** workspace = has its mark; legacy = the older layout without one; empty = nothing in it; foreign = someone else's files */
export type FolderKind = 'workspace' | 'legacy' | 'empty' | 'foreign';
export interface Inspection { kind: FolderKind; problems: Problem[]; warnings: Problem[]; marker: Marker | null }

export const DATA_FILE = /\.(csv|tsv|txt|xlsx|xls|xlsm|ods)$/i;
const TOP = new Set(['data', 'designs', 'files', 'config', 'output']);
const PORT = /^(out|true|false|y\d+)$/;
const OPERATORS = ['is', 'is not', 'contains', 'does not contain', 'starts with', 'ends with', '>', '>=', '<', '<=', 'is empty', 'is not empty'];

type Json = Record<string, any>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const stringMap = (v: unknown) => isObj(v) && Object.values(v).every(isStr);

// ---- one validator per config file: returns the problems found ----------------------------------------------

function dataConfig(o: Json): string[] {
  const out: string[] = [];
  if (o.version !== 1) out.push(`"version" must be 1 (it is ${JSON.stringify(o.version)}).`);
  if (!Array.isArray(o.files)) return [...out, '"files" must be a list.'];
  o.files.forEach((f: any, i: number) => {
    if (!isObj(f) || !isStr(f.file) || !f.file || f.file.includes('/')) {
      out.push(`files[${i}] needs a "file" name (a file inside data/).`);
      return;
    }
    if (f.identity !== undefined && !isStr(f.identity)) out.push(`files[${i}].identity must be text.`);
    if (f.merge !== undefined) {
      const m = f.merge;
      if (!isObj(m) || !['stack', 'join', 'separate', 'side'].includes(m.mode)) out.push(`files[${i}].merge.mode must be stack, join or separate.`);
      else if (m.mode === 'join' && (!isStr(m.leftKey) || !isStr(m.rightKey))) out.push(`files[${i}].merge needs "leftKey" and "rightKey" for a join.`);
    }
  });
  return out;
}

function designConfig(o: Json): string[] {
  const out: string[] = [];
  if (o.version !== 1) out.push(`"version" must be 1 (it is ${JSON.stringify(o.version)}).`);
  if (!stringMap(o.fields)) out.push('"fields" must map each field name to a column name (text).');
  if (!stringMap(o.data)) out.push('"data" must map each design name to a data file name (text).');
  return out;
}

function flowConfig(o: Json): string[] {
  const out: string[] = [];
  if (o.version !== 1) out.push(`"version" must be 1 (it is ${JSON.stringify(o.version)}).`);
  const g = o.flow;
  if (!isObj(g) || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) return [...out, '"flow" needs a list of "nodes" and a list of "edges".'];
  const ids = new Set<string>();
  let starts = 0;
  for (const [i, n] of g.nodes.entries()) {
    if (!isObj(n) || !isStr(n.id) || !n.id) { out.push(`nodes[${i}] has no "id".`); continue; }
    if (ids.has(n.id)) out.push(`The node id "${n.id}" is used twice.`);
    ids.add(n.id);
    if (typeof n.x !== 'number' || typeof n.y !== 'number') out.push(`Node "${n.id}" needs numbers "x" and "y".`);
    if (n.type === 'start') starts++;
    else if (n.type === 'design') { if (!isStr(n.design)) out.push(`Design node "${n.id}" needs a "design" name.`); }
    else if (n.type === 'condition') {
      if (!['all', 'any', 'each'].includes(n.match)) out.push(`Condition "${n.id}": "match" must be all, any or each.`);
      if (!Array.isArray(n.clauses) || !n.clauses.length) out.push(`Condition "${n.id}" needs a list of "clauses".`);
      else for (const [k, c] of n.clauses.entries()) if (!isObj(c) || !isStr(c.column) || !OPERATORS.includes(c.op) || !isStr(c.value)) out.push(`Condition "${n.id}", clause ${k + 1}: needs "column", a valid "op" and "value".`);
    } else if (n.type !== 'skip') out.push(`Node "${n.id}" has an unknown type (${JSON.stringify(n.type)}).`);
  }
  if (!starts) out.push('The flow has no "start" (data) node.');
  for (const [i, e] of g.edges.entries()) {
    if (!isObj(e) || !isStr(e.from) || !isStr(e.to) || !isStr(e.port)) { out.push(`edges[${i}] needs "from", "port" and "to".`); continue; }
    if (!ids.has(e.from) || !ids.has(e.to)) out.push(`Edge ${i + 1} points at a node that does not exist (${e.from} -> ${e.to}).`);
    if (!PORT.test(e.port)) out.push(`Edge ${i + 1} has an unknown port "${e.port}".`);
  }
  return out;
}

function generateConfig(o: Json): string[] {
  const out: string[] = [];
  const num = (k: string, min: number) => { if (o[k] !== undefined && !(typeof o[k] === 'number' && o[k] >= min)) out.push(`"${k}" must be a number of at least ${min}.`); };
  const one = (k: string, set: unknown[]) => { if (o[k] !== undefined && !set.includes(o[k])) out.push(`"${k}" must be one of ${set.join(', ')}.`); };
  num('batchSize', 1); num('buffer', 0);
  one('renderer', ['browser', 'html2canvas']);
  if (o.selectableText !== undefined && typeof o.selectableText !== 'boolean') out.push('"selectableText" must be true or false.');
  one('format', ['separate', 'combined']); one('group', ['none', 'auto', 'custom']); one('quality', [1, 2, 3]);
  for (const k of ['idColumns', 'groupColumns']) if (o[k] !== undefined && !stringMap(o[k])) out.push(`"${k}" must map data file names to column names.`);
  if (o.moves !== undefined && !(isObj(o.moves) && Object.values(o.moves).every((v) => typeof v === 'number'))) out.push('"moves" must map group names to batch numbers.');
  return out;
}

const VALIDATORS: [string, (o: Json) => string[]][] = [
  [DATA_CONFIG, dataConfig],
  [DESIGN_CONFIG, designConfig],
  [FLOW_CONFIG, flowConfig],
  [GENERATE_CONFIG, generateConfig],
];

// ---- the folder as a whole -------------------------------------------------------------------------------------

export async function inspectEntries(entries: FolderContents['entries']): Promise<Inspection> {
  const problems: Problem[] = [];
  const warnings: Problem[] = [];
  const paths = entries.map((e) => e.path);
  const byPath = new Map(entries.map((e) => [e.path, e.file]));

  if (!paths.length) return { kind: 'empty', problems, warnings, marker: null };

  const hasMarker = paths.includes(MARKER_PATH);
  const legacy = !hasMarker && paths.some((p) => p === 'flow.json' || /^[^/]+\.cert\.html$/i.test(p) || /^[^/]+\.(csv|tsv|xlsx|xls)$/i.test(p));
  const kind: FolderKind = hasMarker ? 'workspace' : legacy ? 'legacy' : 'foreign';

  const readJson = async (path: string): Promise<Json | null> => {
    try {
      const v = JSON.parse(await byPath.get(path)!.text());
      if (!isObj(v)) { problems.push({ where: path, text: 'It must be a JSON object ({ … }).' }); return null; }
      return v;
    } catch (e) {
      problems.push({ where: path, text: `It is not valid JSON (${e instanceof Error ? e.message : 'syntax error'}).` });
      return null;
    }
  };

  const parsed = new Map<string, Json>();
  let marker: Marker | null = null;
  if (kind === 'workspace') {
    const m = await readJson(MARKER_PATH);
    if (m) {
      const bad = await markerProblem(m);
      if (bad) problems.push({ where: MARKER_PATH, text: `${bad} CertFlow only uses folders it made itself.` });
      else marker = m as unknown as Marker;
    }
    for (const [path, validate] of VALIDATORS) {
      if (!byPath.has(path)) continue;
      const o = await readJson(path);
      if (o) { parsed.set(path, o); for (const text of validate(o)) problems.push({ where: path, text }); }
    }
    // what is in each folder
    for (const p of paths) {
      const [top, ...rest] = p.split('/');
      if (!TOP.has(top)) warnings.push({ where: p, text: 'This is not part of a workspace, so it is ignored.' });
      else if (top === 'data' && rest.length === 1 && !DATA_FILE.test(rest[0])) warnings.push({ where: p, text: 'This is not a CSV or Excel file, so it is ignored.' });
      else if (top === 'data' && rest.length > 1) warnings.push({ where: p, text: 'Data files must sit directly in data/, so it is ignored.' });
      else if (top === 'designs' && rest.length === 1 && !/\.cert\.html$/i.test(rest[0])) warnings.push({ where: p, text: 'Designs must end in .cert.html, so it is ignored.' });
    }
    for (const p of paths) {
      if (/^designs\/[^/]+\.cert\.html$/i.test(p) && (await byPath.get(p)!.text()).trim().length < 10) problems.push({ where: p, text: 'The design file is empty.' });
    }
    // the data files named in data.config.json must exist
    const dc = parsed.get(DATA_CONFIG);
    if (dc && Array.isArray(dc.files)) {
      for (const f of dc.files) if (isObj(f) && isStr(f.file) && !paths.includes(`data/${f.file}`)) problems.push({ where: DATA_CONFIG, text: `It lists “${f.file}”, but there is no such file in data/.` });
    }
  } else if (kind === 'legacy' && byPath.has('flow.json')) {
    await readJson('flow.json');
  }

  return { kind, problems, warnings, marker };
}
