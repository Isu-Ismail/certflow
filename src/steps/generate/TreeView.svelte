<script lang="ts">
  // A long folder tree as one list: only the rows in view are drawn, so 10 000 files are as light as 10.
  import { buildTree, flatten, type TreeRow } from './tree';
  import { FileText, Folder, FolderOpen } from '@lucide/svelte';

  let { paths, every = false, query = '' }: { paths: string[]; every?: boolean; query?: string } = $props();

  const ROW = 26;
  let scroller: HTMLDivElement | undefined = $state();
  let top = $state(0);
  let height = $state(420);
  /** folders the user opened (true) or closed (false) by hand */
  let touched = $state<Record<string, boolean>>({});

  const needle = $derived(query.trim().toLowerCase());
  const filtered = $derived(needle ? paths.filter((p) => p.toLowerCase().includes(needle)) : paths);
  const root = $derived(buildTree(filtered));
  const firstBatch = $derived([...root.dirs.keys()][0] ?? '');
  const everything = $derived(every || !!needle); // everything open when listing every file or searching

  const isOpen = (d: { path: string }, depth: number) => {
    if (d.path in touched) return touched[d.path];
    if (everything) return true;
    // the shape is visible at once: the first batch fully open, the others closed
    return depth === 0 || (depth >= 1 && (d.path === firstBatch || d.path.startsWith(firstBatch + '/')));
  };

  const rows = $derived(flatten(root, isOpen, every ? Infinity : 3, every ? Infinity : 40));
  const start = $derived(Math.max(0, Math.floor(top / ROW) - 8));
  const end = $derived(Math.min(rows.length, Math.ceil((top + height) / ROW) + 8));
  const visible = $derived(rows.slice(start, end));

  const toggle = (r: TreeRow) => { if (r.kind === 'dir') touched = { ...touched, [r.path]: !r.open }; };
</script>

<div
  bind:this={scroller}
  bind:clientHeight={height}
  class="h-[52dvh] overflow-y-auto rounded-md border-2 border-ink bg-white"
  onscroll={(e) => (top = e.currentTarget.scrollTop)}
  role="tree"
  aria-label="Folders and files"
>
  <div style="height:{rows.length * ROW}px;position:relative">
    <div style="position:absolute;left:0;right:0;top:{start * ROW}px">
      {#each visible as r (r.kind + r.path)}
        <div class="flex items-center gap-1.5 pr-2" style="height:{ROW}px;padding-left:{6 + r.depth * 16}px">
          {#if r.kind === 'dir'}
            <button class="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left hover:bg-step-soft" onclick={() => toggle(r)} aria-expanded={r.open} role="treeitem" aria-selected="false">
              {#if r.open}<FolderOpen class="size-4 shrink-0" />{:else}<Folder class="size-4 shrink-0" />{/if}
              <span class="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold">{r.name}/</span>
            </button>
            <span class="rounded border border-ink bg-white px-1.5 font-mono text-[11px]">{r.total}</span>
          {:else if r.kind === 'file'}
            <FileText class="size-4 shrink-0 text-mute" />
            <span class="min-w-0 flex-1 truncate font-mono text-xs">{r.name}</span>
            {#if r.pages > 1}<span class="font-mono text-[11px] text-mute">{r.pages} pages</span>{/if}
          {:else}
            <span class="font-mono text-xs text-mute">{r.text}</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  {#if !rows.length}<p class="p-6 text-center text-sm text-mute">Nothing matches.</p>{/if}
</div>
