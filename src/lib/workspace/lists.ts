// The data lists a design (or a flow's data node) can be bound to: the merged table (when something is merged) and each data file.
import type { Combined } from './combine';
import type { CombineStep, Sheet } from './types';

export interface DataList {
  /** 'combined', or the data file's name */
  key: string;
  label: string;
  sheet: Sheet;
}

export const COMBINED_KEY = 'combined';

export function buildLists(sources: Sheet[], combined: Combined | null, steps: CombineStep[]): DataList[] {
  const lists: DataList[] = sources.map((sheet) => ({ key: sheet.fileName, label: sheet.fileName, sheet }));
  if (combined && steps.some((s) => s.mode !== 'separate')) lists.unshift({ key: COMBINED_KEY, label: 'Combined', sheet: combined.sheet });
  return lists;
}
