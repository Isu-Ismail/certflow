<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Button from '$lib/ui/Button.svelte';
  import Seg from '$lib/ui/Seg.svelte';
  import OutputTreeModal from './OutputTreeModal.svelte';
  import { FolderTree } from '@lucide/svelte';
  import Card from './Card.svelte';
  import { gen } from './gen.svelte';

  const lists = $derived([...gen.built.configs.keys()]);
  const stem = (n: string) => n.replace(/\.[^.]+$/, '');
  const autoText = $derived(
    [...gen.built.configs].map(([list, c]) => `${lists.length > 1 ? stem(list) + ' → ' : ''}${c.groupColumn || 'no repeated column'}`).join(' · '),
  );
  let treeOpen = $state(false);
  const columnsOf = (key: string) => ws.sheetOf(key)?.columns ?? [];
  const field = 'h-8 min-w-0 flex-1 rounded-md border-2 border-ink bg-white px-2 text-sm';
</script>

<Card
  title="Folders"
  tip="Sub-folders inside each batch folder, for example one folder per team. With several data files, each file gets its own folder and only its own people are inside it. Auto looks for a column whose values repeat (a team, a class) and uses it."
  steps={['Auto: folders are made for you.', 'Choose: pick the column for each data file yourself.', 'None: all files of a batch sit together.']}
>
  <Seg
    label="Sub-folders"
    disabled={gen.running}
    value={gen.settings.group}
    options={[{ value: 'none', label: 'None' }, { value: 'auto', label: 'Auto' }, { value: 'custom', label: 'Choose' }]}
    onchange={(v) => gen.update({ group: v as 'none' | 'auto' | 'custom' })}
  />

  {#if gen.settings.group === 'auto'}
    <p class="text-sm text-mute">{lists.length > 1 ? 'A folder per data file, then ' : 'By '}<b class="text-ink">{autoText}</b></p>
  {:else if gen.settings.group === 'custom'}
    <div class="space-y-1.5">
      {#each lists as list (list)}
        <label class="flex items-center gap-2 text-sm">
          {#if lists.length > 1}<span class="w-24 shrink-0 truncate font-mono text-xs" title={list}>{list}</span>{/if}
          <select class={field} disabled={gen.running} value={gen.settings.groupColumns[list] ?? ''} onchange={(e) => gen.update({ groupColumns: { ...gen.settings.groupColumns, [list]: e.currentTarget.value } })} aria-label="Group {list} by">
            <option value="">No folders for this file</option>
            {#each columnsOf(list) as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        </label>
      {/each}
      {#if lists.length > 1}
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" class="size-4" checked={gen.settings.groupByList} disabled={gen.running} onchange={(e) => gen.update({ groupByList: e.currentTarget.checked })} />A separate folder for each data file</label>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-mute">All files of a batch in one folder.</p>
  {/if}

  <Button size="sm" variant="outline" class="w-full" onclick={() => (treeOpen = true)} disabled={!gen.paths.size}><FolderTree class="size-4" />View folder structure</Button>
</Card>

<OutputTreeModal bind:open={treeOpen} />
