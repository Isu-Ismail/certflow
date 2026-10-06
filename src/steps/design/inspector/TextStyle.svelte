<script lang="ts">
  import { visual } from '../visual/visual.svelte';
  import { setFont } from '../visual/ops';
  import { firstFamily, GOOGLE_FONTS, SYSTEM_FONTS } from '../visual/fonts';
  import { Bold, Italic, Underline, TextAlignStart, TextAlignCenter, TextAlignEnd } from '@lucide/svelte';

  const st = $derived(visual.styleOf());
  const family = $derived(st ? firstFamily(st.fontFamily) : '');
  const known = $derived([...SYSTEM_FONTS, ...GOOGLE_FONTS].includes(family));

  const field = 'h-8 w-full rounded-md border-2 border-ink bg-white px-2 text-sm';
  const cap = 'mb-1 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
  const tog = (on: boolean) => `grid h-8 flex-1 place-items-center ${on ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'}`;

  const num = (e: Event) => Number((e.currentTarget as HTMLInputElement).value);
  const css = (prop: string, value: string, label: string) => visual.setTextStyle(prop, value, label);
</script>

{#if st}
  <div class="space-y-3 px-1">
    {#if st.textCount > 1}
      <p class="rounded-md border-[1.5px] border-ink bg-paper px-2 py-1.5 text-xs">
        This group has <b>{st.textCount} text items</b>{st.mixed.length ? ' with different styles (showing the first)' : ''}. Changes apply to all of them. Double-click an item to style just that one.
      </p>
    {/if}
    <div>
      <label class={cap} for="font-family">Font</label>
      <select id="font-family" class={field} value={family} onchange={(e) => setFont(visual, e.currentTarget.value)}>
        {#if !known}<option value={family}>{family}</option>{/if}
        <optgroup label="System">{#each SYSTEM_FONTS as f (f)}<option value={f}>{f}</option>{/each}</optgroup>
        <optgroup label="Google Fonts (online)">{#each GOOGLE_FONTS as f (f)}<option value={f}>{f}</option>{/each}</optgroup>
      </select>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class={cap} for="font-size">Size px</label>
        <input id="font-size" type="number" min="4" class={field} value={Math.round(st.fontSize * 10) / 10} onchange={(e) => css('font-size', `${num(e)}px`, 'Change font size')} />
      </div>
      <div>
        <label class={cap} for="font-color">Colour</label>
        <input id="font-color" type="color" class="h-8 w-full rounded-md border-2 border-ink bg-white p-0.5" value={st.color.startsWith('#') ? st.color : '#000000'} onchange={(e) => css('color', e.currentTarget.value, 'Change text colour')} />
      </div>
    </div>

    <div class="flex overflow-hidden rounded-md border-2 border-ink" role="group" aria-label="Text style">
      <button class={tog(st.fontWeight >= 600)} aria-label="Bold" aria-pressed={st.fontWeight >= 600} onclick={() => css('font-weight', st.fontWeight >= 600 ? '400' : '700', 'Bold')}><Bold class="size-4" /></button>
      <button class="{tog(st.italic)} border-l-2 border-ink" aria-label="Italic" aria-pressed={st.italic} onclick={() => css('font-style', st.italic ? 'normal' : 'italic', 'Italic')}><Italic class="size-4" /></button>
      <button class="{tog(st.underline)} border-l-2 border-ink" aria-label="Underline" aria-pressed={st.underline} onclick={() => css('text-decoration', st.underline ? 'none' : 'underline', 'Underline')}><Underline class="size-4" /></button>
    </div>

    <div class="flex overflow-hidden rounded-md border-2 border-ink" role="group" aria-label="Alignment">
      <button class={tog(st.textAlign === 'left')} aria-label="Align left" onclick={() => css('text-align', 'left', 'Align text')}><TextAlignStart class="size-4" /></button>
      <button class="{tog(st.textAlign === 'center')} border-l-2 border-ink" aria-label="Align centre" onclick={() => css('text-align', 'center', 'Align text')}><TextAlignCenter class="size-4" /></button>
      <button class="{tog(st.textAlign === 'right')} border-l-2 border-ink" aria-label="Align right" onclick={() => css('text-align', 'right', 'Align text')}><TextAlignEnd class="size-4" /></button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class={cap} for="letter-spacing">Spacing px</label>
        <input id="letter-spacing" type="number" step="0.5" class={field} value={Math.round(st.letterSpacing * 10) / 10} onchange={(e) => css('letter-spacing', `${num(e)}px`, 'Change letter spacing')} />
      </div>
      <div>
        <label class={cap} for="line-height">Line height</label>
        <input id="line-height" type="number" step="0.1" min="0.5" class={field} value={Math.round(st.lineHeight * 100) / 100 || ''} placeholder="auto" onchange={(e) => css('line-height', String(num(e)), 'Change line height')} />
      </div>
    </div>
  </div>
{/if}
