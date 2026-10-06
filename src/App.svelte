<script lang="ts">
  import { onMount } from 'svelte';
  import { preloadGraph } from './steps/flow/graph/loader.svelte';
  import { ws } from '$lib/workspace/store.svelte';
  import Header from '$lib/layout/Header.svelte';
  import Toaster from '$lib/ui/Toaster.svelte';
  import ProblemDialog from './lib/layout/ProblemDialog.svelte';
  import ConfirmDialog from '$lib/ui/ConfirmDialog.svelte';
  import { confirmStore } from '$lib/ui/confirm.svelte';
  import { redo, saveNow, undo } from '$lib/workspace/actions';
  import { reportUnexpectedErrors, watchOtherTabs } from '$lib/workspace/guard';
  import DataStep from './steps/data/DataStep.svelte';
  import DesignStep from './steps/design/DesignStep.svelte';
  import FlowStep from './steps/flow/FlowStep.svelte';
  import GenerateStep from './steps/generate/GenerateStep.svelte';

  onMount(() => {
    // fetch the node graph editor while the user is busy on the Data step
    const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500));
    idle(() => preloadGraph());
    reportUnexpectedErrors();
    watchOtherTabs();
    ws.restore();
    // never lose an edit: save as soon as the page is hidden, closed or reloaded
    const flush = () => ws.flush();
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  });
  $effect(() => {
    document.body.dataset.step = ws.step;
  });

  // Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo. Inside a text field the browser's own undo is used.
  function onKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || confirmStore.req) return;
    // Ctrl/Cmd+S saves right away, even while typing in a field or the code editor (never the browser's own save-page)
    if (e.key.toLowerCase() === 's' && !e.shiftKey) { e.preventDefault(); saveNow(); return; }
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
  }

</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex h-dvh flex-col">
  <Header />

  <main class="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border-2 border-ink bg-white shadow-hard-lg sm:mx-3 sm:mb-3">
    {#if !ws.ready}
      <!-- waiting for the autosave to load -->
    {:else if ws.step === 'data'}
      <DataStep />
    {:else if ws.step === 'design'}
      <DesignStep />
    {:else if ws.step === 'flow'}
      <FlowStep />
    {:else}
      <GenerateStep />
    {/if}
  </main>
</div>

<Toaster />
<ConfirmDialog />
<ProblemDialog />
