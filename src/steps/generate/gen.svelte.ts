// The Generate step: what will be made (from the flow), the batch plan, the checks, and the run itself.
import { untrack } from 'svelte';
import { analyzeDesign } from '$lib/render/analyze';
import { describeRoute } from '$lib/flow/describe';
import { readPageSize } from '$lib/render/page';
import { DesignSurface } from '$lib/generate/surface';
import { pdfFromJpeg, mergePdfs } from '$lib/generate/pdf';
import {
  batchKeys, clearJob, dropPages, folderSink, getPage, hashStrings, jobDone, jobTotal, loadJob, putPage, saveJob, zipSink,
  type Job, type Sink,
} from '$lib/generate/job';
import { buildItems, type Built } from '$lib/generate/items';
import { DEFAULT_SETTINGS, defaultPattern, pathFor, planBatches, type GenItem, type GenSettings, type PlanBatch } from '$lib/generate/plan';
import { GENERATE_STAT } from '$lib/workspace/config';
import { canLinkFolder, listFilesIn, removeFileAt, type DirHandle } from '$lib/workspace/folder';
import { ws } from '$lib/workspace/store.svelte';
import { toast } from '$lib/ui/toast.svelte';
import { design as designUi } from '../design/design.svelte';
import { flowUi } from '../flow/flow.svelte';

export type RunStatus = 'idle' | 'previewing' | 'running' | 'stopping' | 'paused' | 'done';
export interface Check { level: 'error' | 'warn' | 'info'; text: string; where?: 'flow' | 'design' | 'data' | 'options'; fix?: { label: string; run: () => void } }
export interface PreviewItem { key: string; label: string; design: string; url: string; route: string[] }

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const stem = (name: string) => name.replace(/\.[^.]+$/, '');
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

class GenerateUi {
  settings = $state<GenSettings>(clone(DEFAULT_SETTINGS));
  status = $state<RunStatus>('idle');
  /** bumped whenever the (non-reactive) job object changes, so views update */
  rev = $state(0);
  job = $state.raw<Job | null>(null);
  preview = $state.raw<PreviewItem[]>([]);
  /** what is being made right now */
  current = $state('');
  startedAt = $state(0);
  /** how many were done when this run began (for the time left) */
  baseDone = 0;
  #stop = false;
  #wake: { release(): Promise<void> } | null = null;
  #surfaces = new Map<string, Promise<DesignSurface>>();
  /** certificates already in output/ when there is no saved run (one PDF per student): lets a run carry on from the folder */
  found = $state<{ n: number; total: number } | null>(null);
  #existing: Set<string> | null = null;
  /** which opened workspace the options and the saved run were read for */
  #loadedFor = -1;
  /** the options as they were when last read from or written to the workspace (to tell a real change from a re-read) */
  #baseline = '';

