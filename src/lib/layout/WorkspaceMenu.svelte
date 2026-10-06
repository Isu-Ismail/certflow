<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { downloadWorkspaceZip, openFileList, openFolder, reconnectFolder, saveWorkspace } from '$lib/workspace/actions';
  import { canLinkFolder } from '$lib/workspace/folder';
  import Button from '$lib/ui/Button.svelte';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import WorkspaceTree from './WorkspaceTree.svelte';
  import {
    Folder,
    FolderSync,
    ChevronDown,
    FolderOpen,
    Download,
    Save,
    RotateCcw as Rotate,
  } from '@lucide/svelte';

  let open = $state(false);
  let folderInput: HTMLInputElement;

  async function onOpen() {
    open = false;
    if (!(await openFolder())) folderInput.click();
  }

  async function onReset() {
    open = false;
    const ok = await confirmDialog({
      title: 'Start a new workspace?',
      message: 'Everything in this workspace is cleared from this browser, and undo history is lost. Save it first if you need it.',
      confirmLabel: 'Clear and start new',
      danger: true,
    });
    if (ok) ws.reset();
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="relative min-w-0">
  <button
    class="flex h-9 max-w-full items-center gap-2 rounded-md border-2 border-ink bg-white px-2.5 font-mono text-[13px] font-semibold hover:bg-step-soft"
    aria-haspopup="true"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <Folder class="hidden size-4 shrink-0 sm:block" />
    <span class="max-w-20 truncate sm:max-w-56">{ws.name || 'workspace'}</span>
    <ChevronDown class="size-4 shrink-0 text-mute" />
  </button>

  {#if open}
    <button class="fixed inset-0 z-20 cursor-default" aria-label="Close menu" onclick={() => (open = false)}></button>
    <div class="fixed inset-x-3 top-16 z-30 rounded-lg border-2 border-ink bg-white shadow-hard-lg sm:absolute sm:inset-x-auto sm:top-11 sm:left-0 sm:w-[360px]">
      <div class="border-b-2 border-ink p-4">
        <label class="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-mute uppercase" for="ws-name">Workspace name (= folder name)</label>
        <input
          id="ws-name"
          class="h-9 w-full rounded-md border-2 border-ink px-2.5 font-mono text-sm"
          bind:value={ws.name}
          oninput={() => ws.touch()}
          spellcheck="false"
        />
      </div>
      <div class="max-h-64 overflow-auto p-3"><WorkspaceTree /></div>

      <!-- is the workspace a real folder on disk? -->
      <div class="border-t-2 border-ink px-4 py-3 text-sm">
        {#if ws.folderState === 'linked'}
          <p class="flex items-center gap-2"><FolderSync class="size-4 shrink-0 text-[#1f7a3d]" /><span>Saved into the folder <b class="font-mono">{ws.handle?.name}</b> as you work.</span></p>
          <button class="mt-1 text-xs font-semibold text-mute underline underline-offset-2 hover:text-ink" onclick={() => ws.unlinkFolder()}>Stop saving into this folder</button>
        {:else if ws.folderState === 'needs-permission'}
          <p class="font-semibold text-[#8a5a00]">The folder <span class="font-mono">{ws.handle?.name}</span> needs your permission again.</p>
          <Button variant="step" size="sm" class="mt-2" onclick={() => { open = false; reconnectFolder(); }}><FolderSync class="size-4" />Reconnect folder</Button>
        {:else if canLinkFolder()}
          <p class="text-mute">Not in a folder yet. Choose one and your work, and later your certificates, are saved straight into it.</p>
        {:else}
          <p class="text-mute">This browser cannot save into a folder. Work is kept in the browser; use .zip to keep a copy.</p>
        {/if}
      </div>
      <div class="flex flex-wrap gap-2 border-t-2 border-ink p-3">
        {#if canLinkFolder()}<Button variant="dark" size="sm" onclick={() => { open = false; saveWorkspace(); }}><Save class="size-4" />{ws.folderState === 'none' ? 'Choose folder…' : 'Save now'}</Button>{/if}
        <Button variant="outline" size="sm" onclick={() => { open = false; downloadWorkspaceZip(); }}><Download class="size-4" />.zip</Button>
        <Button variant="outline" size="sm" onclick={onOpen}><FolderOpen class="size-4" />Open…</Button>
        <Button variant="ghost" size="sm" class="ml-auto" onclick={onReset}>
          <Rotate class="size-4" />New
        </Button>
      </div>
    </div>
  {/if}

  <input bind:this={folderInput} type="file" class="hidden" webkitdirectory multiple onchange={(e) => { const l = e.currentTarget.files; if (l?.length) openFileList(l); e.currentTarget.value = ''; }} />
</div>
