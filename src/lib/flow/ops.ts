// Pure graph edits. Every function returns a NEW graph (or null when the edit is not allowed).
import type { Clause, ConditionNode, DesignNode, FlowEdge, FlowGraph, FlowNode, Port, SkipNode, StartNode } from './types';

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;

export const edgeId = (from: string, port: Port) => `${from}:${port}`;

export const newStart = (x = 0, y = 0, source?: string): StartNode => ({ id: 'start', type: 'start', x, y, ...(source ? { source } : {}) });
/** An extra Data node (another data list feeding the flow). */
export const newDataStart = (source: string, x: number, y: number): StartNode => ({ id: uid('start'), type: 'start', x, y, source });
export const newSkip = (x: number, y: number): SkipNode => ({ id: uid('skip'), type: 'skip', x, y });
export const newDesign = (design: string, x: number, y: number): DesignNode => ({ id: uid('design'), type: 'design', design, x, y });
export function newCondition(column: string, x: number, y: number): ConditionNode {
  return { id: uid('if'), type: 'condition', match: 'each', clauses: [newClause(column)], x, y };
}
export const newClause = (column: string): Clause => ({ column, op: 'is', value: '' });

/** The yes output of condition row `i` (the first row keeps the old name `true`). */
export const yesPort = (i: number): Port => (i === 0 ? 'true' : `y${i}`);

export const portsOf = (n: FlowNode): Port[] =>
  n.type === 'start' ? ['out']
  : n.type === 'condition' ? (n.match === 'each' ? [...n.clauses.map((_, i) => yesPort(i)), 'false'] : ['true', 'false'])
  : [];

/** Removes condition row `index` of a node: its yes connection goes, the later rows' connections move up. */
export function removeClause(g: FlowGraph, id: string, index: number): FlowGraph {
  const node = g.nodes.find((n) => n.id === id);
  if (!node || node.type !== 'condition') return g;
  const nodes = g.nodes.map((n) => (n.id === id && n.type === 'condition' ? { ...n, clauses: n.clauses.filter((_, k) => k !== index) } : n));
  if (node.match !== 'each') return { ...g, nodes };
  const rank = (port: string) => (port === 'true' ? 0 : /^y(\d+)$/.test(port) ? Number(port.slice(1)) : -1);
  const edges = g.edges.flatMap((e) => {
    if (e.from !== id) return [e];
    const r = rank(e.port);
    if (r < 0 || r < index) return [e];
    if (r === index) return [];
    const port = yesPort(r - 1);
    return [{ ...e, port, id: edgeId(id, port) }];
  });
  return { nodes, edges };
}

/** Data nodes nothing points at: they start rows. A Data node with an incoming connection switches the rows to its list instead. */
export const rootStarts = (g: FlowGraph): StartNode[] => g.nodes.filter((n): n is StartNode => n.type === 'start' && !g.edges.some((e) => e.to === n.id));

/** The data list each node receives rows from (the first path that reaches it). Unreachable nodes are missing. */
export function listKeys(g: FlowGraph, defaultKey: string): Map<string, string> {
  const out = new Map<string, string>();
  const queue: [string, string][] = rootStarts(g).map((s) => [s.id, s.source || defaultKey]);
  for (let i = 0; i < queue.length; i++) {
    const [id, inherited] = queue[i];
    if (out.has(id)) continue;
    const node = g.nodes.find((n) => n.id === id);
    const key = node?.type === 'start' ? node.source || defaultKey : inherited;
    out.set(id, key);
    for (const e of g.edges) if (e.from === id) queue.push([e.to, key]);
  }
  return out;
}

export function addNode(g: FlowGraph, node: FlowNode): FlowGraph {
  return { ...g, nodes: [...g.nodes, node] };
}

export function updateNode<T extends FlowNode>(g: FlowGraph, id: string, patch: Partial<T>): FlowGraph {
  return { ...g, nodes: g.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as FlowNode) : n)) };
}

export function removeNode(g: FlowGraph, id: string): FlowGraph {
  // the last Data node cannot be removed (rows have to start somewhere)
  if (g.nodes.find((n) => n.id === id)?.type === 'start' && g.nodes.filter((n) => n.type === 'start').length < 2) return g;
  return { nodes: g.nodes.filter((n) => n.id !== id), edges: g.edges.filter((e) => e.from !== id && e.to !== id) };
}

/** True if connecting `from` -> `to` would make a loop (to can already reach from). */
export function wouldCycle(g: FlowGraph, from: string, to: string): boolean {
  if (from === to) return true;
  const stack = [to];
  const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of g.edges) if (e.from === id) stack.push(e.to);
  }
  return false;
}

