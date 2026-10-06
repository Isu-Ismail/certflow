// One design, loaded ONCE into a hidden frame. For every student only the text of the {fields} is swapped, then the
// page is turned into a PDF page. Nothing is re-parsed or re-downloaded between certificates.
import { bakeScripts } from '$lib/render/bake';
import { compileDesign } from '$lib/render/compile';
import type { PageSize } from '$lib/render/page';
import { isTokenName, resolveColumn, TOKEN_SOURCE } from '$lib/workspace/tokens';
import type { Row, WorkFile } from '$lib/workspace/types';

const TEXT_ATTRS = ['alt', 'title', 'aria-label'];

interface TextRecord { node: Text; template: string }
interface AttrRecord { el: Element; attr: string; template: string }

/** One line of text on the page. x = left edge, y = baseline, in css px from the page's top left. */
export interface TextRun { text: string; x: number; y: number; width: number; size: number; bold: boolean }

export interface SurfaceOptions {
  html: string;
  files: WorkFile[];
  size: PageSize;
  allowScripts: boolean;
}

export class DesignSurface {
  readonly size: PageSize;
  #frame: HTMLIFrameElement;
  #doc: Document;
  #texts: TextRecord[] = [];
  #attrs: AttrRecord[] = [];

  private constructor(frame: HTMLIFrameElement, size: PageSize) {
    this.#frame = frame;
    this.#doc = frame.contentDocument!;
    this.size = size;
  }

  static async create(o: SurfaceOptions): Promise<DesignSurface> {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin'); // scripts of a trusted design are run first in an isolated frame (bake)
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    Object.assign(frame.style, {
      position: 'fixed', left: '-20000px', top: '0', width: `${o.size.width}px`, height: `${o.size.height}px`,
      border: '0', opacity: '0', pointerEvents: 'none',
    });
    // fields stay as written ({Name}): they are filled per student by setRow
    const compiled = compileDesign(o.html, { row: null, columns: [], fieldMap: {}, files: o.files, size: o.size, allowScripts: o.allowScripts });
    frame.srcdoc = o.allowScripts ? await bakeScripts(compiled) : compiled;
    const loaded = new Promise<void>((resolve) => { frame.onload = () => resolve(); });
    document.body.appendChild(frame);
    await loaded;
    const surface = new DesignSurface(frame, o.size);
    await surface.#settle();
    surface.#record();
    return surface;
  }

