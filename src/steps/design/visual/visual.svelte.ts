// The visual editor session. It works on TWO twins of the design:
//   live: the preview iframe's document — shows what the user sees, mutated instantly while dragging
//   src : a parsed copy of the design's HTML — what actually gets saved
// Elements are matched by `data-cf` id (index in the source HTML, see lib/render/dom.ts).
// Style-only edits change both twins and skip a re-render; structural edits change `src` and re-render.
import { indexAll, NON_VISUAL, serializeDoc } from '$lib/render/dom';
import { readPageSize } from '$lib/render/page';
import { ws } from '$lib/workspace/store.svelte';
import { design } from '../design.svelte';
import { flushNudge } from './ops';
import { boxOf, kindOf, labelOf, layerChildren, layerOf, pageRoot, rgbToHex, type Box, type Kind } from './geometry';
import { NO_GUIDES, type Guides } from './snap';

export interface LayerInfo { id: number; kind: Kind; label: string }

export interface StyleSnapshot {
  /** Text items the text controls refer to (1 for a text layer; >1 for a group). */
  textCount: number;
  /** Text properties that differ between those items (shown as a hint). */
  mixed: string[];
  fontFamily: string; fontSize: number; fontWeight: number; italic: boolean; underline: boolean;
  color: string; textAlign: string; letterSpacing: number; lineHeight: number;
  background: string; opacity: number; borderWidth: number; borderColor: string; radius: number;
}

export class VisualEditor {
  doc: Document | null = null; // live (iframe) document
  src: Document | null = null; // source twin
  root: HTMLElement | null = null; // live page root
  srcList: HTMLElement[] = [];
  liveHtml = ''; // HTML this editor just produced: the stage must not re-render for it
  pendingSelect: number | null = null; // select this id once the next render is attached

  layers = $state.raw<LayerInfo[]>([]);
  selected = $state<number | null>(null);
  hovered = $state<number | null>(null);
  box = $state.raw<Box | null>(null); // selection, in page px
  hoverBox = $state.raw<Box | null>(null);
  guides = $state.raw<Guides>(NO_GUIDES);
  kind = $state<Kind | null>(null);
  editing = $state(false);
  rev = $state(0); // bumps whenever the selection's styles may have changed

  /** Called when the preview iframe has (re)loaded. */
  attach(iframe: HTMLIFrameElement) {
    const doc = iframe.contentDocument;
    if (!doc?.body) return;
    this.doc = doc;
    this.editing = false;
    this.src = new DOMParser().parseFromString(design.html, 'text/html');
    this.srcList = indexAll(this.src);
    this.root = pageRoot(doc, this.pageSize());
    this.layers = this.#layerInfos();
    if (this.pendingSelect !== null) { this.selected = this.pendingSelect; this.pendingSelect = null; }
    if (this.selected !== null && !this.live(this.selected)) this.selected = null;
    this.refresh();
    doc.fonts?.ready.then(() => this.refresh()); // text moves when fonts arrive
  }

  detach() {
    this.doc = this.src = this.root = null;
    this.srcList = [];
    this.selected = this.hovered = null;
    this.box = this.hoverBox = null;
    this.layers = [];
    this.editing = false;
  }

  pageSize() { return readPageSize(design.html); }
  pageDims() { const s = this.pageSize(); return { w: s.width, h: s.height }; }

  live(id: number | null): HTMLElement | null {
    return id === null || !this.doc ? null : (this.doc.querySelector(`[data-cf="${id}"]`) as HTMLElement | null);
  }
  twin(id: number | null): HTMLElement | null { return id === null ? null : (this.srcList[id] ?? null); }
  idOf(el: Element): number { return Number(el.getAttribute('data-cf')); }

  /** The twin of the live root (for adding elements). */
  srcRoot(): HTMLElement {
    const id = this.root && this.root !== this.doc?.body ? this.idOf(this.root) : -1;
    return (id >= 0 ? this.srcList[id] : this.src!.body) as HTMLElement;
  }

