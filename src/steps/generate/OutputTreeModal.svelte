<script lang="ts">
  import Modal from '$lib/ui/Modal.svelte';
  import TreeView from './TreeView.svelte';
  import { gen } from './gen.svelte';
  import { Search } from '@lucide/svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let every = $state(false);
  let query = $state('');
  const paths = $derived(open ? [...gen.paths.values()] : []);
</script>

<Modal bind:open title="What will be saved" size="lg">
  <p class="mb-3 text-sm text-mute">
    The folders and files this run makes inside <span class="font-mono">output/</span> of your workspace folder.
    The number next to a folder is how many certificates are inside it. Click a folder to open or close it.
  </p>
  <div class="relative mb-2">
    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-mute" />
    <input class="h-8 w-full rounded-md border-2 border-ink pr-3 pl-8 text-sm" placeholder="Find a file or folder" bind:value={query} aria-label="Find a file or folder" />
  </div>
  {#if paths.length}
    <TreeView {paths} {every} {query} />
  {:else}
    <p class="py-6 text-center text-sm text-mute">Nothing to save yet. Check the flow.</p>
  {/if}
  {#snippet footer()}
    <label class="mr-auto flex items-center gap-2 text-sm"><input type="checkbox" class="size-4" bind:checked={every} />Open every folder and show every file</label>
    <span class="font-mono text-xs text-mute">{gen.paths.size} {gen.paths.size === 1 ? 'certificate' : 'certificates'}</span>
  {/snippet}
</Modal>
