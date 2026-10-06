<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Button from '$lib/ui/Button.svelte';
  import { dataUi } from './data.svelte';
  import { Columns2, GitMerge, Rows3 } from '@lucide/svelte';

  // how each extra file is merged: all of them on the Combined tab, just its own on a file tab
  const indexes = $derived(
    ws.sources
      .map((_, i) => i)
      .filter((i) => i > 0 && (dataUi.view === i || (dataUi.view === 'combined' && step(i).mode !== 'separate'))),
  );
  const step = (i: number) => ws.combine[i - 1] ?? { mode: 'stack' as const };
  const report = (i: number) => ws.combined?.reports.find((r) => r.source === i);
  const change = (i: number) => (dataUi.pending = { sheet: ws.sources[i], editing: i });
</script>

{#if indexes.length}
  <div class="shrink-0 space-y-1.5">
    {#each indexes as i (i)}
      {@const s = step(i)}
      {@const r = report(i)}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm shadow-hard">
        {#if s.mode === 'join'}
          <GitMerge class="size-4 shrink-0" />
          <span class="min-w-0"><b class="font-mono">{ws.sources[i].fileName}</b> matched on <span class="font-mono">{s.leftKey}</span> = <span class="font-mono">{s.rightKey}</span></span>
          {#if r?.problem}
            <span class="rounded border-[1.5px] border-ink bg-[#fbd5cf] px-2 py-0.5 text-xs font-semibold">{r.problem}</span>
          {:else if r}
            <span class="rounded border-[1.5px] border-ink px-2 py-0.5 font-mono text-xs {r.unmatched.length ? 'bg-[#ffe9a8]' : 'bg-[#d8f6ec]'}">{r.matched} of {r.matched + r.unmatched.length} matched</span>
            {#if r.unmatched.length && dataUi.view === 'combined'}<span class="text-xs text-mute">unmatched rows are yellow</span>{/if}
          {/if}
        {:else if s.mode === 'separate'}
          <Columns2 class="size-4 shrink-0" />
          <span class="min-w-0"><b class="font-mono">{ws.sources[i].fileName}</b> is kept as a separate list. Choose it in the Design step to try a design with it.</span>
        {:else}
          <Rows3 class="size-4 shrink-0" />
          <span class="min-w-0"><b class="font-mono">{ws.sources[i].fileName}</b> adds its {ws.sources[i].rows.length} rows below (column <span class="font-mono">Source</span> says which file)</span>
        {/if}
        <span class="flex-1"></span>
        <Button size="sm" variant="outline" onclick={() => change(i)}>Change</Button>
      </div>
    {/each}
  </div>
{/if}
