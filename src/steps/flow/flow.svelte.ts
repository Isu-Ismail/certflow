import { defaultFlow } from '$lib/flow/convert';
import { evaluateFlow } from '$lib/flow/evaluate';
import { autoLayout, listKeys, needsLayout, rootStarts } from '$lib/flow/ops';
import type { FlowGraph, RowRef } from '$lib/flow/types';
import { describeRoute } from '$lib/flow/describe';
import { validateFlow } from '$lib/flow/validate';
import { resolveColumn, tokensIn } from '$lib/workspace/tokens';
import { matchColumns } from '$lib/workspace/combine';
import { rowLabel } from '$lib/workspace/identity';
import { ws } from '$lib/workspace/store.svelte';

const KEY = 'certflow-flow-ui';
export type FlowView = 'form' | 'graph';

function savedView(): FlowView {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}').view === 'graph' ? 'graph' : 'form'; } catch { return 'form'; }
}

/** UI state of the Flow step plus what is derived from the workspace (the effective graph, its result, its problems). */
class FlowUi {
  view = $state<FlowView>(savedView());

  designNames = $derived(ws.designs.map((d) => d.name));
  /** The list a Data node uses when it has not been given one. */
  defaultKey = $derived(ws.lists[0]?.key ?? '');
  /** The saved flow, or the default one (each data list feeds its first design) until the user edits it. */
  graph = $derived<FlowGraph>(this.#healed(ws.flow ?? defaultFlow(this.designNames, (d) => ws.listKeyOf(d))));
  /** node id -> the data list its rows come from */
  nodeLists = $derived(listKeys(this.graph, this.defaultKey));
  result = $derived(evaluateFlow(this.graph, (key) => ws.sheetOf(key)?.rows ?? [], this.defaultKey, ws.makeRemap()));
  /** How many rows enter the flow in total (all Data nodes). */
  total = $derived(rootStarts(this.graph).reduce((n, node) => n + (ws.sheetOf(node.source || this.defaultKey)?.rows.length ?? 0), 0));
  issues = $derived(
    validateFlow(this.graph, {
      designs: this.designNames,
      columnsOf: (key) => ws.sheetOf(key)?.columns ?? [],
      matchOf: (from, to) => { const a = ws.sheetOf(from); const b = ws.sheetOf(to); return a && b ? matchColumns(a, b) : null; },
      designList: (d) => ws.listKeyOf(d),
      unmatchedIn: (design, list) => this.unmatchedIn(design, list),
      defaultKey: this.defaultKey,
      label: (key) => this.label(key),
    }),
  );

  /** The {fields} of a design that have no column in a data list (after the field mapping). */
  unmatchedIn(design: string, list: string): string[] {
    const html = ws.designs.find((d) => d.name === design)?.html;
    const columns = ws.sheetOf(list)?.columns ?? [];
    return html ? tokensIn(html).filter((t) => !resolveColumn(t, columns, ws.tokenMap)) : [];
  }

  /** People grouped by the way they went through the flow. */
  routes = $derived.by(() => {
    const out = new Map<string, { steps: string[]; refs: RowRef[]; outcome: 'design' | 'skip' | 'none'; design?: string }>();
    for (const r of this.result.rows) {
      const sig = `${r.path.join('>')}|${r.outcome.kind}`;
      let g = out.get(sig);
      if (!g) {
        g = { steps: describeRoute(this.graph, r.path, r.outcome, (k) => this.label(k), this.defaultKey), refs: [], outcome: r.outcome.kind, design: r.outcome.kind === 'design' ? r.outcome.design : undefined };
        out.set(sig, g);
      }
      g.refs.push({ source: r.source, row: r.row });
    }
    return [...out.values()].sort((a, b) => b.refs.length - a.refs.length);
  });

  /** A Data node that points at a list that no longer exists uses the default list instead. */
  #healed(g: FlowGraph): FlowGraph {
    const known = new Set(ws.lists.map((l) => l.key));
    let out = g;
    if (!g.nodes.every((n) => n.type !== 'start' || !n.source || known.has(n.source))) {
      out = { ...g, nodes: g.nodes.map((n) => (n.type === 'start' && n.source && !known.has(n.source) ? { ...n, source: undefined } : n)) };
    }
    // positions that were never saved (or are unusable): tidy them. Positions the user set are kept as they are.
    return needsLayout(out) ? autoLayout(out) : out;
  }

  /** Where the canvas was last looked at (zoom and pan), kept while the page stays open. Another workspace starts fresh. */
  viewport: { x: number; y: number; zoom: number } | null = null;
  #viewportFor = -1;
  rememberViewport(v: { x: number; y: number; zoom: number }) {
    this.viewport = v;
    this.#viewportFor = ws.loadId;
  }
  /** The remembered view, or null (then the canvas fits everything). */
  recallViewport() {
    return this.#viewportFor === ws.loadId ? this.viewport : null;
  }

  /** A data list's name for messages and menus. */
  label(key: string) {
    return key === 'combined' ? 'the combined data' : key;
  }

  /** The data list the rows at a node come from. */
  listOf(nodeId: string) {
    return this.nodeLists.get(nodeId) ?? this.defaultKey;
  }

  columnsFor(nodeId?: string) {
    return ws.sheetOf(nodeId ? this.listOf(nodeId) : this.defaultKey)?.columns ?? [];
  }

  /** The data list the rows come from when they arrive at this node (null = it starts rows itself). */
  incomingList(nodeId: string): string | null {
    const edge = this.graph.edges.find((e) => e.to === nodeId);
    return edge ? this.listOf(edge.from) : null;
  }

  /** A short name for a row of a data list. */
  nameOf(ref: RowRef) {
    return rowLabel(ws.sheetOf(ref.source), ref.row);
  }

  setView(view: FlowView) {
    this.view = view;
    try { localStorage.setItem(KEY, JSON.stringify({ view })); } catch { /* private mode */ }
  }

  /** Applies an edit to the graph as one undo step. `fn` returns null to refuse the change. */
  edit(label: string, fn: (g: FlowGraph) => FlowGraph | null) {
    const next = fn(this.graph);
    if (next) ws.setFlow(next, label);
    return next !== null;
  }
}

export const flowUi = new FlowUi();
