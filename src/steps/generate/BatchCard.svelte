<script lang="ts">
  import Button from '$lib/ui/Button.svelte';
  import Card from './Card.svelte';
  import PlanModal from './PlanModal.svelte';
  import { gen } from './gen.svelte';
  import { LayoutList } from '@lucide/svelte';

  let planOpen = $state(false);
  const field = 'h-8 w-20 rounded-md border-2 border-ink bg-white px-2 text-sm';
  const edited = $derived(Object.keys(gen.settings.moves).length > 0);
</script>

<Card
  title="Batches"
  tip="The certificates are made a batch at a time so the browser stays fast, and each batch gets its own folder (batch-01, batch-02…). A group that is a little over the size still stays in one batch."
  steps={['Set how many certificates make a batch.', 'Extra room lets a group go a bit over, so it is not split.', 'Edit batches to move a group to another batch.']}
>
  <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
    <label class="text-sm font-semibold">Per batch
      <input type="number" min="1" max="500" class="{field} mt-1 block" disabled={gen.running} value={gen.settings.batchSize} onchange={(e) => gen.update({ batchSize: Math.max(1, Math.round(Number(e.currentTarget.value) || 50)) })} />
    </label>
    <label class="text-sm font-semibold">Extra room
      <input type="number" min="0" max="200" class="{field} mt-1 block" disabled={gen.running} value={gen.settings.buffer} onchange={(e) => gen.update({ buffer: Math.max(0, Math.round(Number(e.currentTarget.value) || 0)) })} />
    </label>
    <label class="flex items-center gap-2 pb-1.5 text-sm"><input type="checkbox" class="size-4" checked={gen.settings.keepGroups} disabled={gen.running} onchange={(e) => gen.update({ keepGroups: e.currentTarget.checked })} />Keep groups together</label>
  </div>
  <div class="flex items-center gap-2">
    <span class="text-sm text-mute">{gen.plan.length} {gen.plan.length === 1 ? 'batch' : 'batches'}{edited ? ' · edited' : ''}</span>
    <Button size="sm" variant="outline" class="ml-auto" onclick={() => (planOpen = true)}><LayoutList class="size-4" />Edit batches</Button>
  </div>
</Card>

<PlanModal bind:open={planOpen} />
