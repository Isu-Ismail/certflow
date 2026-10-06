<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { addDataFile } from '$lib/workspace/actions';
  import Button from '$lib/ui/Button.svelte';
  import { dataUi } from './data.svelte';
  import { Layers, Plus } from '@lucide/svelte';

  let fileInput: HTMLInputElement;
  const multiple = $derived(ws.sources.length > 1);
  const tab = (on: boolean) =>
    `inline-flex h-9 max-w-56 shrink-0 items-center gap-2 rounded-md border-2 border-ink px-3 text-sm font-semibold ${on ? 'bg-ink text-white shadow-hard' : 'bg-white hover:bg-step-soft'}`;
</script>

<!-- one tab per data file, plus the merged table (the default once there is more than one file) -->
<div class="flex shrink-0 items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Data files">
  {#if multiple && dataUi.hasMerged}
    <button role="tab" aria-selected={dataUi.view === 'combined'} class={tab(dataUi.view === 'combined')} onclick={() => (dataUi.tab = 'combined')}>
      <Layers class="size-4 shrink-0" />Combined<span class="font-mono text-xs opacity-70">{ws.sheet?.rows.length ?? 0}</span>
    </button>
  {/if}
  {#each ws.sources as source, i (source.fileName)}
    <button role="tab" aria-selected={dataUi.view === i && multiple} class={tab(multiple && dataUi.view === i)} onclick={() => (dataUi.tab = i)}>
      <span class="truncate font-mono">{source.fileName}</span><span class="font-mono text-xs opacity-70">{source.rows.length}</span>
    </button>
  {/each}
  <Button size="sm" variant="outline" class="shrink-0" onclick={() => fileInput.click()}><Plus class="size-4" />Add data file</Button>
</div>

<input
  bind:this={fileInput}
  type="file"
  class="hidden"
  accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods"
  onchange={(e) => {
    const f = e.currentTarget.files?.[0];
    if (f) addDataFile(f);
    e.currentTarget.value = '';
  }}
/>
