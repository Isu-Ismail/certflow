<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import type { Sheet } from '$lib/workspace/types';
  import Button from '$lib/ui/Button.svelte';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import { identityColumn } from '$lib/workspace/identity';
  import { KeyRound, Plus, Search, X } from '@lucide/svelte';

  const PAGE = 100;
  const EMPTY: Sheet = { fileName: '', columns: [], rows: [] };

  let query = $state('');
  let limit = $state(PAGE);
  let editing = $state<{ row: number; col: string } | null>(null);
  let draft = $state('');
  let navigating = false;

  // `view`: one data file (its index, editable) or the merged table ('combined', read-only: edit the files)
  let { view }: { view: 'combined' | number } = $props();
  const merged = $derived(view === 'combined');
  const sheet = $derived((merged ? ws.combined?.sheet : ws.sources[view as number]) ?? EMPTY);
  const source = $derived(merged ? 0 : (view as number));
  const readonly = $derived(merged && ws.sources.length > 1);
  const idCol = $derived(identityColumn(sheet));
  const fileOf = (c: string) => {
    const i = ws.combined?.columnSource.get(c);
    return i === undefined ? '' : i < 0 ? 'added' : ws.sources[i].fileName.replace(/\.[^.]+$/, '');
  };

  // Fast single-pass subsequence fuzzy matching
  function fuzzyMatch(token: string, text: string): boolean {
    if (text.includes(token)) return true;
    const pLen = token.length;
    const sLen = text.length;
    if (pLen > sLen) return false;
    let p = 0;
    let s = 0;
    while (p < pLen && s < sLen) {
      if (token.charCodeAt(p) === text.charCodeAt(s)) p++;
      s++;
    }
    return p === pLen;
  }

  // Pre-computed lowercase text per row, cached and updated only when rows change.
  // Blazing fast for 10,000+ rows.
  const rowSearchTexts = $derived.by(() => {
    const cols = sheet.columns;
    const rows = sheet.rows;
    const len = rows.length;
    const texts = new Array<string>(len);
    for (let i = 0; i < len; i++) {
      const r = rows[i];
      let str = '';
      for (let j = 0; j < cols.length; j++) {
        str += (r[cols[j]] ?? '') + ' ';
      }
      texts[i] = str.toLowerCase();
    }
    return texts;
  });

  // Indices into sheet.rows, so edits and deletes stay correct while searching.
  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheet.rows.map((_, i) => i);

    const tokens = q.split(/\s+/).filter(Boolean);
    const texts = rowSearchTexts;
    const len = texts.length;
    const out: number[] = [];

    for (let i = 0; i < len; i++) {
      const text = texts[i];
      let ok = true;
      for (let t = 0; t < tokens.length; t++) {
        if (!fuzzyMatch(tokens[t], text)) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(i);
    }
    return out;
  });
  const shown = $derived(matches.slice(0, limit));

  function start(row: number, col: string) {
    editing = { row, col };
    draft = sheet.rows[row][col];
  }
  function commit() {
    if (navigating || !editing) return;
    if (draft !== sheet.rows[editing.row][editing.col]) ws.updateCell(editing.row, editing.col, draft, source);
    editing = null;
  }

  function move(dRow: number, dCol: number) {
    if (!editing) return;
    const currRow = editing.row;
    const currCol = editing.col;
    const colIndex = sheet.columns.indexOf(currCol);
    if (colIndex === -1) return;

    navigating = true;

    // Save current cell edit
    if (draft !== sheet.rows[currRow][currCol]) {
      ws.updateCell(currRow, currCol, draft, source);
    }

    const matchIdx = matches.indexOf(currRow);
    let nextColIndex = colIndex + dCol;
    let nextMatchIdx = matchIdx;

    if (dCol !== 0) {
      if (nextColIndex >= sheet.columns.length) {
        nextColIndex = 0;
        nextMatchIdx = matchIdx + 1;
      } else if (nextColIndex < 0) {
        nextColIndex = sheet.columns.length - 1;
        nextMatchIdx = matchIdx - 1;
      }
    } else if (dRow !== 0) {
      nextMatchIdx = matchIdx + dRow;
    }

    if (nextMatchIdx >= 0 && nextMatchIdx < matches.length) {
      const nextRow = matches[nextMatchIdx];
      if (nextMatchIdx >= limit) limit = nextMatchIdx + PAGE;
      const nextCol = sheet.columns[nextColIndex];
      editing = { row: nextRow, col: nextCol };
      draft = sheet.rows[nextRow][nextCol] || '';
    } else {
      editing = null;
    }

    queueMicrotask(() => {
      navigating = false;
    });
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      move(0, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1, 0);
    } else if (e.key === 'Escape') {
      editing = null;
    }
  }
  function focusInput(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
  function addRow() {
    query = '';
    const i = ws.addRow(source);
    limit = Math.max(limit, i + 1);
    start(i, sheet.columns[0]);
  }

  async function remove(i: number) {
    const ok = await confirmDialog({
      title: 'Delete this row?',
      message: `“${ws.personName(i, source)}” will be removed from the data. You can undo this.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) ws.deleteRow(i, source);
  }

  // Column names are shown exactly as in the file (case and spacing), because they become {tokens}.
  const th = 'sticky top-0 z-10 bg-paper px-3 py-2 font-bold whitespace-pre shadow-[inset_0_-2px_0_#121212]';
</script>

<section class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 border-ink bg-white shadow-hard">
  <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-ink px-3 py-2">
    <h2 class="font-bold">{merged && readonly ? 'Combined data' : 'Data'}</h2>
    <span class="hidden font-mono text-xs text-mute sm:inline">{readonly ? 'read-only: edit the data files on their own tabs' : 'click a cell to edit'}</span>
    <div class="relative ml-auto w-full sm:w-60">
      <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-mute" />
      <input
        class="h-8 w-full rounded-md border-2 border-ink pr-8 pl-8 text-sm"
        placeholder="Search"
        bind:value={query}
        oninput={() => (limit = PAGE)}
      />
      {#if query}
        <button class="absolute top-1/2 right-2 -translate-y-1/2 text-mute hover:text-ink" aria-label="Clear search" onclick={() => (query = '')}><X class="size-4" /></button>
      {/if}
    </div>
  </div>

  <div class="no-scrollbar min-h-0 flex-1 overflow-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[13px]">
          <th class="{th} w-12 text-right">#</th>
          {#each sheet.columns as c (c)}<th class={th}>{#if c === idCol}<KeyRound class="mr-1 inline size-3.5 align-[-2px]" aria-label="Identity column" />{/if}{c}{#if readonly}<span class="block text-[10px] font-normal text-mute">{fileOf(c)}</span>{/if}</th>{/each}
          {#if !readonly}<th class="{th} w-10"><span class="sr-only">Row actions</span></th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each shown as i (i)}
          <tr class="group border-b border-soft hover:bg-step-soft {readonly && ws.combined?.unmatchedRows.has(i) ? 'bg-[#ffe9a8]/60' : ''}">
            <td class="px-3 text-right font-mono text-xs text-mute">{i + 1}</td>
            {#each sheet.columns as c, ci (c)}
              <td class="p-0">
                {#if readonly}
                  <span class="block min-h-9 w-full px-3 py-2 whitespace-nowrap {c === idCol ? 'font-semibold' : ''}">{sheet.rows[i][c] || ''}{#if !sheet.rows[i][c]}<span class="text-mute/60">—</span>{/if}</span>
                {:else if editing?.row === i && editing.col === c}
                  <input
                    class="h-9 w-full min-w-32 border-2 border-ink bg-step-soft px-2.5 outline-none"
                    bind:value={draft}
                    onblur={commit}
                    onkeydown={onKey}
                    use:focusInput
                  />
                {:else}
                  <button class="block min-h-9 w-full px-3 py-2 text-left whitespace-nowrap {c === idCol ? 'font-semibold' : ''}" onclick={() => start(i, c)}>
                    {sheet.rows[i][c] || ''}{#if !sheet.rows[i][c]}<span class="text-mute/60">—</span>{/if}
                  </button>
                {/if}
              </td>
            {/each}
            {#if !readonly}<td class="px-1">
              <button
                class="grid size-8 place-items-center rounded text-mute hover:bg-[#fbd5cf] hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Delete row {i + 1}"
                onclick={() => remove(i)}><X class="size-4" /></button>
            </td>{/if}
          </tr>
        {:else}
          <tr>
            <td class="px-4 py-12 text-center text-mute" colspan={sheet.columns.length + 2}>
              {#if query}
                <div class="flex flex-col items-center justify-center gap-2">
                  <p>No rows match “<span class="font-semibold text-ink">{query}</span>”.</p>
                  <button
                    class="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-white px-3 py-1 font-semibold text-xs shadow-hard hover:bg-step-soft"
                    onclick={() => { query = ''; limit = PAGE; }}
                  >
                    <X class="size-3.5" />Clear filter
                  </button>
                </div>
              {:else}
                <span>No rows yet.</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="flex shrink-0 flex-wrap items-center gap-3 border-t-2 border-ink px-3 py-2 text-sm">
    <span class="text-mute">Showing {shown.length} of {matches.length}</span>
    {#if shown.length < matches.length}
      <Button size="sm" variant="outline" onclick={() => (limit += PAGE)}>Show {Math.min(PAGE, matches.length - shown.length)} more</Button>
    {/if}
    {#if !readonly}<Button size="sm" variant="outline" class="ml-auto" onclick={addRow}><Plus class="size-4" />Add row</Button>{/if}
  </div>
</section>
