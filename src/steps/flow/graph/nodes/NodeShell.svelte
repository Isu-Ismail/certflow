<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Handle, Position } from '@xyflow/svelte';
  import { flowUi } from '../../flow.svelte';
  import { removeNode } from '$lib/flow/ops';
  import { X } from '@lucide/svelte';

  // Common frame of every node: left input, title bar with a delete button, a row count.
  let { id, title, tone = 'bg-white', selected, input = true, deletable = true, width = 'w-64', flush = false, children, outputs }: {
    /** Tailwind width class */
    width?: string;
    /** no padding around the content (the content lays itself out) */
    flush?: boolean;
    id: string;
    title: string;
    tone?: string;
    selected?: boolean;
    input?: boolean;
    deletable?: boolean;
    children?: Snippet;
    outputs?: Snippet;
  } = $props();

  const count = $derived(flowUi.result.nodeCounts.get(id) ?? 0);
</script>

<div class="{width} rounded-lg border-2 border-ink bg-white shadow-hard {selected ? 'ring-4 ring-step/60' : ''}">
  {#if input}<Handle type="target" position={Position.Left} />{/if}

  <div class="flex items-center gap-2 border-b-2 border-ink px-3 py-1.5 {tone} rounded-t-md">
    <span class="flex-1 font-bold">{title}</span>
    <span class="rounded border-[1.5px] border-ink bg-white px-1.5 font-mono text-xs" title="Rows that reach this node">{count}</span>
    {#if deletable}
      <button class="nodrag grid size-6 place-items-center rounded hover:bg-[#fbd5cf]" aria-label="Delete this node" onclick={() => flowUi.edit('Delete node', (g) => removeNode(g, id))}><X class="size-4" /></button>
    {/if}
  </div>

  {#if children}<div class={flush ? '' : 'space-y-2 p-3'}>{@render children()}</div>{/if}
  {@render outputs?.()}
</div>
