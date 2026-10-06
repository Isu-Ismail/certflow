<script lang="ts">
  import { visual } from '../visual/visual.svelte';
  import { Type, Image, Square, Layers as Group } from '@lucide/svelte';

  const icons = { text: Type, image: Image, shape: Square, group: Group };

  // keep the selected layer visible when it was picked by clicking on the page
  $effect(() => {
    if (visual.selected !== null) document.querySelector(`[data-layer="${visual.selected}"]`)?.scrollIntoView({ block: 'nearest' });
  });
</script>

{#if visual.layers.length}
  <ul class="space-y-0.5">
    {#each visual.layers as l (l.id)}
      {@const Icon = icons[l.kind]}
      {@const on = visual.selected === l.id}
      <li>
        <button
          data-layer={l.id}
          class="flex w-full items-center gap-2 rounded-md border-[1.5px] px-1.5 py-1 text-left text-[13px] {on ? 'border-ink bg-step-soft font-semibold' : 'border-transparent hover:bg-soft'}"
          onclick={() => visual.select(l.id)}
          onpointerenter={() => visual.setHover(l.id)}
          onpointerleave={() => visual.setHover(null)}
        >
          <Icon class="size-4 shrink-0 text-mute" />
          <span class="truncate">{l.label}</span>
        </button>
      </li>
    {/each}
  </ul>
{:else}
  <p class="px-1 text-sm text-mute">No layers yet. Use Add above the page.</p>
{/if}
