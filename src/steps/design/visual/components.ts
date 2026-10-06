// Premade certificate parts for the Add menu: frame, header, title, recipient, text, signature, seal.
// Each is plain HTML with inline styles, so after adding it everything stays editable like any other layer.
import { boxOf } from './geometry';
import { insertElement } from './ops';
import type { VisualEditor } from './visual.svelte';

const INK = '#1f2d4d';
const GOLD = '#b08d3c';
const MUTED = '#5b6478';

interface Ctx { doc: Document; w: number; h: number; ox: number; oy: number }

function ctx(v: VisualEditor): Ctx | null {
  if (!v.src) return null;
  const p = v.pageDims();
  const origin = v.root && v.root !== v.doc?.body ? boxOf(v.root) : { x: 0, y: 0 };
  return { doc: v.src, w: p.w, h: p.h, ox: origin.x, oy: origin.y };
}

// page coordinates -> the root's own coordinates (the root may not sit at 0,0)
const X = (c: Ctx, x: number) => Math.round(x - c.ox);
const Y = (c: Ctx, y: number) => Math.round(y - c.oy);

function make(c: Ctx, tag: string, style: string, text?: string, cls?: string): HTMLElement {
  const el = c.doc.createElement(tag);
  el.setAttribute('style', style);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** A page-wide border, behind everything and click-through (select it from the Layers list). */
export function addFrame(v: VisualEditor, look: 'classic' | 'thin' | 'gold') {
  const c = ctx(v);
  if (!c) return;
  const border = {
    classic: `border:3px double ${INK}`,
    thin: `border:1px solid ${INK}`,
    gold: `border:5px solid ${GOLD};box-shadow:inset 0 0 0 6px #fffdf7,inset 0 0 0 8px ${GOLD}`,
  }[look];
  const el = make(c, 'div', `position:absolute;left:${X(c, 24)}px;top:${Y(c, 24)}px;width:${c.w - 48}px;height:${c.h - 48}px;box-sizing:border-box;pointer-events:none;${border}`, undefined, 'cf-frame');
  insertElement(v, el, 'Add frame', true);
}

/** Institution header: optional logos left/right (your first two image files) around three lines of text. */
export function addHeader(v: VisualEditor, logos: string[]) {
  const c = ctx(v);
  if (!c) return;
  const header = make(c, 'div', `position:absolute;left:${X(c, 0)}px;top:${Y(c, 40)}px;width:${c.w}px;box-sizing:border-box;padding:0 72px;display:flex;align-items:center;justify-content:space-between;gap:24px;color:${INK}`, undefined, 'cf-header');
  const slot = (file?: string) => {
    if (!file) return make(c, 'span', 'display:block;width:86px;height:86px;flex:none');
    const img = c.doc.createElement('img');
    img.setAttribute('src', `files/${file}`);
    img.setAttribute('alt', file.replace(/\.[^.]+$/, ''));
    img.setAttribute('style', 'display:block;width:86px;height:86px;object-fit:contain;flex:none');
    return img;
  };
  const text = make(c, 'div', 'flex:1;text-align:center');
  text.append(
    make(c, 'div', 'font-size:28px;font-weight:700;letter-spacing:4px;text-transform:uppercase;line-height:1.2', 'University name'),
    make(c, 'div', 'margin-top:6px;font-size:15px;font-weight:600;letter-spacing:3px;text-transform:uppercase', 'Institute or faculty'),
    make(c, 'div', `margin-top:4px;font-size:16px;font-style:italic;color:${MUTED}`, 'Department name'),
  );
  header.append(slot(logos[0]), text, slot(logos[1]));
  insertElement(v, header, 'Add header');
}

function centredLine(v: VisualEditor, label: string, top: number, style: string, text: string, cls: string, widthRatio = 0.72) {
  const c = ctx(v);
  if (!c) return;
  const w = Math.round(c.w * widthRatio);
  const el = make(c, 'div', `position:absolute;left:${X(c, (c.w - w) / 2)}px;top:${Y(c, c.h * top)}px;width:${w}px;text-align:center;color:${INK};${style}`, text, cls);
  insertElement(v, el, label);
}

export const addTitle = (v: VisualEditor) =>
  centredLine(v, 'Add title', 0.22, 'font-size:44px;letter-spacing:4px;text-transform:uppercase;line-height:1.15', 'Certificate of Achievement', 'cf-title');

export const addSubtitle = (v: VisualEditor) =>
  centredLine(v, 'Add subtitle', 0.36, `font-size:20px;font-style:italic;color:${MUTED}`, 'This certificate is proudly presented to', 'cf-subtitle');

/** The recipient: a {field}, so every certificate shows its own name. */
export const addRecipient = (v: VisualEditor, column: string) =>
  centredLine(v, 'Add recipient name', 0.44, 'font-size:64px;line-height:1.2', `{${column}}`, 'cf-recipient');

export const addBodyText = (v: VisualEditor) =>
  centredLine(v, 'Add body text', 0.62, '', 'in recognition of outstanding effort and dedication.', 'cf-body', 0.68);

/** A signature line with name and role. The 1st goes bottom-left, the 2nd bottom-right, then the middle. */
export function addSignature(v: VisualEditor) {
  const c = ctx(v);
  if (!c || !v.src) return;
  const taken = v.srcRoot().querySelectorAll('.cf-signature').length;
  const width = 240;
  const x = [c.w * 0.12, c.w * 0.88 - width, (c.w - width) / 2][taken % 3];
  const box = make(c, 'div', `position:absolute;left:${X(c, x)}px;top:${Y(c, c.h * 0.8)}px;width:${width}px;text-align:center;color:${INK}`, undefined, 'cf-signature');
  box.append(
    make(c, 'div', `border-top:1px solid ${INK};padding-top:8px;font-size:16px;font-weight:600`, 'Name of signatory'),
    make(c, 'div', `font-size:14px;font-style:italic;color:${MUTED}`, 'Designation'),
  );
  insertElement(v, box, 'Add signature');
}

/** A round gold seal. */
export function addSeal(v: VisualEditor) {
  const c = ctx(v);
  if (!c) return;
  const size = 104;
  const el = make(
    c, 'div',
    `position:absolute;left:${X(c, (c.w - size) / 2)}px;top:${Y(c, c.h - size - 70)}px;width:${size}px;height:${size}px;border-radius:50%;box-sizing:border-box;` +
      `background:radial-gradient(circle at 35% 30%,#f3d98b,${GOLD} 70%);border:3px double #fffdf7;box-shadow:0 0 0 3px ${GOLD};color:#fffaf0;` +
      'display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:700;letter-spacing:2px;line-height:1.3',
    'SEAL', 'cf-seal',
  );
  insertElement(v, el, 'Add seal');
}
