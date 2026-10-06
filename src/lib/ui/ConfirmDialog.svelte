<script lang="ts">
  import { confirmStore } from './confirm.svelte';
  import Button from './Button.svelte';

  let dialog: HTMLDialogElement;
  const req = $derived(confirmStore.req);

  // Native <dialog>: focus trap and Esc come for free.
  $effect(() => {
    if (req && !dialog.open) dialog.showModal();
    else if (!req && dialog.open) dialog.close();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class="m-auto w-[min(92vw,420px)] rounded-lg border-2 border-ink bg-white p-0 text-ink shadow-hard-lg backdrop:bg-ink/50"
  oncancel={(e) => { e.preventDefault(); confirmStore.answer(false); }}
  onclick={(e) => { if (e.target === dialog) confirmStore.answer(false); }}
>
  {#if req}
    <div class="p-5">
      <h2 class="text-lg font-bold">{req.title}</h2>
      <p class="mt-2 text-sm text-mute">{req.message}</p>
    </div>
    <div class="flex justify-end gap-2 border-t-2 border-ink p-3">
      <Button variant="outline" onclick={() => confirmStore.answer(false)}>Cancel</Button>
      <Button variant={req.danger ? 'danger' : 'dark'} onclick={() => confirmStore.answer(true)}>{req.confirmLabel ?? 'Confirm'}</Button>
    </div>
  {/if}
</dialog>
