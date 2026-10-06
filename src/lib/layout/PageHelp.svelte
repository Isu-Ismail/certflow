<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { HELP } from './helpContent';
  import Button from '$lib/ui/Button.svelte';
  import { CircleAlert, X } from '@lucide/svelte';

  const SEEN_KEY = 'certflow-help-seen';
  const STEP_NUMBER = { data: 1, design: 2, flow: 3, generate: 4 } as const;

  let dialog: HTMLDialogElement;
  let seen = $state<string[]>(read());

  function read(): string[] {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'); } catch { return []; }
  }

  const help = $derived(HELP[ws.step]);
  const unseen = $derived(!seen.includes(ws.step));

  // Opens as a modal (native <dialog>): centered, dimmed page, focus trapped, Esc closes.
  function show() {
    dialog.showModal();
    if (unseen) {
      seen = [...seen, ws.step];
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* private mode: the dot returns next visit */ }
    }
  }
</script>

<!-- the dot shows until you have read the help for the current page once -->
<Button variant="outline" class="relative px-2.5" aria-haspopup="dialog" aria-label="What is this page?" title="What is this page?" onclick={show}>
  <CircleAlert class="size-5" />
  <span class="hidden text-sm xl:inline">What is this page?</span>
  {#if unseen}<span class="absolute -top-1.5 -right-1.5 size-3 rounded-full border-2 border-ink bg-step"></span>{/if}
</Button>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  aria-label="About this page"
  class="m-auto max-h-[88dvh] w-[min(94vw,540px)] overflow-hidden rounded-lg border-2 border-ink bg-white p-0 text-ink shadow-hard-lg backdrop:bg-ink/50 open:flex open:flex-col"
  onclick={(e) => { if (e.target === dialog) dialog.close(); }}
>
  <!-- header and footer stay pinned; only the middle scrolls -->
  <div class="flex shrink-0 items-start gap-3 border-b-2 border-ink bg-step-soft p-4 sm:p-5">
    <span class="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-step font-mono text-sm font-bold text-on-step">{STEP_NUMBER[ws.step]}</span>
    <div class="min-w-0 flex-1">
      <h2 class="text-lg leading-tight font-bold">{help.title}</h2>
      {#if help.note}<p class="mt-1 font-mono text-xs text-mute">{help.note}</p>{/if}
    </div>
    <button class="rounded p-1 text-mute hover:bg-white hover:text-ink" aria-label="Close" onclick={() => dialog.close()}><X class="size-5" /></button>
  </div>

  <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm sm:p-5">
    <p class="text-[15px]">{help.purpose}</p>

    <section>
      <h3 class="mb-2 font-mono text-[11px] font-bold tracking-wider text-mute uppercase">What you do here</h3>
      <ol class="space-y-2.5">
        {#each help.steps as s, i (i)}
          <li class="flex gap-3">
            <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-ink font-mono text-[11px] font-bold">{i + 1}</span>
            <span>{s}</span>
          </li>
        {/each}
      </ol>
    </section>

    {#if help.tips.length}
      <section>
        <h3 class="mb-2 font-mono text-[11px] font-bold tracking-wider text-mute uppercase">Good to know</h3>
        <ul class="list-disc space-y-1 pl-5 text-mute">
          {#each help.tips as t (t)}<li>{t}</li>{/each}
        </ul>
      </section>
    {/if}
  </div>

  <div class="flex shrink-0 flex-wrap items-center gap-3 border-t-2 border-ink p-3 sm:px-5">
    {#if help.next}<p class="flex-1 text-sm font-semibold">{help.next}</p>{:else}<span class="flex-1"></span>{/if}
    <Button variant="dark" onclick={() => dialog.close()}>Got it</Button>
  </div>
</dialog>
