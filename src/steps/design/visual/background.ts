// The page background: a colour and/or an image from files/ (PNG, JPG, SVG…), set on the page root.
import { rgbToHex } from './geometry';
import type { VisualEditor } from './visual.svelte';

export type Fit = 'cover' | 'contain' | 'stretch';
export interface PageBackground { color: string; image: string | null; fit: Fit }

const SIZE: Record<Fit, string> = { cover: 'cover', contain: 'contain', stretch: '100% 100%' };
const IMAGE_PROPS = ['background-image', 'background-size', 'background-position', 'background-repeat'];

export function readBackground(v: VisualEditor): PageBackground {
  void v.rev;
  const twin = v.src ? v.srcRoot() : null;
  const live = v.root;
  const view = v.doc?.defaultView;
  const color = live && view ? rgbToHex(view.getComputedStyle(live).backgroundColor) : 'transparent';
  const image = twin?.style.backgroundImage.match(/files\/([^"')]+)/)?.[1] ?? null;
  const size = twin?.style.backgroundSize ?? '';
  return { color, image: image ? decodeURIComponent(image) : null, fit: size === 'contain' ? 'contain' : size.startsWith('100%') ? 'stretch' : 'cover' };
}

/** Flat colour. Also clears a gradient/image from the design's own CSS so the colour is actually visible. */
export function setBackgroundColor(v: VisualEditor, hex: string) {
  const live = v.root, twin = v.src ? v.srcRoot() : null;
  if (!live || !twin) return;
  for (const el of [live, twin]) {
    el.style.setProperty('background-color', hex);
    if (!twin.style.backgroundImage.includes('files/')) el.style.setProperty('background-image', 'none');
  }
  v.commit('Page background colour');
}

/** Image from files/ as the page background (null removes it). Re-renders, so the new image shows. */
export function setBackgroundImage(v: VisualEditor, name: string | null, fit: Fit = 'cover') {
  const twin = v.src ? v.srcRoot() : null;
  if (!twin) return;
  if (name) {
    twin.style.setProperty('background-image', `url("files/${name}")`);
    twin.style.setProperty('background-size', SIZE[fit]);
    twin.style.setProperty('background-position', 'center');
    twin.style.setProperty('background-repeat', 'no-repeat');
  } else {
    IMAGE_PROPS.forEach((p) => twin.style.removeProperty(p));
    if (!twin.getAttribute('style')) twin.removeAttribute('style');
  }
  v.commit(name ? 'Page background image' : 'Remove page background image', true);
}

export function setBackgroundFit(v: VisualEditor, fit: Fit) {
  const twin = v.src ? v.srcRoot() : null;
  if (!twin) return;
  twin.style.setProperty('background-size', SIZE[fit]);
  v.commit('Background fit', true);
}
