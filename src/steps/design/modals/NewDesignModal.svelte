<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { toast } from '$lib/ui/toast.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import Button from '$lib/ui/Button.svelte';
  import { PAGE_PRESETS, presetSize, readPageSize } from '$lib/render/page';
  import { blankDesign } from '$lib/templates/blank';
  import { cleanName } from '$lib/workspace/names';
  import { design } from '../design.svelte';
  import { FileUp } from '@lucide/svelte';

  type Mode = 'blank' | 'html';

  let mode = $state<Mode>('blank');
  let name = $state('');
  let presetId = $state('a4');
  let portrait = $state(false);
  let imported = $state<{ fileName: string; html: string } | null>(null);
  let input = $state<HTMLInputElement>();

  // A fresh form every time the modal opens.
  $effect(() => {
    if (design.newOpen) {
      mode = 'blank';
      name = `Design ${ws.designs.length + 1}`;
      presetId = 'a4';
      portrait = false;
      imported = null;
    }
  });

  const canCreate = $derived(!!cleanName(name) && (mode === 'blank' || !!imported));

  async function onFile(file: File | undefined) {
    if (!file) return;
    const html = await file.text();
    imported = { fileName: file.name, html };
    if (!cleanName(name) || /^Design \d+$/.test(name)) name = cleanName(file.name.replace(/\.html?$/i, ''));
    if (/<script[\s>]/i.test(html)) toast('This file has a script (often used to position things when the page loads). Scripts are off for safety, so some parts may sit in the wrong place. Use “Allow scripts…” below the page if you trust the file, or move that layout into CSS.');
  }

  function create() {
    if (!canCreate) return;
    let html: string;
    if (mode === 'html') {
      html = imported!.html;
    } else {
      const size = presetSize(presetId, portrait)!;
      // use the first data column as the recipient field, so the starter works with this data straight away
      html = blankDesign({ title: name, size, nameToken: ws.sheet?.columns[0] ?? 'Name' });
    }
    const final = ws.addDesign(name, html);
    design.select(final);
    design.newOpen = false;
    toast(`Created “${final}”`, 'success');
  }

  const cap = 'mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
  const tab = (active: boolean) => `h-9 flex-1 text-sm font-semibold ${active ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'}`;
</script>

<Modal bind:open={design.newOpen} title="New design" size="md">
  <div class="space-y-5">
    <div class="inline-flex w-full overflow-hidden rounded-md border-2 border-ink" role="group" aria-label="How to start">
      <button class={tab(mode === 'blank')} aria-pressed={mode === 'blank'} onclick={() => (mode = 'blank')}>Blank page</button>
      <button class="{tab(mode === 'html')} border-l-2 border-ink" aria-pressed={mode === 'html'} onclick={() => (mode = 'html')}>From an HTML file</button>
    </div>

    <div>
      <label class={cap} for="design-name">Name</label>
      <div class="flex items-center gap-2">
        <input id="design-name" class="h-9 min-w-0 flex-1 rounded-md border-2 border-ink px-2.5 text-sm" bind:value={name} spellcheck="false" onkeydown={(e) => e.key === 'Enter' && create()} />
        <span class="font-mono text-xs text-mute">.cert.html</span>
      </div>
    </div>

    {#if mode === 'blank'}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class={cap} for="new-size">Page size</label>
          <select id="new-size" class="h-9 w-full rounded-md border-2 border-ink bg-white px-2 text-sm" bind:value={presetId}>
            {#each PAGE_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
          </select>
        </div>
        <div>
          <span class={cap}>Orientation</span>
          <div class="inline-flex w-full overflow-hidden rounded-md border-2 border-ink" role="group">
            <button class={tab(!portrait)} aria-pressed={!portrait} onclick={() => (portrait = false)}>Landscape</button>
            <button class="{tab(portrait)} border-l-2 border-ink" aria-pressed={portrait} onclick={() => (portrait = true)}>Portrait</button>
          </div>
        </div>
      </div>
      <p class="text-sm text-mute">Starts with a simple frame, a title and a <span class="font-mono">{`{${ws.sheet?.columns[0] ?? 'Name'}}`}</span> field. You can change everything.</p>
    {:else}
      <div>
        <button class="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-ink px-4 py-8 text-center hover:bg-step-soft" onclick={() => input?.click()}>
          <FileUp class="size-6" />
          {#if imported}
            <span class="font-mono text-sm font-semibold">{imported.fileName}</span>
            <span class="text-sm text-mute">Page size {readPageSize(imported.html).width}×{readPageSize(imported.html).height}px · click to choose another</span>
          {:else}
            <span class="font-semibold">Choose an .html file</span>
            <span class="text-sm text-mute">Use {'{Name}'} style fields. Images should point to <span class="font-mono">files/…</span> — upload them in the Files section.</span>
          {/if}
        </button>
        <input bind:this={input} type="file" accept=".html,.htm,text/html" class="hidden" onchange={(e) => { onFile(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />
      </div>
    {/if}
  </div>

  {#snippet footer()}
    <Button variant="outline" onclick={() => (design.newOpen = false)}>Cancel</Button>
    <Button variant="dark" disabled={!canCreate} onclick={create}>Create design</Button>
  {/snippet}
</Modal>
