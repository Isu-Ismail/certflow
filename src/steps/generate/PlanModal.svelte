<script lang="ts">
  import Button from '$lib/ui/Button.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import { batchTotal } from '$lib/generate/plan';
  import { gen } from './gen.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  const plan = $derived(gen.plan);
  const hasMoves = $derived(Object.keys(gen.settings.moves).length > 0);
  const locked = $derived(gen.running || !!(gen.job && !gen.job.finished && gen.done > 0));
  const label = (n: number) => String(n).padStart(2, '0');
</script>

<Modal bind:open title="Batches" size="lg">
  {#if locked}<p class="mb-3 rounded-md bg-[#ffe9a8] p-2 text-sm">A run is saved, so the plan is locked. Clear the progress to change it.</p>{/if}
  <div class="grid gap-2 sm:grid-cols-2">
    {#each plan as b (b.n)}
      <div class="rounded-md border-2 border-ink">
        <div class="flex items-center gap-2 border-b-2 border-ink bg-step-soft px-3 py-1.5 text-sm">
          <b class="font-mono">batch-{label(b.n)}</b><span class="text-mute">{batchTotal(b)}</span>
        </div>
        <ul class="divide-y divide-soft text-sm">
          {#each b.parts as p (p.group)}
            <li class="flex items-center gap-2 px-3 py-1">
              <span class="min-w-0 flex-1 truncate">{p.group || 'Everyone'}</span>
              <span class="font-mono text-xs text-mute">{p.keys.length}</span>
              {#if p.group && gen.settings.keepGroups && plan.length > 1}
                <select class="h-7 w-28 rounded border-[1.5px] border-ink bg-white px-1 text-xs" disabled={locked} aria-label="Move {p.group} to another batch" value={String(b.n)} onchange={(e) => (gen.settings.moves = { ...gen.settings.moves, [p.group]: Number(e.currentTarget.value) })}>
                  {#each plan as o (o.n)}<option value={String(o.n)}>batch-{label(o.n)}</option>{/each}
                  <option value={String(plan.length + 1)}>New batch</option>
                </select>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
  {#snippet footer()}
    {#if hasMoves}<Button size="sm" variant="outline" disabled={locked} onclick={() => (gen.settings.moves = {})}>Undo my changes</Button>{/if}
    <Button variant="dark" onclick={() => (open = false)}>Done</Button>
  {/snippet}
</Modal>
