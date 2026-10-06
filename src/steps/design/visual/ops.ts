// Commands on the selection: move/resize by numbers, add, delete, duplicate, stack order, align, fonts, fields.
import { indexAll } from '$lib/render/dom';
import { boxOf, frozenBase, GEOMETRY_PROPS, kindOf, place, setSize } from './geometry';
import { ensureFontLink, GOOGLE_FONTS, isGoogleFont } from './fonts';
import type { VisualEditor } from './visual.svelte';

let nudgeTimer: ReturnType<typeof setTimeout> | undefined;
let pendingNudge: (() => void) | null = null;

/** Commits a nudge that is still waiting for its idle pause (called before saving). */
export function flushNudge() {
  clearTimeout(nudgeTimer);
  pendingNudge?.();
  pendingNudge = null;
}

/** Arrow-key move. Moves instantly; the burst of keypresses becomes ONE undo step. */
export function nudge(v: VisualEditor, dx: number, dy: number) {
  const id = v.selected, el = v.live(id);
  if (id === null || !el) return;
  const b = boxOf(el); // before freezing
  const base = frozenBase(el, kindOf(el) === 'text');
  place(el, base, b.x + dx, b.y + dy);
  v.refresh();
  clearTimeout(nudgeTimer);
  pendingNudge = () => { v.syncStyle(id, GEOMETRY_PROPS); v.commit('Nudge'); };
  nudgeTimer = setTimeout(flushNudge, 400);
}

/** Sets position and/or size from the inspector's number boxes (page px). */
export function setGeometry(v: VisualEditor, g: Partial<{ x: number; y: number; w: number; h: number }>) {
  const id = v.selected, el = v.live(id);
  if (id === null || !el) return;
  const textual = kindOf(el) === 'text';
  const b = boxOf(el); // before freezing
  const base = frozenBase(el, textual);
  const w = g.w ?? b.w;
  if (g.w !== undefined || g.h !== undefined) setSize(el, w, g.h !== undefined ? g.h : textual ? null : b.h);
  place(el, base, g.x ?? b.x, g.y ?? b.y);
  v.syncStyle(id, GEOMETRY_PROPS);
  v.commit('Position and size');
}

export function align(v: VisualEditor, mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  const el = v.live(v.selected);
  if (!el) return;
  const b = boxOf(el);
  const p = v.pageDims();
  if (mode === 'left') setGeometry(v, { x: 0 });
  else if (mode === 'center') setGeometry(v, { x: (p.w - b.w) / 2 });
  else if (mode === 'right') setGeometry(v, { x: p.w - b.w });
  else if (mode === 'top') setGeometry(v, { y: 0 });
  else if (mode === 'middle') setGeometry(v, { y: (p.h - b.h) / 2 });
  else setGeometry(v, { y: p.h - b.h });
}

// ---- adding / removing (structural: edit the source, then re-render) ------------

/** Adds an element to the page (on top, or at the very back for frames) and selects it. */
export function insertElement(v: VisualEditor, el: HTMLElement, label: string, atBack = false) {
  if (!v.src) return;
  if (atBack) v.srcRoot().prepend(el);
  else v.srcRoot().appendChild(el);
  v.pendingSelect = indexAll(v.src).indexOf(el);
  v.commit(label, true);
}

/** Top-left (in the root's own coordinates) that centres a w×h box on the page. */
function centred(v: VisualEditor, w: number, h: number) {
  const p = v.pageDims();
  const origin = v.root && v.root !== v.doc?.body ? boxOf(v.root) : { x: 0, y: 0 };
  return { left: Math.round((p.w - w) / 2 - origin.x), top: Math.round((p.h - h) / 2 - origin.y) };
}

export function addText(v: VisualEditor, text = 'Double-click to edit') {
  if (!v.src) return;
  const { left, top } = centred(v, 420, 48);
  const el = v.src.createElement('div');
  el.setAttribute('style', `position:absolute;left:${left}px;top:${top}px;width:420px;text-align:center;font-size:32px;line-height:1.2;color:#1f2d4d`);
  el.textContent = text;
  insertElement(v, el, 'Add text');
}

