<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { addedNames, columnConflicts, combineSources, stem } from '$lib/workspace/combine';
  import type { CombineStep } from '$lib/workspace/types';
  import Button from '$lib/ui/Button.svelte';
  import Modal from '$lib/ui/Modal.svelte';
  import { dataUi } from './data.svelte';

  const pending = $derived(dataUi.pending);
  let open = $state(false);
  let mode = $state<'stack' | 'join' | 'separate'>('stack');
  let names = $state<Record<string, string>>({}); // new names for columns that already exist
  let leftKey = $state('');
  let rightKey = $state('');
  let keep = $state<'all' | 'matched'>('all');

  // the files that come before this one, and the table they make
  const baseSources = $derived(pending ? (pending.editing === null ? ws.sources : ws.sources.slice(0, pending.editing)) : []);
  const baseSteps = $derived(pending ? (pending.editing === null ? ws.combine : ws.combine.slice(0, pending.editing - 1)) : []);
  const leftColumns = $derived(combineSources(baseSources, baseSteps)?.sheet.columns ?? []);

  /** A column both files have (ignoring case): the likely key. */
  function guessJoin() {
    if (!pending) return null;
    const lower = new Map(leftColumns.map((c) => [c.trim().toLowerCase(), c]));
    for (const c of pending.sheet.columns) {
      const hit = lower.get(c.trim().toLowerCase());
      if (hit) return { left: hit, right: c };
    }
    return null;
  }

  // open and reset whenever a new file is waiting
  let lastPending: unknown = null;
  $effect(() => {
    if (pending === lastPending) return;
    lastPending = pending;
    if (!pending) { open = false; return; }
    const current = pending.editing === null ? null : ws.combine[pending.editing - 1];
    names = current?.mode === 'join' ? { ...(current.rename ?? {}) } : {};
    if (current?.mode === 'join') {
      mode = 'join'; leftKey = current.leftKey; rightKey = current.rightKey; keep = current.keep;
    } else if (current?.mode === 'separate') {
      mode = 'separate';
    } else {
      const g = guessJoin();
      mode = 'stack';
      leftKey = g?.left ?? leftColumns[0] ?? '';
      rightKey = g?.right ?? pending.sheet.columns[0] ?? '';
      keep = 'all';
    }
    open = true;
  });
  $effect(() => { if (!open && dataUi.pending) dataUi.pending = null; });

  // columns of this file whose exact name already exists in the table: they need another name
  const conflicts = $derived(pending && mode === 'join' ? columnConflicts(leftColumns, pending.sheet, rightKey) : []);
  const rename = $derived(Object.fromEntries(conflicts.flatMap((c) => (names[c]?.trim() ? [[c, names[c].trim()]] : []))));
  const autoName = (c: string) => addedNames(leftColumns, pending!.sheet, rightKey, undefined).find((a) => a.from === c)?.to ?? c;
  const step = $derived<CombineStep>(
    mode === 'join' ? { mode: 'join', leftKey, rightKey, keep, rename } : mode === 'separate' ? { mode: 'separate' } : { mode: 'stack' },
  );
  const preview = $derived(pending ? combineSources([...baseSources, pending.sheet], [...baseSteps, step]) : null);
  const report = $derived(preview?.reports.at(-1) ?? null);
  const newColumns = $derived(pending ? pending.sheet.columns.filter((c) => !leftColumns.includes(c)) : []);
  const missingColumns = $derived(pending ? leftColumns.filter((c) => !pending!.sheet.columns.includes(c)) : []);

  function confirm() {
    if (!pending) return;
    if (pending.editing === null) ws.addSource(pending.sheet, step);
    else ws.setCombine(pending.editing, step);
    dataUi.tab = step.mode === 'separate' ? (pending.editing ?? ws.sources.length - 1) : 'combined';
    open = false;
  }

  const field = 'h-9 w-full rounded-md border-2 border-ink bg-white px-2 text-sm';
  const choice = (on: boolean) => `block cursor-pointer rounded-lg border-2 border-ink p-3 ${on ? 'bg-step-soft shadow-hard' : 'bg-white hover:bg-paper'}`;
</script>

