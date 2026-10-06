<script lang="ts">
  import Button from '$lib/ui/Button.svelte';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import { batchKeys } from '$lib/generate/job';
  import Card from './Card.svelte';
  import FilesMadeModal from './FilesMadeModal.svelte';
  import { gen } from './gen.svelte';
  import { CircleCheck, TriangleAlert, Files } from '@lucide/svelte';

  const job = $derived((void gen.rev, gen.job));
  const total = $derived(gen.total);
  const done = $derived(gen.done);
  const percent = $derived(total ? Math.round((done / total) * 100) : 0);
  const failed = $derived((void gen.rev, job ? Object.entries(job.failed) : []));
  const nowBatch = $derived((void gen.rev, job?.batches.find((b) => b.state !== 'done')));
  const doneOf = (b: { done: number }) => (void gen.rev, b.done);
  const stateOf = (b: { state: string }) => (void gen.rev, b.state);
  const label = (n: number) => String(n).padStart(2, '0');
  let showAll = $state(false);
  let filesOpen = $state(false);
  const shown = $derived(job ? (showAll ? job.batches : job.batches.slice(0, 6)) : []);

  // time left, from the speed of this run so far
  const eta = $derived.by(() => {
    void gen.rev;
    const made = done - gen.baseDone;
    if (!gen.running || made < 3) return '';
    const perItem = (Date.now() - gen.startedAt) / made;
    const mins = Math.max(1, Math.round(((total - done) * perItem) / 60000));
    return mins >= 60 ? `about ${Math.floor(mins / 60)} h ${mins % 60} min left` : `about ${mins} min left`;
  });

  async function clearIt(deleteFiles: boolean) {
    const ok = await confirmDialog({
      title: deleteFiles ? 'Clear and delete the files?' : 'Clear the saved progress?',
      message: deleteFiles
        ? 'The saved run is forgotten and everything in the output folder is deleted. You can then generate again from the start.'
        : 'The saved run is forgotten. Files already made stay in the output folder, and a new run starts from the beginning.',
      confirmLabel: deleteFiles ? 'Clear and delete' : 'Clear progress',
      danger: true,
    });
    if (ok) await gen.clear(deleteFiles);
  }
</script>

{#if job}
  <Card
    title={gen.status === 'done' ? 'Finished' : gen.running ? 'Making certificates' : 'Paused'}
    tip="The progress of the run. It is saved in config/generate.stat.json, so you can stop and continue later, even on another day."
    steps={['Stop finishes the certificate it is on.', 'Continue carries on from the next one; nothing is made twice.', 'Clear progress forgets the run and lets you start from the beginning.']}
  >
    {#snippet actions()}
      <span class="font-mono text-xs">{done} / {total}</span>
      {#if eta}<span class="text-xs text-mute">· {eta}</span>{/if}
    {/snippet}

    <div class="h-4 overflow-hidden rounded-sm border-2 border-ink bg-white" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
      <div class="h-full bg-step transition-[width]" style="width:{percent}%"></div>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 text-sm">
      {#if nowBatch && !job.finished}<span class="text-mute">batch {label(nowBatch.n)} of {job.batches.length}</span>{/if}
      {#if gen.running && gen.current}<span class="min-w-0 truncate font-mono text-xs text-mute">now: {gen.current}</span>{/if}
      {#if !gen.running && !job.finished}<span class="text-mute">Stopped. <b class="text-ink">Continue</b> carries on from certificate {done + 1}.</span>{/if}
    </div>

    {#if gen.stale && !gen.running}
      <div class="flex flex-wrap items-center gap-2 rounded-md border-2 border-ink bg-[#ffe9a8] px-3 py-2 text-sm">
        <TriangleAlert class="size-4 shrink-0" />
        <span class="min-w-0 flex-1">The data, a design or the flow changed since this run started.</span>
        <Button size="sm" variant="outline" onclick={() => clearIt(false)}>Clear and start over</Button>
      </div>
    {/if}

    <ul class="max-h-44 divide-y divide-soft overflow-y-auto rounded-md border-2 border-ink text-sm">
      {#each shown as b (b.n)}
        {@const n = batchKeys(b).length}
        <li class="flex items-center gap-3 px-3 py-1">
          <span class="w-20 shrink-0 font-mono text-xs">batch-{label(b.n)}</span>
          <div class="h-2.5 min-w-0 flex-1 overflow-hidden rounded-sm border border-ink bg-white"><div class="h-full bg-step" style="width:{n ? (doneOf(b) / n) * 100 : 0}%"></div></div>
          <span class="w-14 shrink-0 text-right font-mono text-xs">{doneOf(b)}/{n}</span>
          <span class="w-4 shrink-0">{#if stateOf(b) === 'done'}<CircleCheck class="size-4 text-[#1f7a3d]" />{/if}</span>
        </li>
      {/each}
    </ul>
    {#if job.batches.length > 6}
      <button class="text-xs font-semibold text-mute underline underline-offset-2 hover:text-ink" onclick={() => (showAll = !showAll)}>{showAll ? 'Show fewer batches' : `Show all ${job.batches.length} batches`}</button>
    {/if}

    {#if failed.length}
      <div class="rounded-md border-2 border-ink bg-[#fbd5cf] px-3 py-2 text-sm">
        <p class="flex flex-wrap items-center gap-2 font-semibold">{failed.length} could not be made
          <Button size="sm" variant="outline" class="ml-auto" onclick={() => gen.retryFailed()} disabled={gen.running}>Try again</Button>
        </p>
        <ul class="mt-1 max-h-20 overflow-y-auto font-mono text-xs">{#each failed.slice(0, 20) as [key, why] (key)}<li class="truncate">{key.split('::')[1]} — {why}</li>{/each}</ul>
      </div>
    {/if}

    {#if !gen.running}
      <div class="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onclick={() => (filesOpen = true)}><Files class="size-4" />Show files</Button>
        <Button size="sm" variant="outline" onclick={() => clearIt(false)}>Clear progress</Button>
        {#if gen.toFolder}<Button size="sm" variant="ghost" onclick={() => clearIt(true)}>Clear and delete files</Button>{/if}
      </div>
    {/if}
  </Card>
  <FilesMadeModal bind:open={filesOpen} />
{/if}
