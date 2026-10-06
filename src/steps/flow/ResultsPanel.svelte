<script lang="ts">
  import type { RowRef } from '$lib/flow/types';
  import { ws } from '$lib/workspace/store.svelte';
  import { rootStarts } from '$lib/flow/ops';
  import { flowUi } from './flow.svelte';
  import { CircleAlert, TriangleAlert, ChevronDown } from '@lucide/svelte';

  const total = $derived(flowUi.total);
  const r = $derived(flowUi.result);
  const made = $derived([...r.byDesign.values()].reduce((n, v) => n + v.length, 0));
  const entries = $derived([...r.byDesign.entries()].sort((a, b) => b[1].length - a[1].length));
  const inLists = $derived(rootStarts(flowUi.graph).map((s) => { const key = s.source || flowUi.defaultKey; return { key, rows: ws.sheetOf(key)?.rows.length ?? 0 }; }));
  let open = $state<string | null>(null);

  const names = (rows: RowRef[], n = 8) => rows.slice(0, n).map((x) => flowUi.nameOf(x));
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const lists = (rows: RowRef[]) => [...new Set(rows.map((x) => x.source))];
  const h3 = 'mb-2 font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
  const tile = 'rounded-md border-2 border-ink px-2 py-1.5';
</script>

<div class="space-y-5 text-sm">
  {#if !total}
    <p class="text-mute">Add data to see how many rows go where.</p>
  {:else}
    <div>
      <h3 class={h3}>Summary</h3>
      <div class="grid grid-cols-2 gap-1.5">
        <div class="{tile} bg-white"><b class="block text-lg leading-tight">{total}</b><span class="text-xs text-mute">people in</span></div>
        <div class="{tile} bg-step-soft"><b class="block text-lg leading-tight">{made}</b><span class="text-xs text-mute">get a certificate</span></div>
        <div class="{tile} bg-white"><b class="block text-lg leading-tight">{r.skipped.length}</b><span class="text-xs text-mute">skipped on purpose</span></div>
        <div class="{tile} {r.unassigned.length ? 'bg-[#ffe9a8]' : 'bg-white'}"><b class="block text-lg leading-tight">{r.unassigned.length}</b><span class="text-xs text-mute">with no design</span></div>
      </div>
    </div>

    {#if inLists.length > 1}
      <div>
        <h3 class={h3}>Data in</h3>
        <ul class="space-y-0.5">{#each inLists as l, i (i)}<li class="flex gap-2"><span class="min-w-0 flex-1 truncate font-mono text-xs">{l.key}</span><span class="font-mono text-xs">{l.rows}</span></li>{/each}</ul>
      </div>
    {/if}

    <div>
      <h3 class={h3}>Designs</h3>
      <ul class="space-y-2">
        {#each entries as [design, rows] (design)}
          <li>
            <button class="w-full text-left" onclick={() => (open = open === design ? null : design)} aria-expanded={open === design}>
              <div class="flex items-center gap-2">
                <ChevronDown class="size-4 shrink-0 transition-transform {open === design ? '' : '-rotate-90'}" />
                <span class="min-w-0 flex-1 truncate font-semibold">{design}</span>
                <span class="font-mono text-xs">{rows.length} · {pct(rows.length)}%</span>
              </div>
              <div class="mt-1 ml-6 h-2 overflow-hidden rounded-sm border border-ink bg-white"><div class="h-full bg-step" style="width:{pct(rows.length)}%"></div></div>
              <p class="mt-0.5 ml-6 truncate text-xs text-mute">from {lists(rows).join(', ')}</p>
            </button>
            {#if open === design}
              <p class="mt-1 ml-6 text-xs text-mute">{names(rows).join(', ')}{rows.length > 8 ? ` … and ${rows.length - 8} more` : ''}</p>
            {/if}
          </li>
        {/each}
        {#if !entries.length}<li class="text-mute">No design is reached yet.</li>{/if}
      </ul>
    </div>

    <div>
      <h3 class={h3}>How people get there</h3>
      <ul class="space-y-2">
        {#each flowUi.routes.slice(0, 10) as route, i (i)}
          {@const key = `route-${i}`}
          <li class="rounded-md border-[1.5px] border-ink {route.outcome === 'none' ? 'bg-[#ffe9a8]' : 'bg-white'}">
            <button class="w-full px-2 py-1.5 text-left" onclick={() => (open = open === key ? null : key)} aria-expanded={open === key}>
              <div class="flex items-start gap-2">
                <span class="min-w-0 flex-1 text-xs leading-relaxed">
                  {#each route.steps as step, j (j)}{#if j}<span class="text-mute"> → </span>{/if}<span class={j === route.steps.length - 1 ? 'font-bold' : ''}>{step}</span>{/each}
                </span>
                <b class="font-mono text-xs">{route.refs.length}</b>
              </div>
            </button>
            {#if open === key}<p class="border-t border-soft px-2 py-1 text-xs text-mute">{names(route.refs, 12).join(', ')}{route.refs.length > 12 ? ` … and ${route.refs.length - 12} more` : ''}</p>{/if}
          </li>
        {/each}
        {#if flowUi.routes.length > 10}<li class="text-xs text-mute">… and {flowUi.routes.length - 10} more ways</li>{/if}
      </ul>
    </div>
  {/if}

  {#if flowUi.issues.length}
    <div>
      <h3 class={h3}>To check</h3>
      <ul class="space-y-1.5">
        {#each flowUi.issues as issue, i (i)}
          <li class="flex gap-2 text-xs">
            {#if issue.level === 'error'}<CircleAlert class="mt-0.5 size-4 shrink-0 text-[#d6361f]" />{:else}<TriangleAlert class="mt-0.5 size-4 shrink-0 text-[#b8860b]" />{/if}
            <span class="min-w-0 flex-1">{issue.message}
              {#if issue.fix}<button class="mt-1 block font-semibold underline underline-offset-2" onclick={() => ws.setDesignData(issue.fix!.design, issue.fix!.list)}>Pair “{issue.fix.design}” with {flowUi.label(issue.fix.list)}</button>{/if}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
