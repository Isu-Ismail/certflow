<script lang="ts" module>
  export interface MenuItem {
    label: string;
    onselect?: () => void; // not needed for a heading
    danger?: boolean;
    /** A non-clickable group title. */
    heading?: boolean;
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Ellipsis } from '@lucide/svelte';

  let {
    items,
    label = 'More actions',
    trigger,
    triggerClass = 'grid size-7 place-items-center rounded text-mute hover:bg-soft hover:text-ink',
    align = 'right',
  }: { items: MenuItem[]; label?: string; trigger?: Snippet; triggerClass?: string; align?: 'left' | 'right' } = $props();

  let open = $state(false);
  let top = $state(0);
  let edge = $state(0);

  // `fixed` so the menu is not clipped by scrolling panels.
  function toggle(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    top = r.bottom + 4;
    edge = align === 'right' ? window.innerWidth - r.right : r.left;
    open = !open;
  }

  function pick(item: MenuItem) {
    open = false;
    item.onselect?.();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<button class={triggerClass} aria-label={label} aria-haspopup="menu" aria-expanded={open} onclick={toggle}>
  {#if trigger}{@render trigger()}{:else}<Ellipsis class="size-4" />{/if}
</button>

{#if open}
  <button class="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onclick={() => (open = false)}></button>
  <div
    class="fixed z-50 max-h-[70dvh] w-60 overflow-y-auto rounded-md border-2 border-ink bg-white shadow-hard"
    style="top:{top}px;{align === 'right' ? `right:${edge}px` : `left:${edge}px`}"
    role="menu"
  >
    {#each items as item (item.label)}
      {#if item.heading}
        <div class="border-b border-soft bg-paper px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-mute uppercase" role="presentation">{item.label}</div>
      {:else}
        <button
          class="block w-full truncate px-3 py-2 text-left text-sm font-semibold hover:bg-step-soft {item.danger ? 'text-[#b52c18] hover:bg-[#fbd5cf]' : ''}"
          role="menuitem"
          onclick={() => pick(item)}>{item.label}</button>
      {/if}
    {/each}
  </div>
{/if}
