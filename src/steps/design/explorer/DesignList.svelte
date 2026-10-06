<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { design } from '../design.svelte';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import Menu, { type MenuItem } from '$lib/ui/Menu.svelte';
  import { toast } from '$lib/ui/toast.svelte';
  import { FileCode } from '@lucide/svelte';

  let renaming = $state<string | null>(null);
  let draft = $state('');
  let replaceInput: HTMLInputElement;
  let replaceTarget = '';

  const items = (name: string): MenuItem[] => [
    { label: 'Rename (F2)', onselect: () => { renaming = name; draft = name; } },
    { label: 'Duplicate', onselect: () => { design.commitDraft(); const n = ws.duplicateDesign(name); if (n) design.select(n); } },
    { label: 'Replace with a file…', onselect: () => { replaceTarget = name; replaceInput.click(); } },
    { label: 'Download', onselect: () => download(name) },
    { label: 'Delete', danger: true, onselect: () => remove(name) },
  ];

  function onKeydown(e: KeyboardEvent) {
    if (renaming !== null) return;
    const target = e.target as HTMLElement;
    if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (e.key === 'F2' && design.active) {
      e.preventDefault();
      renaming = design.active.name;
      draft = design.active.name;
    }
  }

  function commit() {
    if (renaming === null) return;
    const from = renaming;
    renaming = null;
    design.commitDraft(); // typed-but-unsaved code must be saved under the old name first
    const to = ws.renameDesign(from, draft);
    if (design.activeName === from) design.activeName = to;
  }

  /** Updates a design from an .html file (for example after you edited the file in another editor). Undoable. */
  async function replaceFromFile(file: File | undefined) {
    if (!file || !replaceTarget) return;
    design.commitDraft();
    const html = await file.text();
    ws.setDesignHtml(replaceTarget, html, `Replace “${replaceTarget}” from file`);
    design.forceRerender();
    toast(`Updated “${replaceTarget}” from ${file.name}`, 'success');
    if (/<script[\s>]/i.test(html)) toast('This file has a script. Scripts stay off unless you choose “Allow scripts…” below the page.');
  }

  async function remove(name: string) {
    design.commitDraft();
    const ok = await confirmDialog({
      title: 'Delete this design?',
      message: `“${name}.cert.html” will be removed from the workspace. You can undo this.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    ws.deleteDesign(name);
    if (design.activeName === name) design.activeName = null;
  }

  function download(name: string) {
    design.commitDraft();
    const d = ws.designs.find((x) => x.name === name);
    if (!d) return;
    const url = URL.createObjectURL(new Blob([d.html], { type: 'text/html' }));
    Object.assign(document.createElement('a'), { href: url, download: `${name}.cert.html` }).click();
    URL.revokeObjectURL(url);
  }

  function focusInput(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

<svelte:window onkeydown={onKeydown} />

<input bind:this={replaceInput} type="file" accept=".html,.htm,text/html" class="hidden" onchange={(e) => { replaceFromFile(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} />

<ul class="space-y-0.5">
  {#each ws.designs as d (d.name)}
    {@const active = design.active?.name === d.name}
    <li class="group flex items-center gap-1 rounded-md border-[1.5px] pr-0.5 {active ? 'border-ink bg-step-soft' : 'border-transparent hover:bg-soft'}">
      {#if renaming === d.name}
        <input
          class="m-0.5 h-7 min-w-0 flex-1 rounded border-2 border-ink px-1.5 font-mono text-[13px] outline-none"
          bind:value={draft}
          onblur={commit}
          onkeydown={(e) => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') renaming = null; }}
          use:focusInput
        />
      {:else}
        <button
          class="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 text-left"
          title="Click to edit (double-click or F2 to rename)"
          onclick={() => design.select(d.name)}
          ondblclick={() => { renaming = d.name; draft = d.name; }}
          aria-current={active ? 'true' : undefined}
        >
          <FileCode class="size-4 shrink-0" />
          <span class="min-w-0 truncate font-mono text-[13px] {active ? 'font-bold' : ''}">{d.name}<span class="text-mute">.cert.html</span></span>
        </button>
        <Menu items={items(d.name)} label="Actions for {d.name}" />
      {/if}
    </li>
  {/each}
</ul>
