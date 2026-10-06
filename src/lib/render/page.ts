// Page size of a design. Stored in the HTML as <meta name="certflow:page" content="1123x794">.
export interface PageSize { width: number; height: number }

/** Landscape sizes in CSS px (96 dpi). Portrait swaps width and height. */
export const PAGE_PRESETS = [
  { id: 'a4', label: 'A4', width: 1123, height: 794 },
  { id: 'letter', label: 'Letter', width: 1056, height: 816 },
] as const;

export const DEFAULT_PAGE: PageSize = { width: 1123, height: 794 };

const META = /<meta\s+name=["']certflow:page["'][^>]*>/i;

export function readPageSize(html: string): PageSize {
  const meta = html.match(META)?.[0].match(/content=["'](\d+)\s*x\s*(\d+)["']/i);
  if (meta) return { width: +meta[1], height: +meta[2] };
  return detectFromCss(html) ?? DEFAULT_PAGE;
}

/** HTML without the meta tag (e.g. an imported file): the first CSS rule with a big width AND height. */
function detectFromCss(html: string): PageSize | null {
  for (const style of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const rule of style[1].matchAll(/\{([^{}]*)\}/g)) {
      const w = rule[1].match(/(?<![-\w])width\s*:\s*(\d+)px/i);
      const h = rule[1].match(/(?<![-\w])height\s*:\s*(\d+)px/i);
      if (w && h && +w[1] >= 500 && +h[1] >= 400 && +w[1] <= 4000 && +h[1] <= 4000) return { width: +w[1], height: +h[1] };
    }
  }
  return null;
}

/** Sets the page size, keeping the rest of the HTML text untouched. */
export function writePageSize(html: string, size: PageSize): string {
  const tag = `<meta name="certflow:page" content="${size.width}x${size.height}">`;
  if (META.test(html)) return html.replace(META, tag);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}\n  ${tag}`);
  return `${tag}\n${html}`;
}

export function describePage(size: PageSize): { preset: string; portrait: boolean } {
  const portrait = size.height > size.width;
  const [w, h] = portrait ? [size.height, size.width] : [size.width, size.height];
  const hit = PAGE_PRESETS.find((p) => p.width === w && p.height === h);
  return { preset: hit?.id ?? 'custom', portrait };
}

export function presetSize(id: string, portrait: boolean): PageSize | null {
  const p = PAGE_PRESETS.find((x) => x.id === id);
  if (!p) return null;
  return portrait ? { width: p.height, height: p.width } : { width: p.width, height: p.height };
}
