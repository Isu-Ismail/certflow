# Templates & editor

## Where

- `src/lib/components/templates/TemplateEditor.svelte` — main editor (template list, canvas,
  property panel, asset explorer, inline HTML editor modal)
- `src/lib/components/templates/TemplateCard.svelte` — card in the template list
- `src/lib/components/common/CertificateRenderer.svelte` — rendering + drag/resize/inline edit
- `src/lib/utils/htmlParser.ts` — HTML → canvas elements converter
- `src/lib/utils/htmlEditorWindow.ts`, `layoutInspectorWindow.ts` — popup tools
- Types: `CertificateTemplate`, `CanvasElement` in `src/lib/types.ts`

## Two template kinds

**Canvas template** (`customHtml` empty): background colour/gradient/image, a `borderStyle`, and an
`elements[]` list. Element types in the type union: `text | image | shape | line | badge | qr`, but
the renderer only really handles `text` and `image`; others fall through to a generic branch.

- `x`, `y` = percent of width/height; element is centred on that point.
- `width`, `height`, `fontSize` = px at full 1056×747 size.
- Dragging writes rounded integer percentages (clamped 0–100).
- Images: `content` holds a path like `./logo.png` (resolved through assets) or a URL; `src` is an
  optional direct data URL.

**Custom HTML template** (`customHtml` set): rendered in a sandbox-less `<iframe srcdoc>`. The
whole HTML is interpolated and asset-resolved, then `html,body` get forced to template size.
`elements` is ignored. Ways to create/edit:

- Upload an `.html` file (creates new template, `borderStyle: 'none'`).
- Inline editor modal (`isEditingHtml`) — textarea bound to `customHtml`.
- "Open in new tab" HTML Code Studio (`htmlEditorWindow.ts`) with live preview; Save posts
  `SYNC_HTML_CODE` back to the opener. Closing the main tab breaks saving.
- Layout Inspector (`layoutInspectorWindow.ts`) — rulers/guides view and blueprint PNG download;
  read-only.

## HTML → canvas conversion

`convertHtmlToCanvasElements()` in TemplateEditor calls `parseHtmlToCanvasElements` and then
**clears `customHtml`** (one-way; no undo). The parser is heuristic:

- Collects simple `selector { prop: val }` rules from `<style>` (no nesting, media queries, or
  compound selectors).
- Images: positioned at `110 + idx*772` px horizontally (assumes two logos, left/right).
- Text: only leaf nodes among `h1–h4, p, span, div`; always centred at x=50%; y is guessed from
  hard-coded class names (`univ-title`, `dept-title`, `cert-heading`, `cert-subheading`,
  `student-name`, `student-meta`, `award-text`, `experiment-box`, `sig-title`, `sig-sub`) or
  stacked by index.
- Background image taken from a `body { background-image: url(...) }` rule.

It's tuned to the shape of `sample/certificate.html`. For other HTML expect manual cleanup.

## Fonts

Google Fonts are loaded at export time: Cinzel, Great Vibes, Plus Jakarta Sans. Templates using
other web fonts must include their own `<link>` (custom HTML) or the font won't be in exports.
