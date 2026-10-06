import { renameFileRefs } from '$lib/render/assets';
import { cleanFileName, cleanName, uniqueFileName, uniqueName } from './names';
import type { FlowGraph } from '$lib/flow/types';
import { toast } from '$lib/ui/toast.svelte';
import { combineSources, matchColumns, normKey } from './combine';
import { buildLists } from './lists';
import { makeMarker, type Marker } from './marker';
import { loadXlsx } from './parseSheet';
import { rowLabel } from './identity';
import { clearAll, deleteValue, loadAll, saveAll, warmUp } from './persist';
import { FolderSync, folderPermission, forgetFolder, recallFolder, rememberFolder, type DirHandle, type FolderState } from './folder';
import { workspaceFiles } from './saveFolder';
import type { CombineStep, DesignFile, LoadedWorkspace, Row, Sheet, Step, WorkFile } from './types';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';
/** How long after the last change the autosave runs. Short, so a quick reload loses (almost) nothing. */
const AUTOSAVE_MS = 40;

/** What undo/redo restores. References only: data is replaced, never mutated, so snapshots are cheap. */
interface Snapshot {
  sources: Sheet[];
  combine: CombineStep[];
  designData: Record<string, string>;
  designs: DesignFile[];
  flowJson: string | null;
  fieldMap: Record<string, string>;
  flow: FlowGraph | null;
  genConfig: Record<string, unknown> | null;
  files: WorkFile[];
}
interface HistoryEntry { label: string; snapshot: Snapshot }

/** Undo depth. Memory-only: history is cleared when a workspace is opened/reset or the page reloads. */
export const HISTORY_LIMIT = 100;

/** The single source of truth: one workspace = one folder on disk. */
class WorkspaceStore {
  name = $state('workspace');
  step = $state<Step>('data');
  ready = $state(false); // true once the autosave has been read
  // Data is replaced (never mutated) so it can go straight into IndexedDB.
  sources = $state.raw<Sheet[]>([]); // the data files; the first is the main one
  combine = $state.raw<CombineStep[]>([]); // how sources[i] is merged in, at index i - 1
  /** All data files merged into one table, with where each row/column came from. */
  designData = $state.raw<Record<string, string>>({}); // design name -> data list key
  combined = $derived(combineSources(this.sources, this.combine));
  /** The table designs, flow and export use. */
  /** The lists a design can use: the merged table (if any) and each data file. */
  lists = $derived(buildLists(this.sources, this.combined, this.combine));
  /** The default list's table: the merged one, else the main file. */
  sheet = $derived(this.lists[0]?.sheet ?? null);
  designs = $state.raw<DesignFile[]>([]);
  flowJson = $state.raw<string | null>(null); // the old single flow.json (no longer written)
  /** Options of the Generate step; saved with the workspace in config/generate.config.json. */
  genConfig = $state.raw<Record<string, unknown> | null>(null);
  /** The mark that makes the folder a CertFlow workspace (config/workspace.json); made when the workspace first goes into a folder. */
  marker = $state.raw<Marker | null>(null);
  /** Changes whenever another workspace is opened or the workspace is cleared. */
  loadId = $state(0);
  fieldMap = $state.raw<Record<string, string>>({});
  /** Token -> column map used when filling designs: the user's mappings plus `{file.Column}` names of the data files. */
  tokenMap = $derived({ ...(this.combined?.aliases ?? {}), ...this.fieldMap });
  flow = $state.raw<FlowGraph | null>(null); // null = default (everyone gets the first design)
  files = $state.raw<WorkFile[]>([]);
  /** The folder on disk this workspace is linked to (edits are written into it), or null. */
  handle: DirHandle | null = null;
  folderState = $state<FolderState>('none');
  folderSaving = $state(false);
  #folderTimer: ReturnType<typeof setTimeout> | undefined;
  #genEditAt = 0;
  #sync = new FolderSync();
  undoStack = $state.raw<HistoryEntry[]>([]); // entry.snapshot = state BEFORE the change
  redoStack = $state.raw<HistoryEntry[]>([]); // entry.snapshot = state AFTER the change
  saveStatus = $state<SaveStatus>('saved');
  lastSaved = $state<number | null>(null);
  #timer: ReturnType<typeof setTimeout> | undefined;
  #dirty = false; // changed since the last save
  #persisted = new Map<string, Blob>(); // files already in the database (so only new/changed ones are written)
  #beforeFlush: Array<() => void> = [];

