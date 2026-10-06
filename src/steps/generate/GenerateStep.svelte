<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Button from '$lib/ui/Button.svelte';
  import { gen } from './gen.svelte';
  import SummaryBar from './SummaryBar.svelte';
  import ChecksPanel from './ChecksPanel.svelte';
  import ProgressPanel from './ProgressPanel.svelte';
  import PreviewCard from './PreviewCard.svelte';
  import FilesCard from './FilesCard.svelte';
  import FoldersCard from './FoldersCard.svelte';
  import BatchCard from './BatchCard.svelte';
  import OutputCard from './OutputCard.svelte';

  // read the options and the saved run of the open workspace (again when another one is opened)
  $effect(() => {
    void ws.loadId;
    void gen.load();
  });

  // undo and redo change the options: follow them
  $effect(() => {
    void ws.genConfig;
    gen.syncFromConfig();
  });

  // options are remembered
  $effect(() => {
    JSON.stringify(gen.settings);
    gen.saveSettings();
  });
</script>

{#if !ws.designs.length}
  <div class="grid min-h-64 flex-1 place-items-center px-6 py-10 text-center">
    <div class="max-w-md">
      <h1 class="text-2xl font-bold tracking-tight">Create a design first</h1>
      <p class="mt-2 text-mute">Certificates are made from your designs and your data.</p>
      <Button variant="step" size="lg" class="mt-5" onclick={() => ws.setStep('design')}>Go to Design</Button>
    </div>
  </div>
{:else if !ws.sheet}
  <div class="grid min-h-64 flex-1 place-items-center px-6 py-10 text-center">
    <div class="max-w-md">
      <h1 class="text-2xl font-bold tracking-tight">Add your data first</h1>
      <p class="mt-2 text-mute">There is nobody to make certificates for yet.</p>
      <Button variant="step" size="lg" class="mt-5" onclick={() => ws.setStep('data')}>Go to Data</Button>
    </div>
  </div>
{:else}
  <!-- two columns of the same height: the run on the left (buttons, progress, preview), the options stacked on the right.
       When the screen is narrower the options move below the run. -->
  <div class="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
    <div class="grid gap-2.5 p-2.5 sm:p-3.5 lg:h-full lg:grid-cols-2 lg:grid-rows-1">
      <div class="flex flex-col gap-2.5 lg:min-h-0 lg:overflow-y-auto [&>section:last-of-type]:grow">
        <SummaryBar />
        <ProgressPanel />
        <ChecksPanel />
        <PreviewCard />
      </div>
      <div class="flex flex-col gap-2.5 lg:min-h-0 lg:overflow-y-auto [&>section]:grow">
        <OutputCard />
        <BatchCard />
        <FoldersCard />
        <FilesCard />
      </div>
    </div>
  </div>
{/if}
