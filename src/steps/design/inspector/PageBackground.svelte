<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { visual } from '../visual/visual.svelte';
  import { readBackground, setBackgroundColor, setBackgroundFit, setBackgroundImage, type Fit } from '../visual/background';

  // visual.src is not reactive (it is set when the page loads), so depend on `rev`, which changes then
  const bg = $derived.by(() => {
    void visual.rev;
    return visual.src ? readBackground(visual) : null;
  });
  const images = $derived(ws.files.filter((f) => f.blob.type.startsWith('image/')));

  const field = 'h-8 w-full rounded-md border-2 border-ink bg-white px-2 text-sm';
  const cap = 'mb-1 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
</script>

{#if bg}
  <div class="space-y-3">
    <div>
      <label class={cap} for="bg-colour">Background colour</label>
      <input id="bg-colour" type="color" class="h-8 w-full rounded-md border-2 border-ink bg-white p-0.5" value={bg.color.startsWith('#') ? bg.color : '#ffffff'} onchange={(e) => setBackgroundColor(visual, e.currentTarget.value)} />
    </div>

    <div>
      <label class={cap} for="bg-image">Background image</label>
      <select id="bg-image" class={field} value={bg.image ?? ''} onchange={(e) => setBackgroundImage(visual, e.currentTarget.value || null, bg.fit)}>
        <option value="">None</option>
        {#each images as f (f.name)}<option value={f.name}>{f.name}</option>{/each}
      </select>
      {#if !images.length}<p class="mt-1 text-xs text-mute">Upload a PNG, JPG or SVG in Files first.</p>{/if}
    </div>

    {#if bg.image}
      <div>
        <label class={cap} for="bg-fit">Fit</label>
        <select id="bg-fit" class={field} value={bg.fit} onchange={(e) => setBackgroundFit(visual, e.currentTarget.value as Fit)}>
          <option value="cover">Fill the page (crop)</option>
          <option value="contain">Fit inside</option>
          <option value="stretch">Stretch</option>
        </select>
      </div>
    {/if}
  </div>
{/if}
