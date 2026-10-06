import type { WorkFile } from '$lib/workspace/types';

// Blob URLs for files/ assets, one per Blob (so an unchanged file keeps its URL between renders).
const urls = new WeakMap<Blob, string>();

export function blobUrl(blob: Blob): string {
  let url = urls.get(blob);
  if (!url) {
    url = URL.createObjectURL(blob);
    urls.set(blob, url);
  }
  return url;
}

/** file name under files/ -> blob URL */
export function assetUrls(files: WorkFile[]): Map<string, string> {
  return new Map(files.map((f) => [f.name, blobUrl(f.blob)]));
}

/** Names referenced as `files/<name>` (or `./files/<name>`) in a design. */
export function fileRefs(html: string): string[] {
  const found = new Set<string>();
  // `&quot;` appears when a style attribute is serialised (url(&quot;files/x.png&quot;)): it ends the name too
  for (const m of html.matchAll(/(?:^|[^\w/])(?:\.\/)?files\/((?:(?!&quot;|&#39;)[^"'()\s<>?#])+)/g)) {
    try { found.add(decodeURIComponent(m[1])); } catch { found.add(m[1]); }
  }
  return [...found];
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rewrites `files/old`, `./old` and quoted `"old"` references in a design after a file is renamed. */
export function renameFileRefs(html: string, from: string, to: string): string {
  let out = html;
  for (const variant of new Set([from, encodeURIComponent(from), encodeURI(from)])) {
    const re = new RegExp(String.raw`(?<=files/|\./|["'(])` + escapeRe(variant) + String.raw`(?=["')\s?#>&]|$)`, 'g');
    out = out.replace(re, () => (variant === from ? to : encodeURIComponent(to)));
  }
  return out;
}
