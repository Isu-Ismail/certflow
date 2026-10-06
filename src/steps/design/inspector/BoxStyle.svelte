<script lang="ts">
  import { visual } from '../visual/visual.svelte';

  const st = $derived(visual.styleOf());
  const field = 'h-8 w-full rounded-md border-2 border-ink bg-white px-2 text-sm';
  const cap = 'mb-1 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);
  const css = (prop: string, value: string, label: string) => visual.setStyle(prop, value, label);
  const colour = (v: string) => (v.startsWith('#') ? v : '#ffffff');
</script>

{#if st}
  <div class="space-y-3 px-1">
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class={cap} for="fill">Fill</label>
        <div class="flex gap-1">
          <input id="fill" type="color" class="h-8 min-w-0 flex-1 rounded-md border-2 border-ink bg-white p-0.5" value={colour(st.background)} onchange={(e) => css('background', e.currentTarget.value, 'Change fill')} />
          <button class="h-8 rounded-md border-2 border-ink px-1.5 text-xs font-semibold hover:bg-step-soft" title="No fill" onclick={() => css('background', 'transparent', 'Remove fill')}>None</button>
        </div>
      </div>
      <div>
        <label class={cap} for="opacity">Opacity %</label>
        <input id="opacity" type="number" min="0" max="100" class={field} value={Math.round(st.opacity * 100)} onchange={(e) => css('opacity', String(Math.min(100, Math.max(0, num(e))) / 100), 'Change opacity')} />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div>
        <label class={cap} for="border-w">Border</label>
        <input id="border-w" type="number" min="0" class={field} value={Math.round(st.borderWidth)} onchange={(e) => css('border', `${num(e)}px solid ${st.borderColor === 'transparent' ? '#121212' : st.borderColor}`, 'Change border')} />
      </div>
      <div>
        <label class={cap} for="border-c">Colour</label>
        <input id="border-c" type="color" class="h-8 w-full rounded-md border-2 border-ink bg-white p-0.5" value={colour(st.borderColor)} onchange={(e) => css('border', `${Math.max(1, st.borderWidth)}px solid ${e.currentTarget.value}`, 'Change border colour')} />
      </div>
      <div>
        <label class={cap} for="radius">Radius</label>
        <input id="radius" type="number" min="0" class={field} value={Math.round(st.radius)} onchange={(e) => css('border-radius', `${num(e)}px`, 'Change corner radius')} />
      </div>
    </div>
  </div>
{/if}
