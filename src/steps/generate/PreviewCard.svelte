<script lang="ts">
  import Button from '$lib/ui/Button.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import Card from './Card.svelte';
  import { gen } from './gen.svelte';
  import { Download, ExternalLink, Eye, ChevronLeft, ChevronRight } from '@lucide/svelte';

  let open = $state(false);
  let at = $state(0);
  const list = $derived(gen.preview);
  const current = $derived(list[Math.min(at, list.length - 1)]);

  const view = (i: number) => { at = i; open = true; };
  const download = (p: { url: string; label: string }) => {
    const a = Object.assign(document.createElement('a'), { href: p.url, download: `${p.label || 'certificate'}.pdf` });
    a.click();
  };
  const newTab = (p: { url: string }) => window.open(p.url, '_blank');
  const step = (d: number) => (at = (at + d + list.length) % list.length);
</script>

{#if list.length}
  <Card
    title="Preview"
    tip="Ten random certificates, one for every different way through your flow. Nothing is saved. Open one in a big window, in a browser tab, or download it."
    steps={['View opens a big window you can scroll and zoom.', 'Tab opens the PDF in a browser tab.', 'Press Preview 10 again for another ten.']}
  >
    <ul class="grid grid-cols-2 gap-1.5">
      {#each list as p, i (p.key)}
        <li class="flex items-center gap-0.5 rounded-md border-2 border-ink bg-white p-1">
          <button class="min-w-0 flex-1 px-1 text-left" onclick={() => view(i)} title={`${p.design}: ${p.route.join(' → ')}`}>
            <span class="block truncate text-sm font-bold">{p.label}</span>
          </button>
          <button class="grid size-7 place-items-center rounded hover:bg-step-soft" aria-label="View {p.label}" title="View" onclick={() => view(i)}><Eye class="size-4" /></button>
          <button class="grid size-7 place-items-center rounded hover:bg-step-soft" aria-label="Open {p.label} in a browser tab" title="Open in a tab" onclick={() => newTab(p)}><ExternalLink class="size-4" /></button>
          <button class="grid size-7 place-items-center rounded hover:bg-step-soft" aria-label="Download {p.label}" title="Download" onclick={() => download(p)}><Download class="size-4" /></button>
        </li>
      {/each}
    </ul>
  </Card>

  <Modal bind:open title={current ? `Preview · ${current.label}` : 'Preview'} size="lg">
    {#if current}
      <div class="mb-3 flex flex-wrap items-center gap-1 text-xs" aria-label="How this certificate got here">
        {#each current.route as step, i (i)}{#if i}<span class="text-mute">→</span>{/if}<span class="rounded border-[1.5px] border-ink bg-step-soft px-1.5 py-0.5">{step}</span>{/each}
      </div>
      <iframe title="Preview of {current.label}" src="{current.url}#view=Fit" class="h-[62dvh] w-full rounded-md border-2 border-ink bg-paper"></iframe>
    {/if}
    {#snippet footer()}
      <span class="mr-auto font-mono text-xs text-mute">{at + 1} / {list.length}</span>
      <Button size="sm" variant="outline" onclick={() => step(-1)} aria-label="Previous"><ChevronLeft class="size-4" /></Button>
      <Button size="sm" variant="outline" onclick={() => step(1)} aria-label="Next"><ChevronRight class="size-4" /></Button>
      {#if current}
        <Button size="sm" variant="outline" onclick={() => newTab(current)}><ExternalLink class="size-4" />Open in a tab</Button>
        <Button size="sm" variant="dark" onclick={() => download(current)}><Download class="size-4" />Download</Button>
      {/if}
    {/snippet}
  </Modal>
{/if}