export function addShape(v: VisualEditor, shape: 'rectangle' | 'line') {
  if (!v.src) return;
  const [w, h] = shape === 'line' ? [320, 4] : [300, 160];
  const { left, top } = centred(v, w, h);
  const el = v.src.createElement('div');
  const look = shape === 'line' ? 'background:#1f2d4d' : 'background:#f3e3b0;border:2px solid #1f2d4d';
  el.setAttribute('style', `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;${look}`);
  insertElement(v, el, shape === 'line' ? 'Add line' : 'Add rectangle');
}

/** Adds `files/<name>` as an image, about 240px wide, keeping its proportions. */
export function addImage(v: VisualEditor, name: string, natural: { w: number; h: number }) {
  if (!v.src) return;
  const w = Math.min(240, natural.w || 240);
  const h = Math.round(w * ((natural.h || natural.w || 1) / (natural.w || 1)));
  const { left, top } = centred(v, w, h);
  const el = v.src.createElement('img');
  el.setAttribute('src', `files/${name}`);
  el.setAttribute('alt', name.replace(/\.[^.]+$/, ''));
  el.setAttribute('style', `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;object-fit:contain`);
  insertElement(v, el, 'Add image');
}

export function remove(v: VisualEditor) {
  const t = v.twin(v.selected);
  if (!t) return;
  t.remove();
  v.selected = null;
  v.commit('Delete layer', true);
}

export function duplicate(v: VisualEditor) {
  const t = v.twin(v.selected);
  if (!t || !v.src) return;
  const copy = t.cloneNode(true) as HTMLElement;
  const left = parseFloat(copy.style.left), top = parseFloat(copy.style.top);
  if (!Number.isNaN(left) && !Number.isNaN(top)) { copy.style.left = `${left + 20}px`; copy.style.top = `${top + 20}px`; }
  t.after(copy);
  v.pendingSelect = indexAll(v.src).indexOf(copy);
  v.commit('Duplicate layer', true);
}

export function reorder(v: VisualEditor, where: 'front' | 'forward' | 'backward' | 'back') {
  const t = v.twin(v.selected);
  if (!t || !v.src) return;
  const parent = t.parentElement;
  if (!parent) return;
  if (where === 'front') parent.append(t);
  else if (where === 'back') parent.prepend(t);
  else if (where === 'forward') t.nextElementSibling?.after(t);
  else t.previousElementSibling?.before(t);
  v.pendingSelect = indexAll(v.src).indexOf(t);
  v.commit('Change stacking order', true);
}

// ---- fonts and fields ---------------------------------------------------------------

const SCRIPTS = ['Great Vibes', 'Dancing Script', 'Pinyon Script', 'Alex Brush'];
const SANS = ['Montserrat', 'Poppins', 'Raleway', 'Roboto', 'Oswald', 'Arial', 'Helvetica', 'Verdana', 'Trebuchet MS'];

export function setFont(v: VisualEditor, family: string) {
  const generic = SCRIPTS.includes(family) ? 'cursive' : SANS.includes(family) ? 'sans-serif' : 'serif';
  if (isGoogleFont(family) || GOOGLE_FONTS.includes(family)) {
    if (v.doc) ensureFontLink(v.doc, family);
    if (v.src) ensureFontLink(v.src, family);
  }
  v.setTextStyle('font-family', `'${family}', ${generic}`, 'Change font');
}

/** Puts `{token}` into the text being edited, else at the end of the selected text, else in a new text layer. */
export function insertField(v: VisualEditor, token: string) {
  const text = `{${token}}`;
  if (v.editing && v.doc) { v.doc.execCommand('insertText', false, text); return; }
  const t = v.twin(v.selected);
  if (t && v.kind === 'text') { t.append(t.childNodes.length ? ` ${text}` : text); v.commit('Insert field', true); return; }
  addText(v, text);
}
