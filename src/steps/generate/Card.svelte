<script lang="ts">
  import type { Snippet } from 'svelte';
  import InfoTip from '$lib/ui/InfoTip.svelte';

  let { title, tip, steps = [], actions, children, class: extra = '' }: {
    title: string;
    /** the short note behind the "!" */
    tip?: string;
    steps?: string[];
    actions?: Snippet;
    children: Snippet;
    class?: string;
  } = $props();
</script>

<section class="flex min-w-0 shrink-0 flex-col rounded-lg border-2 border-ink bg-white shadow-hard {extra}" aria-label={title}>
  <header class="flex items-center gap-2 border-b-2 border-ink bg-step-soft px-3 py-1.5">
    <h2 class="font-mono text-[11px] font-bold tracking-wider uppercase">{title}</h2>
    {#if tip}<InfoTip {title} text={tip} {steps} />{/if}
    <span class="flex-1"></span>
    {@render actions?.()}
  </header>
  <div class="min-w-0 flex-1 space-y-3 p-3">{@render children()}</div>
</section>
