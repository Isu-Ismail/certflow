// Words for a route through the flow: "Data: data.csv → Roll Number is “2023507030” → Design: certificate".
import { NO_VALUE, type Clause, type FlowGraph, type Outcome } from './types';

const clauseText = (c: Clause) => `${c.column} ${c.op}${NO_VALUE.includes(c.op) ? '' : ` “${c.value}”`}`;

/** The steps a row went through, from its path (node ids) in the flow. */
export function describeRoute(g: FlowGraph, path: string[], outcome: Outcome, label: (key: string) => string, defaultKey: string): string[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  path.forEach((id, i) => {
    const n = byId.get(id);
    if (!n) return;
    const next = path[i + 1];
    const port = next ? g.edges.find((e) => e.from === id && e.to === next)?.port : undefined;
    if (n.type === 'start') {
      out.push(i === 0 ? `Data: ${label(n.source || defaultKey)}` : `Found in ${label(n.source || defaultKey)}`);
    } else if (n.type === 'condition') {
      if (n.match === 'each') {
        if (port === 'false' || !port) out.push(port ? 'Else (no condition matched)' : `No condition matched`);
        else out.push(clauseText(n.clauses[port === 'true' ? 0 : Number(port.slice(1))] ?? n.clauses[0]));
      } else {
        const text = n.clauses.map(clauseText).join(n.match === 'all' ? ' and ' : ' or ');
        out.push(port === 'false' ? `Not: ${text}` : text);
      }
    } else if (n.type === 'design') out.push(`Design: ${n.design}`);
    else out.push('Skipped');
  });
  const last = byId.get(path.at(-1) ?? '');
  if (outcome.kind === 'none') {
    out.push(last?.type === 'start' && path.length > 1 ? `Not found in ${label(last.source || defaultKey)}` : 'Not connected to a design');
  }
  return out;
}
