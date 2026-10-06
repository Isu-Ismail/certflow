import { listKeys, portsOf, rootStarts, wouldCycle } from './ops';
import type { FlowGraph, FlowIssue } from './types';

const describe = (n: { clauses: { column: string; op: string; value: string }[] }) =>
  n.clauses.length ? `${n.clauses[0].column} ${n.clauses[0].op} ${n.clauses[0].value}`.trim() : 'if';

export interface FlowContext {
  designs: string[];
  /** the columns of a data list */
  columnsOf: (key: string) => string[];
  /** the columns that identify the same person in two lists (null = none in common) */
  matchOf: (from: string, to: string) => { from: string; to: string } | null;
  /** the data list a design is paired with */
  designList: (design: string) => string;
  /** the {fields} of a design that have no column in a data list */
  unmatchedIn: (design: string, list: string) => string[];
  defaultKey: string;
  /** a data list's name for messages */
  label: (key: string) => string;
}

/** Things that would stop some rows getting the design the user expects. */
export function validateFlow(g: FlowGraph, ctx: FlowContext): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const has = (from: string, port: string) => g.edges.some((e) => e.id === `${from}:${port}`);
  const lists = listKeys(g, ctx.defaultKey); // node -> the data list its rows come from

  for (const n of g.nodes) {
    if (n.type === 'start' && !has(n.id, 'out')) issues.push({ level: 'error', nodeId: n.id, message: 'A data node is not connected to anything.' });
  }

  for (const n of g.nodes) {
    const list = lists.get(n.id);
    if (n.type === 'condition') {
      const label = describe(n);
      for (const port of portsOf(n)) {
        if (port === 'false') continue;
        if (!has(n.id, port)) issues.push({ level: 'warn', nodeId: n.id, message: n.match === 'each' ? `Condition ${(port === 'true' ? 0 : Number(port.slice(1))) + 1} of “${label}…”: its yes branch is not connected.` : `“${label}”: the yes branch is not connected.` });
      }
      if (!has(n.id, 'false')) issues.push({ level: 'warn', nodeId: n.id, message: `“${label}”: the no branch is not connected, so those rows get no certificate.` });
      const columns = list ? ctx.columnsOf(list) : [];
      if (list) for (const c of n.clauses) {
        if (!columns.includes(c.column)) issues.push({ level: 'error', nodeId: n.id, message: `“${c.column}” is not a column of ${ctx.label(list)}.` });
      }
    } else if (n.type === 'design') {
      if (!ctx.designs.includes(n.design)) issues.push({ level: 'error', nodeId: n.id, message: `The design “${n.design}” does not exist.` });
      else if (list) {
        const missing = ctx.unmatchedIn(n.design, list);
        if (missing.length) {
          issues.push({
            level: 'warn',
            nodeId: n.id,
            message: `“${n.design}” uses ${missing.map((t) => `{${t}}`).join(' ')}, which ${missing.length === 1 ? 'is' : 'are'} not a column of ${ctx.label(list)}, so ${missing.length === 1 ? 'it' : 'they'} would print as written.${ctx.designList(n.design) !== list ? ` Map the fields to its columns in the Design step.` : ''}`,
            fix: ctx.designList(n.design) !== list ? { design: n.design, list } : undefined,
          });
        }
      }
    }
    if (n.type === 'start' && g.edges.some((e) => e.to === n.id)) {
      const incoming = g.edges.find((e) => e.to === n.id)!;
      const from = lists.get(incoming.from);
      const to = n.source || ctx.defaultKey;
      if (from && from !== to && !(n.matchFrom && n.matchTo) && !ctx.matchOf(from, to)) {
        issues.push({ level: 'warn', nodeId: n.id, message: `${ctx.label(from)} and ${ctx.label(to)} have no column in common (like a roll number), so people cannot be found in ${ctx.label(to)}. Choose the columns to match on this data node.` });
      }
    }
    if (n.type !== 'start' && !lists.has(n.id)) issues.push({ level: 'warn', nodeId: n.id, message: 'This node is not connected to a data node, so no row reaches it.' });
  }
  for (const e of g.edges) if (wouldCycle({ ...g, edges: g.edges.filter((x) => x.id !== e.id) }, e.from, e.to)) issues.push({ level: 'error', message: 'The flow loops back on itself.' });
  return issues;
}
