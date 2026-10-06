<script lang="ts">
  import Button from '$lib/ui/Button.svelte';
  import { gen } from './gen.svelte';
  import { Eye, Play, Square, RotateCw } from '@lucide/svelte';

  const count = $derived(gen.built.items.length);
  const batches = $derived(gen.plan.length);
  const designs = $derived(new Set(gen.built.items.map((i) => i.design)).size);
  const busy = $derived(gen.running || gen.status === 'previewing');
  const notes = $derived(gen.checks.filter((c) => c.level === 'info').slice(0, 2));
</script>

<section class="flex flex-col gap-3 rounded-lg border-2 border-ink bg-white p-4 shadow-hard">
  <div class="min-w-0">
    <p class="text-2xl font-bold tracking-tight">{count} {count === 1 ? 'certificate' : 'certificates'}</p>
    <p class="text-sm text-mute">
      {designs} {designs === 1 ? 'design' : 'designs'} · {batches} {batches === 1 ? 'batch' : 'batches'} of up to {gen.settings.batchSize}
      · saved in <span class="font-mono">output/</span>
    </p>
    {#each notes as n, i (i)}<p class="text-xs text-mute">{n.text}</p>{/each}
  </div>

  <div class="flex flex-wrap items-center gap-2 [&>button]:flex-1">
    {#if gen.running}
      <Button variant="danger" size="lg" onclick={() => gen.stop()} disabled={gen.status === 'stopping'}><Square class="size-4" />{gen.status === 'stopping' ? 'Stopping…' : 'Stop'}</Button>
    {:else}
      <Button variant="outline" size="lg" onclick={() => gen.previewTen()} disabled={busy || !count}>
        <Eye class="size-4" />{gen.status === 'previewing' ? 'Making preview…' : 'Preview 10'}
      </Button>
      {#if !gen.resumable && gen.found}
        <Button variant="step" size="lg" onclick={() => gen.continueFromFolder()} disabled={busy || gen.blocked} title="{gen.found.n} of {gen.found.total} certificates are already in output/. Only the missing ones are made."><RotateCw class="size-4" />Continue <span class="font-mono text-xs opacity-80">{gen.found.n}/{gen.found.total}</span></Button>
        <Button variant="outline" size="lg" onclick={() => gen.generate()} disabled={busy || gen.blocked || !count} title="Make everything again"><Play class="size-4" />Start over</Button>
      {:else if gen.resumable}
        <Button variant="step" size="lg" onclick={() => gen.resume()} disabled={busy}><RotateCw class="size-4" />Continue <span class="font-mono text-xs opacity-80">{gen.done}/{gen.total}</span></Button>
      {:else}
        <Button variant="step" size="lg" onclick={() => gen.generate()} disabled={busy || gen.blocked || !count}><Play class="size-4" />Generate</Button>
      {/if}
    {/if}
  </div>
</section>
