<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { analyzeDesign } from '$lib/render/analyze';
  import { design } from '../design.svelte';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import { CircleCheck, TriangleAlert } from '@lucide/svelte';

  const info = $derived(
    design.active
      ? analyzeDesign(design.html, design.columns, ws.tokenMap, ws.files.map((f) => f.name))
      : null,
  );
  const tag = (t: string) => `{${t}}`;

  const hasScript = $derived(!!design.active && /<script[\s>]/i.test(design.html));
  const trusted = $derived(!!design.active && design.isTrusted(design.active.name));

  async function allowScripts() {
    if (!design.active) return;
    const ok = await confirmDialog({
      title: 'Allow scripts in this design?',
      message: 'The design will run its own JavaScript, for example to position text. The script runs once in an isolated frame that cannot reach this workspace, and the finished page is shown. The choice is remembered in this browser for this exact script only.',
      confirmLabel: 'Allow scripts',
      danger: true,
    });
    if (ok) design.setTrusted(design.active.name, true);
  }
</script>

<!-- one line instead of status cards -->
{#if info}
  <div class="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t-2 border-ink bg-white px-3 py-1.5 text-[13px]">
    {#if !info.tokens.length}
      <span class="text-mute">No fields in this design yet — use {'{Name}'} style text.</span>
    {:else if !design.sheet}
      <span class="text-mute">{info.tokens.length} field{info.tokens.length === 1 ? '' : 's'} used · add data to match them</span>
    {:else if !info.unmatched.length}
      <span class="flex items-center gap-1.5"><CircleCheck class="size-4 text-[#1f7a3d]" />{info.tokens.length} field{info.tokens.length === 1 ? '' : 's'} matched</span>
    {:else}
      <span class="flex items-center gap-1.5 font-semibold"><TriangleAlert class="size-4 text-[#b8860b]" />
        {info.unmatched.length} not matched:
        <span class="font-mono font-normal whitespace-pre">{info.unmatched.map(tag).join('  ')}</span>
      </span>
      <button class="font-semibold underline underline-offset-2" onclick={() => (design.explorerOpen = true)}>Map them in Fields</button>
    {/if}

    {#if info.missingFiles.length}
      <span class="flex items-center gap-1.5 font-semibold"><TriangleAlert class="size-4 text-[#b8860b]" />Missing file{info.missingFiles.length === 1 ? '' : 's'}: <span class="font-mono font-normal">{info.missingFiles.join(', ')}</span></span>
    {/if}
    {#if hasScript}
      {#if trusted}
        <span class="flex items-center gap-1.5"><TriangleAlert class="size-4 text-[#b8860b]" />Scripts are on</span>
        <button class="font-semibold underline underline-offset-2" onclick={() => design.setTrusted(design.active!.name, false)}>Turn off</button>
      {:else}
        <span class="flex items-center gap-1.5"><TriangleAlert class="size-4 text-[#b8860b]" />This design has a script (off): parts may sit in the wrong place</span>
        <button class="font-semibold underline underline-offset-2" onclick={allowScripts}>Allow scripts…</button>
      {/if}
    {/if}
    {#if design.mode !== 'code'}
      <span class="ml-auto hidden text-mute xl:inline">click to select · drag to move · double-click text to edit · hold Space and drag to pan · Ctrl+wheel to zoom</span>
    {/if}
    {#if info.externalRefs}
      <span class="text-mute" title="Images or fonts loaded from the internet stop working offline">{info.externalRefs} online resource{info.externalRefs === 1 ? '' : 's'}</span>
    {/if}
  </div>
{/if}
