<script lang="ts">
  import { toast } from '$lib/ui/toast.svelte';

  let { columns }: { columns: string[] } = $props();

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Copied ${text}`);
    } catch {
      toast('Could not copy — select the text instead', 'error');
    }
  }
</script>

<!-- One scrollable line: every column as a {field}. Mapping fields to columns happens in the Design step. -->
<div class="no-scrollbar flex items-center gap-2 overflow-x-auto border-t-2 border-ink bg-paper px-3 py-2">
  <span class="shrink-0 font-mono text-[11px] font-bold tracking-wider text-mute uppercase">Fields</span>
  {#each columns as c (c)}
    <button
      class="shrink-0 rounded border-[1.5px] border-ink bg-white px-2 py-0.5 font-mono text-xs whitespace-pre hover:bg-step hover:text-on-step"
      title="Copy {`{${c}}`} to paste into a design"
      onclick={() => copy(`{${c}}`)}>{`{${c}}`}</button>
  {/each}
</div>
