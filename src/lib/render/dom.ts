// Shared by the preview compiler and the visual editor: both must number elements identically.

/** Every element inside <body>, in document order. The index is the element's `data-cf` id. */
export function indexAll(doc: Document): HTMLElement[] {
  return Array.from(doc.body.querySelectorAll<HTMLElement>('*'));
}

/** HTML text of a parsed document (keeps the doctype only if the file had one). */
export function serializeDoc(doc: Document): string {
  return (doc.doctype ? '<!DOCTYPE html>\n' : '') + doc.documentElement.outerHTML + '\n';
}

/** Elements that are never shown on the page. */
export const NON_VISUAL = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'TEMPLATE', 'NOSCRIPT', 'BASE']);
