<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import NodeShell from './NodeShell.svelte';

  let { id, selected }: NodeProps = $props();
</script>

<NodeShell {id} {selected} title="Skip" tone="bg-soft">
  <p class="text-sm text-mute">Rows that arrive here get no certificate.</p>
</NodeShell>
