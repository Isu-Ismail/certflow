<script lang="ts">
  import { visual } from '../visual/visual.svelte';
  import { align, duplicate, remove, reorder } from '../visual/ops';
  import Button from '$lib/ui/Button.svelte';
  import {
    AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, Copy, Trash,
  } from '@lucide/svelte';

  const cap = 'mb-1 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase';
  const aligns = [
    { m: 'left', l: 'Align left', i: AlignStartVertical }, { m: 'center', l: 'Align centre', i: AlignCenterVertical }, { m: 'right', l: 'Align right', i: AlignEndVertical },
    { m: 'top', l: 'Align top', i: AlignStartHorizontal }, { m: 'middle', l: 'Align middle', i: AlignCenterHorizontal }, { m: 'bottom', l: 'Align bottom', i: AlignEndHorizontal },
  ] as const;
</script>

<div class="space-y-3 px-1">
  <div>
    <span class={cap}>Align to page</span>
    <div class="flex overflow-hidden rounded-md border-2 border-ink">
      {#each aligns as a, i (a.m)}
        <button class="grid h-8 flex-1 place-items-center bg-white hover:bg-step-soft {i ? 'border-l-2 border-ink' : ''}" aria-label={a.l} title={a.l} onclick={() => align(visual, a.m)}><a.i class="size-4" /></button>
      {/each}
    </div>
  </div>

  <div>
    <span class={cap}>Stacking order</span>
    <div class="grid grid-cols-4 gap-1">
      <Button variant="outline" size="sm" onclick={() => reorder(visual, 'front')}>Front</Button>
      <Button variant="outline" size="sm" onclick={() => reorder(visual, 'forward')}>Up</Button>
      <Button variant="outline" size="sm" onclick={() => reorder(visual, 'backward')}>Down</Button>
      <Button variant="outline" size="sm" onclick={() => reorder(visual, 'back')}>Back</Button>
    </div>
  </div>

  <div class="flex gap-2">
    <Button variant="outline" size="sm" class="flex-1" onclick={() => duplicate(visual)}><Copy class="size-4" />Duplicate</Button>
    <Button variant="outline" size="sm" class="flex-1 hover:bg-[#fbd5cf]" onclick={() => remove(visual)}><Trash class="size-4" />Delete</Button>
  </div>
</div>
