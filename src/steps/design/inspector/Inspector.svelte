<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { analyzeDesign } from '$lib/render/analyze';
  import { describePage, presetSize, PAGE_PRESETS, readPageSize, writePageSize } from '$lib/render/page';
  import { design } from '../design.svelte';
  import Section from '../explorer/Section.svelte';
  import { visual } from '../visual/visual.svelte';
  import SelectionPanel from './SelectionPanel.svelte';
  import Layers from './Layers.svelte';
  import PageBackground from './PageBackground.svelte';

  const active = $derived(design.active);
  const size = $derived(active ? readPageSize(design.html) : null);
  const page = $derived(size ? describePage(size) : null);
  const info = $derived(
    active ? analyzeDesign(design.html, design.columns, ws.tokenMap, ws.files.map((f) => f.name)) : null,
  );

  function resize(next: { width: number; height: number } | null) {
    if (!active || !next || next.width < 200 || next.height < 200) return;
    design.apply(writePageSize(design.html, next), 'Change page size');
  }

  const field = 'h-8 rounded-md border-2 border-ink bg-white px-2 text-sm';
  const cap = 'mb-1 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
</script>

{#if active && size && page && info}
  <div class="flex h-full min-h-0 flex-col">
    <!-- Layers stay pinned at the top (with their own scroll); every control sits below them and scrolls -->
    {#if design.mode !== 'code'}
      <div class="flex max-h-[34%] min-h-0 shrink-0 flex-col border-b-2 border-ink bg-white">
        <h3 class="shrink-0 px-3 py-2 font-mono text-[11px] font-bold tracking-wider uppercase">Layers <span class="font-normal text-mute">{visual.layers.length}</span></h3>
        <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2"><Layers /></div>
      </div>
    {/if}

    <div class="min-h-0 flex-1 overflow-y-auto">
    {#if design.mode !== 'code'}<SelectionPanel />{/if}

    <Section title="Page">
      <div class="space-y-3 px-1">
        <div>
          <label class={cap} for="page-size">Size</label>
          <select id="page-size" class="{field} w-full" value={page.preset} onchange={(e) => { const v = e.currentTarget.value; if (v !== 'custom') resize(presetSize(v, page.portrait)); }}>
            {#each PAGE_PRESETS as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <span class={cap}>Orientation</span>
          <div class="inline-flex w-full overflow-hidden rounded-md border-2 border-ink" role="group">
            <button class="h-8 flex-1 text-sm font-semibold {!page.portrait ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'}" aria-pressed={!page.portrait} onclick={() => page.portrait && resize({ width: size.height, height: size.width })}>Landscape</button>
            <button class="h-8 flex-1 border-l-2 border-ink text-sm font-semibold {page.portrait ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'}" aria-pressed={page.portrait} onclick={() => !page.portrait && resize({ width: size.height, height: size.width })}>Portrait</button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class={cap} for="page-w">Width px</label>
            <input id="page-w" type="number" class="{field} w-full" value={size.width} min="200" onchange={(e) => resize({ width: +e.currentTarget.value, height: size.height })} />
          </div>
          <div>
            <label class={cap} for="page-h">Height px</label>
            <input id="page-h" type="number" class="{field} w-full" value={size.height} min="200" onchange={(e) => resize({ width: size.width, height: +e.currentTarget.value })} />
          </div>
        </div>

        {#if design.mode !== 'code'}<PageBackground />{/if}
      </div>
    </Section>

    <Section title="File">
      <p class="px-1 font-mono text-xs break-all text-mute">{active.name}.cert.html</p>
    </Section>
    </div>
  </div>
{/if}
