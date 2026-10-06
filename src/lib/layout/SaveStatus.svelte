<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';

  const look = {
    saved: { label: 'Saved', dot: 'bg-[#2fc99a]' },
    saving: { label: 'Saving…', dot: 'animate-pulse bg-[#e0a800]' },
    unsaved: { label: 'Unsaved', dot: 'bg-[#e0a800]' },
    error: { label: 'Not saved', dot: 'bg-[#d6361f]' },
  } as const;

  const s = $derived(look[ws.saveStatus]);
  const when = $derived(ws.lastSaved ? `Last saved ${new Date(ws.lastSaved).toLocaleTimeString()}` : 'Not saved yet');
</script>

<!-- changes are saved automatically a moment after each edit; this just shows it -->
<span class="flex shrink-0 items-center gap-1.5 font-mono text-xs text-mute xl:w-24" title="{s.label} in this browser. {when}{ws.folderState === 'linked' ? ` Also saved into the folder “${ws.handle?.name}”.` : ''}" role="status">
  <span class="size-2.5 rounded-full border border-ink {s.dot}"></span>
  <span class="hidden w-20 truncate xl:inline">{ws.folderState === 'linked' && ws.saveStatus === 'saved' ? 'In folder' : s.label}</span>
</span>
