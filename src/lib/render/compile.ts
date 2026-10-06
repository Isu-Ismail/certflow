import { isTokenName, resolveColumn, TOKEN_SOURCE } from '$lib/workspace/tokens';
import type { Row, WorkFile } from '$lib/workspace/types';
import { assetUrls } from './assets';
import { indexAll } from './dom';
import type { PageSize } from './page';

export interface CompileOptions {
  row: Row | null;
  columns: string[];
  fieldMap: Record<string, string>;
  files: WorkFile[];
  size: PageSize;
  /** Show `{tokens}` as highlighted chips instead of the row's values. */
  showFields?: boolean;
  /** Keep the design's own <script>s (only for designs the user trusts). Default: scripts are removed. */
  allowScripts?: boolean;
  /** Preview for the visual editor: every body element gets a `data-cf` id (its index in the source HTML). */
  editable?: boolean;
  accent?: string;
  onAccent?: string;
}

// `files/x.png`, `./files/x.png`, and (lenient) a bare `./x.png` / `x.png` when files/ has a file of that name
const ASSET_URL = /^(?:\.\/)?(?:files\/)?([^/:?#]+)$/;
const CSS_ASSET_URL = /url\(\s*(['"]?)(?:\.\/)?(?:files\/)?([^'")/:]+)\1\s*\)/g;
const URL_ATTRS = ['src', 'href', 'poster'];
const TEXT_ATTRS = ['alt', 'title', 'aria-label'];

const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };

/** Final document for the preview iframe / export: fields filled, files/ paths -> blob URLs, page size set. */
export function compileDesign(html: string, o: CompileOptions): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const urls = assetUrls(o.files);

  // number the elements BEFORE scripts are removed / fields are expanded, so ids match the source HTML
  if (o.editable) indexAll(doc).forEach((el, i) => el.setAttribute('data-cf', String(i)));

  if (!o.allowScripts) doc.querySelectorAll('script').forEach((s) => s.remove());
  rewriteAssets(doc, urls);
  fillFields(doc, o);

  const style = doc.createElement('style');
  style.setAttribute('data-certflow', '');
  style.textContent =
    `html,body{margin:0;padding:0;width:${o.size.width}px;height:${o.size.height}px;overflow:hidden}` +
    `.cf-token{background:${o.accent ?? '#ff7a59'};color:${o.onAccent ?? '#121212'};border-radius:4px;padding:0 .25em;font:500 min(.62em,26px)/1.4 ui-monospace,Consolas,monospace;letter-spacing:0}`;
  doc.head.appendChild(style);

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

function rewriteAssets(doc: Document, urls: Map<string, string>) {
  const mapCss = (css: string) => css.replace(CSS_ASSET_URL, (m, q, name) => (urls.has(decode(name)) ? `url(${q}${urls.get(decode(name))}${q})` : m));

  for (const el of doc.querySelectorAll('*')) {
    for (const attr of URL_ATTRS) {
      const m = el.getAttribute(attr)?.match(ASSET_URL);
      const url = m && urls.get(decode(m[1]));
      if (url) el.setAttribute(attr, url);
    }
    const inline = el.getAttribute('style');
    if (inline?.includes('url(')) el.setAttribute('style', mapCss(inline));
  }
  for (const s of doc.querySelectorAll('style')) if (s.textContent?.includes('url(')) s.textContent = mapCss(s.textContent);
}

function fillFields(doc: Document, o: CompileOptions) {
  const value = (name: string): string | null => {
    const col = resolveColumn(name.trim(), o.columns, o.fieldMap);
    return col && o.row ? (o.row[col] ?? '') : null; // null = leave the {token} as written
  };
  const replace = (text: string) =>
    text.replace(new RegExp(TOKEN_SOURCE, 'g'), (raw, name: string) => (isTokenName(name.trim()) ? (value(name) ?? raw) : raw));

  // Text nodes (never <style>/<script>, so CSS braces are safe)
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  for (const node of nodes) {
    const tag = node.parentElement?.tagName;
    if (tag === 'STYLE' || tag === 'SCRIPT') continue;
    const text = node.data;
    if (!text.includes('{')) continue;
    if (o.showFields) node.replaceWith(chips(doc, text));
    else node.data = replace(text);
  }
  if (!o.showFields) {
    for (const el of doc.body.querySelectorAll('*')) {
      for (const attr of TEXT_ATTRS) {
        const v = el.getAttribute(attr);
        if (v?.includes('{')) el.setAttribute(attr, replace(v));
      }
    }
  }
}

function chips(doc: Document, text: string): DocumentFragment {
  const frag = doc.createDocumentFragment();
  let last = 0;
  for (const m of text.matchAll(new RegExp(TOKEN_SOURCE, 'g'))) {
    if (!isTokenName(m[1].trim())) continue;
    frag.append(text.slice(last, m.index));
    const span = doc.createElement('span');
    span.className = 'cf-token';
    span.textContent = m[0];
    frag.append(span);
    last = m.index! + m[0].length;
  }
  frag.append(text.slice(last));
  return frag;
}
