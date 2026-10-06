// Turns what the flow decided into the list of certificates to make, with their ids and folders.
import type { FlowResult } from '$lib/flow/types';
import type { Sheet } from '$lib/workspace/types';
import { identityColumn } from '$lib/workspace/identity';
import { cleanSegment, guessGroupColumn, type GenItem, type GenSettings } from './plan';

export interface ListConfig {
  /** column whose value names the file ('' = row numbers) */
  idColumn: string;
  /** column that makes sub-folders ('' = none) */
  groupColumn: string;
  /** true when the id column was found automatically */
  idAuto: boolean;
  groupAuto: boolean;
}

/** How each data list in the run is read: its id column and its group column, from the settings or found automatically. */
export function listConfigs(lists: Map<string, Sheet>, s: GenSettings): Map<string, ListConfig> {
  const out = new Map<string, ListConfig>();
  for (const [key, sheet] of lists) {
    const chosenId = s.idColumns[key];
    const idAuto = !chosenId || !sheet.columns.includes(chosenId);
    const idColumn = idAuto ? identityColumn(sheet) : chosenId;
    let groupColumn = '';
    let groupAuto = false;
    if (s.group === 'auto') { groupColumn = guessGroupColumn(sheet, idColumn); groupAuto = true; }
    else if (s.group === 'custom') {
      const g = s.groupColumns[key] ?? '';
      groupColumn = sheet.columns.includes(g) ? g : '';
    }
    out.set(key, { idColumn, groupColumn, idAuto, groupAuto });
  }
  return out;
}

export interface Built {
  items: GenItem[];
  configs: Map<string, ListConfig>;
  skipped: number;
  unassigned: number;
}

const stem = (name: string) => name.replace(/\.[^.]+$/, '');

export function buildItems(result: FlowResult, sheetOf: (key: string) => Sheet | null, s: GenSettings): Built {
  const used = new Map<string, Sheet>();
  for (const r of result.rows) {
    if (r.outcome.kind !== 'design' || used.has(r.source)) continue;
    const sheet = sheetOf(r.source);
    if (sheet) used.set(r.source, sheet);
  }
  const configs = listConfigs(used, s);
  const several = used.size > 1;
  const byList = s.group === 'auto' ? several : s.group === 'custom' && s.groupByList;

  const items: GenItem[] = [];
  for (const r of result.rows) {
    if (r.outcome.kind !== 'design') continue;
    const sheet = used.get(r.source);
    const cfg = configs.get(r.source);
    if (!sheet || !cfg) continue;
    const row = sheet.rows[r.row];
    if (!row) continue;
    const id = cfg.idColumn ? (row[cfg.idColumn] ?? '').trim() : `row-${r.row + 1}`;
    const group: string[] = [];
    if (s.group !== 'none') {
      if (byList) group.push(cleanSegment(stem(r.source)));
      if (cfg.groupColumn) group.push(cleanSegment((row[cfg.groupColumn] ?? '').trim()));
    }
    items.push({ key: `${r.source}::${cfg.idColumn ? id : `row-${r.row + 1}`}`, list: r.source, row: r.row, design: r.outcome.design, id: id, group, path: r.path });
  }
  return { items, configs, skipped: result.skipped.length, unassigned: result.unassigned.length };
}
