<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { updateNode } from '$lib/flow/ops';
  import type { StartNode } from '$lib/flow/types';
  import { matchColumns } from '$lib/workspace/combine';
  import { ws } from '$lib/workspace/store.svelte';
  import { flowUi } from '../../flow.svelte';
  import NodeShell from './NodeShell.svelte';

  let { id, selected }: NodeProps = $props();

  const node = $derived(flowUi.graph.nodes.find((n) => n.id === id) as StartNode | undefined);
  const key = $derived(node?.source || flowUi.defaultKey);
  const rows = $derived(ws.sheetOf(key)?.rows.length ?? 0);
  // rows arrive from another list: say how the same person is found here
  const from = $derived(flowUi.incomingList(id));
  const fromSheet = $derived(from ? ws.sheetOf(from) : null);
  const thisSheet = $derived(ws.sheetOf(key));
  const auto = $derived(fromSheet && thisSheet ? matchColumns(fromSheet, thisSheet) : null);
  const switching = $derived(!!from && from !== key);
  const pick = 'nodrag h-7 min-w-0 flex-1 rounded-md border-2 border-ink bg-white px-1 text-xs';
  const set = (p: Partial<StartNode>) => flowUi.edit('Change data matching', (g) => updateNode<StartNode>(g, id, p));
  const hasInput = $derived(flowUi.graph.edges.some((e) => e.to === id));
  const deletable = $derived(flowUi.graph.nodes.filter((n) => n.type === 'start').length > 1);
</script>

{#if node}
  <NodeShell {id} {selected} title="Data" tone="bg-step" width="w-72" {deletable}>
    {#if ws.lists.length > 1}
      <select
        class="nodrag h-8 w-full rounded-md border-2 border-ink bg-white px-2 text-sm font-semibold"
        aria-label="Data list"
        value={key}
        onchange={(e) => flowUi.edit('Change data', (g) => updateNode<StartNode>(g, id, { source: e.currentTarget.value }))}
      >
        {#each ws.lists as l (l.key)}<option value={l.key} selected={l.key === key}>{l.label}</option>{/each}
      </select>
    {:else}
      <p class="font-mono text-xs">{ws.sheetOf(key)?.fileName}</p>
    {/if}
    {#if switching && fromSheet && thisSheet}
      <div class="space-y-1">
        <p class="text-xs font-semibold">Find the same person here by</p>
        <div class="flex items-center gap-1">
          <select class={pick} aria-label="Column of the rows that arrive" value={node.matchFrom ?? ''} onchange={(e) => set({ matchFrom: e.currentTarget.value || undefined, matchTo: node.matchTo })}>
            <option value="">{auto ? `${auto.from} (auto)` : 'Choose…'}</option>
            {#each fromSheet.columns as c (c)}<option value={c}>{c}</option>{/each}
          </select>
          <span class="text-xs">=</span>
          <select class={pick} aria-label="Column of this data" value={node.matchTo ?? ''} onchange={(e) => set({ matchTo: e.currentTarget.value || undefined, matchFrom: node.matchFrom })}>
            <option value="">{auto ? `${auto.to} (auto)` : 'Choose…'}</option>
            {#each thisSheet.columns as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        </div>
      </div>
    {/if}
    <p class="text-sm"><b>{rows} rows</b>{#if hasInput} <span class="text-mute">· takes the rows that reach it</span>{/if}</p>
    {#snippet outputs()}
      <div class="relative px-3 pb-2 text-right text-xs text-mute">{hasInput ? 'continues from here' : 'every row starts here'} →<Handle id="out" type="source" position={Position.Right} /></div>
    {/snippet}
  </NodeShell>
{/if}
