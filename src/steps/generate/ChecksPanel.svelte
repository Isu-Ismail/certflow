<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import Card from './Card.svelte';
  import { gen } from './gen.svelte';
  import { CircleAlert, Info, TriangleAlert } from '@lucide/svelte';

  const go = { flow: 'flow', design: 'design', data: 'data' } as const;
  const order = { error: 0, warn: 1, info: 2 } as const;
  // notes (info) are shown in the summary at the top; this card is only for things to fix or watch
  const list = $derived(gen.checks.filter((c) => c.level !== 'info').sort((a, b) => order[a.level] - order[b.level]));
  const problems = $derived(list.length);
</script>

{#if list.length}
  <Card
    title="Before you start"
    tip="Things to know before generating. A red one stops Generate until it is fixed. A yellow one is only a warning."
  >
    {#snippet actions()}<span class="font-mono text-xs text-mute">{problems} to look at</span>{/snippet}
    <ul class="max-h-40 space-y-1.5 overflow-y-auto text-sm" aria-label="Checks before generating">
      {#each list as c, i (i)}
        <li class="flex items-start gap-2">
          {#if c.level === 'error'}<CircleAlert class="mt-0.5 size-4 shrink-0 text-[#d6361f]" />
          {:else if c.level === 'warn'}<TriangleAlert class="mt-0.5 size-4 shrink-0 text-[#b8860b]" />
          {:else}<Info class="mt-0.5 size-4 shrink-0 text-mute" />{/if}
          <span class="min-w-0 flex-1 {c.level === 'info' ? 'text-mute' : ''}">{c.text}</span>
          {#if c.fix}
            <button class="shrink-0 rounded-md border-2 border-ink bg-white px-2 py-0.5 text-xs font-semibold hover:bg-step-soft" onclick={c.fix.run}>{c.fix.label}</button>
          {:else if c.where && c.where !== 'options' && c.level !== 'info'}
            <button class="shrink-0 font-semibold underline underline-offset-2" onclick={() => ws.setStep(go[c.where as 'flow'])}>Open {c.where}</button>
          {/if}
        </li>
      {/each}
    </ul>
  </Card>
{/if}
