<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import { updateNode } from '$lib/flow/ops';
  import type { DesignNode } from '$lib/flow/types';
  import { flowUi } from '../../flow.svelte';
  import NodeShell from './NodeShell.svelte';

  let { id, selected }: NodeProps = $props();

  const node = $derived(flowUi.graph.nodes.find((n) => n.id === id) as DesignNode | undefined);
  const missing = $derived(!!node && !flowUi.designNames.includes(node.design));
</script>

{#if node}
  <NodeShell {id} {selected} title="Use design" tone="bg-[#ffe6de]">
    <select
      class="nodrag h-8 w-full rounded-md border-2 bg-white px-2 text-sm font-semibold {missing ? 'border-[#d6361f]' : 'border-ink'}"
      aria-label="Design"
      value={node.design}
      onchange={(e) => flowUi.edit('Change design', (g) => updateNode<DesignNode>(g, id, { design: e.currentTarget.value }))}
    >
      {#if missing}<option value={node.design}>{node.design} (missing)</option>{/if}
      {#each flowUi.designNames as d (d)}<option value={d}>{d}</option>{/each}
    </select>
  </NodeShell>
{/if}
