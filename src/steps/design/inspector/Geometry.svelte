<script lang="ts">
  import { visual } from '../visual/visual.svelte';
  import { setGeometry } from '../visual/ops';

  const b = $derived(visual.box);
  const field = 'h-8 w-full rounded-md border-2 border-ink bg-white px-2 text-sm tabular-nums';
  const cap = 'mb-1 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';

  const set = (key: 'x' | 'y' | 'w' | 'h', e: Event) => {
    const v = Number((e.currentTarget as HTMLInputElement).value);
    if (!Number.isNaN(v)) setGeometry(visual, { [key]: v });
  };
</script>

{#if b}
  <div class="grid grid-cols-2 gap-2 px-1">
    {#each [['x', 'X', b.x], ['y', 'Y', b.y], ['w', 'Width', b.w], ['h', 'Height', b.h]] as const as [key, label, value] (key)}
      <div>
        <label class={cap} for="geo-{key}">{label}</label>
        <input id="geo-{key}" type="number" class={field} value={Math.round(value)} onchange={(e) => set(key, e)} />
      </div>
    {/each}
  </div>
{/if}
