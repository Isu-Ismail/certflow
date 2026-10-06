<script lang="ts">
  import { importFile, importText, openFileList, openFolder, useSample } from '$lib/workspace/actions';
  import Button from '$lib/ui/Button.svelte';
  import { FolderOpen, FileSpreadsheet as Sheet } from '@lucide/svelte';

  let dragging = $state(false);
  let folderInput: HTMLInputElement;
  let fileInput: HTMLInputElement;

  async function onOpenFolder() {
    if (!(await openFolder())) folderInput.click();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) importFile(file);
  }

  function onPaste(e: ClipboardEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea')) return;
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (/[\n\t,]/.test(text.trim())) importText(text);
  }

  const card = 'flex flex-col gap-4 rounded-lg border-2 border-ink bg-white p-5 shadow-hard-lg sm:p-6';
  const icon = 'grid size-11 place-items-center rounded-lg border-2 border-ink bg-step text-on-step';
</script>

<svelte:window onpaste={onPaste} />

<div class="mx-auto flex max-w-4xl flex-col gap-7 px-4 py-8 sm:px-8 sm:py-14">
  <div class="text-center">
    <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Start with your data</h1>
    <p class="mt-2 text-mute">Open a workspace you saved before, or import a spreadsheet.</p>
  </div>

  <div class="grid gap-5 md:grid-cols-2">
    <section class={card}>
      <span class={icon}><FolderOpen class="size-6" /></span>
      <div class="flex-1">
        <h2 class="text-lg font-bold">Open a workspace</h2>
        <p class="mt-1 text-sm text-mute">Pick a folder with your data, designs and flow. Everything loads at once.</p>
      </div>
      <Button variant="dark" size="lg" onclick={onOpenFolder}><FolderOpen class="size-5" />Choose folder</Button>
    </section>

    <section
      class="{card} border-dashed transition-colors {dragging ? 'bg-step-soft' : ''}"
      ondragover={(e) => { e.preventDefault(); dragging = true; }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
      aria-label="Drop a CSV or Excel file"
    >
      <span class={icon}><Sheet class="size-6" /></span>
      <div class="flex-1">
        <h2 class="text-lg font-bold">Import a spreadsheet</h2>
        <p class="mt-1 text-sm text-mute">Drop a CSV or Excel file here. One row per person, a header row on top.</p>
      </div>
      <Button variant="step" size="lg" onclick={() => fileInput.click()}><Sheet class="size-5" />Choose file</Button>
    </section>
  </div>

  <p class="text-center text-sm text-mute">
    No file handy?
    <button class="font-semibold text-ink underline underline-offset-2 hover:text-step" onclick={useSample}>Try sample data</button>
    <span class="hidden sm:inline">· or paste a table from Excel or Sheets with <kbd class="rounded border border-ink bg-white px-1.5 font-mono text-xs">Ctrl V</kbd></span>
  </p>
</div>

<input bind:this={fileInput} type="file" class="hidden" accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods"
  onchange={(e) => { const f = e.currentTarget.files?.[0]; if (f) importFile(f); e.currentTarget.value = ''; }} />
<input bind:this={folderInput} type="file" class="hidden" webkitdirectory multiple
  onchange={(e) => { const l = e.currentTarget.files; if (l?.length) openFileList(l); e.currentTarget.value = ''; }} />
