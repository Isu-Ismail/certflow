<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { blobUrl } from '$lib/render/assets';
  import Menu, { type MenuItem } from '$lib/ui/Menu.svelte';
  import { design } from '../design.svelte';
  import { visual } from '../visual/visual.svelte';
  import { addImage, addShape, addText } from '../visual/ops';
  import { addBodyText, addFrame, addHeader, addRecipient, addSeal, addSignature, addSubtitle, addTitle } from '../visual/components';
  import { setBackgroundImage } from '../visual/background';
  import { Plus } from '@lucide/svelte';

  /** Natural size of an image file, so it is added with the right proportions. */
  function measure(blob: Blob): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 240, h: 240 });
      img.src = blobUrl(blob);
    });
  }

  const images = $derived(ws.files.filter((f) => f.blob.type.startsWith('image/')));

  // The page-colour controls live in the inspector (Page, with nothing selected).
  function openPagePanel() {
    visual.select(null);
    if (!design.inspectorOpen) design.toggleInspector();
  }

  const items = $derived<MenuItem[]>([
    { label: 'Basics', heading: true },
    { label: 'Text', onselect: () => addText(visual) },
    { label: 'Rectangle', onselect: () => addShape(visual, 'rectangle') },
    { label: 'Line', onselect: () => addShape(visual, 'line') },
    ...images.map((f) => ({ label: `Image: ${f.name}`, onselect: async () => addImage(visual, f.name, await measure(f.blob)) })),

    { label: 'Certificate parts', heading: true },
    { label: 'Frame: classic double', onselect: () => addFrame(visual, 'classic') },
    { label: 'Frame: thin line', onselect: () => addFrame(visual, 'thin') },
    { label: 'Frame: gold', onselect: () => addFrame(visual, 'gold') },
    { label: 'Header (logos + institution)', onselect: () => addHeader(visual, images.map((f) => f.name)) },
    { label: 'Title', onselect: () => addTitle(visual) },
    { label: 'Subtitle', onselect: () => addSubtitle(visual) },
    { label: 'Recipient name (field)', onselect: () => addRecipient(visual, ws.sheet?.columns[0] ?? 'Name') },
    { label: 'Body text', onselect: () => addBodyText(visual) },
    { label: 'Signature', onselect: () => addSignature(visual) },
    { label: 'Seal', onselect: () => addSeal(visual) },

    { label: 'Page background', heading: true },
    { label: 'Colour…', onselect: openPagePanel },
    ...images.map((f) => ({ label: `Background: ${f.name}`, onselect: () => setBackgroundImage(visual, f.name) })),
    { label: 'Remove background image', onselect: () => setBackgroundImage(visual, null) },
  ]);
</script>

<Menu
  {items}
  align="left"
  label="Add to the page"
  triggerClass="inline-flex h-8 items-center gap-1.5 rounded-md border-2 border-ink bg-step px-2.5 text-sm font-semibold text-on-step shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
>
  {#snippet trigger()}<Plus class="size-4" />Add{/snippet}
</Menu>
