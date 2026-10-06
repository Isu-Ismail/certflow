# Export (PNG / PDF / print)

## Where

- `src/lib/utils/exporter.ts`
- `src/lib/components/output/GenerationView.svelte` (buttons, progress overlay, print area)

## How capture works

Every export rasterises DOM with `html2canvas`:

1. Find the certificate container `#cert_card_<id>` rendered by `CertificateRenderer`.
2. If it contains an `<iframe>` (custom HTML template), capture `iframe.contentDocument.body`
   instead, at a fixed 1056×747. This requires same-origin iframe access (srcdoc works).
3. `prepareDocumentFonts()` injects the Google Fonts `<link>` (Cinzel, Great Vibes, Plus Jakarta
   Sans) and awaits `document.fonts.ready`, then a short `setTimeout` settle delay.
4. `onclone: sanitizeModernColors` — in the cloned DOM, removes `scale(...)` transforms and
   rewrites `oklch/oklab/lab/lch/hwb` colours to `rgb()` using a 2D-canvas colour parser.
   **Required**: html2canvas 1.4.1 throws on modern colour functions, which Tailwind 4 emits.

## Outputs

| Function | Scale | Format | Notes |
|---|---|---|---|
| `exportElementToPng` | 3 | PNG | Single download via `<a download>` |
| `exportElementsToPdf` | 2 | JPEG 0.90 in jsPDF | A4 landscape, one page per cert, image stretched to full page |
| `generatePrintCanvasImages` | 2 | JPEG data URLs | Used by "Print all": images go into `#certflow_native_print_area`, then `window.print()`; `@media print` CSS in GenerationView hides the app |
| `printCertificates` | 3 | PNG in popup | Older popup-based print path; currently not wired to UI |

## Gotchas

- Only certificates currently rendered in the DOM can be exported — exports use
  `filteredCertificates`, so the search/template filter controls what goes into "export all".
- Bulk PDF of many certificates is memory-heavy (each page is a 2× canvas); slow for 100+ rows.
- Template dimensions other than 1056×747 aren't respected for iframe templates, and PDF always
  stretches to A4 landscape.
- `useCORS` + `allowTaint` are on; remote images without CORS headers can taint/blank the canvas.
  Prefer uploaded assets (data URLs).
- Filenames use `student.Name`; datasets without a `Name` column get `certificate.png/.pdf`.
