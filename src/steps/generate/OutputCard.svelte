<script lang="ts">
  import Seg from '$lib/ui/Seg.svelte';
  import Card from './Card.svelte';
  import { gen } from './gen.svelte';
  import { DEFAULT_SETTINGS } from '$lib/generate/plan';

  const changed = $derived(JSON.stringify($state.snapshot(gen.settings)) !== JSON.stringify(DEFAULT_SETTINGS));
</script>

<Card
  title="Quality and names"
  tip="Sharpness is how finely the page is drawn: higher is sharper but slower and bigger. The page is a picture inside the PDF; with selectable text on, the words are also put in invisibly so you can select, search and copy them. The file path says where each PDF goes inside output/."
  steps={['Standard (about 200 dpi) is right for most prints.', 'In the path, {batch} {group} {id} {design} {list} are filled in for you. Leave it empty for the default.']}
>
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-sm font-semibold">Sharpness</span>
    <Seg
      label="Sharpness"
      disabled={gen.running}
      value={String(gen.settings.quality)}
      options={[{ value: '1', label: 'Draft' }, { value: '2', label: 'Standard' }, { value: '3', label: 'High' }]}
      onchange={(v) => gen.update({ quality: Number(v) as 1 | 2 | 3 }, true)}
    />
  </div>
  <div class="space-y-1">
    <span class="text-sm font-semibold">Page is drawn by</span>
    <Seg
      label="Who draws the page"
      disabled={gen.running}
      value={gen.settings.renderer}
      options={[{ value: 'browser', label: 'Browser (exact)', title: 'The browser itself draws the page: gradient text, masks, filters and shadows all come out right' }, { value: 'html2canvas', label: 'html2canvas (older)', title: 'A library that redraws the page by hand: simpler, but gradient text becomes solid blocks and some effects are missing' }]}
      onchange={(v) => gen.update({ renderer: v as 'browser' | 'html2canvas' }, true)}
    />
  </div>
  <label class="flex items-center gap-2 text-sm" title="The text is added to the PDF invisibly, over the picture">
    <input type="checkbox" class="size-4" checked={gen.settings.selectableText} disabled={gen.running} onchange={(e) => gen.update({ selectableText: e.currentTarget.checked }, true)} />Keep text selectable and searchable
  </label>
  <label class="block text-sm font-semibold">File path
    <input class="mt-1 h-8 w-full rounded-md border-2 border-ink bg-white px-2 font-mono text-xs font-normal" disabled={gen.running} value={gen.settings.pattern} placeholder={gen.pattern} spellcheck="false" onchange={(e) => gen.update({ pattern: e.currentTarget.value })} />
  </label>
  {#if changed}
    <button class="text-xs font-semibold text-mute underline underline-offset-2 hover:text-ink" disabled={gen.running} onclick={() => gen.reset()}>Back to the defaults</button>
  {/if}
</Card>
