<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { NO_VALUE, OPERATORS, type Clause, type Operator } from '$lib/flow/types';
  import { flowUi } from '../flow.svelte';
  import { X } from '@lucide/svelte';

  let { clause, canRemove, onchange, onremove, compact = false, listKey = flowUi.defaultKey }: {
    clause: Clause;
    /** the data list whose columns and values are offered */
    listKey?: string;
    /** stacked layout for narrow places (graph nodes) */
    compact?: boolean;
    canRemove: boolean;
    onchange: (next: Clause) => void;
    onremove: () => void;
  } = $props();

  const field = $derived(compact ? 'h-7 rounded-md border-2 border-ink bg-white px-1.5 text-xs' : 'h-8 rounded-md border-2 border-ink bg-white px-2 text-sm');
  // the values that exist in this column, offered while typing
  const sheet = $derived(ws.sheetOf(listKey));
  const columns = $derived(sheet?.columns ?? []);
  const suggestions = $derived([...new Set((sheet?.rows ?? []).map((r) => r[clause.column] ?? '').filter(Boolean))].slice(0, 40));
  const listId = $derived(`vals-${clause.column.replace(/\W/g, '_')}`);
  const needsValue = $derived(!NO_VALUE.includes(clause.op));
  const known = $derived(columns.includes(clause.column));
</script>

<div class="nodrag flex items-center gap-1.5 {compact ? '' : 'flex-wrap gap-2'}">
  <select class="{field} min-w-0 {compact ? 'w-[32%] shrink-0' : 'flex-1 basis-32'} {known ? '' : 'border-[#d6361f]'}" aria-label="Column" value={clause.column} onchange={(e) => onchange({ ...clause, column: e.currentTarget.value })}>
    {#if !known}<option value={clause.column}>{clause.column} (missing)</option>{/if}
    {#each columns as c (c)}<option value={c}>{c}</option>{/each}
  </select>
  <select class="{field} min-w-0 {compact ? 'w-[26%] shrink-0' : 'w-36'}" aria-label="Condition" value={clause.op} onchange={(e) => onchange({ ...clause, op: e.currentTarget.value as Operator })}>
    {#each OPERATORS as o (o)}<option value={o}>{o}</option>{/each}
  </select>
  {#if needsValue}
    <input class="{field} min-w-0 flex-1 {compact ? 'basis-16' : 'basis-28'}" aria-label="Value" list={listId} value={clause.value} placeholder="value" onchange={(e) => onchange({ ...clause, value: e.currentTarget.value })} />
    <datalist id={listId}>{#each suggestions as v (v)}<option value={v}></option>{/each}</datalist>
  {/if}
  {#if canRemove}
    <button class="grid {compact ? 'size-6' : 'size-8'} shrink-0 place-items-center rounded-md text-mute hover:bg-[#fbd5cf] hover:text-ink" aria-label="Remove this condition" onclick={onremove}><X class="size-4" /></button>
  {/if}
</div>
