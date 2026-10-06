<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { design, type ViewMode } from '../design.svelte';
  import Button from '$lib/ui/Button.svelte';
  import AddMenu from './AddMenu.svelte';
  import { PanelLeft, PanelRight, ChevronLeft, ChevronRight, Minus, Plus } from '@lucide/svelte';

  const rows = $derived(design.sheet?.rows.length ?? 0);
  const current = $derived(Math.min(design.rowIndex, Math.max(rows - 1, 0)));
  const percent = $derived(Math.round(design.scale * 100));
  const codeOnly = $derived(design.mode === 'code');

  const step = (delta: number) => (design.rowIndex = (current + delta + rows) % rows);
  const zoomBy = (delta: number) => (design.zoom = Math.min(2, Math.max(0.2, Math.round((design.scale + delta) * 100) / 100)));

  const modes: { id: ViewMode; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'split', label: 'Split' },
    { id: 'code', label: 'Code' },
  ];
  const seg = (on: boolean) => `h-8 px-2 text-sm font-semibold sm:px-3 ${on ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'}`;
</script>

<!-- Phones: row 1 = explorer · add · row switcher · inspector, row 2 = view + data toggles. Wider: one row (wraps if tight). -->
<div class="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-2 border-b-2 border-ink bg-white px-2.5 py-2 sm:gap-x-3">
  <Button variant={design.explorerOpen ? 'default' : 'outline'} size="icon" class="order-1 size-8" aria-label="Toggle explorer" title="Explorer" onclick={() => design.toggleExplorer()}>
    <PanelLeft class="size-4" />
  </Button>

  <div class="order-5 inline-flex overflow-hidden rounded-md border-2 border-ink sm:order-2" role="group" aria-label="View">
    {#each modes as m, i (m.id)}
      <button class="{seg(design.mode === m.id)} {i ? 'border-l-2 border-ink' : ''}" aria-pressed={design.mode === m.id} onclick={() => design.setMode(m.id)}>{m.label}</button>
    {/each}
  </div>

  {#if !codeOnly}
    <div class="order-1 sm:order-3"><AddMenu /></div>

    <!-- the row switcher only matters when the page is visible -->
    <div class="order-2 flex min-w-0 flex-1 items-center justify-center gap-1 sm:order-4 sm:flex-none sm:justify-start">
      {#if rows}
        <Button variant="outline" size="icon" class="size-8" aria-label="Previous row" onclick={() => step(-1)}><ChevronLeft class="size-4" /></Button>
        <span class="max-w-28 min-w-20 truncate text-center text-sm"><b>{design.personName(current)}</b> <span class="font-mono text-xs text-mute">{current + 1}/{rows}</span></span>
        <Button variant="outline" size="icon" class="size-8" aria-label="Next row" onclick={() => step(1)}><ChevronRight class="size-4" /></Button>
      {:else}
        <span class="text-sm text-mute">No data yet</span>
      {/if}
    </div>

    <div class="order-6 inline-flex overflow-hidden rounded-md border-2 border-ink sm:order-5" role="group" aria-label="Preview content">
      <button class={seg(!design.showFields)} aria-pressed={!design.showFields} onclick={() => (design.showFields = false)}>Real data</button>
      <button class="{seg(design.showFields)} border-l-2 border-ink" aria-pressed={design.showFields} onclick={() => (design.showFields = true)}>Fields</button>
    </div>
  {:else}
    <span class="order-2 flex-1 sm:hidden"></span>
  {/if}

  <span class="order-4 h-0 basis-full sm:hidden"></span>

  {#if !codeOnly}
    <!-- zoom is hidden on phones (Fit is enough there) so the toggles fit in one row -->
    <div class="order-6 ml-auto hidden items-center gap-1 sm:order-7 sm:flex">
      <Button variant="outline" size="icon" class="size-8" aria-label="Zoom out" onclick={() => zoomBy(-0.1)}><Minus class="size-4" /></Button>
      <button class="h-8 w-14 rounded-md border-[1.5px] border-ink bg-white text-sm font-semibold tabular-nums hover:bg-step-soft" title="Fit to screen" onclick={() => (design.zoom = null)}>
        {design.zoom === null ? 'Fit' : `${percent}%`}
      </button>
      <Button variant="outline" size="icon" class="size-8" aria-label="Zoom in" onclick={() => zoomBy(0.1)}><Plus class="size-4" /></Button>
    </div>
  {/if}

  <Button variant={design.inspectorOpen ? 'default' : 'outline'} size="icon" class="order-3 size-8 sm:order-8" aria-label="Toggle inspector" title="Inspector" onclick={() => design.toggleInspector()}>
    <PanelRight class="size-4" />
  </Button>
</div>