  #layerInfos(): LayerInfo[] {
    if (!this.root) return [];
    return layerChildren(this.root).map((el) => {
      const kind = kindOf(el);
      return { id: this.idOf(el), kind, label: labelOf(el, kind) };
    });
  }

  /** The element under a page point: the top-level layer, or (deep) the exact element. */
  hit(x: number, y: number, deep = false): number | null {
    if (!this.doc || !this.root) return null;
    const raw = this.doc.elementFromPoint(x, y);
    if (!raw || raw === this.root || raw === this.doc.body || raw === this.doc.documentElement) return null;
    const el = deep ? raw : layerOf(raw, this.root);
    return el && el.hasAttribute('data-cf') ? this.idOf(el) : null;
  }

  /** Boxes of the top-level layers, except the one being moved (for snapping). */
  layerBoxes(exceptId: number): Box[] {
    if (!this.root) return [];
    const me = this.live(exceptId);
    return layerChildren(this.root).filter((c) => c !== me && !(me && c.contains(me))).map(boxOf);
  }

  select(id: number | null) {
    if (this.editing) this.endEdit(true);
    this.selected = id;
    this.refresh();
  }

  setHover(id: number | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.refresh();
  }

  refresh() {
    const el = this.live(this.selected);
    this.box = el ? boxOf(el) : null;
    this.kind = el ? kindOf(el) : null;
    const h = this.hovered !== null && this.hovered !== this.selected ? this.live(this.hovered) : null;
    this.hoverBox = h ? boxOf(h) : null;
    this.rev++;
  }

  // ---- editing text in place ---------------------------------------------------

  #editOriginal = '';
  #editEl: HTMLElement | null = null;

  /** Edits the selected element's text right on the page. Shows the RAW text, so {fields} stay editable. */
  startEdit() {
    const id = this.selected, el = this.live(id), twin = this.twin(id);
    if (id === null || !el || !twin || !this.doc || this.editing) return;
    this.editing = true;
    this.#editEl = el;
    this.#editOriginal = twin.innerHTML;
    el.innerHTML = twin.innerHTML;
    el.setAttribute('contenteditable', 'true');
    el.style.outline = 'none';
    el.focus();
    const range = this.doc.createRange();
    range.selectNodeContents(el);
    const sel = this.doc.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    el.addEventListener('blur', () => this.endEdit(true), { once: true });
    el.addEventListener('keydown', (e) => {
      const k = e as KeyboardEvent;
      if (k.key === 'Escape') el.blur();
      // Ctrl+S inside the page's own text editing: finish the edit, then save
      else if ((k.ctrlKey || k.metaKey) && k.key.toLowerCase() === 's') { k.preventDefault(); el.blur(); queueMicrotask(() => void ws.flush(true)); }
    });
    this.refresh();
  }

  endEdit(save: boolean) {
    const el = this.#editEl, id = this.selected, twin = this.twin(id);
    if (!this.editing || !el) return;
    this.editing = false;
    this.#editEl = null;
    const html = el.innerHTML;
    el.removeAttribute('contenteditable');
    // Keyboard focus must go back to the app: while it stays inside the preview, arrow keys, Delete, Ctrl+Z and
    // Space go to the preview document and nothing seems to work until the next click.
    (this.doc?.defaultView?.frameElement as HTMLElement | null)?.blur();
    window.focus();
    if (save && twin && html !== this.#editOriginal) {
      twin.innerHTML = html;
      this.commit('Edit text', true); // re-render: {fields} are filled in again
    } else {
      this.forceRender(); // nothing changed: restore the filled-in page
    }
  }

  // ---- saving ------------------------------------------------------------------

  /** Copies inline style properties from the live element to its source twin. */
  syncStyle(id: number, props: string[]) {
    const live = this.live(id), twin = this.twin(id);
    if (!live || !twin) return;
    for (const p of props) {
      const v = live.style.getPropertyValue(p);
      if (v) twin.style.setProperty(p, v, live.style.getPropertyPriority(p));
      else twin.style.removeProperty(p);
    }
    if (!twin.getAttribute('style')) twin.removeAttribute('style');
  }

  /** Saves the source twin as the design's new HTML (one undo step). `recompile` = the stage must re-render. */
  commit(label: string, recompile = false) {
    if (!this.src) return;
    const html = serializeDoc(this.src);
    this.liveHtml = recompile ? '' : html;
    design.apply(html, label);
    this.refresh();
  }

  /** Re-render the preview from the saved HTML (drops anything only the live twin has). */
  forceRender() {
    this.liveHtml = '';
    design.renderKey++;
  }

  /** Sets one inline CSS property on the selection (both twins) and saves. */
  setStyle(prop: string, value: string, label: string) {
    const id = this.selected, live = this.live(id), twin = this.twin(id);
    if (id === null || !live || !twin) return;
    live.style.setProperty(prop, value);
    twin.style.setProperty(prop, value);
    this.commit(label);
  }

  /**
   * The text elements the text controls read and change. A text layer is its own target. For a GROUP (header,
   * title block…) the targets are the text items inside it: the group itself only holds inherited values, so
   * reading/changing it would show (and do) the wrong thing.
   */
  textTargets(id: number | null = this.selected): HTMLElement[] {
    const el = this.live(id);
    if (!el) return [];
    if (kindOf(el) !== 'group') return [el];
    const found: HTMLElement[] = [];
    const walk = (node: HTMLElement) => {
      for (const child of Array.from(node.children) as HTMLElement[]) {
        if (NON_VISUAL.has(child.tagName)) continue;
        const k = kindOf(child);
        if (k === 'text') found.push(child);
        else if (k === 'group') walk(child);
      }
    };
    walk(el);
    return found.length ? found : [el];
  }

  /** Like setStyle, but for the text controls: applies to every text item of the selection (see textTargets). */
  setTextStyle(prop: string, value: string, label: string) {
    const targets = this.textTargets();
    if (!targets.length) return;
    for (const t of targets) {
      t.style.setProperty(prop, value);
      this.twin(this.idOf(t))?.style.setProperty(prop, value);
    }
    this.commit(label);
  }

  /** What the inspector shows for the selection (computed, so class-based styles are included). */
  styleOf(): StyleSnapshot | null {
    void this.rev;
    const box = this.live(this.selected);
    const view = this.doc?.defaultView;
    if (!box || !view) return null;
    const targets = this.textTargets();
    const px = (v: string) => parseFloat(v) || 0;
    const text = (el: HTMLElement) => {
      const c = view.getComputedStyle(el);
      return {
        fontFamily: c.fontFamily, fontSize: px(c.fontSize), fontWeight: Number(c.fontWeight) || 400,
        italic: c.fontStyle === 'italic', underline: c.textDecorationLine.includes('underline'),
        color: rgbToHex(c.color), textAlign: c.textAlign === 'start' ? 'left' : c.textAlign === 'end' ? 'right' : c.textAlign,
        letterSpacing: px(c.letterSpacing), lineHeight: c.lineHeight === 'normal' ? 0 : px(c.lineHeight) / (px(c.fontSize) || 1),
      };
    };
    const first = text(targets[0] ?? box);
    const mixed = new Set<string>();
    for (const t of targets.slice(1)) {
      const o = text(t);
      for (const k of Object.keys(first) as (keyof typeof first)[]) if (o[k] !== first[k]) mixed.add(k);
    }
    const b = view.getComputedStyle(box);
    return {
      ...first,
      textCount: targets.length, mixed: [...mixed],
      background: rgbToHex(b.backgroundColor), opacity: Number(b.opacity),
      borderWidth: px(b.borderTopWidth), borderColor: rgbToHex(b.borderTopColor), radius: px(b.borderTopLeftRadius),
    };
  }
}

export const visual = new VisualEditor();
ws.onBeforeFlush(flushNudge); // an arrow-key nudge that is still waiting for its pause is saved too
