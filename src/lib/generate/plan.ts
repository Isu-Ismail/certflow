// Pure planning for a generate run: who gets a certificate, how they are grouped, how the groups are cut into batches
// and what each file is called. No UI and no store in here, so it can be reasoned about (and tested) on its own.
import type { Row, Sheet } from '$lib/workspace/types';

export interface GenSettings {
  /** Certificates per batch. */
  batchSize: number;
  /** A single group may go over the batch size by this much to stay in one batch. */
  buffer: number;
  /** One PDF per student, or one PDF per batch (per design, per group). */
  format: 'separate' | 'combined';
  /** none = no sub-folders, auto = found from the data, custom = the columns chosen below. */
  group: 'none' | 'auto' | 'custom';
  /** For `custom`: per data list, the column to group by ('' = do not group that list). */
  groupColumns: Record<string, string>;
  /** For `custom`: put each data list in its own folder first. */
  groupByList: boolean;
  /** Keep a group in one batch when it fits. */
  keepGroups: boolean;
  /** Per data list, the column whose value names the file ('' = found automatically). */
  idColumns: Record<string, string>;
  /** File path pattern; '' = the default for the chosen format. */
  pattern: string;
  /** Group name -> the batch number it was moved to by hand. */
  moves: Record<string, number>;
  /** How sharp the page is drawn: 1 = draft, 2 = standard (about 200 dpi), 3 = high. */
  quality: 1 | 2 | 3;
  /** Who draws the page: the browser itself (exact), or the older html2canvas. */
  renderer: 'browser' | 'html2canvas';
  /** Put the page's text into the PDF too (invisible, over the picture) so it can be selected, searched and copied. */
  selectableText: boolean;
}

export const DEFAULT_SETTINGS: GenSettings = {
  batchSize: 50,
  buffer: 10,
  format: 'separate',
  group: 'none',
  groupColumns: {},
  groupByList: true,
  keepGroups: true,
  idColumns: {},
  pattern: '',
  moves: {},
  quality: 2,
  renderer: 'browser',
  selectableText: true,
};

export const defaultPattern = (format: GenSettings['format']) => (format === 'separate' ? 'batch-{batch}/{group}/{id}.pdf' : 'batch-{batch}/{group}/{design}.pdf');

/** One certificate to make. */
export interface GenItem {
  /** `${list}::${id}`: stable across runs while the data does not change */
  key: string;
  list: string;
  row: number;
  design: string;
  id: string;
  /** folder levels, e.g. ['classb.csv', 'Team 9'] */
  group: string[];
  /** the nodes of the flow this person went through */
  path: string[];
}

export interface Part { group: string; keys: string[] }
export interface PlanBatch { n: number; parts: Part[] }

export const groupKey = (g: string[]) => g.join(' / ');

/** Characters that cannot be in a file or folder name are replaced; empty names become `fallback`. */
export function cleanSegment(s: string, fallback = '(none)'): string {
  const t = s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').slice(0, 80).trim();
  return t || fallback;
}

// ---- finding columns ------------------------------------------------------------------------------------------

const GROUP_HINT = /(team|group|class|section|batch|dept|department|house|division|category|year|course|club|lab)/i;
const ID_HINT = /(roll|reg|admission|enrol|student|emp|member|serial|ticket|uid|id\b|\bno\b|number)/i;

