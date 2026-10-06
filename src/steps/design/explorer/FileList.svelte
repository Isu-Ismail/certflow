<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { addFiles } from '$lib/workspace/actions';
  import { blobUrl } from '$lib/render/assets';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import { toast } from '$lib/ui/toast.svelte';
  import Menu, { type MenuItem } from '$lib/ui/Menu.svelte';
  import { design } from '../design.svelte';
  import { File as FileIcon, Trash, Check } from '@lucide/svelte';

  let dragging = $state(false);
  let input: HTMLInputElement;
  let renaming = $state<string | null>(null);
  let draft = $state('');

  let lastSelected = $state<string | null>(null);

  /** The section header's upload button opens the same picker. */
  export function openPicker() {
    input.click();
  }

  export function clearSelection() {
    design.selectedFiles = [];
    lastSelected = null;
  }

  export function selectAll() {
    design.selectedFiles = ws.files.map((f) => f.name);
    lastSelected = design.selectedFiles[design.selectedFiles.length - 1] ?? null;
  }

  /** file name -> number of designs that use it. */
  const usage = $derived.by(() => {
    const counts = new Map<string, number>();
    // lenient on purpose: `files/x.png`, `./x.png` and `x.png` all count as using x.png
    for (const f of ws.files) for (const d of ws.designs) if (d.html.includes(f.name)) counts.set(f.name, (counts.get(f.name) ?? 0) + 1);
    return counts;
  });

  const isImage = (b: Blob) => b.type.startsWith('image/');

  function toggleSelect(name: string) {
    if (design.selectedFiles.includes(name)) {
      design.selectedFiles = design.selectedFiles.filter((x) => x !== name);
      if (lastSelected === name) lastSelected = design.selectedFiles[design.selectedFiles.length - 1] ?? null;
    } else {
      design.selectedFiles = [...design.selectedFiles, name];
      lastSelected = name;
    }
  }

  function handleClick(name: string, e: MouseEvent) {
    if (renaming !== null) return;

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      toggleSelect(name);
    } else if (e.shiftKey && lastSelected && ws.files.some((f) => f.name === lastSelected)) {
      e.preventDefault();
      const all = ws.files.map((f) => f.name);
      const i1 = all.indexOf(lastSelected);
      const i2 = all.indexOf(name);
      if (i1 !== -1 && i2 !== -1) {
        const [start, end] = [Math.min(i1, i2), Math.max(i1, i2)];
        const range = all.slice(start, end + 1);
        design.selectedFiles = [...new Set([...design.selectedFiles, ...range])];
      }
    } else {
      // Normal click opens preview only; only checkbox selects
      lastSelected = name;
      design.previewFile = name;
    }
  }

  const items = (name: string): MenuItem[] => {
    const isMulti = design.selectedFiles.length > 1 && design.selectedFiles.includes(name);
    if (isMulti) {
      return [
        { label: `Delete ${design.selectedFiles.length} selected files`, danger: true, onselect: () => removeSelected() },
        { label: 'Clear selection', onselect: () => clearSelection() },
        { label: 'Preview', onselect: () => (design.previewFile = name) },
        { label: 'Copy path', onselect: () => copyPath(name) },
      ];
    }
    return [
      { label: 'Preview', onselect: () => (design.previewFile = name) },
      { label: 'Rename (F2)', onselect: () => startRename(name) },
      { label: 'Copy path', onselect: () => copyPath(name) },
      { label: 'Delete', danger: true, onselect: () => remove(name) },
    ];
  };

  function startRename(name: string) {
    renaming = name;
    draft = name;
  }

  function commitRename() {
    if (renaming === null) return;
    const from = renaming;
    renaming = null;
    const result = ws.renameFile(from, draft);
    if (!result) return;
    toast(result.updated ? `Renamed to ${result.name} — updated ${result.updated} design${result.updated === 1 ? '' : 's'}` : `Renamed to ${result.name}`, 'success');
  }

  function focusInput(node: HTMLInputElement) {
    node.focus();
    // select the name without the extension, so typing replaces just the name
    const dot = node.value.lastIndexOf('.');
    node.setSelectionRange(0, dot > 0 ? dot : node.value.length);
  }

  async function copyPath(name: string) {
    try {
      await navigator.clipboard.writeText(`files/${name}`);
      toast(`Copied files/${name}`);
    } catch {
      toast('Could not copy', 'error');
    }
  }

  async function remove(name: string) {
    const used = usage.get(name) ?? 0;
    const ok = await confirmDialog({
      title: 'Delete this file?',
      message: used
        ? `“${name}” is used in ${used} design${used === 1 ? '' : 's'}. They will show a missing file. You can undo this.`
        : `“${name}” will be removed from files/. You can undo this.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      ws.deleteFile(name);
      design.selectedFiles = design.selectedFiles.filter((x) => x !== name);
      if (lastSelected === name) lastSelected = null;
    }
  }

  export async function removeSelected() {
    const count = design.selectedFiles.length;
    if (!count) return;

    if (count === 1) {
      await remove(design.selectedFiles[0]);
      return;
    }

    const usedCount = design.selectedFiles.filter((name) => (usage.get(name) ?? 0) > 0).length;
    const ok = await confirmDialog({
      title: `Delete ${count} files?`,
      message: usedCount > 0
        ? `${count} files will be removed from files/. ${usedCount} of them are used in designs and will show missing assets. You can undo this.`
        : `${count} files will be removed from files/. You can undo this.`,
      confirmLabel: `Delete ${count} files`,
      danger: true,
    });
    if (!ok) return;

    const names = [...design.selectedFiles];
    ws.deleteFiles(names);
    toast(`Deleted ${count} files`);
    design.selectedFiles = [];
    lastSelected = null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
  }

  function onKeydown(e: KeyboardEvent) {
    if (renaming !== null) return;
    const target = e.target as HTMLElement;
    if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (e.key === 'F2') {
      const targetName = design.selectedFiles.length === 1 ? design.selectedFiles[0] : lastSelected;
      if (targetName && ws.files.some((f) => f.name === targetName)) {
        e.preventDefault();
        startRename(targetName);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (design.selectedFiles.length > 0) {
        e.preventDefault();
        removeSelected();
      }
    } else if (e.key === 'Escape' && design.selectedFiles.length > 0) {
      clearSelection();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div
  role="group"
  aria-label="Files"
  class="rounded-md border-[1.5px] border-dashed p-1 transition-colors {dragging ? 'border-ink bg-step-soft' : 'border-transparent'}"
  ondragover={(e) => { e.preventDefault(); dragging = true; }}
  ondragleave={() => (dragging = false)}
  ondrop={onDrop}
>
  {#if ws.files.length}
    {#if design.selectedFiles.length > 1}
      <div class="mb-1.5 flex items-center justify-between rounded border-2 border-ink bg-paper px-2 py-1 text-xs shadow-hard">
        <span class="font-mono font-bold">{design.selectedFiles.length} files selected</span>
        <div class="flex items-center gap-1.5">
          {#if design.selectedFiles.length < ws.files.length}
            <button class="font-semibold text-mute hover:text-ink underline" onclick={selectAll}>All</button>
          {/if}
          <button class="font-semibold text-mute hover:text-ink underline" onclick={clearSelection}>Clear</button>
          <button
            class="flex items-center gap-1 rounded border border-ink bg-[#fbd5cf] px-2 py-0.5 font-bold text-ink shadow-[1px_1px_0_#121212] hover:bg-[#f8b4a8]"
            onclick={removeSelected}
          >
            <Trash class="size-3" />Delete
          </button>
        </div>
      </div>
    {/if}

    <ul class="space-y-0.5">
      {#each ws.files as f (f.name)}
        {@const isSel = design.selectedFiles.includes(f.name)}
        <li
          class="group flex items-center gap-1.5 rounded-md border-[1.5px] py-1 pr-0.5 pl-1 transition-colors {isSel ? 'border-ink bg-step-soft shadow-[2px_2px_0_#121212]' : 'border-transparent hover:bg-soft'}"
        >
          <!-- Checkbox / select circle -->
          <button
            class="grid size-4 shrink-0 place-items-center rounded border border-ink transition-opacity {isSel ? 'bg-ink text-white opacity-100' : design.selectedFiles.length > 0 ? 'bg-white opacity-70 hover:opacity-100' : 'bg-white opacity-0 group-hover:opacity-100'}"
            aria-label="{isSel ? 'Deselect' : 'Select'} {f.name}"
            title="{isSel ? 'Click to deselect' : 'Click to select'}"
            onclick={(e) => { e.stopPropagation(); toggleSelect(f.name); }}
          >
            {#if isSel}<Check class="size-3" />{/if}
          </button>

          <!-- Thumbnail -->
          <button
            class="grid size-8 shrink-0 place-items-center overflow-hidden rounded border-[1.5px] border-ink bg-white"
            aria-label="Preview {f.name}"
            title="Click to preview (Ctrl+click to select)"
            onclick={(e) => handleClick(f.name, e)}
          >
            {#if isImage(f.blob)}<img src={blobUrl(f.blob)} alt="" class="size-full object-contain" />{:else}<FileIcon class="size-4 text-mute" />{/if}
          </button>

          {#if renaming === f.name}
            <input
              class="h-8 min-w-0 flex-1 rounded border-2 border-ink px-1.5 font-mono text-[13px] outline-none"
              bind:value={draft}
              onblur={commitRename}
              onkeydown={(e) => { if (e.key === 'Enter') commitRename(); else if (e.key === 'Escape') renaming = null; }}
              use:focusInput
            />
          {:else}
            <button
              class="min-w-0 flex-1 text-left"
              title="Click to preview (Ctrl+click to select, F2 to rename)"
              ondblclick={() => startRename(f.name)}
              onclick={(e) => handleClick(f.name, e)}
            >
              <span class="block truncate font-mono text-[13px] {isSel ? 'font-bold' : ''}">{f.name}</span>
              <span class="block text-[11px] text-mute">{usage.get(f.name) ? `used in ${usage.get(f.name)}` : 'not used'}</span>
            </button>
            <Menu items={items(f.name)} label="Actions for {f.name}" />
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <button class="w-full rounded-md px-2 py-3 text-center text-sm text-mute hover:bg-soft" onclick={() => input.click()}>
      Drop logos, backgrounds or fonts here<br /><span class="font-semibold text-ink underline underline-offset-2">or choose files</span>
    </button>
  {/if}
</div>

<input bind:this={input} type="file" multiple class="hidden" accept="image/*,.ttf,.otf,.woff,.woff2"
  onchange={(e) => { const l = e.currentTarget.files; if (l?.length) addFiles(l); e.currentTarget.value = ''; }} />
