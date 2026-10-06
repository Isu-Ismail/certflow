<script lang="ts">
  import { ws } from "$lib/workspace/store.svelte";
  import { replaceDataFile } from "$lib/workspace/actions";
  import { dataUi } from "./data.svelte";
  import Button from "$lib/ui/Button.svelte";
  import { confirmDialog } from "$lib/ui/confirm.svelte";
  import TokenStrip from "./TokenStrip.svelte";
  import { identityColumn, identityProblems, isIdentity } from "$lib/workspace/identity";
  import { FileSpreadsheet as Sheet, KeyRound, Pencil, Upload, Trash } from "@lucide/svelte";

  let fileInput: HTMLInputElement;
  let renaming = $state(false);
  let draft = $state('');

  function startRename() {
    if (typeof dataUi.view !== 'number') return;
    draft = (shownSheet?.fileName ?? '').replace(/\.[^.]+$/, ''); // the extension stays as it is
    renaming = true;
  }
  function finishRename(save: boolean) {
    if (renaming && save && typeof dataUi.view === 'number') ws.renameSource(dataUi.view, draft);
    renaming = false;
  }
  const focusSelect = (node: HTMLInputElement) => { node.focus(); node.select(); };

  // what the table below shows: one data file, or all of them merged
  const shownSheet = $derived(dataUi.view === 'combined' ? ws.sheet : ws.sources[dataUi.view]);
  const merged = $derived(dataUi.view === 'combined');
  const rows = $derived(shownSheet?.rows.length ?? 0);
  const columns = $derived(shownSheet?.columns ?? []);

  // identity column: who a row is (all different); it names people everywhere and names their files
  const identity = $derived(shownSheet ? identityColumn(shownSheet) : '');
  const candidates = $derived(shownSheet ? columns.filter((c) => isIdentity(shownSheet, c)) : []);
  const chosenBad = $derived(!!shownSheet?.identity && shownSheet.identity !== identity);
  const problem = $derived(shownSheet && shownSheet.identity ? identityProblems(shownSheet.rows, shownSheet.identity) : null);
  const why = (c: string) => {
    if (!shownSheet) return '';
    const p = identityProblems(shownSheet.rows, c);
    return p.empty ? '(has blanks)' : p.repeated.length ? '(repeats)' : '';
  };
  const pickIdentity = (value: string) => { if (typeof dataUi.view === 'number') ws.setIdentity(dataUi.view, value); };

  async function removeData() {
    const many = ws.sources.length > 1;
    const name = shownSheet?.fileName ?? '';
    const ok = await confirmDialog({
      title: many ? `Remove ${name}?` : "Remove all data?",
      message: `${rows} ${rows === 1 ? "row" : "rows"} will be removed from this workspace. You can undo this.`,
      confirmLabel: many ? "Remove file" : "Remove data",
      danger: true,
    });
    if (!ok) return;
    if (many && typeof dataUi.view === 'number') { ws.removeSource(dataUi.view); dataUi.tab = 'combined'; }
    else ws.setSheet(null, "Remove data");
  }

  const stat =
    "rounded border-[1.5px] border-ink px-2 py-0.5 font-mono text-xs whitespace-nowrap";
</script>

<section
  class="shrink-0 overflow-hidden rounded-lg border-2 border-ink bg-white shadow-hard"
>
  <div class="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-3 py-2">
    <span
      class="grid size-8 shrink-0 place-items-center rounded-md border-2 border-ink bg-step text-on-step"
      ><Sheet class="size-4" /></span
    >
    {#if renaming}
      <input
        class="h-8 w-56 max-w-[50vw] rounded-md border-2 border-ink px-2 font-mono text-sm"
        aria-label="New name of the data file"
        bind:value={draft}
        use:focusSelect
        onblur={() => finishRename(true)}
        onkeydown={(e) => { if (e.key === 'Enter') finishRename(true); else if (e.key === 'Escape') finishRename(false); }}
      />
      <span class="font-mono text-sm text-mute" title="The kind of file stays the same">{shownSheet?.fileName.match(/\.[^.]+$/)?.[0] ?? ''}</span>
    {:else}
      <b class="max-w-[40vw] truncate font-mono text-sm">{shownSheet?.fileName}</b>
      {#if !merged}<button class="grid size-7 place-items-center rounded text-mute hover:bg-soft hover:text-ink" aria-label="Rename this data file" title="Rename" onclick={startRename}><Pencil class="size-4" /></button>{/if}
    {/if}
    <span class="{stat} bg-step-soft">{rows} {rows === 1 ? "row" : "rows"}</span
    >
    <span class="{stat} bg-white">{columns.length} columns</span>
    {#if merged}
      <span class="{stat} flex items-center gap-1 bg-white" title="The identity column of the main file"><KeyRound class="size-3.5" />{identity || 'row numbers'}</span>
    {:else}
      <label class="flex items-center gap-1.5 text-xs font-semibold" title="The column that says who a row is. It must be different for everyone. It names people in the app and names their files.">
        <KeyRound class="size-4" />Identity
        <select class="h-7 max-w-44 rounded-md border-2 border-ink bg-white px-1.5 text-xs font-semibold" value={shownSheet?.identity ?? ''} onchange={(e) => pickIdentity(e.currentTarget.value)} aria-label="Identity column">
          <option value="">Automatic ({identity || 'none fits'})</option>
          {#each columns as c (c)}<option value={c} disabled={!candidates.includes(c)}>{c} {why(c)}</option>{/each}
        </select>
      </label>
      {#if !candidates.length}
        <span class="{stat} bg-[#ffe9a8]">No column is different for everyone</span>
      {:else if chosenBad}
        <span class="{stat} bg-[#ffe9a8]" title="{problem?.repeated.slice(0, 5).map((r) => `${r.value} ×${r.count}`).join(', ')}">“{shownSheet?.identity}” {problem?.empty ? 'has blanks' : 'repeats'}: using {identity}</span>
      {/if}
    {/if}
    <span class="flex-1"></span>
    {#if !merged}<Button
      size="sm"
      variant="outline"
      onclick={() => fileInput.click()}
      aria-label="Replace file"
      ><Upload class="size-4" /><span class="hidden sm:inline">Replace</span
      ></Button
    >
    <Button
      size="sm"
      variant="outline"
      onclick={removeData}
      aria-label="Remove data"
      ><Trash class="size-4" /><span class="hidden sm:inline">Remove</span
      ></Button
    >{/if}
  </div>
  <TokenStrip {columns} />
</section>

<input
  bind:this={fileInput}
  type="file"
  class="hidden"
  accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods"
  onchange={(e) => {
    const f = e.currentTarget.files?.[0];
    if (f && typeof dataUi.view === 'number') replaceDataFile(dataUi.view, f);
    e.currentTarget.value = "";
  }}
/>
