<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import {
    Folder,
    File,
    FileSpreadsheet as Sheet,
    Image,
    GitBranch as Branch,
  } from '@lucide/svelte';

  const row = 'flex items-center gap-2 rounded px-1.5 py-0.5 hover:bg-step-soft';
</script>

<div class="font-mono text-[13px] leading-7">
  <div class="{row} font-bold"><Folder class="size-4" />{ws.name || 'workspace'}/</div>
  {#if ws.isEmpty}
    <p class="ml-6 py-1 font-sans text-sm text-mute">Empty. Import data or open a folder.</p>
  {/if}
  <div class="ml-5">
    {#if ws.sources.length}
      <div class={row}><Folder class="size-4" />data/</div>
      {#each ws.sources as src (src.fileName)}<div class="{row} ml-5"><Sheet class="size-4" />{src.fileName}</div>{/each}
    {/if}
    {#if ws.designs.length}
      <div class={row}><Folder class="size-4" />designs/</div>
      {#each ws.designs as d (d.name)}<div class="{row} ml-5"><File class="size-4" />{d.name}.cert.html</div>{/each}
    {/if}
    {#if ws.files.length}
      <div class={row}><Folder class="size-4" />files/</div>
      {#each ws.files as f (f.name)}<div class="{row} ml-5"><Image class="size-4" />{f.name}</div>{/each}
    {/if}
    {#if ws.sources.length || ws.flow || ws.genConfig || ws.designs.length}
      <div class={row}><Folder class="size-4" />config/</div>
      <div class="ml-5">
        <div class={row}><Branch class="size-4" />workspace.json</div>
        {#if ws.sources.length}<div class={row}><Branch class="size-4" />data.config.json</div>{/if}
        {#if Object.keys(ws.fieldMap).length || Object.keys(ws.designData).length}<div class={row}><Branch class="size-4" />design.config.json</div>{/if}
        {#if ws.flow}<div class={row}><Branch class="size-4" />flow.config.json</div>{/if}
        {#if ws.genConfig}<div class={row}><Branch class="size-4" />generate.config.json</div>{/if}
      </div>
    {/if}
  </div>
</div>