  built = $derived<Built>(buildItems(flowUi.result, (key) => ws.sheetOf(key), this.settings));
  plan = $derived<PlanBatch[]>(planBatches(this.built.items, { size: this.settings.batchSize, buffer: this.settings.buffer, keepGroups: this.settings.keepGroups }, this.settings.moves));
  itemMap = $derived(new Map(this.built.items.map((i) => [i.key, i])));
  /** certificate key -> where its file goes */
  paths = $derived.by(() => {
    const out = new Map<string, string>();
    for (const b of this.plan) for (const p of b.parts) for (const key of p.keys) {
      const item = this.itemMap.get(key);
      if (item) out.set(key, pathFor(item, b.n, this.plan.length, this.settings, ws.designs));
    }
    return out;
  });
  checks = $derived<Check[]>(this.#checks());

  get running() { return this.status === 'running' || this.status === 'stopping'; }
  get blocked() { return this.checks.some((c) => c.level === 'error'); }
  /** There is a saved run that has not finished. */
  get resumable() { void this.rev; return !!this.job && !this.job.finished && jobDone(this.job) < jobTotal(this.job); }
  get done() { void this.rev; return this.job ? jobDone(this.job) : 0; }
  get total() { void this.rev; return this.job ? jobTotal(this.job) : this.built.items.length; }
  get pattern() { return this.settings.pattern.trim() || defaultPattern(this.settings.format); }
  /** The output goes into a real folder (else each batch is downloaded). */
  get toFolder() { return ws.folderState === 'linked' || ws.folderState === 'needs-permission'; }

  /** Has anything changed since the saved run began? */
  get stale() {
    void this.rev;
    return !!this.job && this.job.fingerprint !== this.#fingerprint();
  }

  // ---- loading and saving -------------------------------------------------------------------------------

  /** Reads the options (config/generate.config.json) and the saved run (config/generate.stat.json) of the open workspace. */
  async load() {
    if (this.#loadedFor === ws.loadId) return;
    this.#loadedFor = ws.loadId;
    this.settings = { ...clone(DEFAULT_SETTINGS), ...((ws.genConfig ?? {}) as Partial<GenSettings>) };
    this.#baseline = JSON.stringify($state.snapshot(this.settings));
    this.preview = [];
    this.job = await loadJob(ws.handle);
    this.status = this.job?.finished ? 'done' : this.job ? 'paused' : 'idle';
    this.rev++;
    void this.scanFolder();
  }

  /** Looks in output/ for certificates of the planned run that are already there (one PDF per student only). */
  async scanFolder() {
    this.found = null;
    this.#existing = null;
    if (this.job || !ws.handle || ws.folderState !== 'linked' || this.settings.format !== 'separate' || !this.paths.size) return;
    try {
      const dirs = [...new Set([...this.paths.values()].map((p) => 'output/' + p.split('/').slice(0, -1).join('/')))].slice(0, 400);
      const have = await listFilesIn(ws.handle, dirs);
      const existing = new Set([...this.paths.values()].filter((p) => have.has('output/' + p)));
      if (existing.size) { this.#existing = existing; this.found = { n: existing.size, total: this.paths.size }; }
    } catch { /* the folder cannot be read: no suggestion */ }
  }

  /** The options belong to the workspace: they are saved in its config/generate.config.json. */
  saveSettings() {
    if (this.#loadedFor !== ws.loadId) return; // not read yet: do not overwrite them with the defaults
    const snap = $state.snapshot(this.settings) as unknown as Record<string, unknown>;
    const json = JSON.stringify(snap);
    if (json === this.#baseline) return; // nothing the user changed
    this.#baseline = json;
    ws.setGenConfig(snap);
  }

  /** Undo and redo change the workspace's options: show them here. */
  syncFromConfig() {
    if (this.#loadedFor !== ws.loadId) return;
    const want = { ...clone(DEFAULT_SETTINGS), ...((ws.genConfig ?? {}) as Partial<GenSettings>) };
    const json = JSON.stringify(want);
    if (json === untrack(() => JSON.stringify($state.snapshot(this.settings)))) return;
    this.settings = want;
    this.#baseline = json;
  }

  /** Changes options. A change that alters the batches also forgets groups moved by hand (unless `keepMoves`). */
  update(patch: Partial<GenSettings>, keepMoves = false) {
    this.settings = { ...this.settings, ...patch, ...(keepMoves ? {} : { moves: {} }) };
  }

  reset(keys?: (keyof GenSettings)[]) {
    const d = clone(DEFAULT_SETTINGS);
    if (!keys) this.settings = d;
    else for (const k of keys) (this.settings as unknown as Record<string, unknown>)[k] = d[k];
  }

  // ---- checks -------------------------------------------------------------------------------------------

  #fingerprint(): string {
    const parts: string[] = [JSON.stringify(ws.fieldMap)];
    const lists = new Set(this.built.items.map((i) => i.list));
    for (const key of lists) {
      const sheet = ws.sheetOf(key);
      parts.push(key, JSON.stringify(sheet?.columns ?? []), JSON.stringify(sheet?.rows ?? []));
    }
    for (const d of new Set(this.built.items.map((i) => i.design))) parts.push(d, ws.designs.find((x) => x.name === d)?.html ?? '');
    parts.push(...this.built.items.map((i) => `${i.key}>${i.design}`));
    return hashStrings(parts);
  }

  #checks(): Check[] {
    const out: Check[] = [];
    const s = this.settings;
    const { items, configs, skipped, unassigned } = this.built;

    const flowErrors = flowUi.issues.filter((i) => i.level === 'error');
    for (const e of flowErrors.slice(0, 4)) {
      const fix = e.fix;
      out.push({ level: 'error', where: 'flow', text: e.message, fix: fix ? { label: `Pair “${fix.design}” with ${flowUi.label(fix.list)}`, run: () => ws.setDesignData(fix.design, fix.list) } : undefined });
    }
    if (!items.length) out.push({ level: 'error', where: 'flow', text: 'Nobody gets a certificate yet. Check that the flow sends rows to a design.' });

    for (const [list, cfg] of configs) {
      const sheet = ws.sheetOf(list);
      if (!sheet) continue;
      if (!cfg.idColumn && s.format === 'separate') out.push({ level: 'info', where: 'options', text: `${list}: no column has different values for everyone, so files are numbered row-1, row-2…` });
      else if (cfg.idColumn) {
        const empty = items.filter((i) => i.list === list && !i.id).length;
        if (empty) out.push({ level: 'error', where: 'options', text: `${empty} ${empty === 1 ? 'person has' : 'people have'} no value in “${cfg.idColumn}” (${list}), so their files cannot be named.` });
      }
    }

    if (s.format === 'separate') {
      const byPath = new Map<string, GenItem[]>();
      for (const [key, path] of this.paths) {
        const item = this.itemMap.get(key)!;
        (byPath.get(path.toLowerCase()) ?? byPath.set(path.toLowerCase(), []).get(path.toLowerCase())!).push(item);
      }
      const clashes = [...byPath.values()].filter((v) => v.length > 1);
      if (clashes.length) {
        const sample = clashes.slice(0, 3).map((v) => `“${v[0].id}” ×${v.length}`).join(', ');
        out.push({ level: 'error', where: 'options', text: `${clashes.length} file name${clashes.length === 1 ? ' is' : 's are'} used more than once (${sample}). Pick a column whose values are all different, or add {list} or {group} to the path.` });
      }
    }

    const pairs = new Set(items.map((i) => `${i.design}\u0000${i.list}`));
    const several = new Set(items.map((i) => i.list)).size > 1;
    for (const pair of pairs) {
      const [name, list] = pair.split('\u0000');
      const d = ws.designs.find((x) => x.name === name);
      if (!d) { if (!out.some((c) => c.text.includes(`“${name}”`))) out.push({ level: 'error', where: 'flow', text: `The flow uses a design called “${name}” that does not exist.` }); continue; }
      const info = analyzeDesign(d.html, ws.sheetOf(list)?.columns ?? [], ws.tokenMap, ws.files.map((f) => f.name));
      if (info.unmatched.length) out.push({ level: 'warn', where: 'design', text: `${name}${several ? ` (rows from ${list})` : ''}: ${info.unmatched.map((t) => `{${t}}`).join(' ')} ${info.unmatched.length === 1 ? 'has' : 'have'} no matching column and will print as written.` });
      if (info.missingFiles.length) out.push({ level: 'warn', where: 'design', text: `${name}: missing file${info.missingFiles.length === 1 ? '' : 's'} ${info.missingFiles.join(', ')}.` });
      if (/<script[\s>]/i.test(d.html) && !designUi.isTrusted(name)) out.push({ level: 'warn', where: 'design', text: `${name} has a script that is switched off, so parts of it may sit in the wrong place.` });
    }
    if (skipped) out.push({ level: 'info', where: 'flow', text: `${skipped} skipped by the flow (no certificate).` });
    if (unassigned) out.push({ level: 'warn', where: 'flow', text: `${unassigned} ${unassigned === 1 ? 'person has' : 'people have'} no design (a branch of the flow is not connected).` });
    if (!this.toFolder) out.push({ level: 'info', where: 'options', text: canLinkFolder() ? 'No folder yet: you will be asked to pick one. Certificates are saved there in output/.' : 'This browser cannot save into a folder, so each finished batch is downloaded as a zip.' });
    return out;
  }

  // ---- where the files go -------------------------------------------------------------------------------

  async #sink(): Promise<Sink | null> {
    if (canLinkFolder()) {
      if (!ws.handle || ws.folderState === 'none') {
        const { saveWorkspace } = await import('$lib/workspace/actions');
        await saveWorkspace(); // asks for a folder and links the workspace to it
      } else if (ws.folderState === 'needs-permission' && !(await ws.reconnectFolder())) {
        toast('Could not get access to the folder', 'error');
        return null;
      }
      if (ws.handle && ws.folderState === 'linked') return folderSink(ws.handle);
      return null; // the folder picker was cancelled
    }
    return zipSink(ws.name || 'workspace');
  }

  // ---- rendering ----------------------------------------------------------------------------------------

  #surface(name: string): Promise<DesignSurface> {
    let s = this.#surfaces.get(name);
    if (!s) {
      const d = ws.designs.find((x) => x.name === name);
      if (!d) throw new Error(`The design “${name}” does not exist`);
      s = DesignSurface.create({ html: d.html, files: ws.files, size: readPageSize(d.html), allowScripts: designUi.isTrusted(name) });
      this.#surfaces.set(name, s);
    }
    return s;
  }

  #dropSurfaces() {
    for (const p of this.#surfaces.values()) p.then((s) => s.destroy()).catch(() => {});
    this.#surfaces.clear();
  }

  /** One certificate as a one-page PDF. */
  async #render(item: GenItem): Promise<Uint8Array> {
    const surface = await this.#surface(item.design);
    const sheet = ws.sheetOf(item.list);
    const row = sheet?.rows[item.row];
    if (!sheet || !row) throw new Error('The row is no longer in the data');
    surface.setRow(row, sheet.columns, ws.tokenMap);
    const s = this.job?.settings ?? this.settings;
    const jpeg = await surface.toJpeg(s.quality, 0.92, s.renderer ?? 'browser');
    const runs = s.selectableText === false ? [] : surface.textRuns();
    return pdfFromJpeg(jpeg, surface.size.width, surface.size.height, runs);
  }

  // ---- preview ------------------------------------------------------------------------------------------

  /** Makes ten random certificates (at least one per design) to look at. Nothing is saved. */
  async previewTen() {
    if (this.running || this.status === 'previewing') return;
    const items = this.built.items;
    if (!items.length) return;
    const before = this.status;
    this.status = 'previewing';
    this.#revokePreview();
    try {
      // one certificate for every different way through the flow first, then random ones up to ten
      const picks: GenItem[] = [];
      const shuffled = items.slice().sort(() => Math.random() - 0.5);
      const seen = new Set<string>();
      for (const i of shuffled) { const sig = i.path.join('>'); if (!seen.has(sig) && picks.length < 10) { seen.add(sig); picks.push(i); } }
      for (const i of shuffled) if (picks.length < 10 && !picks.includes(i)) picks.push(i);
      const made: PreviewItem[] = [];
      for (const item of picks.slice(0, 10)) {
        this.current = item.id;
        const bytes = await this.#render(item);
        made.push({ key: item.key, label: item.id || `row ${item.row + 1}`, design: item.design, route: describeRoute(flowUi.graph, item.path, { kind: 'design', design: item.design }, (k) => flowUi.label(k), flowUi.defaultKey), url: URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' })) });
        this.preview = [...made];
        await tick();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      this.current = '';
      this.#dropSurfaces();
      this.status = before;
    }
  }

  #revokePreview() {
    for (const p of this.preview) URL.revokeObjectURL(p.url);
    this.preview = [];
  }

  // ---- the run ------------------------------------------------------------------------------------------

  /** Starts a new run from the current plan. */
  async generate() {
    if (this.running || this.blocked || !this.built.items.length) return;
    if (this.job && !this.job.finished && !(await this.#confirmReplace())) return;
    const sink = await this.#sink();
    if (!sink) return;
    this.#existing = null; // a fresh run makes everything again
    this.found = null;
    await this.#startJob(sink);
  }

  /** Carries on from what is in output/: the certificates that are already there are skipped (no saved run needed). */
  async continueFromFolder() {
    if (this.running || this.blocked || !this.found) return;
    const sink = await this.#sink();
    if (!sink) return;
    await this.#startJob(sink);
  }

  async #startJob(sink: Sink) {
    const plan = this.plan;
    this.job = {
      version: 1,
      id: Math.random().toString(36).slice(2, 10),
      startedAt: Date.now(),
      updatedAt: Date.now(),
      fingerprint: this.#fingerprint(),
      settings: clone($state.snapshot(this.settings)),
      batches: plan.map((b) => ({ n: b.n, parts: b.parts.map((p) => ({ group: p.group, keys: [...p.keys] })), done: 0, state: 'waiting' as const })),
      paths: Object.fromEntries(this.paths),
      failed: {},
      finished: false,
    };
    // batches the folder already has in front: their first certificates count as done
    if (this.#existing) for (const b of this.job.batches) { let n = 0; for (const k of batchKeys(b)) { if (!this.#existing.has(this.job.paths[k])) break; n++; } b.done = n; }
    this.found = null;
    this.rev++;
    await saveJob(this.job, ws.handle, true);
    await this.#run(sink);
  }

  async #confirmReplace(): Promise<boolean> {
    const { confirmDialog } = await import('$lib/ui/confirm.svelte');
    return confirmDialog({ title: 'Start over?', message: 'A run that did not finish is saved. Starting a new one forgets its progress. Files already made stay in output/.', confirmLabel: 'Start over', danger: true });
  }

  /** Carries on with the saved run. */
  async resume() {
    if (this.running || !this.job || this.job.finished) return;
    const sink = await this.#sink();
    if (!sink) return;
    if (sink.kind === 'zip') for (const b of this.job.batches) if (b.state !== 'done') b.done = 0; // a half batch cannot be finished in the download mode
    await this.#run(sink);
  }

  stop() {
    if (this.status === 'running') { this.#stop = true; this.status = 'stopping'; }
  }

  /** Forgets the saved run. With `deleteFiles` the output/ folder is emptied too. */
  async clear(deleteFiles: boolean) {
    if (this.running) return;
    await clearJob(ws.handle);
    if (deleteFiles && ws.handle) await removeOutput(ws.handle);
    this.job = null;
    this.status = 'idle';
    this.rev++;
    void this.scanFolder();
  }

  /** Tries the certificates that failed once more. */
  async retryFailed() {
    const job = this.job;
    if (!job || this.running) return;
    const keys = Object.keys(job.failed);
    if (!keys.length) return;
    const sink = await this.#sink();
    if (!sink) return;
    this.status = 'running';
    for (const key of keys) {
      const item = this.itemMap.get(key);
      const path = job.paths[key];
      if (!item || !path) continue;
      try { await sink.write(path, await this.#render(item)); delete job.failed[key]; } catch (e) { job.failed[key] = e instanceof Error ? e.message : String(e); }
      this.rev++;
    }
    this.#dropSurfaces();
    await saveJob(job, ws.handle, true);
    this.status = job.finished ? 'done' : 'paused';
  }

  async #run(sink: Sink) {
    const job = this.job!;
    this.#stop = false;
    this.status = 'running';
    this.startedAt = Date.now();
    this.baseDone = jobDone(job);
    this.#startGuards();
    let sinceSave = 0;
    try {
      for (const batch of job.batches) {
        if (batch.state === 'done') continue;
        batch.state = 'running';
        const keys = batchKeys(batch);
        for (let i = batch.done; i < keys.length; i++) {
          if (this.#stop) break;
          const key = keys[i];
          const item = this.itemMap.get(key);
          const path = job.paths[key];
          this.current = item?.id || key;
          if (this.#existing?.has(path) && job.settings.format === 'separate') { batch.done = i + 1; continue; } // already in the folder
          try {
            if (!item) throw new Error('This person is no longer in the flow');
            const bytes = await this.#render(item);
            if (this.settings.format === 'combined' || job.settings.format === 'combined') await putPage(batch.n, i, bytes);
            else await sink.write(path, bytes);
          } catch (e) {
            job.failed[key] = e instanceof Error ? e.message : String(e);
          }
          batch.done = i + 1;
          this.rev++;
          if (++sinceSave >= 10) { sinceSave = 0; await saveJob(job, null, false); }
          await tick(); // let the browser draw and respond between certificates
        }
        if (this.#stop) {
          // paused in the middle of a combined batch: the folder gets the PDF made of the pages so far (the rest is added on Continue)
          if (job.settings.format === 'combined' && sink.kind === 'folder' && batch.done > 0) await this.#writeCombined(job, batch, keys, sink, batch.done, true);
          break;
        }
        await this.#finishBatch(job, batch, keys, sink);
      }
      job.finished = job.batches.every((b) => b.state === 'done');
      this.status = this.#stop ? 'paused' : job.finished ? 'done' : 'paused';
      if (job.finished) toast(`Done: ${jobDone(job) - Object.keys(job.failed).length} certificates made${Object.keys(job.failed).length ? `, ${Object.keys(job.failed).length} failed` : ''}`, Object.keys(job.failed).length ? 'info' : 'success');
    } catch (e) {
      this.status = 'paused';
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      this.current = '';
      this.#dropSurfaces();
      this.#endGuards();
      await saveJob(job, ws.handle, true);
      this.rev++;
    }
  }

  /** A batch has all its certificates: build its combined PDFs (if any) and hand it over. */
  async #finishBatch(job: Job, batch: Job['batches'][number], keys: string[], sink: Sink) {
    if (job.settings.format === 'combined') {
      await this.#writeCombined(job, batch, keys, sink, keys.length, false);
      await dropPages(batch.n, keys.length);
    }
    await sink.batchDone(batch.n, `batch ${String(batch.n).padStart(2, '0')}`);
    batch.state = 'done';
    await saveJob(job, ws.handle, true);
  }

  /**
   * Writes the combined PDFs of a batch from its first `upTo` certificates. A page that is missing (the saved pages are
   * gone, for example in another browser) is made again, so no certificate is silently left out. `partial` (a pause)
   * writes only the pages that exist.
   */
  async #writeCombined(job: Job, batch: Job['batches'][number], keys: string[], sink: Sink, upTo: number, partial: boolean) {
    const byPath = new Map<string, number[]>();
    keys.slice(0, upTo).forEach((key, i) => { if (!job.failed[key]) (byPath.get(job.paths[key]) ?? byPath.set(job.paths[key], []).get(job.paths[key])!).push(i); });
    for (const [path, indexes] of byPath) {
      const pages: Uint8Array[] = [];
      for (const i of indexes) {
        let page = await getPage(batch.n, i);
        if (!page && !partial) {
          const item = this.itemMap.get(keys[i]);
          try {
            if (!item) throw new Error('This person is no longer in the flow');
            page = await this.#render(item);
            await putPage(batch.n, i, page);
          } catch (e) {
            job.failed[keys[i]] = e instanceof Error ? e.message : String(e);
          }
        }
        if (page) pages.push(page);
      }
      if (pages.length) await sink.write(path, await mergePdfs(pages));
      await tick();
    }
  }

  #startGuards() {
    window.addEventListener('beforeunload', this.#beforeUnload);
    (navigator as unknown as { wakeLock?: { request(t: string): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen').then((w) => (this.#wake = w)).catch(() => {});
  }
  #endGuards() {
    window.removeEventListener('beforeunload', this.#beforeUnload);
    void this.#wake?.release().catch(() => {});
    this.#wake = null;
  }
  #beforeUnload = (e: BeforeUnloadEvent) => { if (this.running) e.preventDefault(); };

  // ---- the files of the run -----------------------------------------------------------------------------

  /** Opens a finished PDF (from the output folder) in a new tab. */
  async open(path: string) {
    if (!ws.handle) return;
    try {
      const parts = ('output/' + path).split('/');
      const name = parts.pop()!;
      let dir: DirHandle = ws.handle;
      for (const p of parts) dir = await dir.getDirectoryHandle(p);
      const file = await (await dir.getFileHandle(name)).getFile();
      window.open(URL.createObjectURL(file), '_blank');
    } catch {
      toast('That file is not in the folder (any more)', 'error');
    }
  }

}

async function removeOutput(root: DirHandle) {
  try { await root.removeEntry('output', { recursive: true }); } catch { /* nothing there */ }
  await removeFileAt(root, GENERATE_STAT);
}

export const gen = new GenerateUi();
export { stem };
