<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import StartPanel from './StartPanel.svelte';
  import DataBar from './DataBar.svelte';
  import DataTable from './DataTable.svelte';
  import MergeModal from './MergeModal.svelte';
  import MergeNote from './MergeNote.svelte';
  import SourceTabs from './SourceTabs.svelte';
  import { dataUi } from './data.svelte';
</script>

{#if ws.sources.length}
  <!-- file tabs, status layer, how the files are merged, then the table fills everything below -->
  <div class="flex min-h-0 flex-1 flex-col gap-3 p-2.5 sm:p-3.5">
    <SourceTabs />
    <DataBar />
    <MergeNote />
    {#key dataUi.view}<DataTable view={dataUi.view} />{/key}
  </div>
  <MergeModal />
{:else}
  <StartPanel />
{/if}
