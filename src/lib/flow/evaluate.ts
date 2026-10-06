import { rootStarts, yesPort } from './ops';
import type { Clause, ConditionNode, FlowGraph, FlowNode, FlowResult, Outcome, Port, Row } from './types';

const norm = (s: string) => s.trim().toLowerCase();
const num = (s: string): number | null => {
  const t = s.trim().replace(/,/g, '');
  return t !== '' && Number.isFinite(Number(t)) ? Number(t) : null;
};

/** One test against one row. Text is compared ignoring case and surrounding spaces; numbers compare as numbers. */
export function testClause(row: Row, c: Clause): boolean {
  const raw = row[c.column];
  if (raw === undefined) return false; // the column does not exist
  const a = norm(raw);
  const b = norm(c.value);
  const x = num(raw);
  const y = num(c.value);
  const both = x !== null && y !== null;
  switch (c.op) {
    case 'is empty': return a === '';
    case 'is not empty': return a !== '';
    case 'is': return both ? x === y : a === b;
    case 'is not': return both ? x !== y : a !== b;
    case 'contains': return a.includes(b);
    case 'does not contain': return !a.includes(b);
    case 'starts with': return a.startsWith(b);
    case 'ends with': return a.endsWith(b);
    case '>': return both ? x! > y! : a > b;
    case '>=': return both ? x! >= y! : a >= b;
    case '<': return both ? x! < y! : a < b;
    case '<=': return both ? x! <= y! : a <= b;
    default: return false;
  }
}

export function testCondition(row: Row, node: ConditionNode): boolean {
  if (!node.clauses.length) return true;
  const results = node.clauses.map((c) => testClause(row, c));
  return node.match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

/** Which output a row takes at a condition. */
export function branchOf(row: Row, node: ConditionNode): Port {
  if (node.match !== 'each') return testCondition(row, node) ? 'true' : 'false';
  const hit = node.clauses.findIndex((c) => testClause(row, c));
  return hit < 0 ? 'false' : yesPort(hit);
}

/**
 * Walks every row of every starting Data node through the graph. A row follows an output at each condition until it
 * reaches an end. `rowsOf(key)` gives the rows of a data list; a Data node without a list uses `defaultKey`.
 * A Data node in the middle of a path moves the row to its list: `remap` finds the same person there (by a shared
 * column such as a roll number) and gives the row's index (null = no counterpart, so the row ends there).
 */
export type Remap = (from: string, row: number, to: string, via: { from?: string; to?: string }) => number | null;

export function evaluateFlow(
  graph: FlowGraph,
  rowsOf: (key: string) => Row[],
  defaultKey: string,
  remap: Remap = (_f, row) => row,
): FlowResult {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const next = new Map(graph.edges.map((e) => [e.id, e]));

  const result: FlowResult = { rows: [], byDesign: new Map(), skipped: [], unassigned: [], nodeCounts: new Map(), edgeCounts: new Map() };
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const start of rootStarts(graph)) {
    const first = start.source || defaultKey;
    rowsOf(first).forEach((_, index) => {
      const path: string[] = [];
      let outcome: Outcome = { kind: 'none' };
      let node: FlowNode | undefined = start;
      let source = first;
      let at = index; // the row's index in `source`
      const seen = new Set<string>();
      while (node && !seen.has(node.id)) {
        seen.add(node.id);
        path.push(node.id);
        bump(result.nodeCounts, node.id);
        if (node.type === 'design') { outcome = { kind: 'design', design: node.design }; break; }
        if (node.type === 'skip') { outcome = { kind: 'skip' }; break; }
        if (node.type === 'start' && node.id !== start.id) {
          const key = node.source || defaultKey;
          const moved = remap(source, at, key, { from: node.matchFrom, to: node.matchTo });
          if (moved === null) break; // this row does not exist in that list
          source = key;
          at = moved;
        }
        const row = rowsOf(source)[at] ?? {};
        const port: Port = node.type === 'start' ? 'out' : branchOf(row, node);
        const edge = next.get(`${node.id}:${port}`);
        if (!edge) break; // not connected: the row ends here without a certificate
        bump(result.edgeCounts, edge.id);
        node = byId.get(edge.to);
      }
      const ref = { source, row: at };
      result.rows.push({ ...ref, outcome, path });
      if (outcome.kind === 'design') (result.byDesign.get(outcome.design) ?? result.byDesign.set(outcome.design, []).get(outcome.design)!).push(ref);
      else if (outcome.kind === 'skip') result.skipped.push(ref);
      else result.unassigned.push(ref);
    });
  }
  return result;
}
