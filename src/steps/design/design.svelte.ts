import { ws } from '$lib/workspace/store.svelte';
import { tokensIn } from '$lib/workspace/tokens';
import { rowLabel } from '$lib/workspace/identity';
import { scriptsFingerprint } from '$lib/render/bake';

const KEY = 'certflow-design-ui';
const TRUST_KEY = 'certflow-trusted-scripts';

function loadTrusted(): string[] {
  try { return JSON.parse(localStorage.getItem(TRUST_KEY) ?? '[]'); } catch { return []; }
}

export type ViewMode = 'preview' | 'code' | 'split';

function loadSaved(): { explorerOpen?: boolean; inspectorOpen?: boolean; mode?: ViewMode } {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}

/** UI-only state of the Design step (not part of the workspace, not undoable). */
class DesignUi {
  #saved = loadSaved();
  activeName = $state<string | null>(null);
  rowIndex = $state(0); // which data row the preview shows
  showFields = $state(false); // preview shows {tokens} instead of values
  zoom = $state<number | null>(null); // null = fit to screen
  fit = $state(1); // set by the stage
  explorerOpen = $state(this.#saved.explorerOpen ?? window.innerWidth >= 768);
  inspectorOpen = $state(this.#saved.inspectorOpen ?? window.innerWidth >= 1100);
  newOpen = $state(false);
  renderKey = $state(0); // bump to force the preview to re-render
  mode = $state<ViewMode>(this.#saved.mode ?? 'preview');
  // Text typed in the code editor, shown live in the preview before it becomes an undo step.
  draft = $state.raw<{ name: string; html: string } | null>(null);
  #draftTimer: ReturnType<typeof setTimeout> | undefined;
  previewFile = $state<string | null>(null); // name of the file shown in the preview popup
  selectedFiles = $state<string[]>([]); // names of files multi-selected in the explorer
  // Designs the user allowed to run their own <script> (stored only in this browser, as "workspace::design").
  trusted = $state<string[]>(loadTrusted());

  /** The design being edited (falls back to the first one). */
  get active() {
    return ws.designs.find((d) => d.name === this.activeName) ?? ws.designs[0] ?? null;
  }

  get scale() {
    return this.zoom ?? this.fit;
  }

  /** Re-renders the page (used after the HTML was replaced from outside). */
  forceRerender() {
    this.renderKey++;
  }

  /** The HTML to show and analyse: what is being typed (draft) or the saved design. */
  get html(): string {
    const a = this.active;
    if (!a) return '';
    return this.draft?.name === a.name ? this.draft.html : a.html;
  }

  /** Live typing: updates the preview at once; becomes ONE undo step after a short pause. */
  setDraft(html: string) {
    const a = this.active;
    if (!a) return;
    clearTimeout(this.#draftTimer);
    this.draft = html === a.html ? null : { name: a.name, html };
    if (this.draft) this.#draftTimer = setTimeout(() => this.commitDraft(), 500);
  }

  /** Turns the draft into an undoable edit. Safe to call any time. */
  commitDraft() {
    clearTimeout(this.#draftTimer);
    const d = this.draft;
    this.draft = null;
    if (d && ws.designs.some((x) => x.name === d.name && x.html !== d.html)) ws.setDesignHtml(d.name, d.html, 'Edit HTML');
  }

  /** A non-typing change (page size, …): applies now, replacing any draft. */
  apply(html: string, label: string) {
    const a = this.active;
    if (!a) return;
    clearTimeout(this.#draftTimer);
    this.draft = null;
    ws.setDesignHtml(a.name, html, label);
  }

  setMode(mode: ViewMode) {
    this.commitDraft();
    this.mode = mode;
    this.#persist();
  }

  /** Key of the data list the open design is paired with. */
  get listKey() {
    return this.active ? ws.listKeyOf(this.active.name) : (ws.lists[0]?.key ?? '');
  }

  /** The table the open design is filled from (its paired data list). */
  get sheet() {
    return this.active ? ws.sheetForDesign(this.active.name) : ws.sheet;
  }

  /** How many {fields} the open design uses. */
  get fieldCount() {
    return this.active ? tokensIn(this.html).length : 0;
  }

  get columns() {
    return this.sheet?.columns ?? [];
  }

  /** A short name for a row of the paired data. */
  personName(index: number) {
    return rowLabel(this.sheet, index);
  }

  /** The data row shown in the preview, or null when there is no data. */
  get row() {
    const rows = this.sheet?.rows ?? [];
    return rows.length ? rows[Math.min(this.rowIndex, rows.length - 1)] : null;
  }

  // Trust follows the SCRIPT text of a design (not its name), so a different file with the same name is never trusted.
  #fp = { html: '', value: '' };
  #trustId(name: string) {
    const html = (this.draft?.name === name ? this.draft.html : ws.designs.find((d) => d.name === name)?.html) ?? '';
    if (this.#fp.html !== html) this.#fp = { html, value: scriptsFingerprint(html) };
    return this.#fp.value;
  }
  isTrusted(name: string) { return this.trusted.includes(this.#trustId(name)); }
  setTrusted(name: string, on: boolean) {
    const id = this.#trustId(name);
    this.trusted = on ? [...new Set([...this.trusted, id])] : this.trusted.filter((t) => t !== id);
    try { localStorage.setItem(TRUST_KEY, JSON.stringify(this.trusted)); } catch { /* private mode */ }
  }

  select(name: string) {
    this.commitDraft();
    this.activeName = name;
    if (window.innerWidth < 768) this.explorerOpen = false; // panels are overlays on phones
  }

  toggleExplorer() { this.explorerOpen = !this.explorerOpen; this.#persist(); }
  toggleInspector() { this.inspectorOpen = !this.inspectorOpen; this.#persist(); }

  #persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ explorerOpen: this.explorerOpen, inspectorOpen: this.inspectorOpen, mode: this.mode }));
    } catch { /* private mode: panels just reset next visit */ }
  }
}

export const design = new DesignUi();
ws.onBeforeFlush(() => design.commitDraft()); // typed code becomes part of the saved design

// registered at import time, so it runs before the workspace's own save-on-close handler
window.addEventListener('beforeunload', () => design.commitDraft());
window.addEventListener('pagehide', () => design.commitDraft());
