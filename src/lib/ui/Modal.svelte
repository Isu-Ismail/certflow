<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';

  let {
    open = $bindable(false),
    title,
    size = 'md',
    tone = 'normal',
    children,
    footer,
  }: { open?: boolean; title: string; size?: 'sm' | 'md' | 'lg'; tone?: 'normal' | 'error'; children: Snippet; footer?: Snippet } = $props();

  let dialog: HTMLDialogElement;
  const widths = { sm: 'w-[min(94vw,420px)]', md: 'w-[min(94vw,560px)]', lg: 'w-[min(94vw,780px)]' };

  // Native <dialog>: focus trap and Esc for free. Header and footer stay pinned; only the body scrolls.
  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  aria-label={title}
  class="m-auto max-h-[88dvh] overflow-hidden rounded-lg border-2 border-ink bg-white p-0 text-ink shadow-hard-lg backdrop:bg-ink/50 open:flex open:flex-col {widths[size]}"
  onclose={() => (open = false)}
  onclick={(e) => { if (e.target === dialog) open = false; }}
>
  {#if open}
    <div class="flex shrink-0 items-center gap-3 border-b-2 border-ink {tone === 'error' ? 'bg-[#d6361f] text-white' : 'bg-step-soft'} px-4 py-3 sm:px-5">
      <h2 class="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
      <button class="rounded p-1 {tone === 'error' ? 'text-white hover:bg-white hover:text-ink' : 'text-mute hover:bg-white hover:text-ink'}" aria-label="Close" onclick={() => (open = false)}><X class="size-5" /></button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{@render children()}</div>
    {#if footer}
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t-2 border-ink p-3 sm:px-5">{@render footer()}</div>
    {/if}
  {/if}
</dialog>