  /** Waits for fonts and images, so the first page is not drawn half loaded. */
  async #settle() {
    const doc = this.#doc;
    try { await doc.fonts?.ready; } catch { /* old browser */ }
    const images = [...doc.images];
    const wait = Promise.all([
      ...images.map((img) => (img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = img.onerror = () => r(); }))),
      ...images.map((img) => img.decode?.().catch(() => {})),
    ]);
    // an image that never answers must not freeze the whole run
    await Promise.race([wait, new Promise<void>((r) => setTimeout(r, 10_000))]);
  }

  #record() {
    const walker = this.#doc.createTreeWalker(this.#doc.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const tag = (n as Text).parentElement?.tagName;
      if (tag === 'STYLE' || tag === 'SCRIPT') continue;
      if ((n as Text).data.includes('{')) this.#texts.push({ node: n as Text, template: (n as Text).data });
    }
    for (const el of this.#doc.body.querySelectorAll('*')) {
      for (const attr of TEXT_ATTRS) {
        const v = el.getAttribute(attr);
        if (v?.includes('{')) this.#attrs.push({ el, attr, template: v });
      }
    }
  }

  /** Puts one student's values into the fields. */
  setRow(row: Row, columns: string[], fieldMap: Record<string, string>) {
    const fill = (text: string) =>
      text.replace(new RegExp(TOKEN_SOURCE, 'g'), (raw, name: string) => {
        if (!isTokenName(name.trim())) return raw;
        const col = resolveColumn(name.trim(), columns, fieldMap);
        return col ? (row[col] ?? '') : raw;
      });
    for (const r of this.#texts) r.node.data = fill(r.template);
    for (const r of this.#attrs) r.el.setAttribute(r.attr, fill(r.template));
  }

  /**
   * The page as a JPEG (scale 2 = 192 dpi on a 96 dpi page). The browser itself draws the page (as an SVG picture), so
   * everything it understands comes out: gradient text (background-clip: text), masks, filters, shadows. The older
   * html2canvas redraws the page by hand and is only the fallback: it paints gradient text as solid blocks.
   */
  async toJpeg(scale = 2, quality = 0.92, renderer: 'browser' | 'html2canvas' = 'browser'): Promise<Uint8Array> {
    try { await this.#doc.fonts?.ready; } catch { /* old browser */ }
    const viaHtml2canvas = async () => {
      const { default: html2canvas } = await import('html2canvas');
      return html2canvas(this.#doc.documentElement, {
        scale, width: this.size.width, height: this.size.height, windowWidth: this.size.width, windowHeight: this.size.height,
        backgroundColor: '#ffffff', logging: false, useCORS: true, imageTimeout: 8000,
      });
    };
    let canvas: HTMLCanvasElement;
    if (renderer === 'html2canvas') canvas = await viaHtml2canvas();
    else {
      const undo = this.#widenClippedText();
      try {
        const { domToCanvas } = await import('modern-screenshot');
        canvas = await domToCanvas(this.#doc.documentElement, {
          scale, width: this.size.width, height: this.size.height, backgroundColor: '#ffffff', timeout: 15000,
        });
      } catch {
        canvas = await viaHtml2canvas(); // the browser's own drawing failed for this page
      } finally {
        undo();
      }
    }
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not draw the page'))), 'image/jpeg', quality));
    canvas.width = canvas.height = 0; // free the memory at once
    return new Uint8Array(await blob.arrayBuffer());
  }

  /**
   * Gradient text (background-clip: text) is only painted inside its own box. When the page is drawn again as a picture,
   * a line can come out a hair wider than its box (letter-spacing, font rounding) and the last letter is cut off. So
   * each such box is made a little wider on the right, and pulled back by the same amount so nothing moves. The change
   * is undone right after the picture is taken.
   */
  #widenClippedText(): () => void {
    const win = this.#doc.defaultView!;
    const saved: [HTMLElement, string, string][] = [];
    for (const el of this.#doc.body.querySelectorAll<HTMLElement>('*')) {
      const cs = win.getComputedStyle(el);
      if ((cs.getPropertyValue('-webkit-background-clip') || cs.backgroundClip) !== 'text') continue;
      const extra = Math.max(6, (parseFloat(cs.fontSize) || 16) * 0.4);
      saved.push([el, el.style.paddingRight, el.style.marginRight]);
      el.style.paddingRight = `${(parseFloat(cs.paddingRight) || 0) + extra}px`;
      el.style.marginRight = `${(parseFloat(cs.marginRight) || 0) - extra}px`;
    }
    return () => { for (const [el, pad, margin] of saved) { el.style.paddingRight = pad; el.style.marginRight = margin; } };
  }

  /**
   * The visible text of the page, line by line, with where each line is (css px, page coordinates). Used to put the text
   * into the PDF (invisible, over the picture) so it can be selected, searched and copied.
   */
  textRuns(): TextRun[] {
    const doc = this.#doc;
    const win = doc.defaultView!;
    const { width: W, height: H } = this.size;
    const out: TextRun[] = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const range = doc.createRange();
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!node.data.trim()) continue;
      const el = node.parentElement;
      if (!el || el.closest('svg,script,style,noscript,[aria-hidden="true"]')) continue;
      const cs = win.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const size = parseFloat(cs.fontSize) || 16;
      const bold = Number.parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === 'bold';
      const transform = (t: string) => (cs.textTransform === 'uppercase' ? t.toUpperCase() : cs.textTransform === 'lowercase' ? t.toLowerCase() : cs.textTransform === 'capitalize' ? t.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : t);

      let line: { text: string; left: number; right: number; top: number; bottom: number } | null = null;
      const flush = () => {
        if (!line) return;
        const text = transform(line.text.replace(/\s+/g, ' ').trim());
        if (text && line.right > 0 && line.left < W && line.bottom > 0 && line.top < H) {
          out.push({ text, x: line.left, y: line.top + (line.bottom - line.top) * 0.8, width: line.right - line.left, size, bold });
        }
        line = null;
      };
      for (let i = 0; i < node.data.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getClientRects()[0];
        if (!r || (r.width === 0 && r.height === 0)) continue; // collapsed white space
        if (line && Math.abs(r.top - line.top) > r.height * 0.5) flush(); // the next line of a wrapped paragraph
        if (!line) line = { text: '', left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        line.text += node.data[i];
        line.left = Math.min(line.left, r.left);
        line.right = Math.max(line.right, r.right);
      }
      flush();
    }
    return out;
  }

  destroy() {
    this.#frame.remove();
  }
}

