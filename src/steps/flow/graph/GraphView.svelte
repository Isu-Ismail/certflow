<script lang="ts">
  import { Background, Controls, Panel, SvelteFlow, type Connection, type Edge, type Node } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { connect, removeNode, disconnect } from '$lib/flow/ops';
  import type { Port } from '$lib/flow/types';
  import { flowUi } from '../flow.svelte';
  import ResultsPanel from '../ResultsPanel.svelte';
  import GraphToolbar from './GraphToolbar.svelte';
  import { FIT, buildEdges, buildNodes, edgesKey, nodesKey } from './build';
  import StartNode from './nodes/StartNode.svelte';
  import ConditionNode from './nodes/ConditionNode.svelte';
  import DesignNode from './nodes/DesignNode.svelte';
  import SkipNode from './nodes/SkipNode.svelte';
  import { PanelRight } from '@lucide/svelte';

  // the view the user left the canvas in is kept while the page stays open; the first time it fits everything
  const remembered = flowUi.recallViewport();
  const nodeTypes = { start: StartNode, condition: ConditionNode, design: DesignNode, skip: SkipNode };

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let resultsOpen = $state(typeof window !== 'undefined' && window.innerWidth >= 1100);

  // Rebuild the canvas only when structure/positions change (editing a value inside a node must not touch it).
  let lastNodes = '';
  $effect(() => {
    const g = flowUi.graph;
    const key = nodesKey(g);
    if (key === lastNodes) return;
    lastNodes = key;
    const selected = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    nodes = buildNodes(g, selected);
  });
  let lastEdges = '';
  $effect(() => {
    const key = edgesKey(flowUi.graph, flowUi.result);
    if (key === lastEdges) return;
    lastEdges = key;
    edges = buildEdges(flowUi.graph, flowUi.result);
  });

  function onconnect(c: Connection) {
    if (!c.sourceHandle) return;
    flowUi.edit('Connect', (g) => connect(g, c.source, c.sourceHandle as Port, c.target));
  }
  // refuse loops, connections into Start, and handles that do not exist
  const isValidConnection = (c: Connection | Edge) => !!c.sourceHandle && connect(flowUi.graph, c.source, c.sourceHandle as Port, c.target) !== null;

  function ondelete({ nodes: gone, edges: cut }: { nodes: Node[]; edges: Edge[] }) {
    flowUi.edit('Delete', (g) => {
      let next = g;
      for (const n of gone) next = removeNode(next, n.id);
      for (const e of cut) next = disconnect(next, e.id);
      return next;
    });
  }

  function onnodedragstop({ nodes: moved }: { nodes: Node[] }) {
    flowUi.edit('Move', (g) => ({ ...g, nodes: g.nodes.map((n) => { const m = moved.find((x) => x.id === n.id); return m ? { ...n, x: Math.round(m.position.x), y: Math.round(m.position.y) } : n; }) }));
  }
</script>

<div class="flex min-h-0 flex-1">
  <div class="relative min-w-0 flex-1 bg-[#ece8dc]">
    <SvelteFlow
      bind:nodes
      bind:edges
      {nodeTypes}
      {isValidConnection}
      {onconnect}
      {ondelete}
      {onnodedragstop}
      fitView={!remembered}
      initialViewport={remembered ?? undefined}
      onmoveend={(_e, v) => flowUi.rememberViewport(v)}
      fitViewOptions={FIT}
      minZoom={0.2}
      deleteKey={['Backspace', 'Delete']}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} />
      <Controls showLock={false} />
      <Panel position="top-left"><GraphToolbar /></Panel>
      <Panel position="top-right">
        <button class="grid size-9 place-items-center rounded-md border-2 border-ink bg-white shadow-hard hover:bg-step-soft" aria-label="Show or hide who gets what" aria-pressed={resultsOpen} onclick={() => (resultsOpen = !resultsOpen)}><PanelRight class="size-4" /></button>
      </Panel>
    </SvelteFlow>
  </div>

  {#if resultsOpen}
    <aside class="absolute inset-y-0 right-0 z-20 w-[min(88vw,300px)] overflow-y-auto border-l-2 border-ink bg-white p-4 lg:static lg:z-auto lg:w-72 lg:shrink-0" aria-label="Who gets what"><ResultsPanel /></aside>
  {/if}
</div>

<style>
  /* brutalist look for Svelte Flow */
  :global(.svelte-flow) { --xy-handle-background-color-default: #ffffff; --xy-handle-border-color-default: #121212; --xy-edge-label-background-color-default: #ffffff; }
  :global(.svelte-flow__handle) { width: 14px; height: 14px; border: 2px solid #121212; background: #fff; }
  :global(.svelte-flow__handle.connectingto) { background: var(--c); }
  :global(.svelte-flow__handle:hover) { background: var(--c); }
  :global(.svelte-flow__controls) { border: 2px solid #121212; box-shadow: 3px 3px 0 #121212; border-radius: 6px; overflow: hidden; }
  :global(.svelte-flow__controls-button) { border-bottom: 1px solid #121212; background: #fff; }
  :global(.svelte-flow__edge.selected .svelte-flow__edge-path) { stroke-width: 4px; }
</style>
