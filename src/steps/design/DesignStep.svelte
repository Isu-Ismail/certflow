<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Button from '$lib/ui/Button.svelte';
  import { design } from './design.svelte';
  import { visual } from './visual/visual.svelte';
  import { duplicate, nudge, remove } from './visual/ops';
  import Explorer from './explorer/Explorer.svelte';
  import Stage from './stage/Stage.svelte';
  import Inspector from './inspector/Inspector.svelte';
  import NewDesignModal from './modals/NewDesignModal.svelte';
  import FilePreviewModal from './modals/FilePreviewModal.svelte';
  import { FilePlus } from '@lucide/svelte';

  // Keyboard on the page: arrows move (Shift = 10px), Delete removes, Ctrl+D duplicates, Enter edits text, Esc deselects.
  // Ignored while typing in a field, the code editor or the page's own text editing.
  function onKey(e: KeyboardEvent) {
    if (design.mode === 'code' || visual.selected === null) return;
    if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"], .cm-editor')) return;
    const step = e.shiftKey ? 10 : 1;
    const mod = e.ctrlKey || e.metaKey;
    let handled = true;
    if (e.key === 'ArrowLeft') nudge(visual, -step, 0);
    else if (e.key === 'ArrowRight') nudge(visual, step, 0);
    else if (e.key === 'ArrowUp') nudge(visual, 0, -step);
    else if (e.key === 'ArrowDown') nudge(visual, 0, step);
    else if (e.key === 'Delete' || e.key === 'Backspace') remove(visual);
    else if (e.key === 'Escape') visual.select(null);
    else if (e.key === 'Enter' && visual.kind === 'text') visual.startEdit();
    else if (mod && e.key.toLowerCase() === 'd') duplicate(visual);
    else handled = false;
    if (handled) e.preventDefault();
  }

  const panel = 'absolute inset-y-0 z-20 w-[min(85vw,288px)] overflow-hidden bg-white';
</script>

<svelte:window onkeydown={onKey} />

{#if ws.designs.length === 0}
  <div class="grid min-h-64 flex-1 place-items-center px-6 py-10 text-center">
    <div class="max-w-md">
      <h1 class="text-2xl font-bold tracking-tight">Create your first design</h1>
      <p class="mt-2 text-mute">A design is one certificate page, saved as a <span class="font-mono text-sm">.cert.html</span> file. Start from a blank page or an HTML file you already have.</p>
      <Button variant="step" size="lg" class="mt-5" onclick={() => (design.newOpen = true)}><FilePlus class="size-5" />New design</Button>
    </div>
  </div>
{:else}
  <div class="relative flex min-h-0 flex-1">
    <!-- on phones the panels float over the page; this dims it and closes them -->
    {#if design.explorerOpen}<button class="absolute inset-0 z-10 bg-ink/40 md:hidden" aria-label="Close explorer" onclick={() => design.toggleExplorer()}></button>{/if}
    {#if design.inspectorOpen}<button class="absolute inset-0 z-10 bg-ink/40 lg:hidden" aria-label="Close inspector" onclick={() => design.toggleInspector()}></button>{/if}

    {#if design.explorerOpen}
      <aside class="{panel} left-0 border-r-2 border-ink md:static md:z-auto md:w-64 md:shrink-0" aria-label="Explorer"><Explorer /></aside>
    {/if}

    <Stage />

    {#if design.inspectorOpen}
      <aside class="{panel} right-0 border-l-2 border-ink lg:static lg:z-auto lg:w-72 lg:shrink-0" aria-label="Inspector"><Inspector /></aside>
    {/if}
  </div>
{/if}

<NewDesignModal />
<FilePreviewModal />
