// Geometry helpers for the visual editor. They run against elements of the live preview iframe.
// NOTE: never use `instanceof HTMLElement` here — the iframe is another realm, so it is always false.
import { NON_VISUAL } from '$lib/render/dom';

export interface Box { x: number; y: number; w: number; h: number }
export type Kind = 'text' | 'image' | 'shape' | 'group';

const INLINE = new Set(['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'A', 'SMALL', 'SUB', 'SUP', 'MARK', 'CODE', 'WBR']);

export function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

const isElement = (n: Node): n is HTMLElement => n.nodeType === 1;

/** The element that holds the certificate's layers: the single big wrapper in <body>, else <body>. */
export function pageRoot(doc: Document, page: { width: number; height: number }): HTMLElement {
  const kids = Array.from(doc.body.children).filter((c) => !NON_VISUAL.has(c.tagName)) as HTMLElement[];
  if (kids.length === 1) {
    const r = kids[0].getBoundingClientRect();
    if (r.width >= page.width * 0.8 && r.height >= page.height * 0.8) return kids[0];
  }
  return doc.body;
}

/** Direct, visible children of the root, in document order. */
export function layerChildren(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter((c) => isElement(c) && !NON_VISUAL.has(c.tagName)) as HTMLElement[];
}

/** The root's child that contains `el` (or is `el`). */
export function layerOf(el: Element | null, root: HTMLElement): HTMLElement | null {
  let cur: Element | null = el;
  while (cur && cur.parentElement !== root) cur = cur.parentElement;
  return cur && cur !== root ? (cur as HTMLElement) : null;
}

export function kindOf(el: HTMLElement): Kind {
  if (el.tagName === 'IMG') return 'image';
  const text = (el.textContent ?? '').trim();
  if (!text) return el.querySelector('img') ? 'image' : 'shape';
  return Array.from(el.children).every((c) => INLINE.has(c.tagName)) ? 'text' : 'group';
}

/** A short name for the layers list. */
export function labelOf(el: HTMLElement, kind: Kind): string {
  if (kind === 'image') return (el.tagName === 'IMG' ? el : el.querySelector('img'))?.getAttribute('alt') || 'Image';
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 28 ? `${text.slice(0, 28)}…` : text;
  return el.className ? `.${String(el.className).split(/\s+/)[0]}` : kind === 'shape' ? 'Shape' : el.tagName.toLowerCase();
}

const isPx = (v: string) => /^-?[\d.]+px$/.test(v);
const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Makes `el` absolutely positioned with explicit left/top/width (height too for non-text) and returns the
 * page position it has at left:0, top:0. After this, `place()` can put it anywhere with plain arithmetic.
 * Works whatever margins, transforms, flex or flow the element had, because it measures instead of guessing.
 */
export function frozenBase(el: HTMLElement, textual: boolean): { bx: number; by: number } {
  const s = el.style;
  if (s.position === 'absolute' && s.right === 'auto' && isPx(s.left) && isPx(s.top) && isPx(s.width)) {
    const r = boxOf(el);
    return { bx: r.x - parseFloat(s.left), by: r.y - parseFloat(s.top) };
  }
  const r = boxOf(el);
  s.position = 'absolute';
  s.right = 'auto';
  s.bottom = 'auto';
  s.margin = '0'; // margins (e.g. a centering margin-left) would otherwise leave odd numbers in left/top
  s.left = '0px';
  s.top = '0px';
  setSize(el, r.w, textual ? null : r.h);
  const z = boxOf(el);
  return { bx: z.x, by: z.y };
}

/** Sets border-box width (and height when given), correcting for padding/border. */
export function setSize(el: HTMLElement, w: number, h: number | null) {
  el.style.width = `${round(w)}px`;
  const dw = boxOf(el).w - w;
  if (Math.abs(dw) > 0.5) el.style.width = `${round(w - dw)}px`;
  if (h !== null) {
    el.style.height = `${round(h)}px`;
    const dh = boxOf(el).h - h;
    if (Math.abs(dh) > 0.5) el.style.height = `${round(h - dh)}px`;
  }
}

/** Puts a frozen element so its box starts at page position (x, y). */
export function place(el: HTMLElement, base: { bx: number; by: number }, x: number, y: number) {
  el.style.left = `${round(x - base.bx)}px`;
  el.style.top = `${round(y - base.by)}px`;
}

export const GEOMETRY_PROPS = ['position', 'left', 'top', 'right', 'bottom', 'margin', 'width', 'height'];

export function rgbToHex(css: string): string {
  const m = css.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if (!m) return css.startsWith('#') ? css : 'transparent';
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return 'transparent';
  return '#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
}
