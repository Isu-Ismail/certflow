<script lang="ts">
  // A small "!" that explains what something does. Hover, focus or click shows a short note; Esc or a click elsewhere hides it.
  let { title = '', text, steps = [] }: { title?: string; text: string; steps?: string[] } = $props();

  let button: HTMLButtonElement;
  let pinned = $state(false);
  let hover = $state(false);
  let pos = $state({ left: 0, top: 0 });
  let tip: HTMLDivElement | undefined = $state();
  const show = $derived(pinned || hover);

  function place() {
    const r = button.getBoundingClientRect();
    pos = { left: Math.max(8, Math.min(r.left - 8, window.innerWidth - 296)), top: r.bottom + 6 };
  }

  // once it is drawn we know its height: if it would run off the bottom, it goes above the button instead
  $effect(() => {
    if (!show || !tip) return;
    const r = button.getBoundingClientRect();
    const h = tip.offsetHeight;
    const below = r.bottom + 6;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 6) : below;
    if (Math.abs(top - pos.top) > 1) pos = { ...pos, top };
  });
</script>

<svelte:window
  onclick={(e) => { if (pinned && !button.contains(e.target as Node)) pinned = false; }}
  onkeydown={(e) => { if (e.key === 'Escape') pinned = false; }}
  onscrollcapture={() => (pinned = false)}
/>

<span class="inline-flex" role="presentation" onmouseenter={() => { place(); hover = true; }} onmouseleave={() => (hover = false)}>
  <button
    bind:this={button}
    type="button"
    class="grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-white font-mono text-[11px] leading-none font-bold text-ink hover:bg-step hover:text-on-step focus-visible:bg-step"
    aria-label="What is this?{title ? ` (${title})` : ''}"
    aria-expanded={show}
    onclick={(e) => { e.stopPropagation(); place(); pinned = !pinned; }}
    onfocus={() => { place(); hover = true; }}
    onblur={() => (hover = false)}
  >!</button>
</span>

{#if show}
  <div bind:this={tip} role="tooltip" class="fixed z-50 w-72 rounded-lg border-2 border-ink bg-white p-3 text-left text-[13px] leading-snug font-normal tracking-normal text-ink normal-case shadow-hard-lg" style="left:{pos.left}px;top:{pos.top}px">
    {#if title}<p class="mb-1 font-bold">{title}</p>{/if}
    <p>{text}</p>
    {#if steps.length}
      <ol class="mt-1.5 list-decimal space-y-0.5 pl-4 text-mute">{#each steps as s (s)}<li>{s}</li>{/each}</ol>
    {/if}
  </div>
{/if}