  get hasFlowFile() {
    return !!this.flowJson || !!this.flow || Object.keys(this.fieldMap).length > 0;
  }

  get isEmpty() {
    return !this.sources.length && !this.designs.length && !this.flowJson && !this.files.length;
  }

  get undoCount() { return this.undoStack.length; }
  get redoCount() { return this.redoStack.length; }
  get undoLabel() { return this.undoStack.at(-1)?.label ?? null; }
  get redoLabel() { return this.redoStack.at(-1)?.label ?? null; }

  toWorkspace(): LoadedWorkspace {
    return { name: this.name, sources: this.sources, combine: this.combine, designData: this.designData, designs: this.designs, flowJson: this.flowJson, fieldMap: this.fieldMap, flow: this.flow, genConfig: this.genConfig, marker: this.marker, files: this.files };
  }

  /** Things that hold not-yet-saved edits (e.g. text typed in the code editor) register here; they run before every save. */
  onBeforeFlush(fn: () => void) {
    this.#beforeFlush.push(fn);
  }

  /** Call after any change. Saves to IndexedDB a moment later (and at once if the page is closing, see flush). */
  touch() {
    this.#dirty = true;
    this.#scheduleFolder();
    if (this.saveStatus !== 'saving') this.saveStatus = 'unsaved';
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), AUTOSAVE_MS);
  }

  /**
   * Saves now (if anything changed, or always with `force`). Called when the tab is hidden/closed/reloaded and by
   * the Save button. Resolves true when the data is safely stored.
   */
  flush(force = false): Promise<boolean> {
    // Never write before the saved workspace has been read, or an empty store would replace it.
    if (!this.#restored) return this.#whenRestored.then(() => this.flush(force));
    this.#beforeFlush.forEach((fn) => fn()); // may call touch(), so run before looking at #dirty
    clearTimeout(this.#timer);
    if (!this.#dirty && !force) return Promise.resolve(this.saveStatus !== 'error');
    this.#dirty = false;
    this.saveStatus = 'saving';
    const files = this.files;
    const meta = { name: this.name, step: this.step, sources: this.sources, combine: this.combine, designData: this.designData, designs: this.designs, flowJson: this.flowJson, fieldMap: this.fieldMap, flow: this.flow, genConfig: this.genConfig, marker: this.marker, fileNames: files.map((f) => f.name) };
    return saveAll(meta, files, this.#persisted).then((ok) => {
      if (ok) {
        this.#persisted = new Map(files.map((f) => [f.name, f.blob]));
        this.lastSaved = Date.now();
        this.saveStatus = this.#dirty ? 'unsaved' : 'saved';
      } else {
        this.#dirty = true;
        if (this.saveStatus !== 'error') toast('Could not save in this browser (storage full or blocked). Use Save to folder or .zip to keep your work.', 'error');
        this.saveStatus = 'error';
      }
      return ok;
    });
  }

  #restored = false;
  #markRestored!: () => void;
  #whenRestored = new Promise<void>((resolve) => { this.#markRestored = resolve; });

  async restore() {
    try {
      await this.#restore();
    } finally {
      this.ready = true; // also when loading failed: an empty workspace is better than a blank page
      this.#restored = true;
      this.#markRestored();
    }
  }

  async #restore() {
    warmUp();
    const saved = await loadAll();
    if (saved) {
      const m = saved.meta;
      this.name = m.name;
      this.step = ((m.step as string) === 'export' ? 'generate' : m.step) ?? 'data';
      this.sources = m.sources ?? (m.sheet ? [m.sheet] : []);
      this.combine = m.combine ?? [];
      this.designData = m.designData ?? {};
      this.designs = m.designs ?? [];
      this.flowJson = m.flowJson ?? null;
      this.fieldMap = m.fieldMap ?? {};
      this.flow = m.flow ?? null;
      this.genConfig = m.genConfig ?? null;
      this.marker = m.marker ?? null;
      this.files = saved.files;
      // files stored the new way are already in the database; older saves get re-written on the first save
      this.#persisted = m.fileNames ? new Map(saved.files.map((f) => [f.name, f.blob])) : new Map();
    }
    this.ready = true;
    void navigator.storage?.persist?.(); // ask the browser not to evict our data when the disk is low
    if (this.sources.some((s) => s.format === 'xlsx')) await loadXlsx(); // Excel files are saved back as Excel
    await this.#restoreFolder();
  }

  // ---- linked folder -------------------------------------------------------------

  async #restoreFolder() {
    const handle = await recallFolder();
    if (!handle) return;
    this.handle = handle;
    this.folderState = (await folderPermission(handle, false)) ? 'linked' : 'needs-permission';
    // what is in the folder is what we wrote last time: only changes are written from now on
    if (this.folderState === 'linked') this.#sync.prime(workspaceFiles(this.toWorkspace()), new Set(workspaceFiles(this.toWorkspace()).map(([p]) => p)));
  }

  /** Links the workspace to a folder and writes everything into it. `existing` = paths already in the folder (not rewritten). */
  async linkFolder(handle: DirHandle, existing?: Set<string>) {
    this.handle = handle;
    this.folderState = 'linked';
    await rememberFolder(handle);
    this.marker ??= await makeMarker(); // the folder becomes a CertFlow workspace
    const files = workspaceFiles(this.toWorkspace());
    if (existing) this.#sync.prime(files, existing);
    else this.#sync.forget();
    await this.syncFolder();
  }

  /** Asks again for permission on the linked folder (needs a click). */
  async reconnectFolder(): Promise<boolean> {
    if (!this.handle) return false;
    if (!(await folderPermission(this.handle, true))) return false;
    this.folderState = 'linked';
    this.#sync.forget();
    await this.syncFolder();
    return true;
  }

  async unlinkFolder() {
    clearTimeout(this.#folderTimer);
    this.handle = null;
    this.folderState = 'none';
    this.#sync.forget();
    await forgetFolder();
  }

  #scheduleFolder() {
    if (!this.handle || this.folderState !== 'linked') return;
    clearTimeout(this.#folderTimer);
    this.#folderTimer = setTimeout(() => void this.syncFolder(), 700);
  }

  /** Writes what changed into the linked folder. Resolves to false if there is none or it could not be written. */
  async syncFolder(): Promise<boolean> {
    if (!this.handle || this.folderState === 'none') return false;
    clearTimeout(this.#folderTimer);
    this.#beforeFlush.forEach((fn) => fn());
    if (!(await folderPermission(this.handle, false))) { this.folderState = 'needs-permission'; return false; }
    this.folderState = 'linked';
    this.folderSaving = true;
    try {
      await this.#sync.sync(this.handle, workspaceFiles(this.toWorkspace()));
      return true;
    } catch (e) {
      console.warn('CertFlow could not write the folder:', e);
      toast('Could not write to the linked folder. Press Reconnect in the workspace menu.', 'error');
      this.folderState = 'needs-permission';
      return false;
    } finally {
      this.folderSaving = false;
    }
  }

  /** Opens a loaded workspace. With a folder handle the workspace is linked to that folder (`existing` = its paths). */
  load(w: LoadedWorkspace, handle: DirHandle | null = null, existing?: Set<string>) {
    clearTimeout(this.#folderTimer);
    Object.assign(this, { name: w.name, sources: w.sources, combine: w.combine, designData: w.designData, designs: w.designs, flowJson: w.flowJson, fieldMap: w.fieldMap, flow: w.flow, genConfig: w.genConfig, marker: w.marker, files: w.files, handle: null, folderState: 'none', step: 'data' });
    this.#sync.forget();
    this.#clearHistory();
    this.loadId++;
    void deleteValue('generate-job'); // the progress of another workspace's run is not this one's
    if (handle) {
      this.handle = handle;
      this.folderState = 'linked';
      void rememberFolder(handle);
      this.#sync.prime(workspaceFiles(this.toWorkspace()), existing ?? new Set());
    } else void forgetFolder();
    this.touch();
  }

  async reset() {
    clearTimeout(this.#timer);
    this.#dirty = false;
    Object.assign(this, { name: 'workspace', sources: [], combine: [], designData: {}, designs: [], flowJson: null, fieldMap: {}, flow: null, genConfig: null, marker: null, files: [], handle: null, folderState: 'none', step: 'data' });
    this.loadId++;
    clearTimeout(this.#folderTimer);
    this.#sync.forget();
    this.#clearHistory();
    this.#persisted = new Map();
    this.saveStatus = 'saved';
    await clearAll();
  }

  setStep(step: Step) {
    this.step = step;
    this.touch();
  }

  // ---- undo / redo ----------------------------------------------------------

  #snapshot(): Snapshot {
    return { sources: this.sources, combine: this.combine, designData: this.designData, designs: this.designs, flowJson: this.flowJson, fieldMap: this.fieldMap, flow: this.flow, genConfig: this.genConfig, files: this.files };
  }

  #clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Call BEFORE changing undoable data. */
  #record(label: string) {
    this.undoStack = [...this.undoStack, { label, snapshot: this.#snapshot() }].slice(-HISTORY_LIMIT);
    this.redoStack = [];
  }

  /** Returns the label of what was undone, or null if there was nothing to undo. */
  undo(): string | null {
    const entry = this.undoStack.at(-1);
    if (!entry) return null;
    this.redoStack = [...this.redoStack, { label: entry.label, snapshot: this.#snapshot() }];
    this.undoStack = this.undoStack.slice(0, -1);
    Object.assign(this, entry.snapshot);
    this.touch();
    return entry.label;
  }

  redo(): string | null {
    const entry = this.redoStack.at(-1);
    if (!entry) return null;
    this.undoStack = [...this.undoStack, { label: entry.label, snapshot: this.#snapshot() }];
    this.redoStack = this.redoStack.slice(0, -1);
    Object.assign(this, entry.snapshot);
    this.touch();
    return entry.label;
  }

  // ---- undoable edits ---------------------------------------------------------

  /** Replaces ALL data with one file (or removes it with null). */
  setSheet(sheet: Sheet | null, label = 'Change data') {
    this.#record(label);
    this.sources = sheet ? [sheet] : [];
    this.combine = [];
    this.touch();
  }

  /** Chooses the identity column of a data file ('' = automatic). */
  setIdentity(index: number, column: string) {
    const sheet = this.sources[index];
    if (!sheet || (sheet.identity ?? '') === column) return;
    this.setSource(index, { ...sheet, identity: column || undefined }, column ? `Identity column: ${column}` : 'Identity column: automatic');
  }

  /** Replaces one data file's content (one undo step). */
  setSource(index: number, sheet: Sheet, label = 'Change data') {
    if (!this.sources[index]) return;
    this.#record(label);
    this.sources = this.sources.map((s, i) => (i === index ? sheet : s));
    this.touch();
  }

  /** Adds another data file, merged by `step`. The name is made unique. */
  addSource(sheet: Sheet, step: CombineStep, label = `Add ${sheet.fileName}`) {
    if (!this.sources.length) return this.setSheet(sheet, label);
    const taken = new Set(this.sources.map((s) => s.fileName));
    let fileName = sheet.fileName;
    for (let n = 2; taken.has(fileName); n++) fileName = sheet.fileName.replace(/(\.[^.]+)?$/, ` ${n}$1`);
    this.#record(label);
    this.sources = [...this.sources, { ...sheet, fileName }];
    this.combine = [...this.combine, step];
    this.touch();
  }

  /** Gives a data file another name; designs and flow data nodes that used the old name follow. Returns the final name. */
  renameSource(index: number, to: string): string {
    const sheet = this.sources[index];
    if (!sheet) return '';
    // the file keeps its kind of extension (.csv, .xlsx…): only the name before it changes
    const ext = sheet.fileName.match(/\.[^.]+$/)?.[0] ?? (sheet.format === 'xlsx' ? '.xlsx' : '.csv');
    const stem = to.trim().replace(/[\\/]/g, '-').replace(/\.(csv|tsv|txt|xlsx|xls|xlsm|ods)$/i, '');
    if (!stem || stem + ext === sheet.fileName) return sheet.fileName;
    const final = this.#uniqueSourceName(stem + ext, index);
    this.#record(`Rename ${sheet.fileName}`);
    this.sources = this.sources.map((s, i) => (i === index ? { ...s, fileName: final } : s));
    this.#followRename(sheet.fileName, final);
    this.touch();
    return final;
  }

  /** Puts another file's content in place of a data file (one undo step). References follow the new name. */
  replaceSource(index: number, sheet: Sheet, label = 'Replace data'): void {
    const old = this.sources[index];
    if (!old) return;
    const final = this.#uniqueSourceName(sheet.fileName, index);
    this.#record(label);
    const identity = sheet.identity ?? (old.identity && sheet.columns.includes(old.identity) ? old.identity : undefined);
    this.sources = this.sources.map((s, i) => (i === index ? { ...sheet, identity, fileName: final } : s));
    this.#followRename(old.fileName, final);
    this.touch();
  }

  #uniqueSourceName(name: string, except: number): string {
    const taken = new Set(this.sources.filter((_, i) => i !== except).map((s) => s.fileName));
    let out = name;
    for (let n = 2; taken.has(out); n++) out = name.replace(/(\.[^.]+)?$/, ` ${n}$1`);
    return out;
  }

  /** Designs and flow data nodes that pointed at a data file keep pointing at it after it is renamed. */
  #followRename(from: string, to: string) {
    if (from === to) return;
    this.designData = Object.fromEntries(Object.entries(this.designData).map(([d, k]) => [d, k === from ? to : k]));
    if (this.flow) this.flow = { ...this.flow, nodes: this.flow.nodes.map((n) => (n.type === 'start' && n.source === from ? { ...n, source: to } : n)) };
  }

  /**
   * Finds the same person in another data list. Returns a function (from list, row, to list, chosen columns) -> the row
   * index in the other list, or null. The merged table and its own files map exactly; otherwise the rows are matched by
   * a column both lists have (or the columns the user chose). Lookups are cached for the life of the function.
   */
  makeRemap(): (from: string, row: number, to: string, via: { from?: string; to?: string }) => number | null {
    const c = this.combined;
    const index = new Map<string, Map<string, number>>();
    const lookup = (key: string, col: string) => {
      const id = key + '\u0000' + col;
      let m = index.get(id);
      if (!m) {
        m = new Map();
        (this.sheetOf(key)?.rows ?? []).forEach((r, i) => { const k = normKey(r[col]); if (k && !m!.has(k)) m!.set(k, i); });
        index.set(id, m);
      }
      return m;
    };
    return (from, row, to, via) => {
      if (from === to) return row;
      if (c && !via.from && !via.to) {
        if (from === 'combined') {
          const o = c.origins[row];
          if (o && this.sources[o.source]?.fileName === to) return o.row;
        } else if (to === 'combined') {
          const src = this.sources.findIndex((s) => s.fileName === from);
          const at = src < 0 ? -1 : c.origins.findIndex((o) => o.source === src && o.row === row);
          if (at >= 0) return at;
        }
      }
      const a = this.sheetOf(from);
      const b = this.sheetOf(to);
      if (!a || !b) return null;
      const m = via.from && via.to ? { from: via.from, to: via.to } : matchColumns(a, b);
      if (!m) return null;
      const k = normKey(a.rows[row]?.[m.from]);
      return k ? (lookup(to, m.to).get(k) ?? null) : null;
    };
  }

  /** Removes a data file. Removing the main one makes the next file the main one. */
  removeSource(index: number) {
    const gone = this.sources[index];
    if (!gone) return;
    this.#record(`Remove ${gone.fileName}`);
    this.sources = this.sources.filter((_, i) => i !== index);
    this.combine = this.combine.filter((_, i) => i !== Math.max(index - 1, 0));
    this.touch();
  }

  // ---- which data a design uses ---------------------------------------------

  /** The key of the data list a design uses (its choice, or the default list). */
  listKeyOf(design: string): string {
    const key = this.designData[design];
    return key && this.lists.some((l) => l.key === key) ? key : (this.lists[0]?.key ?? '');
  }

  sheetOf(key: string): Sheet | null {
    return (this.lists.find((l) => l.key === key) ?? this.lists[0])?.sheet ?? null;
  }

  /** The table a design is filled from. */
  sheetForDesign(design: string): Sheet | null {
    return this.sheetOf(this.listKeyOf(design));
  }

  /** Pairs a design with a data list (one undo step). */
  setDesignData(design: string, key: string) {
    if (this.listKeyOf(design) === key) return;
    this.#record(`Use ${key === 'combined' ? 'the combined data' : key} for “${design}”`);
    this.designData = { ...this.designData, [design]: key };
    this.touch();
  }

  setCombine(index: number, step: CombineStep) {
    if (index < 1 || !this.sources[index]) return;
    this.#record(`Change how ${this.sources[index].fileName} is merged`);
    const next = this.combine.slice();
    next[index - 1] = step;
    this.combine = next;
    this.touch();
  }

  /** Replaces the flow graph (one undo step). */
  setFlow(flow: FlowGraph, label = 'Change flow') {
    this.#record(label);
    this.flow = flow;
    this.touch();
  }

  /** Remembers the options of the Generate step. An undo step; edits made one after another (typing a number) are one step. */
  setGenConfig(config: Record<string, unknown>) {
    const label = 'Change Generate options';
    const now = Date.now();
    if (!(this.undoStack.at(-1)?.label === label && now - this.#genEditAt < 1200)) this.#record(label);
    this.#genEditAt = now;
    this.genConfig = config;
    this.touch();
  }

  /** Maps a design token to a data column (empty column clears the mapping). */
  setField(token: string, column: string) {
    this.#record(`Map {${token}}`);
    const map = { ...this.fieldMap };
    if (column) map[token] = column;
    else delete map[token];
    this.fieldMap = map;
    this.touch();
  }

  /** A short name for a row (its first column), used in history labels and confirmations. */
  personName(index: number, source?: number): string {
    return rowLabel(source === undefined ? this.sheet : this.sources[source], index);
  }

  updateCell(index: number, column: string, value: string, source = 0) {
    const sheet = this.sources[source];
    if (!sheet) return;
    const rows = sheet.rows.slice();
    rows[index] = { ...rows[index], [column]: value };
    this.setSource(source, { ...sheet, rows }, `Edit “${column}” of ${this.personName(index, source)}`);
  }

  /** Appends an empty row and returns its index. */
  addRow(source = 0): number {
    const sheet = this.sources[source];
    if (!sheet) return -1;
    const row: Row = Object.fromEntries(sheet.columns.map((c) => [c, '']));
    this.setSource(source, { ...sheet, rows: [...sheet.rows, row] }, 'Add row');
    return sheet.rows.length;
  }

  deleteRow(index: number, source = 0) {
    const sheet = this.sources[source];
    if (!sheet) return;
    const label = `Delete ${this.personName(index, source)}`;
    this.setSource(source, { ...sheet, rows: sheet.rows.filter((_, i) => i !== index) }, label);
  }

  // ---- designs (<name>.cert.html) ---------------------------------------------

  /** Adds a design; the name is cleaned and made unique. Returns the final name. */
  addDesign(name: string, html: string): string {
    const final = uniqueName(cleanName(name), this.designs.map((d) => d.name));
    this.#record(`Add design “${final}”`);
    this.designs = [...this.designs, { name: final, html }];
    this.touch();
    return final;
  }

  renameDesign(from: string, to: string): string {
    const base = cleanName(to);
    if (!base || base === from) return from;
    const final = uniqueName(base, this.designs.filter((d) => d.name !== from).map((d) => d.name));
    this.#record(`Rename “${from}”`);
    this.designs = this.designs.map((d) => (d.name === from ? { ...d, name: final } : d));
    if (this.designData[from]) { const { [from]: key, ...rest } = this.designData; this.designData = { ...rest, [final]: key }; }
    // design nodes in the flow follow the rename
    if (this.flow) this.flow = { ...this.flow, nodes: this.flow.nodes.map((n) => (n.type === 'design' && n.design === from ? { ...n, design: final } : n)) };
    this.touch();
    return final;
  }

  duplicateDesign(name: string): string | null {
    const source = this.designs.find((d) => d.name === name);
    if (!source) return null;
    const copy = this.addDesign(`${name} copy`, source.html);
    if (this.designData[name]) this.designData = { ...this.designData, [copy]: this.designData[name] };
    return copy;
  }

  deleteDesign(name: string) {
    this.#record(`Delete design “${name}”`);
    this.designs = this.designs.filter((d) => d.name !== name);
    this.touch();
  }

  setDesignHtml(name: string, html: string, label = 'Edit design') {
    this.#record(label);
    this.designs = this.designs.map((d) => (d.name === name ? { ...d, html } : d));
    this.touch();
  }

  // ---- files/ -----------------------------------------------------------------

  /** Adds a file under files/ (replaces one with the same name). Returns the final name. */
  addFile(name: string, blob: Blob): string {
    const final = cleanFileName(name) || 'file';
    const exists = this.files.some((f) => f.name === final);
    this.#record(`${exists ? 'Replace' : 'Add'} file ${final}`);
    this.files = [...this.files.filter((f) => f.name !== final), { name: final, blob }];
    this.touch();
    return final;
  }

  /** Renames a file under files/ and rewrites its references in every design (one undo step). */
  renameFile(from: string, to: string): { name: string; updated: number } | null {
    let base = cleanFileName(to);
    if (!base) return null;
    const ext = /.[^./]+$/;
    if (!ext.test(base) && ext.test(from)) base += from.match(ext)![0]; // keep the extension if the user left it off
    const final = uniqueFileName(base, this.files.filter((f) => f.name !== from).map((f) => f.name));
    if (final === from) return null;
    this.#record(`Rename file ${from}`);
    this.files = this.files.map((f) => (f.name === from ? { ...f, name: final } : f));
    let updated = 0;
    this.designs = this.designs.map((d) => {
      const html = renameFileRefs(d.html, from, final);
      if (html === d.html) return d;
      updated++;
      return { ...d, html };
    });
    this.touch();
    return { name: final, updated };
  }

  deleteFile(name: string) {
    this.#record(`Delete file ${name}`);
    this.files = this.files.filter((f) => f.name !== name);
    this.touch();
  }

  /** Deletes multiple files under files/ in one atomic undo step. */
  deleteFiles(names: string[]) {
    if (!names.length) return;
    const label = names.length === 1 ? `Delete file ${names[0]}` : `Delete ${names.length} files`;
    this.#record(label);
    const set = new Set(names);
    this.files = this.files.filter((f) => !set.has(f.name));
    this.touch();
  }

  /** Deletes multiple designs in one atomic undo step. */
  deleteDesigns(names: string[]) {
    if (!names.length) return;
    const label = names.length === 1 ? `Delete design “${names[0]}”` : `Delete ${names.length} designs`;
    this.#record(label);
    const set = new Set(names);
    this.designs = this.designs.filter((d) => !set.has(d.name));
    this.touch();
  }
}

export const ws = new WorkspaceStore();
