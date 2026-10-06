<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Seg from '$lib/ui/Seg.svelte';
  import Card from './Card.svelte';
  import { gen } from './gen.svelte';

  const lists = $derived([...gen.built.configs.keys()]);
  const example = $derived([...gen.paths.values()][0] ?? gen.pattern);
  const columnsOf = (key: string) => ws.sheetOf(key)?.columns ?? [];
  const field = 'h-8 min-w-0 flex-1 rounded-md border-2 border-ink bg-white px-2 text-sm';
</script>

<Card
  title="Files"
  tip="How the certificates are saved. One PDF per student gives each person their own file. One PDF per batch puts everyone of a batch into one file."
  steps={['Pick one PDF per student or per batch.', 'Files are named after the identity column of your data (change it on the Data page).']}
>
  <Seg
    label="How the PDFs are made"
    disabled={gen.running}
    value={gen.settings.format}
    options={[{ value: 'separate', label: 'PDF per student', title: 'Every student gets their own PDF file' }, { value: 'combined', label: 'PDF per batch', title: 'Everyone in a batch (and group) goes into one PDF file' }]}
    onchange={(v) => gen.update({ format: v as 'separate' | 'combined' })}
  />
  <p class="truncate font-mono text-xs text-mute" title={example}>e.g. {example}</p>

  {#if gen.settings.format === 'separate'}
    <div class="space-y-1.5">
      {#each lists as list (list)}
        {@const cfg = gen.built.configs.get(list)}
        <label class="flex items-center gap-2 text-sm">
          <span class="shrink-0 font-semibold">{lists.length > 1 ? '' : 'Name after'}</span>
          {#if lists.length > 1}<span class="w-24 shrink-0 truncate font-mono text-xs" title={list}>{list}</span>{/if}
          <select class={field} disabled={gen.running} value={gen.settings.idColumns[list] ?? ''} onchange={(e) => gen.update({ idColumns: { ...gen.settings.idColumns, [list]: e.currentTarget.value } })} aria-label="Column that names the files of {list}">
            <option value="">Identity{cfg?.idAuto ? `: ${cfg.idColumn || 'row numbers'}` : ''}</option>
            {#each columnsOf(list) as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        </label>
      {/each}
    </div>
  {/if}
</Card>