/** The best column to put folders by: values repeat (a few distinct values), and most rows have one. '' = none fits. */
export function guessGroupColumn(sheet: Sheet, skip = ''): string {
  const n = sheet.rows.length;
  if (n < 2) return '';
  let best = '';
  let bestScore = 0;
  for (const c of sheet.columns) {
    if (c === skip) continue;
    const counts = new Map<string, number>();
    let filled = 0;
    for (const r of sheet.rows) {
      const v = (r[c] ?? '').trim();
      if (!v) continue;
      filled++;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const distinct = counts.size;
    if (filled < n * 0.8 || distinct < 2 || distinct > Math.max(2, n / 2) || distinct > 60) continue; // all the same, or nearly all different
    let score = 10 - Math.min(9, Math.abs(Math.log2(distinct) - 2)); // a handful of groups is best
    if (GROUP_HINT.test(c)) score += 6;
    if (ID_HINT.test(c) && !GROUP_HINT.test(c)) score -= 5;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}

// ---- batches --------------------------------------------------------------------------------------------------

/**
 * Cuts the items into batches. Items are kept in order; with `keepGroups` the groups (folders) stay whole:
 * small groups are packed together up to `size`, a group up to `size + buffer` gets its own batch if it does not fit,
 * a bigger group is cut into chunks of `size` and the last chunk takes the rest (so 105 = 50 + 55, 112 = 50 + 50 + 12).
 */
export function planBatches(items: GenItem[], o: { size: number; buffer: number; keepGroups: boolean }, moves: Record<string, number> = {}): PlanBatch[] {
  const size = Math.max(1, Math.floor(o.size));
  const buffer = Math.max(0, Math.floor(o.buffer));

  // groups in order of first appearance
  const groups = new Map<string, string[]>();
  for (const it of items) {
    const k = groupKey(it.group);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(it.key);
  }

  const batches: Part[][] = [];
  let current: Part[] = [];
  let count = 0;
  const flush = () => { if (current.length) batches.push(current); current = []; count = 0; };

  for (const [group, keys] of groups) {
    if (!o.keepGroups) {
      // plain order: fill each batch to `size`, the tail rule still avoids a tiny last batch
      for (const key of keys) {
        if (count >= size) flush();
        const last = current.at(-1);
        if (last && last.group === group) last.keys.push(key);
        else current.push({ group, keys: [key] });
        count++;
      }
      continue;
    }
    if (keys.length > size + buffer) {
      flush();
      let rest = keys.slice();
      while (rest.length > size + buffer) { batches.push([{ group, keys: rest.slice(0, size) }]); rest = rest.slice(size); }
      batches.push([{ group, keys: rest }]);
    } else if (count + keys.length <= size) {
      current.push({ group, keys });
      count += keys.length;
    } else {
      flush();
      current.push({ group, keys });
      count = keys.length;
      if (count >= size) flush();
    }
  }
  flush();

  // without keepGroups the last batch may be a few leftovers: fold a tail within the buffer into the batch before it
  if (!o.keepGroups && batches.length > 1) {
    const total = (b: Part[]) => b.reduce((n, p) => n + p.keys.length, 0);
    if (total(batches.at(-1)!) <= buffer && total(batches.at(-2)!) + total(batches.at(-1)!) <= size + buffer) {
      const tail = batches.pop()!;
      for (const p of tail) {
        const prev = batches.at(-1)!;
        const last = prev.at(-1);
        if (last && last.group === p.group) last.keys.push(...p.keys);
        else prev.push(p);
      }
    }
  }

  let plan: PlanBatch[] = batches.map((parts, i) => ({ n: i + 1, parts }));

  // groups the user moved by hand
  for (const [group, target] of Object.entries(moves)) {
    if (!Number.isInteger(target) || target < 1 || target > plan.length + 1) continue;
    const moved: Part[] = [];
    for (const b of plan) {
      moved.push(...b.parts.filter((p) => p.group === group));
      b.parts = b.parts.filter((p) => p.group !== group);
    }
    if (!moved.length) continue;
    while (plan.length < target) plan.push({ n: plan.length + 1, parts: [] });
    plan[target - 1].parts.push(...moved);
  }
  plan = plan.filter((b) => b.parts.length).map((b, i) => ({ ...b, n: i + 1 }));
  return plan;
}

export const batchTotal = (b: PlanBatch) => b.parts.reduce((n, p) => n + p.keys.length, 0);

// ---- file names -----------------------------------------------------------------------------------------------

const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** The path (inside output/) of a certificate. In `combined` mode several certificates share the same path. */
export function pathFor(item: GenItem, batch: number, batchCount: number, s: GenSettings, designs: { name: string }[]): string {
  const pattern = (s.pattern.trim() || defaultPattern(s.format)).replace(/^[/\\]+/, '');
  const group = item.group.map((g) => cleanSegment(g)).join('/');
  const values: Record<string, string> = {
    batch: pad(batch, Math.max(2, String(batchCount).length)),
    group,
    list: cleanSegment(item.list.replace(/\.[^.]+$/, '')),
    design: cleanSegment(item.design, 'certificate'),
    id: cleanSegment(item.id, 'certificate'),
  };
  const filled = pattern.replace(/\{(batch|group|list|design|id)\}/g, (_, k: string) => values[k]);
  // no empty, `.` or `..` parts: a path never leaves output/
  const clean = filled.split('/').map((seg) => seg.trim()).filter((seg) => seg !== '' && seg !== '.' && seg !== '..').map((seg) => seg.replace(/[\\:*?"<>|]/g, '-')).join('/');
  void designs;
  return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
}
