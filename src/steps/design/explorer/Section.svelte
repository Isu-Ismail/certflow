<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';

  import InfoTip from '$lib/ui/InfoTip.svelte';

  let {
    title,
    count,
    open = $bindable(true),
    actions,
    children,
    tip,
    steps = [],
  }: { title: string; count?: number; open?: boolean; actions?: Snippet; children: Snippet; tip?: string; steps?: string[] } = $props();
</script>

<section class="border-b-2 border-ink">
  <div class="flex items-center gap-1 px-2 py-1.5">
    <button
      class="flex flex-1 items-center gap-1.5 text-left font-mono text-[11px] font-bold tracking-wider uppercase"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <ChevronDown class="size-4 transition-transform {open ? '' : '-rotate-90'}" />
      {title}
      {#if count !== undefined}<span class="font-normal text-mute">{count}</span>{/if}
    </button>
    {#if tip}<InfoTip {title} text={tip} {steps} />{/if}
    {@render actions?.()}
  </div>
  {#if open}<div class="px-2 pb-2.5">{@render children()}</div>{/if}
</section>
