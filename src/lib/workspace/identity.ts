// The identity column of a data file: the column that says who a row is (a roll number, a registration number…).
// Its values are all different, so it can name people everywhere and name their files.
import type { Row, Sheet } from './types';

const ID_HINT = /(roll|reg|admission|enrol|student|emp|member|serial|ticket|uid|id\b|\bno\b|number)/i;

export interface IdentityProblems {
  /** rows with no value */
  empty: number;
  /** values that appear more than once, with how many times */
  repeated: { value: string; count: number }[];
}

export function identityProblems(rows: Row[], column: string): IdentityProblems {
  const counts = new Map<string, number>();
  let empty = 0;
  for (const r of rows) {
    const v = (r[column] ?? '').trim();
    if (!v) { empty++; continue; }
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return { empty, repeated: [...counts].filter(([, n]) => n > 1).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count) };
}

/** True when every row has a value and no value repeats. */
export const isIdentity = (sheet: Sheet, column: string) => sheet.rows.length > 0 && sheet.columns.includes(column) && (() => {
  const p = identityProblems(sheet.rows, column);
  return p.empty === 0 && p.repeated.length === 0;
})();

/** Columns that could be the identity (all different, none empty). */
export const identityCandidates = (sheet: Sheet) => sheet.columns.filter((c) => isIdentity(sheet, c));

/** The best guess: a candidate whose name looks like an id, else the first candidate. '' = no column qualifies. */
export function guessIdentity(sheet: Sheet): string {
  const ok = identityCandidates(sheet);
  return ok.find((c) => ID_HINT.test(c)) ?? ok[0] ?? '';
}

const cache = new WeakMap<Sheet, string>(); // sheets are replaced, never changed, so this stays right

/** The identity column to use: the one chosen (if it still qualifies), else the guess. '' = none (rows are numbered). */
export function identityColumn(sheet: Sheet): string {
  let col = cache.get(sheet);
  if (col === undefined) {
    col = sheet.identity && isIdentity(sheet, sheet.identity) ? sheet.identity : guessIdentity(sheet);
    cache.set(sheet, col);
  }
  return col;
}

/** The column to show as a person's name: the identity column, or (when there is none) the first column. */
export function labelColumn(sheet: Sheet): string {
  return identityColumn(sheet) || sheet.columns[0] || '';
}

/** A short name for a row, for messages and lists. */
export function rowLabel(sheet: Sheet | null | undefined, index: number): string {
  const col = sheet ? labelColumn(sheet) : '';
  return (sheet && col && (sheet.rows[index]?.[col] ?? '').trim()) || `row ${index + 1}`;
}
