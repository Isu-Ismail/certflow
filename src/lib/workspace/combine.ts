// Merges the workspace's data files into the one table that designs, flow and export use.
//   stack: the rows of another file are added below (same kind of data, different people).
//   join:  the columns of another file are added to rows that share a key value (same people, other columns).
//   separate: not merged at all; the file stays its own list.
// A column that already exists exactly (same case) is renamed `<file>.<Column>`, or to a name the user chose.
import type { CombineStep, Row, Sheet } from './types';

/** A combined row came from `source` (index into the data files), row `row` of that file. */
export interface Origin { source: number; row: number }

export interface JoinReport {
  /** index of the data file that was joined in */
  source: number;
  matched: number;
  /** rows of the table so far that found no partner */
  unmatched: Row[];
  /** partners that were never used */
  unusedPartners: number;
  /** keys that appear more than once in the joined file (first one wins) */
  duplicateKeys: string[];
  /** set when the step could not run (a key column is missing) */
  problem: string | null;
}

export interface Combined {
  sheet: Sheet;
  origins: Origin[];
  /** where each column came from: a data file index, or -1 for the added `Source` column */
  columnSource: Map<string, number>;
  /** indices of combined rows that found no partner in a join */
  unmatchedRows: Set<number>;
  reports: JoinReport[];
  /** `{file.Column}` names that read a column of one data file (joined files and the main file) */
  aliases: Record<string, string>;
}

export const SOURCE_COLUMN = 'Source';

/** Key matching ignores case, extra spaces and leading zeros of plain numbers. */
export function normKey(v: string | undefined): string {
  const t = (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return /^\d+$/.test(t) ? t.replace(/^0+(?=\d)/, '') : t;
}

export const stem = (fileName: string) => fileName.replace(/\.[^.]+$/, '');

/** The name a new column gets: the wanted name, or `<file>.<name>` (then numbered) while that name is taken. */
function freeName(want: string, taken: Set<string>, file: string): string {
  if (!taken.has(want)) return want;
  const base = `${stem(file)}.${want}`;
  let out = base;
  for (let n = 2; taken.has(out); n++) out = `${base} ${n}`;
  return out;
}

/** Columns of `src` (except `skip`) whose exact name is already in `existing`: they need another name. */
export const columnConflicts = (existing: string[], src: Sheet, skip?: string) =>
  src.columns.filter((c) => c !== skip && existing.includes(c));

/** The final name of each added column of `src`. */
export function addedNames(existing: string[], src: Sheet, skip: string | undefined, rename: Record<string, string> | undefined) {
  const taken = new Set(existing);
  return src.columns
    .filter((c) => c !== skip)
    .map((from) => {
      const want = rename?.[from]?.trim() || from;
      const to = freeName(want, taken, src.fileName);
      taken.add(to);
      return { from, to };
    });
}

export function combineSources(sources: Sheet[], steps: CombineStep[]): Combined | null {
  const first = sources[0];
  if (!first) return null;

  let columns = [...first.columns];
  let rows: Row[] = first.rows.map((r) => ({ ...r }));
  let origins: Origin[] = first.rows.map((_, row) => ({ source: 0, row }));
  const columnSource = new Map<string, number>(columns.map((c) => [c, 0]));
  const reports: JoinReport[] = [];
  const unmatched = new Set<Row>();
  const aliases: Record<string, string> = Object.fromEntries(first.columns.map((c) => [`${stem(first.fileName)}.${c}`, c]));
  let stacked = false;

  for (let i = 1; i < sources.length; i++) {
    const src = sources[i];
    const step: CombineStep = steps[i - 1] ?? { mode: 'stack' };

    if (step.mode === 'separate') continue; // its own list, not part of the table

    if (step.mode === 'stack') {
      stacked = true;
      for (const c of src.columns) if (!columnSource.has(c)) { columns.push(c); columnSource.set(c, i); }
      src.rows.forEach((r, row) => {
        rows.push(Object.fromEntries(columns.map((c) => [c, r[c] ?? ''])));
        origins.push({ source: i, row });
      });
      continue;
    }

    const report: JoinReport = { source: i, matched: 0, unmatched: [], unusedPartners: 0, duplicateKeys: [], problem: null };
    reports.push(report);

    // join
    if (!columns.includes(step.leftKey)) { report.problem = `The table has no column “${step.leftKey}”.`; continue; }
    if (!src.columns.includes(step.rightKey)) { report.problem = `${src.fileName} has no column “${step.rightKey}”.`; continue; }

    const partners = new Map<string, Row>();
    const dup = new Set<string>();
    for (const r of src.rows) {
      const k = normKey(r[step.rightKey]);
      if (!k) continue;
      if (partners.has(k)) dup.add(r[step.rightKey]);
      else partners.set(k, r);
    }
    report.duplicateKeys = [...dup];

    const added = addedNames(columns, src, step.rightKey, step.rename);
    for (const a of added) { columns.push(a.to); columnSource.set(a.to, i); aliases[`${stem(src.fileName)}.${a.from}`] = a.to; }
    aliases[`${stem(src.fileName)}.${step.rightKey}`] = step.leftKey;

    const used = new Set<string>();
    const nextRows: Row[] = [];
    const nextOrigins: Origin[] = [];
    rows.forEach((row, n) => {
      const k = normKey(row[step.leftKey]);
      const partner = k ? partners.get(k) : undefined;
      if (partner) { used.add(k); report.matched++; for (const a of added) row[a.to] = partner[a.from] ?? ''; }
      else { for (const a of added) row[a.to] = ''; report.unmatched.push(row); unmatched.add(row); }
      if (partner || step.keep === 'all') { nextRows.push(row); nextOrigins.push(origins[n]); }
    });
    rows = nextRows;
    origins = nextOrigins;
    report.unusedPartners = partners.size - used.size;
  }

  if (stacked && !columnSource.has(SOURCE_COLUMN)) {
    columns = [...columns, SOURCE_COLUMN];
    columnSource.set(SOURCE_COLUMN, -1);
    rows.forEach((r, n) => { r[SOURCE_COLUMN] = sources[origins[n].source].fileName; });
  }

  const unmatchedRows = new Set<number>();
  rows.forEach((r, n) => { if (unmatched.has(r)) unmatchedRows.add(n); });
  return { sheet: { fileName: steps.some((st) => st.mode !== 'separate') && sources.length > 1 ? 'combined data' : first.fileName, columns, rows, identity: first.identity && columns.includes(first.identity) ? first.identity : undefined }, origins, columnSource, unmatchedRows, reports, aliases };
}

const ID_NAME = /(roll|reg|admission|enrol|student|emp|member|serial|ticket|uid|id\b|\bno\b|number)/i;

/**
 * The columns that identify the same person in two data lists: a column both have (same name, ignoring case and
 * spaces), preferring ones that look like an id and that are different for everyone in the target.
 */
export function matchColumns(a: Sheet, b: Sheet): { from: string; to: string } | null {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const byName = new Map(b.columns.map((c) => [norm(c), c]));
  let best: { from: string; to: string } | null = null;
  let bestScore = -1;
  for (const from of a.columns) {
    const to = byName.get(norm(from));
    if (!to) continue;
    const values = b.rows.map((r) => normKey(r[to])).filter(Boolean);
    const unique = new Set(values).size === values.length && values.length > 0;
    const score = (ID_NAME.test(from) ? 2 : 0) + (unique ? 3 : 0);
    if (score > bestScore) { best = { from, to }; bestScore = score; }
  }
  return best;
}
