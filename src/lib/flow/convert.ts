// Default flow, and the two-way bridge between the node graph and the simple form (a chain of rules).
import { autoLayout, edgeId, newDataStart, newStart, uid } from './ops';
import type { DesignNode, FlowGraph, FlowNode, FormModel, FormRule, SkipNode, Target } from './types';

/**
 * No flow saved yet: every data list that a design is paired with feeds its first design (everyone in that list
 * gets it). Nothing but a Data node if there is no design.
 */
export function defaultFlow(designs: string[], listOf: (design: string) => string = () => ''): FlowGraph {
  if (!designs.length) return { nodes: [newStart()], edges: [] };
  const first = new Map<string, string>(); // list -> its first design
  for (const d of designs) if (!first.has(listOf(d))) first.set(listOf(d), d);
  const nodes: FlowNode[] = [];
  const edges: FlowGraph['edges'] = [];
  [...first].forEach(([list, design], i) => {
    const start = i === 0 ? newStart(0, 0, list || undefined) : newDataStart(list, 0, 0);
    const end: DesignNode = { id: i === 0 ? 'design-default' : `design-default-${i}`, type: 'design', design, x: 0, y: 0 };
    nodes.push(start, end);
    edges.push({ id: edgeId(start.id, 'out'), from: start.id, port: 'out', to: end.id });
  });
  return autoLayout({ nodes, edges });
}

const terminalOf = (id: string, t: Target): DesignNode | SkipNode =>
  t.kind === 'design' ? { id, type: 'design', design: t.design, x: 0, y: 0 } : { id, type: 'skip', x: 0, y: 0 };

/** Form -> graph: Start -> if -> (yes: its design) / (no: next if … -> otherwise). Keeps positions of nodes that already existed. */
export function formToGraph(form: FormModel, previous?: FlowGraph): FlowGraph {
  const source = (previous?.nodes.find((n) => n.id === 'start') as { source?: string } | undefined)?.source;
  const nodes: FlowNode[] = [newStart(0, 0, source)];
  const edges: FlowGraph['edges'] = [];
  const link = (from: string, port: 'out' | 'true' | 'false', to: string) => edges.push({ id: edgeId(from, port), from, port, to });

  let cursor = 'start';
  let cursorPort: 'out' | 'false' = 'out';
  for (const rule of form.rules) {
    const cid = `if-${rule.id}`;
    const tid = `end-${rule.id}`;
    nodes.push({ id: cid, type: 'condition', match: rule.match, clauses: rule.clauses, x: 0, y: 0 }, terminalOf(tid, rule.target));
    link(cursor, cursorPort, cid);
    link(cid, 'true', tid);
    cursor = cid;
    cursorPort = 'false';
  }
  if (form.otherwise) {
    nodes.push(terminalOf('end-otherwise', form.otherwise));
    link(cursor, cursorPort, 'end-otherwise');
  }
  const laid = autoLayout({ nodes, edges });
  const old = new Map(previous?.nodes.map((n) => [n.id, n]));
  return { ...laid, nodes: laid.nodes.map((n) => (old.has(n.id) ? { ...n, x: old.get(n.id)!.x, y: old.get(n.id)!.y } : n)) };
}

const targetOf = (n: FlowNode | undefined): Target | null =>
  n?.type === 'design' ? { kind: 'design', design: n.design } : n?.type === 'skip' ? { kind: 'skip' } : null;

/**
 * Graph -> form, only if the graph IS a chain of rules (every `true` goes straight to an end, every `false` goes
 * to the next if or to the last end, nothing else on the canvas). Otherwise null: only the graph view can show it.
 */
export function graphToForm(g: FlowGraph): FormModel | null {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const out = (id: string, port: string) => byId.get(g.edges.find((e) => e.id === `${id}:${port}`)?.to ?? '');
  const used = new Set<string>(['start']);
  const rules: FormRule[] = [];
  let otherwise: Target | null = null;

  let node = out('start', 'out');
  while (node) {
    if (used.has(node.id)) return null;
    used.add(node.id);
    if (node.type !== 'condition') { otherwise = targetOf(node); break; }
    if (node.match === 'each' && node.clauses.length > 1) return null; // one branch per row: only the graph can show it
    const yes = out(node.id, 'true');
    const target = targetOf(yes);
    if (!target) return null; // `true` leads to another if (or nowhere): not a simple rule
    used.add(yes!.id);
    rules.push({ id: node.id.replace(/^if-/, ''), match: node.match === 'any' ? 'any' : 'all', clauses: node.clauses, target });
    node = out(node.id, 'false');
  }
  if (g.nodes.some((n) => !used.has(n.id))) return null; // something else is on the canvas
  return { rules, otherwise };
}

export const newRuleId = () => uid('r');
