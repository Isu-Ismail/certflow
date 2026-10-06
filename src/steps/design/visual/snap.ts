import type { Box } from './geometry';

export interface Guides { x: number[]; y: number[] }
export const NO_GUIDES: Guides = { x: [], y: [] };

/** Distance to the closest target for any of `points`; returns the shift to apply (or null) and the matched targets. */
function nearest(points: number[], targets: number[], threshold: number): { delta: number; at: number } | null {
  let best: { delta: number; at: number } | null = null;
  for (const t of targets) {
    for (const p of points) {
      const d = t - p;
      if (Math.abs(d) <= threshold && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, at: t };
    }
  }
  return best;
}

/**
 * Snaps a box being moved to the page centre/edges and to other layers' edges/centres.
 * `threshold` is in page px. Returns the correction to add to the box and the guide lines to draw.
 */
export function snapBox(box: Box, others: Box[], page: { w: number; h: number }, threshold: number): { dx: number; dy: number; guides: Guides } {
  const xt = [0, page.w / 2, page.w];
  const yt = [0, page.h / 2, page.h];
  for (const o of others) {
    xt.push(o.x, o.x + o.w / 2, o.x + o.w);
    yt.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const sx = nearest([box.x, box.x + box.w / 2, box.x + box.w], xt, threshold);
  const sy = nearest([box.y, box.y + box.h / 2, box.y + box.h], yt, threshold);
  return { dx: sx?.delta ?? 0, dy: sy?.delta ?? 0, guides: { x: sx ? [sx.at] : [], y: sy ? [sy.at] : [] } };
}
