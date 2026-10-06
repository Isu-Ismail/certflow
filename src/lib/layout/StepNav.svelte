<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import type { Step } from '$lib/workspace/types';

  // Each step owns one colour (the page accent follows the active step, see app.css).
  const steps: { id: Step; label: string; bg: string; fg: string }[] = [
    { id: 'data', label: 'Data', bg: '#4563ee', fg: '#ffffff' },
    { id: 'design', label: 'Design', bg: '#ff7a59', fg: '#121212' },
    { id: 'flow', label: 'Flow', bg: '#7a55ee', fg: '#ffffff' },
    { id: 'generate', label: 'Generate', bg: '#2fc99a', fg: '#121212' },
  ];

  const count = (id: Step) => (id === 'data' ? ws.sheet?.rows.length : id === 'design' ? ws.designs.length : 0);
</script>

<!-- one row on desktop; on phones the header wraps and this takes its own full-width row -->
<nav class="order-last flex w-full gap-1.5 md:order-none md:w-auto md:flex-1 md:justify-center" aria-label="Steps">
  {#each steps as s, i (s.id)}
    {@const active = ws.step === s.id}
    <button
      class="flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border-2 border-ink px-2 font-semibold transition-[transform,box-shadow,background-color] hover:-translate-x-px hover:-translate-y-px hover:shadow-hard md:flex-none md:px-3.5
        {active ? 'shadow-hard' : 'bg-white'}"
      style={active ? `background:${s.bg};color:${s.fg}` : ''}
      aria-current={active ? 'step' : undefined}
      onclick={() => ws.setStep(s.id)}
    >
      <span
        class="grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-mono text-[11px] font-bold"
        style="background:{active ? '#121212' : s.bg};color:{active ? '#fff' : s.fg}">{i + 1}</span>
      <span class="text-sm">{s.label}</span>
      {#if count(s.id)}
        <span class="hidden font-mono text-[11px] lg:inline">{count(s.id)}</span>
      {/if}
    </button>
  {/each}
</nav>
