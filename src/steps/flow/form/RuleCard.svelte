<script lang="ts">
  import { newClause } from '$lib/flow/ops';
  import type { FormRule, Target } from '$lib/flow/types';
  import { flowUi } from '../flow.svelte';
  import ClauseRow from './ClauseRow.svelte';
  import TargetSelect from './TargetSelect.svelte';
  import { ArrowUp, ArrowDown, Trash, Plus } from '@lucide/svelte';

  let { rule, index, total, rows, listKey, onchange, onmove, onremove }: {
    rule: FormRule;
    /** the data list this rule looks at */
    listKey: string;
    index: number;
    total: number;
    /** rows that take this rule */
    rows: number;
    onchange: (r: FormRule) => void;
    onmove: (delta: -1 | 1) => void;
    onremove: () => void;
  } = $props();

  const set = (i: number, clause: FormRule['clauses'][number]) => onchange({ ...rule, clauses: rule.clauses.map((c, k) => (k === i ? clause : c)) });
  const iconBtn = 'grid size-8 place-items-center rounded-md text-mute hover:bg-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30';
</script>

<section class="rounded-lg border-2 border-ink bg-white shadow-hard">
  <div class="flex items-center gap-2 border-b-2 border-ink px-3 py-2">
    <span class="grid size-7 place-items-center rounded-full border-2 border-ink bg-ink font-mono text-xs font-bold text-white">{index + 1}</span>
    <span class="font-bold">If</span>
    {#if rule.clauses.length > 1}
      <select class="h-8 rounded-md border-2 border-ink bg-white px-2 text-sm font-semibold" aria-label="Match all or any" value={rule.match} onchange={(e) => onchange({ ...rule, match: e.currentTarget.value as 'all' | 'any' })}>
        <option value="all">all of these</option>
        <option value="any">any of these</option>
      </select>
    {:else}
      <span class="text-mute">this is true</span>
    {/if}
    <span class="flex-1"></span>
    <span class="rounded border-[1.5px] border-ink bg-step-soft px-2 py-0.5 font-mono text-xs">{rows} {rows === 1 ? 'row' : 'rows'}</span>
    <button class={iconBtn} aria-label="Move up" disabled={index === 0} onclick={() => onmove(-1)}><ArrowUp class="size-4" /></button>
    <button class={iconBtn} aria-label="Move down" disabled={index === total - 1} onclick={() => onmove(1)}><ArrowDown class="size-4" /></button>
    <button class="{iconBtn} hover:bg-[#fbd5cf]" aria-label="Delete this rule" onclick={onremove}><Trash class="size-4" /></button>
  </div>

  <div class="space-y-2 px-3 py-3">
    {#each rule.clauses as clause, i (i)}
      <ClauseRow {listKey} {clause} canRemove={rule.clauses.length > 1} onchange={(c) => set(i, c)} onremove={() => onchange({ ...rule, clauses: rule.clauses.filter((_, k) => k !== i) })} />
    {/each}
    <button class="inline-flex items-center gap-1 text-sm font-semibold text-mute hover:text-ink" onclick={() => onchange({ ...rule, clauses: [...rule.clauses, newClause(flowUi.columnsFor()[0] ?? '')] })}>
      <Plus class="size-4" />Add a condition
    </button>
  </div>

  <div class="flex flex-wrap items-center gap-2 border-t-2 border-ink bg-paper px-3 py-2">
    <span class="font-bold">Then use</span>
    <TargetSelect target={rule.target} onchange={(t) => t && onchange({ ...rule, target: t as Target })} />
  </div>
</section>
