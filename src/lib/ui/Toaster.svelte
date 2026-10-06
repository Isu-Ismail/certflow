<script lang="ts">
  import { toasts } from './toast.svelte';
  import { X } from '@lucide/svelte';

  const tone = { info: 'bg-ink text-white', success: 'bg-ink text-white', error: 'bg-[#d6361f] text-white' };
</script>

<div class="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-80" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <div class="pointer-events-auto flex items-start gap-2 rounded-md border-2 border-ink px-3.5 py-2.5 text-sm font-semibold shadow-[4px_4px_0_var(--c)] {tone[t.kind]}">
      <span class="flex-1">{t.text}</span>
      <button class="opacity-70 hover:opacity-100" onclick={() => toasts.dismiss(t.id)} aria-label="Dismiss"><X class="size-4" /></button>
    </div>
  {/each}
</div>
