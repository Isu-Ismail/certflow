// A design's own <script> never runs inside the app's origin. It runs once in a throw-away frame with an OPAQUE origin
// (sandbox="allow-scripts" without allow-same-origin: no access to IndexedDB, localStorage or the app). The finished
// page is sent back as text and shown without scripts.
const DONE = 'certflow:baked';

/** Runs the scripts of a compiled design in an isolated frame and returns the resulting static HTML. */
export function bakeScripts(compiled: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    const token = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    Object.assign(frame.style, { position: 'fixed', left: '-20000px', top: '0', width: '1px', height: '1px', border: '0', opacity: '0', pointerEvents: 'none' });

    let finished = false;
    const finish = (html: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      frame.remove();
      resolve(html);
    };
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; token?: string; html?: string } | null;
      if (e.source !== frame.contentWindow || d?.type !== DONE || d.token !== token || typeof d.html !== 'string') return;
      finish(stripScripts('<!DOCTYPE html>' + d.html));
    };
    // on timeout the page is shown as it is, without scripts (what an untrusted design looks like)
    const timer = setTimeout(() => finish(stripScripts(compiled)), timeoutMs);
    window.addEventListener('message', onMessage);

    // setTimeout, not requestAnimationFrame: an off-screen cross-origin frame is not given animation frames
    const reporter =
      `<script>addEventListener('load',function(){var p=function(){parent.postMessage({type:${JSON.stringify(DONE)},token:${JSON.stringify(token)},html:document.documentElement.outerHTML},'*')};` +
      `(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(p,80)})});<\/script>`;
    frame.srcdoc = compiled.replace(/<\/body>\s*<\/html>\s*$/i, reporter + '</body></html>');
    document.body.appendChild(frame);
  });
}

function stripScripts(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

/** Short stable hash (cyrb53) of the design's scripts: trust follows the script text, not the design's name. */
export function scriptsFingerprint(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = [...doc.querySelectorAll('script')].map((s) => `${s.getAttribute('src') ?? ''}\n${s.textContent ?? ''}`).join('\u0000');
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `s:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}:${text.length}`;
}
