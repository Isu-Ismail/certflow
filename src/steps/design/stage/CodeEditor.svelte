<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { design } from '../design.svelte';
  import type { Editor } from './editor/cm';

  let { value }: { value: string } = $props();

  let host: HTMLDivElement;
  let editor = $state.raw<Editor | null>(null);
  let failed = $state(false);
  let cursor = $state({ line: 1, col: 1 });
  let problems = $state(0);

  // CodeMirror is downloaded only when the editor is first shown.
  onMount(() => {
    let alive = true;
    import('./editor/cm')
      .then(({ createEditor }) => {
        if (!alive) return;
        editor = createEditor(host, value, {
          onChange: (doc) => design.setDraft(doc),
          onBlur: () => design.commitDraft(),
          onCursor: (line, col) => (cursor = { line, col }),
          onProblems: (n) => (problems = n),
        });
      })
      .catch(() => (failed = true));
    return () => { alive = false; };
  });

  onDestroy(() => {
    design.commitDraft();
    editor?.destroy();
  });

  // Changes that did not come from typing (undo, redo…) are pushed into the editor.
  $effect(() => {
    const text = value;
    if (editor && text !== editor.getDoc()) editor.setDoc(text);
  });
</script>

<div class="flex h-full min-h-0 flex-col bg-white">
  <div class="relative min-h-0 flex-1">
    <div bind:this={host} class="absolute inset-0"></div>
    {#if !editor}
      <p class="absolute inset-0 grid place-items-center text-sm text-mute">{failed ? 'The editor could not be loaded.' : 'Loading editor…'}</p>
    {/if}
  </div>
  <div class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-0.5 border-t-2 border-ink bg-paper px-3 py-1 font-mono text-xs">
    <span>Ln {cursor.line}, Col {cursor.col}</span>
    <span class={problems ? 'font-bold text-[#b8860b]' : 'text-mute'}>{problems ? `${problems} HTML problem${problems === 1 ? '' : 's'}` : 'No HTML problems'}</span>
    <span class="ml-auto text-mute">changes show live</span>
  </div>
</div>
