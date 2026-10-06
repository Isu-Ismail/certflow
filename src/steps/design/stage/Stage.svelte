<script lang="ts">
  import { onDestroy } from 'svelte';
  import { ws } from '$lib/workspace/store.svelte';
  import { compileDesign } from '$lib/render/compile';
import { bakeScripts } from '$lib/render/bake';
  import { readPageSize } from '$lib/render/page';
  import { design } from '../design.svelte';
  import { visual } from '../visual/visual.svelte';
  import VisualLayer from '../visual/VisualLayer.svelte';
  import Toolbar from './Toolbar.svelte';
  import PagePreview from './PagePreview.svelte';
  import StatusLine from './StatusLine.svelte';
  import CodeEditor from './CodeEditor.svelte';

  let width = $state(0);
  let height = $state(0);

  const active = $derived(design.active);
  const html = $derived(design.html); // what is typed right now, or the saved design
  const size = $derived(active ? readPageSize(html) : { width: 1123, height: 794 });
  const showCode = $derived(design.mode !== 'preview');
  const showPage = $derived(design.mode !== 'code');
  const trusted = $derived(active ? design.isTrusted(active.name) : false);

  // Fit = the whole page visible with a little air around it.
  $effect(() => {
    design.fit = Math.max(0.15, Math.min((width - 48) / size.width, (height - 48) / size.height, 1.5));
  });

  // The preview document. A visual edit (drag, resize, style…) is already shown live and saved as HTML
  // the editor produced itself, so that case must NOT reload the iframe.
  let srcdoc = $state('');
  let previous: unknown[] = [];
  let renders = 0;
  $effect(() => {
    if (!active || !showPage) {
      srcdoc = '';
      visual.detach();
      // forget what was compiled: when the page comes back (Code -> Split) it MUST be compiled again
      previous = [];
      visual.liveHtml = '';
      return;
    }
    const inputs = [design.row, design.showFields, ws.files, ws.tokenMap, design.renderKey, trusted, active.name, size.width, size.height];
    const unchanged = inputs.length === previous.length && inputs.every((v, i) => v === previous[i]);
    previous = inputs;
    if (unchanged && html === visual.liveHtml) return;
    visual.liveHtml = html; // the page now matches this HTML (so an undo/redo to other HTML will reload it)
    const css = getComputedStyle(document.body);
    // The comment makes every compile a NEW string: after an undo the HTML can compile to exactly the text the
    // iframe was loaded with, yet the iframe's live DOM was changed by dragging — it must be reloaded anyway.
    const render = ++renders;
    const compiled = compileDesign(html, {
      row: design.row,
      columns: design.columns,
      fieldMap: ws.tokenMap,
      files: ws.files,
      size,
      showFields: design.showFields,
      allowScripts: trusted,
      editable: true,
      accent: css.getPropertyValue('--c').trim() || undefined,
      onAccent: css.getPropertyValue('--on').trim() || undefined,
    });
    // a trusted design runs its scripts in an isolated frame first; the page shown has no scripts
    if (!trusted) { srcdoc = `<!--render ${render}-->` + compiled; return; }
    void bakeScripts(compiled).then((baked) => { if (render === renders) srcdoc = `<!--render ${render}-->` + baked; });
  });

  onDestroy(() => visual.detach());
</script>

<div class="flex min-w-0 flex-1 flex-col">
  <Toolbar />

  <!-- Split: code left, page right (stacked on phones) -->
  <div class="flex min-h-0 flex-1 flex-col md:flex-row">
    {#if showCode && active}
      <div class="min-h-0 min-w-0 {showPage ? 'h-1/2 border-b-2 border-ink md:h-auto md:w-1/2 md:border-r-2 md:border-b-0' : 'flex-1'}">
        {#key active.name}<CodeEditor value={html} />{/key}
      </div>
    {/if}

    {#if showPage}
      <div class="min-h-0 min-w-0 flex-1 overflow-auto bg-[#ece8dc]" bind:clientWidth={width} bind:clientHeight={height}>
        <div class="flex min-h-full min-w-fit items-center justify-center p-6">
          {#if active}
            <PagePreview {srcdoc} {size} scale={design.scale} onload={(frame) => visual.attach(frame)}>
              {#snippet overlay(frame)}<VisualLayer {frame} />{/snippet}
            </PagePreview>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <StatusLine />
</div>
