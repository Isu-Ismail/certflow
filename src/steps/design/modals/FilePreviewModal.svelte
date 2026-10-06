<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { blobUrl } from '$lib/render/assets';
  import { toast } from '$lib/ui/toast.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import Button from '$lib/ui/Button.svelte';
  import { design } from '../design.svelte';
  import { File as FileIcon, Minus, Plus, RotateCcw } from '@lucide/svelte';

  const file = $derived(ws.files.find((f) => f.name === design.previewFile) ?? null);
  const kind = $derived(!file ? 'other' : file.blob.type.startsWith('image/') ? 'image' : /\.(ttf|otf|woff2?)$/i.test(file.name) ? 'font' : 'other');
  const usedIn = $derived(file ? ws.designs.filter((d) => d.html.includes(file.name)).length : 0);

  let dims = $state<string | null>(null);
  let fontFamily = $state<string | null>(null);

  // Zoom & pan state for free image zoom
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let isDragging = $state(false);
  let dragStart = { x: 0, y: 0 };
  let containerEl = $state<HTMLDivElement | null>(null);

  function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  function zoomBy(delta: number) {
    const newZoom = Math.min(Math.max(Math.round((zoom + delta) * 100) / 100, 0.1), 15);
    if (newZoom === zoom) return;
    if (newZoom <= 1 && zoom > 1) {
      panX = 0;
      panY = 0;
    } else if (zoom > 0) {
      panX = (panX * newZoom) / zoom;
      panY = (panY * newZoom) / zoom;
    }
    zoom = newZoom;
  }

  function onWheel(e: WheelEvent) {
    if (kind !== 'image') return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(Math.max(zoom * factor, 0.1), 15);

    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const cx = e.clientX - (rect.left + rect.width / 2);
      const cy = e.clientY - (rect.top + rect.height / 2);
      panX = cx - (cx - panX) * (newZoom / zoom);
      panY = cy - (cy - panY) * (newZoom / zoom);
    }
    zoom = newZoom;
  }

  function onPointerDown(e: PointerEvent) {
    if (kind !== 'image' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, [data-toolbar]')) return;
    isDragging = true;
    dragStart = { x: e.clientX - panX, y: e.clientY - panY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    panX = e.clientX - dragStart.x;
    panY = e.clientY - dragStart.y;
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  function onDblClick(e: MouseEvent) {
    if (kind !== 'image') return;
    if ((e.target as HTMLElement).closest('button, [data-toolbar]')) return;
    if (Math.abs(zoom - 1) > 0.05 || panX !== 0 || panY !== 0) {
      resetZoom();
    } else {
      if (containerEl) {
        const rect = containerEl.getBoundingClientRect();
        const cx = e.clientX - (rect.left + rect.width / 2);
        const cy = e.clientY - (rect.top + rect.height / 2);
        panX = cx - (cx - panX) * 2.5;
        panY = cy - (cy - panY) * 2.5;
      }
      zoom = 2.5;
    }
  }

  // load whatever the popup needs for the newly selected file
  $effect(() => {
    dims = null;
    fontFamily = null;
    resetZoom();
    if (file && kind === 'font') loadFont(file.blob);
  });

  async function loadFont(blob: Blob) {
    try {
      const face = new FontFace(`cf-preview-${Math.random().toString(36).slice(2)}`, await blob.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      fontFamily = face.family;
    } catch {
      fontFamily = null;
    }
  }

  const size = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

  async function copyPath() {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(`files/${file.name}`);
      toast(`Copied files/${file.name}`);
    } catch {
      toast('Could not copy', 'error');
    }
  }

  // checkerboard shows transparent areas of logos
  const checker = 'background-color:#fff;background-image:conic-gradient(#e7e3d6 25%,transparent 0 50%,#e7e3d6 0 75%,transparent 0);background-size:20px 20px';
</script>

<Modal bind:open={() => design.previewFile !== null && file !== null, (v) => { if (!v) design.previewFile = null; }} title={file?.name ?? 'Preview'} size="lg">
  {#if file}
    {#if kind === 'image'}
      <div class="relative overflow-hidden rounded-md border-2 border-ink">
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          bind:this={containerEl}
          class="relative flex h-[56dvh] w-full items-center justify-center overflow-hidden select-none touch-none {isDragging ? 'cursor-grabbing' : 'cursor-grab'}"
          style={checker}
          onwheel={onWheel}
          onpointerdown={onPointerDown}
          onpointermove={onPointerMove}
          onpointerup={onPointerUp}
          onpointercancel={onPointerUp}
          ondblclick={onDblClick}
          role="region"
          aria-label="Image preview with free zoom and pan"
        >
          <img
            src={blobUrl(file.blob)}
            alt={file.name}
            draggable="false"
            class="pointer-events-none max-h-full max-w-full object-contain will-change-transform"
            style="transform: translate({panX}px, {panY}px) scale({zoom}); transform-origin: center center; transition: {isDragging ? 'none' : 'transform 120ms ease-out'};"
            onload={(e) => { const i = e.currentTarget as HTMLImageElement; dims = `${i.naturalWidth} × ${i.naturalHeight} px`; }}
          />
        </div>

        <!-- Top hints -->
        <div class="pointer-events-none absolute top-2 left-2 rounded border border-ink/30 bg-paper/90 px-2 py-0.5 font-mono text-[11px] text-mute shadow-sm backdrop-blur-[2px]">
          Scroll to zoom · Drag to pan · Double-click to toggle 250%
        </div>

        <!-- Floating Neo-Brutalist zoom toolbar -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          role="toolbar"
          aria-label="Zoom controls"
          tabindex="-1"
          data-toolbar="true"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-md border-2 border-ink bg-paper px-2 py-1 shadow-hard"
          onpointerdown={(e) => e.stopPropagation()}
          onclick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            class="flex size-7 cursor-pointer items-center justify-center rounded border border-ink bg-white transition hover:bg-soft active:translate-y-0.5"
            title="Zoom out (-25%)"
            aria-label="Zoom out"
            onclick={() => zoomBy(-0.25)}
          >
            <Minus class="size-3.5" />
          </button>

          <button
            type="button"
            class="min-w-16 cursor-pointer px-1.5 py-0.5 text-center font-mono text-xs font-bold text-ink hover:underline"
            title="Click to reset zoom (100%)"
            onclick={resetZoom}
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            class="flex size-7 cursor-pointer items-center justify-center rounded border border-ink bg-white transition hover:bg-soft active:translate-y-0.5"
            title="Zoom in (+25%)"
            aria-label="Zoom in"
            onclick={() => zoomBy(0.25)}
          >
            <Plus class="size-3.5" />
          </button>

          <div class="mx-1 h-4 w-[1px] bg-ink/30"></div>

          <button
            type="button"
            class="flex cursor-pointer items-center gap-1 rounded border border-ink bg-white px-2 py-1 text-[11px] font-bold text-ink transition hover:bg-soft active:translate-y-0.5"
            title="Reset pan and zoom"
            onclick={resetZoom}
          >
            <RotateCcw class="size-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    {:else}
      <div class="grid min-h-48 place-items-center overflow-hidden rounded-md border-2 border-ink p-4" style={checker}>
        {#if kind === 'font' && fontFamily}
          <div class="space-y-3 rounded bg-white/90 p-4 text-center" style="font-family:'{fontFamily}'">
            <div class="text-5xl">Aa Bb Cc 123</div>
            <div class="text-2xl">The quick brown fox jumps over the lazy dog</div>
          </div>
        {:else}
          <div class="rounded bg-white/90 px-6 py-8 text-center text-sm text-mute">
            <FileIcon class="mx-auto mb-2 size-8" />
            {kind === 'font' ? 'This font could not be previewed.' : 'No preview for this file type.'}
          </div>
        {/if}
      </div>
    {/if}

    <div class="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded border border-ink/20 bg-soft/50 px-2.5 py-1.5 font-mono text-xs text-mute">
      <span class="truncate"><strong class="font-sans font-semibold text-ink">Filename:</strong> {file.name}</span>
      <span class="text-ink/30">•</span>
      <span class="truncate"><strong class="font-sans font-semibold text-ink">Path:</strong> files/{file.name}</span>
      {#if dims}
        <span class="text-ink/30">•</span>
        <span><strong class="font-sans font-semibold text-ink">Dimensions:</strong> {dims}</span>
      {/if}
      <span class="text-ink/30">•</span>
      <span><strong class="font-sans font-semibold text-ink">Size:</strong> {size(file.blob.size)}</span>
      <span class="text-ink/30">•</span>
      <span><strong class="font-sans font-semibold text-ink">Used:</strong> {usedIn ? `${usedIn} design${usedIn === 1 ? '' : 's'}` : '0 designs'}</span>
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="outline" onclick={copyPath}>Copy path</Button>
    <Button variant="dark" onclick={() => (design.previewFile = null)}>Close</Button>
  {/snippet}
</Modal>
