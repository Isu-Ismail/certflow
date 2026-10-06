// Turns the flow graph into Svelte Flow nodes/edges. The node components read their own data from the store
// (so editing a value never rebuilds the canvas); only structure, positions and counts end up here.
import { MarkerType, type Edge, type Node } from '@xyflow/svelte';
import type { FlowGraph, FlowResult } from '$lib/flow/types';

export function buildNodes(g: FlowGraph, selected: Set<string>): Node[] {
  return g.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.x, y: n.y },
    data: {},
    deletable: n.type !== 'start' || g.nodes.filter((x) => x.type === 'start').length > 1,
    selected: selected.has(n.id),
  }));
}

const colourOf = (p: string) => (p === 'out' ? '#121212' : p === 'false' ? '#d6361f' : '#1f7a3d');
const labelOf = (p: string) => (p === 'out' ? '' : p === 'false' ? 'else' : p === 'true' ? 'yes' : `yes ${Number(p.slice(1)) + 1}`);

export function buildEdges(g: FlowGraph, result: FlowResult): Edge[] {
  return g.edges.map((e) => {
    const count = result.edgeCounts.get(e.id) ?? 0;
    const text = [labelOf(e.port), count ? `${count} ${count === 1 ? 'row' : 'rows'}` : ''].filter(Boolean).join(' · ');
    return {
      id: e.id,
      source: e.from,
      sourceHandle: e.port,
      target: e.to,
      type: 'smoothstep',
      label: text || undefined,
      markerEnd: { type: MarkerType.ArrowClosed, color: colourOf(e.port) },
      style: `stroke:${colourOf(e.port)};stroke-width:2.5px`,
      labelStyle: `font:600 12px 'JetBrains Mono',monospace;fill:${colourOf(e.port)}`,
    };
  });
}

/** A string that changes only when the canvas must be rebuilt (not for edits inside nodes). */
export const nodesKey = (g: FlowGraph) => g.nodes.map((n) => `${n.id}@${n.x},${n.y}:${n.type}`).join('|');
export const edgesKey = (g: FlowGraph, r: FlowResult) => g.edges.map((e) => `${e.id}>${e.to}=${r.edgeCounts.get(e.id) ?? 0}`).join('|');

/** Keeps the floating toolbar from covering nodes when the view is fitted. */
export const FIT = { padding: { top: '84px', right: '32px', bottom: '32px', left: '32px' }, maxZoom: 1 } as const;
