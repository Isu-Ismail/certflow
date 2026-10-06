<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { design } from '../design.svelte';
  import { Database, Layers } from '@lucide/svelte';

  const active = $derived(design.active);
  const current = $derived(design.listKey);
</script>

<!-- the data lists; the one picked here is paired with the open design and fills its {fields} -->
{#if !ws.lists.length}
  <p class="px-1 text-sm text-mute">No data yet. Add a CSV or Excel file on the Data step.</p>
{:else}
  {#if active}
    <p class="mb-1.5 px-1 text-xs text-mute">Fills <b class="text-ink">{active.name}</b> with:</p>
  {/if}
  <ul class="space-y-1" role="radiogroup" aria-label="Data for this design">
    {#each ws.lists as list (list.key)}
      {@const on = list.key === current}
      <li>
        <button
          class="flex w-full items-center gap-2 rounded-md border-2 px-2 py-1.5 text-left text-sm disabled:cursor-default {on ? 'border-ink bg-step-soft font-semibold shadow-hard' : 'border-transparent hover:bg-soft'}"
          role="radio"
          aria-checked={on}
          disabled={!active}
          title={active ? `Use ${list.label} for ${active.name}` : 'Create a design first'}
          onclick={() => active && ws.setDesignData(active.name, list.key)}
        >
          {#if list.key === 'combined'}<Layers class="size-4 shrink-0" />{:else}<Database class="size-4 shrink-0" />{/if}
          <span class="min-w-0 flex-1 truncate {list.key === 'combined' ? '' : 'font-mono text-xs'}">{list.label}</span>
          <span class="font-mono text-xs text-mute">{list.sheet.rows.length}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}
