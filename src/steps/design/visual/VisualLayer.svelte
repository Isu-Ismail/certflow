<script lang="ts">
  import { design } from '../design.svelte';
  import { visual } from './visual.svelte';
  import { beginMove, beginResize, type Gesture, type Handle } from './gestures';
  import { kindOf } from './geometry';

  // Sits on top of the preview. It owns ALL pointer input (the page never gets clicks), hit-tests the page
  // with elementFromPoint, and draws the selection. While text is edited it steps aside.
  //   click = select · drag = move · handles = resize · double-click text = edit
  //   Space + drag (or middle mouse button) = pan the view · Ctrl + wheel = zoom
  let { frame }: { frame: () => HTMLIFrameElement | undefined } = $props();

  let layer: HTMLDivElement;
  let gesture: Gesture | null = null;
  let origin = { x: 0, y: 0 };
  let moved = false;
  let spaceDown = $state(false);
  let panning = $state(false);
  let pan: { x: number; y: number; left: number; top: number; el: HTMLElement } | null = null;

  const s = $derived(design.scale);
  const toPage = (e: MouseEvent) => {
    const r = layer.getBoundingClientRect();
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };

  /** If the editor lost track of the page (the preview was reloaded without it noticing), reconnect. */
  function heal() {
    const f = frame();
    const doc = f?.contentDocument;
    if (f && doc?.body && doc !== visual.doc) visual.attach(f);
  }

  function onDown(e: PointerEvent) {
    heal();
    if (e.button === 1 || (e.button === 0 && spaceDown)) return startPan(e);
    if (e.button !== 0 || visual.editing) return;
    const p = toPage(e);
    const id = visual.hit(p.x, p.y);
    visual.select(id);
    if (id === null) return;
    gesture = beginMove(visual, id);
    origin = p;
    moved = false;
    layer.setPointerCapture(e.pointerId);
  }

  function startPan(e: PointerEvent) {
    const scroller = layer.closest('.overflow-auto') as HTMLElement | null;
    if (!scroller) return;
    e.preventDefault();
    pan = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop, el: scroller };
    panning = true;
    layer.setPointerCapture(e.pointerId);
  }

  function onHandleDown(e: PointerEvent, handle: Handle) {
    if (e.button !== 0 || visual.selected === null) return;
    e.stopPropagation();
    gesture = beginResize(visual, visual.selected, handle);
    origin = toPage(e);
    moved = true;
    layer.setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent) {
    if (pan) {
      pan.el.scrollLeft = pan.left - (e.clientX - pan.x);
      pan.el.scrollTop = pan.top - (e.clientY - pan.y);
      return;
    }
    const p = toPage(e);
    if (!gesture) {
      if (!e.buttons) { heal(); visual.setHover(visual.hit(p.x, p.y)); }
      return;
    }
    const dx = p.x - origin.x, dy = p.y - origin.y;
    if (!moved && Math.hypot(dx, dy) * s < 3) return; // a click, not a drag
    moved = true;
    gesture.update(dx, dy, e.shiftKey);
  }

  function onUp(e: PointerEvent) {
    pan = null;
    panning = false;
    gesture?.end();
    gesture = null;
    if (layer.hasPointerCapture(e.pointerId)) layer.releasePointerCapture(e.pointerId);
  }

  // Double-click text = edit it right there (even when it sits inside a group). On a group = go one level deeper.
  function onDblClick(e: MouseEvent) {
    if (visual.editing) return;
    heal();
    const p = toPage(e);
    const deepId = visual.hit(p.x, p.y, true);
    let el = visual.live(deepId);
    while (el && el !== visual.root) {
      if (kindOf(el) === 'text') {
        visual.select(visual.idOf(el));
        visual.startEdit();
        return;
      }
      el = el.parentElement;
    }
    const sel = visual.live(visual.selected);
    const deep = visual.live(deepId);
    if (sel && deep && visual.kind === 'group') {
      let child: HTMLElement | null = deep;
      while (child && child.parentElement !== sel) child = child.parentElement;
      if (child && child !== sel) visual.select(visual.idOf(child));
    }
  }

  // Ctrl/Cmd + wheel zooms; a plain wheel scrolls the stage as usual. (Needs a non-passive listener.)
  function wheel(node: HTMLElement) {
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      design.zoom = Math.min(2, Math.max(0.2, Math.round(design.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1) * 100) / 100));
    };
    node.addEventListener('wheel', handler, { passive: false });
    return { destroy: () => node.removeEventListener('wheel', handler) };
  }

  const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"], .cm-editor');
  function keydown(e: KeyboardEvent) {
    if (e.code === 'Space' && !typing(e) && !e.repeat) { spaceDown = true; e.preventDefault(); }
  }
  function keyup(e: KeyboardEvent) {
    if (e.code === 'Space') spaceDown = false;
  }

  // Which resize handles make sense: text only changes width; images keep their shape from the corners.
  const handles = $derived<Handle[]>(
    visual.kind === 'text' || visual.kind === 'group' ? ['w', 'e'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'],
  );
  const pos: Record<Handle, [number, number]> = {
    nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5],
  };
  const cursor: Record<Handle, string> = {
    nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  };
  const cursorClass = $derived(panning ? 'cursor-grabbing' : spaceDown ? 'cursor-grab' : visual.hovered !== null ? 'cursor-move' : 'cursor-default');
</script>

<svelte:window onkeydown={keydown} onkeyup={keyup} onblur={() => (spaceDown = false)} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={layer}
  use:wheel
  class="absolute inset-0 touch-none select-none {visual.editing ? 'pointer-events-none' : ''} {cursorClass}"
  onpointerdown={onDown}
  onpointermove={onMove}
  onpointerup={onUp}
  onpointercancel={onUp}
  ondblclick={onDblClick}
>
  {#if visual.hoverBox && !visual.editing && !spaceDown}
    <div class="pointer-events-none absolute border-2 border-dashed border-ink/60" style="left:{visual.hoverBox.x * s}px;top:{visual.hoverBox.y * s}px;width:{visual.hoverBox.w * s}px;height:{visual.hoverBox.h * s}px"></div>
  {/if}

  {#each visual.guides.x as x (x)}
    <div class="pointer-events-none absolute inset-y-0 w-0 border-l-2 border-dashed border-step" style="left:{x * s}px"></div>
  {/each}
  {#each visual.guides.y as y (y)}
    <div class="pointer-events-none absolute inset-x-0 h-0 border-t-2 border-dashed border-step" style="top:{y * s}px"></div>
  {/each}

  {#if visual.box}
    {@const b = visual.box}
    <div class="pointer-events-none absolute border-2 border-step" style="left:{b.x * s}px;top:{b.y * s}px;width:{b.w * s}px;height:{b.h * s}px">
      {#if visual.editing}
        <span class="absolute -top-7 left-0 rounded bg-ink px-2 py-0.5 font-mono text-[11px] whitespace-nowrap text-white">Editing text — Esc to finish</span>
      {:else}
        <span class="absolute top-full left-1/2 mt-2 -translate-x-1/2 rounded bg-ink px-2 py-0.5 font-mono text-[11px] whitespace-nowrap text-white">{Math.round(b.w)} × {Math.round(b.h)}</span>
        {#each handles as h (h)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="pointer-events-auto absolute size-3 -translate-x-1/2 -translate-y-1/2 border-2 border-ink bg-white"
            style="left:{pos[h][0] * 100}%;top:{pos[h][1] * 100}%;cursor:{cursor[h]}"
            onpointerdown={(e) => onHandleDown(e, h)}
          ></div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
