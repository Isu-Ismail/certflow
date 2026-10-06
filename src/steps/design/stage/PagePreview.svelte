<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { PageSize } from '$lib/render/page';

  let {
    srcdoc,
    size,
    scale,
    onload,
    overlay,
  }: {
    srcdoc: string;
    size: PageSize;
    scale: number;
    onload?: (frame: HTMLIFrameElement) => void;
    overlay?: Snippet<[() => HTMLIFrameElement | undefined]>;
  } = $props();

  let frame = $state<HTMLIFrameElement>();
</script>

<!-- Never allow-scripts: with allow-same-origin a script could reach the app. Trusted designs are baked first (render/bake.ts). -->
<div class="rounded-sm border-2 border-ink bg-white shadow-[6px_6px_0_#121212]">
  <div class="relative overflow-hidden" style="width:{size.width * scale}px;height:{size.height * scale}px">
    <iframe
      bind:this={frame}
      title="Certificate preview"
      sandbox="allow-same-origin"
      {srcdoc}
      class="block border-0 bg-white"
      style="width:{size.width}px;height:{size.height}px;transform:scale({scale});transform-origin:top left"
      onload={() => frame && onload?.(frame)}
    ></iframe>
    {@render overlay?.(() => frame)}
  </div>
</div>