/** Connects an output to a node. An output has one connection: it replaces the old one. Null = not allowed. */
export function connect(g: FlowGraph, from: string, port: Port, to: string): FlowGraph | null {
  const a = g.nodes.find((n) => n.id === from);
  const b = g.nodes.find((n) => n.id === to);
  if (!a || !b || !portsOf(a).includes(port) || wouldCycle(g, from, to)) return null;
  const id = edgeId(from, port);
  return { ...g, edges: [...g.edges.filter((e) => e.id !== id), { id, from, port, to }] };
}

export function disconnect(g: FlowGraph, id: string): FlowGraph {
  return { ...g, edges: g.edges.filter((e) => e.id !== id) };
}

/** True when node positions are missing or unusable (not numbers, or two nodes on the same spot): the flow needs a tidy. */
export function needsLayout(g: FlowGraph): boolean {
  const spots = new Set<string>();
  for (const n of g.nodes) {
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return true;
    const key = `${Math.round(n.x / 20)},${Math.round(n.y / 20)}`;
    if (spots.has(key)) return true;
    spots.add(key);
  }
  return false;
}

/** Where an output sits on its node, top to bottom: out, then yes (1st row), yes 2…, and else last. */
const portRank = (port: string) => (port === 'out' ? 0 : port === 'true' ? 1 : port === 'false' ? 1000 : 1 + Number(port.slice(1)));

// roughly how big a node is on the canvas (px), to stack them without overlap
const widthOf = (n: FlowNode) => (n.type === 'condition' ? 460 : n.type === 'start' ? 288 : 256);
const heightOf = (n: FlowNode, hasInput: boolean) =>
  n.type === 'condition' ? 150 + 38 * Math.min(n.clauses.length, 3) + (n.match === 'each' ? 0 : 34)
  : n.type === 'start' ? 130 + (hasInput ? 70 : 0)
  : n.type === 'design' ? 100
  : 90;

/**
 * A tidy left-to-right layout. Columns by distance from the Data nodes; inside a column the nodes follow the order of the
 * outputs they come from (yes above else, row 1 above row 2…), so the picture matches the node's own outputs.
 */
export function autoLayout(g: FlowGraph, gapX = 110, gapY = 40): FlowGraph {
  const out = new Map<string, FlowEdge[]>();
  for (const e of g.edges) (out.get(e.from) ?? out.set(e.from, []).get(e.from)!).push(e);
  for (const list of out.values()) list.sort((x, y) => portRank(x.port) - portRank(y.port));

  // order of discovery: parents first, each parent's children in output order
  const order: string[] = rootStarts(g).map((n) => n.id);
  const seen = new Set(order);
  for (let i = 0; i < order.length; i++) {
    for (const e of out.get(order[i]) ?? []) if (!seen.has(e.to)) { seen.add(e.to); order.push(e.to); }
  }
  // the column of a node is after all its parents (longest path), so arrows always point right
  const depth = new Map<string, number>(order.map((id) => [id, 0]));
  for (let pass = 0; pass < g.nodes.length; pass++) {
    let moved = false;
    for (const e of g.edges) {
      const d = (depth.get(e.from) ?? 0) + 1;
      if (depth.has(e.from) && (depth.get(e.to) ?? 0) < d && depth.has(e.to)) { depth.set(e.to, d); moved = true; }
    }
    if (!moved) break;
  }
  const maxDepth = Math.max(0, ...depth.values());
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const columns = new Map<number, FlowNode[]>();
  for (const id of order) { const n = byId.get(id); if (n) columns.set(depth.get(id)!, [...(columns.get(depth.get(id)!) ?? []), n]); }
  const loose = g.nodes.filter((n) => !seen.has(n.id)); // not connected to anything: an extra column
  if (loose.length) columns.set(maxDepth + 1, loose);

  const hasInput = (n: FlowNode) => g.edges.some((e) => e.to === n.id);
  const pos = new Map<string, { x: number; y: number }>();
  let x = 0;
  for (const d of [...columns.keys()].sort((a, b) => a - b)) {
    const col = columns.get(d)!;
    const total = col.reduce((sum, n) => sum + heightOf(n, hasInput(n)), 0) + gapY * (col.length - 1);
    let y = -total / 2;
    for (const n of col) { pos.set(n.id, { x, y: Math.round(y) }); y += heightOf(n, hasInput(n)) + gapY; }
    x += Math.max(...col.map(widthOf)) + gapX;
  }
  return { ...g, nodes: g.nodes.map((n) => ({ ...n, ...(pos.get(n.id) ?? {}) })) };
}
