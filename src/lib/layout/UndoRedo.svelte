<script lang="ts">
  import { HISTORY_LIMIT, ws } from '$lib/workspace/store.svelte';
  import { redo, undo } from '$lib/workspace/actions';
  import Button from '$lib/ui/Button.svelte';
  import { RotateCcw as Undo, RotateCw as Redo } from '@lucide/svelte';

  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  const steps = (n: number) => `${n} step${n === 1 ? '' : 's'}`;

  const undoTip = $derived(
    ws.undoCount
      ? `Undo “${ws.undoLabel}” (${mod}+Z) · ${steps(ws.undoCount)} to undo, up to ${HISTORY_LIMIT} kept`
      : `Nothing to undo (${mod}+Z)`,
  );
  const redoTip = $derived(ws.redoCount ? `Redo “${ws.redoLabel}” (${mod}+Shift+Z) · ${steps(ws.redoCount)} to redo` : `Nothing to redo (${mod}+Shift+Z)`);

  const badge = 'absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full border border-ink bg-step px-1 font-mono text-[10px] leading-none text-on-step';
</script>

<!-- not `disabled`, so the tooltip still shows why nothing happens -->
<div class="flex gap-1.5">
  <Button variant="outline" size="icon" class="relative {ws.undoCount ? '' : 'opacity-40'}" title={undoTip} aria-label={undoTip} aria-disabled={!ws.undoCount} onclick={undo}>
    <Undo class="size-4" />
    {#if ws.undoCount}<span class={badge}>{ws.undoCount}</span>{/if}
  </Button>
  <Button variant="outline" size="icon" class="relative {ws.redoCount ? '' : 'opacity-40'}" title={redoTip} aria-label={redoTip} aria-disabled={!ws.redoCount} onclick={redo}>
    <Redo class="size-4" />
    {#if ws.redoCount}<span class={badge}>{ws.redoCount}</span>{/if}
  </Button>
</div>