<Modal bind:open title={pending?.editing === null ? `Add ${pending?.sheet.fileName ?? 'data file'}` : `How ${pending?.sheet.fileName ?? 'this file'} is merged`} size="md">
  {#if pending}
    <p class="mb-4 text-sm text-mute"><b class="text-ink">{pending.sheet.fileName}</b> has {pending.sheet.rows.length} rows and {pending.sheet.columns.length} columns. How should it be used?</p>

    <div class="space-y-3">
      <label class={choice(mode === 'stack')}>
        <span class="flex items-center gap-2 font-bold"><input type="radio" bind:group={mode} value="stack" />Add its rows below</span>
        <span class="mt-1 block pl-6 text-sm text-mute">Same kind of data, different people (for example two classes). A <span class="font-mono">Source</span> column tells you which file each row came from.</span>
      </label>
      <label class={choice(mode === 'separate')}>
        <span class="flex items-center gap-2 font-bold"><input type="radio" bind:group={mode} value="separate" />Keep it as a separate data file</span>
        <span class="mt-1 block pl-6 text-sm text-mute">Not mixed with the other files. It stays its own list, and you choose which list the certificates are made from.</span>
      </label>
      <label class={choice(mode === 'join')}>
        <span class="flex items-center gap-2 font-bold"><input type="radio" bind:group={mode} value="join" />Match and add its columns</span>
        <span class="mt-1 block pl-6 text-sm text-mute">The same people with more information (for example mobile numbers). Rows are matched on a column they share.</span>
      </label>
    </div>

    {#if mode === 'join'}
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block text-sm font-semibold">Column in the table so far
          <select class="{field} mt-1 font-normal" bind:value={leftKey}>{#each leftColumns as c (c)}<option value={c}>{c}</option>{/each}</select>
        </label>
        <label class="block text-sm font-semibold">Same value in {pending.sheet.fileName}
          <select class="{field} mt-1 font-normal" bind:value={rightKey}>{#each pending.sheet.columns as c (c)}<option value={c}>{c}</option>{/each}</select>
        </label>
      </div>
      <p class="mt-2 text-xs text-mute">Upper/lower case, extra spaces and leading zeros (007 = 7) are ignored when matching.</p>
      <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <label class="flex items-center gap-2"><input type="radio" bind:group={keep} value="all" />Keep everyone, even without a match</label>
        <label class="flex items-center gap-2"><input type="radio" bind:group={keep} value="matched" />Keep only matched rows</label>
      </div>
    {/if}

    {#if conflicts.length}
      <div class="mt-4 rounded-lg border-2 border-ink p-3">
        <p class="text-sm font-semibold">{conflicts.length === 1 ? 'This column name is' : 'These column names are'} already in the table</p>
        <p class="mt-1 text-xs text-mute">So it is named after its file. Use the long name in designs (for example <span class="font-mono">{`{${stem(pending.sheet.fileName)}.${conflicts[0]}}`}</span>), or type a new name. Names that differ only in capitals (Roll Number and ROLL NUMBER) are fine as they are.</p>
        <div class="mt-2 space-y-2">
          {#each conflicts as c (c)}
            <label class="flex flex-wrap items-center gap-2 text-sm">
              <span class="w-36 shrink-0 truncate font-mono" title={c}>{c}</span>→
              <input class="{field} min-w-0 flex-1 basis-40 font-mono" placeholder={autoName(c)} bind:value={names[c]} />
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <div class="mt-4 rounded-lg border-2 border-ink bg-paper p-3 text-sm" aria-live="polite">
      {#if mode === 'join' && report}
        {#if report.problem}
          <p class="font-semibold text-[#d6361f]">{report.problem}</p>
        {:else}
          <p><b>{report.matched} of {report.matched + report.unmatched.length}</b> rows found a match.</p>
          {#if report.unmatched.length}<p class="mt-1 text-[#8a5a00]">{report.unmatched.length} without a match: {report.unmatched.slice(0, 3).map((r) => r[leftKey] || '(empty)').join(', ')}{report.unmatched.length > 3 ? '…' : ''}</p>{/if}
          {#if report.duplicateKeys.length}<p class="mt-1 text-[#8a5a00]">{report.duplicateKeys.length} value{report.duplicateKeys.length === 1 ? '' : 's'} appear more than once in {pending.sheet.fileName}; the first row is used.</p>{/if}
          {#if report.unusedPartners}<p class="mt-1 text-mute">{report.unusedPartners} row{report.unusedPartners === 1 ? '' : 's'} of {pending.sheet.fileName} match nobody.</p>{/if}
        {/if}
      {:else if mode === 'separate'}
        <p>{pending.sheet.fileName} keeps its {pending.sheet.rows.length} rows and {pending.sheet.columns.length} columns. Nothing changes in the other files.</p>
      {:else if mode === 'stack'}
        <p>The table gets <b>{pending.sheet.rows.length} more rows</b> ({preview?.sheet.rows.length ?? 0} in total).</p>
        {#if newColumns.length}<p class="mt-1 text-mute">New columns: {newColumns.join(', ')}</p>{/if}
        {#if missingColumns.length}<p class="mt-1 text-[#8a5a00]">Not in this file (will be empty): {missingColumns.join(', ')}</p>{/if}
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
    <Button variant="step" disabled={mode === 'join' && !!report?.problem} onclick={confirm}>{pending?.editing === null ? 'Add data file' : 'Save'}</Button>
  {/snippet}
</Modal>
