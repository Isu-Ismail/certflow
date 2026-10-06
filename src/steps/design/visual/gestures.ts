import { boxOf, frozenBase, GEOMETRY_PROPS, kindOf, place, setSize, type Box } from './geometry';
import { NO_GUIDES, snapBox } from './snap';
import type { VisualEditor } from './visual.svelte';

export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export interface Gesture {
  /** dx/dy = pointer travel in page px since pointer-down. */
  update(dx: number, dy: number, keepRatio?: boolean): void;
  end(): void;
}

const SNAP_PX = 6;
const MIN_SIZE = 12;

/** Drag the selection. The element is only touched once the pointer really moves. */
export function beginMove(v: VisualEditor, id: number): Gesture | null {
  const el = v.live(id);
  if (!el) return null;
  let base: { bx: number; by: number } | null = null;
  let start: Box = { x: 0, y: 0, w: 0, h: 0 };
  let others: Box[] = [];
  return {
    update(dx, dy) {
      if (!base) {
        start = boxOf(el); // measure BEFORE freezing (freezing parks the element at 0,0)
        base = frozenBase(el, kindOf(el) === 'text');
        others = v.layerBoxes(id);
      }
      let x = start.x + dx;
      let y = start.y + dy;
      const snap = snapBox({ x, y, w: start.w, h: start.h }, others, v.pageDims(), SNAP_PX);
      x += snap.dx;
      y += snap.dy;
      place(el, base, x, y);
      v.guides = snap.guides;
      v.refresh();
    },
    end() {
      v.guides = NO_GUIDES;
      if (base) { v.syncStyle(id, GEOMETRY_PROPS); v.commit('Move'); } else v.refresh();
    },
  };
}

/** Drag a resize handle. Text only changes width (its height follows the content). Images keep their ratio from corners. */
export function beginResize(v: VisualEditor, id: number, handle: Handle): Gesture | null {
  const el = v.live(id);
  if (!el) return null;
  const kind = kindOf(el);
  const textual = kind === 'text' || kind === 'group';
  let base: { bx: number; by: number } | null = null;
  let start: Box = { x: 0, y: 0, w: 0, h: 0 };
  return {
    update(dx, dy, keepRatio = false) {
      if (!base) { start = boxOf(el); base = frozenBase(el, textual); }
      let { x, y, w, h } = start;
      if (handle.includes('e')) w = Math.max(MIN_SIZE, start.w + dx);
      if (handle.includes('w')) { w = Math.max(MIN_SIZE, start.w - dx); x = start.x + start.w - w; }
      if (!textual) {
        if (handle.includes('s')) h = Math.max(MIN_SIZE, start.h + dy);
        if (handle.includes('n')) { h = Math.max(MIN_SIZE, start.h - dy); y = start.y + start.h - h; }
        if (handle.length === 2 && (keepRatio || kind === 'image')) {
          h = Math.max(MIN_SIZE, w * (start.h / start.w));
          if (handle.includes('n')) y = start.y + start.h - h;
        }
      }
      setSize(el, w, textual ? null : h);
      place(el, base, x, y);
      v.refresh();
    },
    end() {
      if (base) { v.syncStyle(id, GEOMETRY_PROPS); v.commit('Resize'); } else v.refresh();
    },
  };
}
