<script lang="ts">
  import Modal from '$lib/ui/Modal.svelte';
  import { batchKeys } from '$lib/generate/job';
  import { gen } from './gen.svelte';
  import { CircleAlert, ExternalLink } from '@lucide/svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let at = $state(0);
  const job = $derived((void gen.rev, gen.job));
  const batch = $derived(job?.batches[Math.min(at, (job?.batches.length ?? 1) - 1)]);
  const label = (n: number) => String(n).padStart(2, '0');

  // The files as they are in the folder: with one PDF per student each person is a file; with one PDF per batch
  // many people share one file, so it is listed once with its page count.
  const files = $derived.by(() => {
    void gen.rev;
    if (!job || !batch) return [];
    const byPath = new Map<string, { path: string; pages: number; failed: number }>();
    batchKeys(batch).slice(0, batch.done).forEach((key) => {
      const path = job.paths[key];
      const f = byPath.get(path) ?? byPath.set(path, { path, pages: 0, failed: 0 }).get(path)!;
      if (job.failed[key]) f.failed++;
      else f.pages++;
    });
    return [...byPath.values()];
  });
  const combined = $derived(job?.settings.format === 'combined');
  // a combined PDF is put together when its batch is complete
  const ready = $derived(!combined || batch?.state === 'done');
  const SHOWN = 300;
</script>

<Modal bind:open title="Files made" size="md">
  {#if job && job.batches.length > 1}
    <label class="mb-3 flex items-center gap-2 text-sm font-semibold">Batch
      <select class="h-8 rounded-md border-2 border-ink bg-white px-2 text-sm font-normal" bind:value={at}>
        {#each job.batches as b, i (b.n)}<option value={i}>batch-{label(b.n)} ({b.done} of {batchKeys(b).length})</option>{/each}
      </select>
    </label>
  {/if}
  <p class="mb-3 text-sm text-mute">
    {#if combined}One PDF per batch (and group): each file holds the pages of everyone in it.{:else}One PDF per student.{/if}
    They are in <span class="font-mono">output/</span> in your folder.
  </p>
  <ul class="divide-y divide-soft rounded-md border-2 border-ink text-sm">
    {#each files.slice(0, SHOWN) as f (f.path)}
      <li class="flex items-center gap-2 px-3 py-1.5">
        <span class="min-w-0 flex-1 truncate font-mono text-xs" title={f.path}>{f.path}</span>
        {#if combined}<span class="font-mono text-[11px] text-mute">{f.pages} {f.pages === 1 ? 'page' : 'pages'}</span>{/if}
        {#if f.failed}
          <span class="flex items-center gap-1 text-xs text-[#d6361f]"><CircleAlert class="size-4" />{f.failed} failed</span>
        {:else if gen.toFolder && ready}
          <button class="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2" onclick={() => gen.open(f.path)}>Open<ExternalLink class="size-3.5" /></button>
        {:else if combined}
          <span class="text-xs text-mute">made when the batch is complete</span>
        {/if}
      </li>
    {:else}
      <li class="px-3 py-4 text-center text-mute">Nothing made yet.</li>
    {/each}
    {#if files.length > SHOWN}<li class="px-3 py-1.5 font-mono text-xs text-mute">… and {files.length - SHOWN} more files (all of them are in the folder)</li>{/if}
  </ul>
</Modal>
