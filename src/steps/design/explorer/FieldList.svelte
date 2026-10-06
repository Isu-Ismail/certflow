<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { toast } from '$lib/ui/toast.svelte';
  import { analyzeDesign } from '$lib/render/analyze';
  import { design } from '../design.svelte';
  import { visual } from '../visual/visual.svelte';
  import { insertField } from '../visual/ops';

  const sheet = $derived(design.sheet);
  const info = $derived(design.active ? analyzeDesign(design.html, design.columns, ws.tokenMap, ws.files.map((f) => f.name)) : null);
  // the data lists this design does NOT use: shown dimmed, so you can see what else exists
  const others = $derived(ws.lists.filter((l) => l.key !== design.listKey));

  // On the page: puts the field into the selected/edited text (or a new text). Otherwise just copies it.
  function add(column: string) {
    if (!column) return;
    if (design.mode !== 'code' && visual.doc) {
      insertField(visual, column);
      toast(`Inserted {${column}}`);
    } else copy(`{${column}}`);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${text}`);
    } catch {
      toast('Could not copy', 'error');
    }
  }
</script>

{#if sheet}
  <p class="mb-2 px-1 text-xs text-mute">
    Each field reads from a column of <span class="font-mono text-ink">{design.listKey === 'combined' ? 'the combined data' : sheet.fileName}</span>.
  </p>

  <!-- the fields this design uses, each with the column it reads -->
  {#if info?.tokens.length}
    <ul class="space-y-1.5 px-1">
      {#each info.tokens as t (t.token)}
        <li class="flex items-center gap-2 text-[13px]">
          <span class="max-w-[45%] shrink-0 truncate rounded border-[1.5px] border-ink px-1.5 py-0.5 font-mono text-xs whitespace-pre {t.column ? 'bg-step-soft' : 'bg-[#ffe9a8]'}" title={`{${t.token}}`}>{`{${t.token}}`}</span>
          <select
            class="h-7 min-w-0 flex-1 rounded border-[1.5px] bg-white px-1 text-xs {t.column ? 'border-ink' : 'border-[#b8860b]'}"
            aria-label="Column for {`{${t.token}}`}"
            value={t.column ?? ''}
            onchange={(e) => ws.setField(t.token, e.currentTarget.value === t.token ? '' : e.currentTarget.value)}
          >
            {#if !t.column}<option value="">choose a column</option>{/if}
            {#each sheet.columns as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        </li>
      {/each}
    </ul>
  {:else if design.active}
    <p class="px-1 text-sm text-mute">No fields used yet. Add one below, or write {'{Name}'} in the page text.</p>
  {/if}

  <!-- adds another field to the page -->
  {#if design.active}
    <select
      class="mt-2 h-8 w-full rounded-md border-2 border-ink bg-white px-2 text-sm font-semibold"
      aria-label="Add a field to the page"
      value=""
      onchange={(e) => { add(e.currentTarget.value); e.currentTarget.value = ''; }}
    >
      <option value="">+ Add a field…</option>
      {#each sheet.columns as c (c)}<option value={c}>{`{${c}}`}</option>{/each}
    </select>
  {/if}

  {#if others.length}
    <div class="mt-3 space-y-2 border-t border-soft pt-2 opacity-60" title="Not used by this design. Pick one of them in the Data section to switch.">
      {#each others as list (list.key)}
        <div>
          <p class="truncate px-1 font-mono text-xs text-mute">{list.label}</p>
          <div class="mt-1 flex flex-wrap gap-1">
            {#each list.sheet.columns as c (c)}<span class="rounded border border-mute px-1.5 py-px font-mono text-[11px] whitespace-pre">{`{${c}}`}</span>{/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
{:else}
  <p class="px-1 text-sm text-mute">Add data on the Data step to see its fields here.</p>
{/if}
