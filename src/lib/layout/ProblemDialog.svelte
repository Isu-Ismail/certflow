<script lang="ts">
  import Button from '$lib/ui/Button.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import { problems } from '$lib/workspace/problems.svelte';
  import { CircleAlert } from '@lucide/svelte';

  let open = $state(false);
  const report = $derived(problems.current);

  // opens when there is something to show, forgets it when closed
  $effect(() => { if (report) open = true; });
  $effect(() => { if (!open && problems.current) problems.current = null; });
</script>

<Modal bind:open title={report?.title ?? 'Problem'} size="md" tone="error">
  {#if report}
    {#if report.lead}<p class="mb-3 text-sm">{report.lead}</p>{/if}
    <ul class="space-y-2" role="alert">
      {#each report.items as item, i (i)}
        <li class="flex gap-2 rounded-md border-2 border-[#d6361f] bg-[#fbd5cf] p-2.5 text-sm">
          <CircleAlert class="mt-0.5 size-4 shrink-0 text-[#d6361f]" />
          <span class="min-w-0"><b class="font-mono text-xs break-all">{item.where}</b><br />{item.text}</span>
        </li>
      {/each}
    </ul>
  {/if}
  {#snippet footer()}
    <Button variant="dark" onclick={() => (open = false)}>Close</Button>
  {/snippet}
</Modal>
