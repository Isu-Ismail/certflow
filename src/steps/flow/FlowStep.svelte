<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Button from '$lib/ui/Button.svelte';
  import { flowUi, type FlowView } from './flow.svelte';
  import FormView from './form/FormView.svelte';
  import ResultsPanel from './ResultsPanel.svelte';

  import { graphLoader, preloadGraph } from './graph/loader.svelte';

  preloadGraph();

  const views: { id: FlowView; label: string }[] = [
    { id: 'form', label: 'Simple form' },
    { id: 'graph', label: 'Node graph' },
  ];
  const total = $derived(flowUi.total);
  const summary = $derived(
    [...flowUi.result.byDesign.entries()].map(([d, rows]) => `${d} ${rows.length}`).join(' · ') +
      (flowUi.result.unassigned.length ? ` · ${flowUi.result.unassigned.length} with no design` : ''),
  );
</script>

{#if !ws.designs.length}
  <div class="grid min-h-64 flex-1 place-items-center px-6 py-10 text-center">
    <div class="max-w-md">
      <h1 class="text-2xl font-bold tracking-tight">Create a design first</h1>
      <p class="mt-2 text-mute">The flow decides which design each row gets, so it needs at least one design to choose from.</p>
      <Button variant="step" size="lg" class="mt-5" onclick={() => ws.setStep('design')}>Go to Design</Button>
    </div>
  </div>
{:else if !ws.sheet}
  <div class="grid min-h-64 flex-1 place-items-center px-6 py-10 text-center">
    <div class="max-w-md">
      <h1 class="text-2xl font-bold tracking-tight">Add your data first</h1>
      <p class="mt-2 text-mute">Rules look at the columns of your data, such as “Team is Team 1”.</p>
      <Button variant="step" size="lg" class="mt-5" onclick={() => ws.setStep('data')}>Go to Data</Button>
    </div>
  </div>
{:else}
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- one compact line: view switch + the result in a few words -->
    <div class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b-2 border-ink px-3 py-2">
      <div class="inline-flex overflow-hidden rounded-md border-2 border-ink" role="group" aria-label="Flow view">
        {#each views as v, i (v.id)}
          <button class="h-8 px-3 text-sm font-semibold {flowUi.view === v.id ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'} {i ? 'border-l-2 border-ink' : ''}" aria-pressed={flowUi.view === v.id} onclick={() => flowUi.setView(v.id)}>{v.label}</button>
        {/each}
      </div>
      <p class="min-w-0 flex-1 truncate text-sm"><b>{total} rows</b> <span class="text-mute">→ {summary || 'no design yet'}</span></p>
    </div>

    {#if flowUi.view === 'form'}
      <div class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto grid max-w-6xl gap-6 p-3 sm:p-5 lg:grid-cols-[1fr_300px]">
          <FormView />
          <aside class="h-fit rounded-lg border-2 border-ink bg-white p-4 shadow-hard lg:sticky lg:top-3"><ResultsPanel /></aside>
        </div>
      </div>
    {:else}
      {#if graphLoader.component}
        {@const Graph = graphLoader.component}
        <Graph />
      {:else}
        <p class="grid flex-1 place-items-center text-sm text-mute">Loading the graph editor…</p>
      {/if}
    {/if}
  </div>
{/if}
