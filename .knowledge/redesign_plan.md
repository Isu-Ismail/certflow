# CertFlow Redesign Plan

_Drafted: 2026-10-05. UPDATED 2026-10-05 — see "Revised decisions" below; where this conflicts with the older sections, the revised decisions win._

## Revised decisions (latest)

- **No shadcn / no component library.** Components are hand-built as each screen needs them (Bits UI may be added later only for hard widgets like select/dialog if needed). shadcn experiment was discarded; branch `redesign` was recreated from `main`.
- **UI style: clean brutalism, professional.** Paper off-white, ink black, 2px borders, small radius, hard 3px offset shadow on buttons/cards, ONE accent (signal yellow `#ffe14d`), Space Grotesk + JetBrains Mono. Light only.
- **Four steps, in order: Data → Design → Flow → Export.** Flow = rules list (no node graph).
- **Workspace = a folder** (name = folder name), shown in a left panel that maps 1:1 to the steps:
  `data.csv|xlsx`, `<Name>.cert.html` (one per design), `flow.json` (rules, fallback, file-name pattern, field map), `files/` (uploads). Export output is generated, not stored.
- **`.cert.html` is the source of truth** for a design; the editor edits HTML directly (no Fabric.js). Persist: IndexedDB autosave + Save/Open folder (File System Access API, Chrome/Edge) with .zip fallback.
- Mock page: `workspace_example.html` (repo root, standalone, open in browser).

---

## 1. Honest assessment of the current app

**What works:** the core loop (spreadsheet → template → per-row certificate → PDF) is real and
useful; conditional templates (e.g. rank 1 gets the gold design) is a genuinely nice idea; it is
fully client-side, so student data never leaves the browser.

**Why it feels heavy:**

- 4 tabs, ~45 buttons and ~30 inputs; the Templates screen alone has 15 buttons and 22 inputs
  across three crowded panels (template library + asset explorer + tag list | toolbar + canvas |
  border settings + element inspector with a layer dropdown and position sliders).
- Two parallel template systems (canvas vs. raw HTML) with three extra tools bolted on (pop-up
  code editor, pop-up layout inspector, HTML→canvas converter). Users must understand both.
- The node-graph flow editor (xyflow) is a power-user UI for what is almost always one rule:
  "rank 1 → gold, everyone else → standard".
- Two "Generate" buttons (navbar and flow tab), and the Output tab renders every certificate as a
  live DOM node/iframe, which gets slow fast.
- Visual noise: dotted background, many colours, heavy shadows on everything, all-caps black
  labels everywhere — nothing tells the eye what the *one* next action is.
- 1.3 MB main JS bundle (xlsx, xyflow, jspdf, html2canvas all loaded up front).

## 2. Is it unique?

Not on its own. Bulk certificates from a spreadsheet is a crowded space: Canva Bulk Create,
Certifier, Sertifier, Google Slides + Autocrat, Word mail merge, and many free web generators.

It *can* be distinctive if it leans into a combination nobody offers together:

1. **Free, no account, nothing uploaded.** Student data stays on the device — a real selling point
   for colleges and departments.
2. **"Design in free Canva, bulk-generate here."** Canva's own Bulk Create is a paid (Pro/Teams/
   Education/Nonprofit) feature. Importing a free-Canva design and filling it with 200 names is a
   sharp, easy-to-explain pitch.
3. **Rules:** different designs per row (winner / runner-up / participant) in one run.
4. **Certificate-specific polish:** auto-shrink long names, missing-field and overflow checks
   before export, one file per person with smart filenames (`{Name} - {Roll Number}.pdf`).
5. **Works offline** (installable PWA) — useful in college labs with poor connectivity.

Target user: event / lab / department coordinators (colleges, hackathons, workshops) who need
50–500 certificates and do it a few times a semester.

**Positioning — "not unique, but more power":** a valid strategy as long as the power never costs
simplicity for the basic job (one design + one sheet → PDF in under 2 minutes). Power features
that competitors lack or charge for, and that fit a no-backend app:

- Rules: multiple designs in one run (winners / participants / per-track).
- Pre-export checks: missing fields, empty cells, names that had to shrink.
- Output control: one PDF, ZIP of per-person files, PNG; filename patterns; export only selected
  rows (re-issue one corrected certificate without redoing all).
- Field formatting: `{Name|upper}`, `{Name|title}`, `{Issue_Date|date:DD MMM YYYY}`, fallback
  values `{Team|"—"}`.
- QR code element bound to any field (certificate ID / verification URL).
- Reusable project files and a personal template library.
- Keyboard-first: shortcuts + `Ctrl+K` command palette.
- Offline + private by design.

Out of scope while there is no backend: emailing certificates to recipients, hosted verification
pages, Canva account login. (Later option: a small serverless function.)

## 3. UI style — DECIDED: calm, professional, shadcn-style

_Decided 2026-10-05: neo-brutalism is dropped entirely._ In a design editor the chrome must step
back so the user's certificate is the loudest thing on screen. The new look is a quiet,
professional tool UI in the style of shadcn/ui (Linear, Vercel, Figma's UI chrome).

**Component library: [shadcn-svelte](https://shadcn-svelte.com)** (Svelte 5 + Tailwind v4,
built on Bits UI). Components are copied into `src/lib/components/ui/` and owned by us, so they
stay lean and fully customisable. Supports plain Vite (needs a `$lib` alias in `vite.config.js` +
`jsconfig/tsconfig` paths, then `npx shadcn-svelte@latest init`). Icons: `@lucide/svelte`.

| Area | Treatment |
|---|---|
| Palette | shadcn "neutral"/"zinc" base: white/near-white surfaces, zinc-200 borders, zinc-900 text; **one** restrained brand accent used only for the primary action, selection and focus rings; red only for destructive |
| Type | Inter (or Geist) 13–14px UI text, sentence case, medium weight for labels; no all-caps shouting |
| Shape | 1px borders, `rounded-md`/`rounded-lg`, soft `shadow-sm` only on popovers, menus, dialogs |
| Workspace | Canvas on a flat neutral grey (`zinc-100`), certificate page with a subtle drop shadow; panels flat |
| Density | One primary button per screen; secondary actions as ghost/icon buttons with tooltips; rare actions in dropdown menus or the command palette |
| Feedback | Toasts (`svelte-sonner`) instead of modals for success/info; `AlertDialog` only for destructive confirms |
| Theme | **One light theme only, no dark mode** (decided). shadcn-svelte "Nova" style (compact), zinc base, single indigo accent (`--primary`), Geist font. Tokens live in `src/theme.css`; the `.dark` block was removed but `@custom-variant dark` is kept so component `dark:` classes never follow the OS setting |
| Power-user | `Ctrl+K` command palette (shadcn `Command`) for every action — keeps the UI lean while nothing is hidden |

Key shadcn-svelte components we will use: Button, Input, Select, Popover, DropdownMenu, Tooltip,
Tabs, Dialog, AlertDialog, Sheet, Slider, Toggle/ToggleGroup, Command, Table, Sonner, Resizable
(panels), ScrollArea, Separator, Badge, Progress.

### Lean but powerful: progressive disclosure

The rule for every screen: **the default path needs no thought; power is one click deeper.**

- Defaults visible, advanced options in a popover / "More options" / command palette.
- Rules builder hidden until there are 2+ designs.
- Field formatting (`{Name|upper}`, date formats) available but never required.
- Every action reachable by keyboard and `Ctrl+K`, so toolbars can stay small.

## 4. New product structure

Replace 4 tabs with a **3-step flow** (steps are clickable; not a locked wizard):

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ■ CertFlow   Lab Certificates ✎        ① Design ── ② Data ── ③ Generate    ⋯  │
└────────────────────────────────────────────────────────────────────────────┘
```

`⋯` menu: New project, Open project file, Save project file, Reset. Autosave indicator next to it.

### Step ① Design (Canva-lite editor)

```
┌────┬─────────────┬──────────────────────────────────────────────────────────┐
│ ▦  │ Templates   │  [ Playfair ▾ ][ 36 ][B][I][≡▾][■ color][Fit: shrink ▾][⋯] │ ← appears only
│ T  │  (flyout    │                                                          │   when something
│ {} │   panel for │          ┌──────────────────────────────────┐            │   is selected
│ ◇  │   the rail  │          │                                  │            │
│ ⬆  │   item)     │          │        certificate page          │            │
│ ▧  │             │          │                                  │            │
│    │             │          └──────────────────────────────────┘            │
├────┴─────────────┴──────────────────────────────────────────────────────────┤
│ Designs: [Gold ●] [Standard] [+]        Preview row: ◀ Alex Rivera 1/64 ▶   − 65% + │
└──────────────────────────────────────────────────────────────────────────────┘
```

Left rail (icon + label): **Templates** (starter designs), **Text** (heading / body / script
presets), **Fields** (one chip per data column — click or drag to insert `{Name}`), **Elements**
(rectangle, circle, line, divider, QR code), **Uploads** (images, logos, signatures, custom fonts,
**Import from Canva**), **Background** (colour, gradient, image, border presets).

Editor behaviour (Canva conventions):

- Click to select, Shift-click multi-select, drag to move, corner handles to resize, rotate handle.
- Smart guides: snap to page centre/edges and to other elements; arrow keys nudge (Shift = 10px).
- Contextual toolbar instead of a permanent inspector panel.
- Keyboard: Ctrl+Z / Ctrl+Shift+Z undo/redo, Ctrl+D duplicate, Ctrl+C/V, Delete, Esc.
- Layers: bring forward/back, lock, hide — in the `⋯` of the toolbar, plus a small layers popover.
- Text boxes have a width and wrap; **Fit: shrink-to-fit** for name fields so long names never
  overflow.
- Page size: A4 landscape/portrait, Letter, custom — respected everywhere including export.
- **Preview row:** step through real data rows on the canvas to see how each name fits.
- Multiple designs live in the bottom strip (used by rules in step ③).

### Step ② Data

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Drop CSV / Excel here · or paste from Google Sheets · or start typing   │
├──────────────────────────────────────────────────────────────────────────┤
│  Fields used in your designs          Matched column                     │
│  {Name}                         ✓     Name                                │
│  {Roll_Number}                  ⚠     [ Roll Number ▾ ]  ← suggest match  │
│  {Team_ID}                      ✗     [ choose column ▾ ]                 │
├──────────────────────────────────────────────────────────────────────────┤
│  Editable table (search, fix typos inline, add/remove rows) · 64 rows    │
└──────────────────────────────────────────────────────────────────────────┘
```

- Paste-from-clipboard (TSV) support — the fastest path from Google Sheets/Excel.
- Field mapping fixes the silent `{Roll_Number}` vs `Roll Number` problem.
- Design can be made before data exists (fields are just names until mapped).

### Step ③ Generate

```
┌───────────────────────────────┬──────────────────────────────────────────┐
│ Which design for whom?         │  Preview  ◀ 12 / 64 ▶   (thumbnail grid)  │
│ If [Position ▾][is ▾][1]       │                                          │
│      → [Gold ▾]                │                                          │
│ + Add rule                     │                                          │
│ Everyone else → [Standard ▾]   │                                          │
├───────────────────────────────┤                                          │
│ Checks: ✓ all fields filled     │                                          │
│         ⚠ 3 names shrunk >30%   │                                          │
├───────────────────────────────┤                                          │
│ Download as:                   │                                          │
│ (•) One PDF  ( ) ZIP, 1 per person  ( ) PNG images                         │
│ File name: {Name} - {Roll Number}                                         │
│ [  Download 64 certificates  ]   Print                                    │
└───────────────────────────────┴──────────────────────────────────────────┘
```

- Rules list replaces the xyflow node graph (same power for real use: ordered "if → design" rules
  plus an "everyone else" fallback; first match wins). Hidden entirely when there is only one design.
- Checks run before export: unmapped fields, empty values, text that had to shrink a lot.
- Progress bar with **Cancel**; thumbnails virtualised (no rendering 500 live certificates).

## 5. Canva import

Canva does not export HTML. Realistic paths, in order of reliability:

| Path | How | Fidelity | Editable? | Phase |
|---|---|---|---|---|
| **PNG / JPG / PDF as background** | User removes the variable text (name, etc.) in Canva, downloads PNG or PDF, imports; CertFlow places it as a locked background layer and the user adds fields on top. PDF rendered with `pdfjs-dist`. | Pixel-perfect | Only the fields added on top | 4 (first) |
| **SVG** (Canva Pro download) | Parsed with Fabric's `loadSVGFromString` into objects | High for shapes/images; text depends on export | Partly | 4 |
| **PPTX** (Canva → Share → PowerPoint) | Unzip with JSZip, parse slide XML (positions in EMU, text runs, fonts, colours, images) into native elements | Medium (fonts/effects may differ) | Yes, fully | 4b (beta) |
| **Direct "Connect Canva" button** | Canva Connect API (export job → download) | High | Depends on format | Not now — needs a small backend: the OAuth client secret can't live in a static site |

PDF import extra: `pdfjs-dist` also gives positioned text, so we can offer "click the name text
in your design to turn it into a {Name} field" — later enhancement.

## 6. Technical plan

**Keep:** Svelte 5 (runes), Vite, Tailwind 4, pnpm, static hosting via committed `dist/`.

**Editor engine: Fabric.js v6** (recommended) instead of the hand-written DOM editor. Gives
selection, resize/rotate handles, multi-select, text editing with wrapping, SVG import, JSON
serialisation and image export out of the box. Biggest win: **the same engine renders the editor
and the exported certificates**, so export is WYSIWYG and the html2canvas/oklch workaround
disappears.

**Add:** `shadcn-svelte` components (+ `bits-ui`, `tailwind-variants`, `clsx`, `tailwind-merge`,
`svelte-sonner`), `fabric`, `jszip` (ZIP export + PPTX import), `pdfjs-dist` (PDF import, lazy),
`qrcode` (QR element), a tiny IndexedDB helper (`idb-keyval` or ~40 lines of our own).

**Remove:** `@xyflow/svelte`, `html2canvas` (unless HTML templates stay — §9), one of the two
Lucide packages (keep `@lucide/svelte`, the Svelte 5 one), `htmlEditorWindow.ts`,
`layoutInspectorWindow.ts`, `htmlParser.ts`, `Counter.svelte`, `src/assets/*`.

**Upgrade:** `xlsx` 0.18.5 has known CVEs (prototype pollution, ReDoS). Move to the current
SheetJS build from `cdn.sheetjs.com`, lazy-loaded only when an `.xlsx` is dropped; CSV/TSV parsed
without it.

**State & persistence:**

- Stores split by concern: `project` (designs, dataset, mapping, rules, export settings),
  `editor` (selection, zoom, active design — not persisted), `history` (undo/redo).
- Autosave to **IndexedDB** (debounced ~500 ms), assets stored as Blobs, no 5 MB limit, survives
  closing the tab. "Save project file" exports a single `.certflow` (zip: `project.json` + assets)
  for backup/sharing; "Open" imports it.
- Generated certificates are **not stored** — they are derived from rows + rules + designs at
  export time (fixes stale snapshots and storage bloat).

**Data model (sketch):**

```ts
interface Project { id; name; designs: Design[]; dataset: Dataset; fieldMap: Record<string,string>;
                    rules: Rule[]; fallbackDesignId; export: { format; fileNamePattern } }
interface Design  { id; name; page: { width; height; preset }; fabricJson: object; }
interface Rule    { id; column; op: 'is'|'is not'|'contains'|'starts with'|'>'|'<'|'>='|'<='|'is empty';
                    value; designId }
```

Text objects carry custom props: `fitMode: 'none' | 'shrink'`, `minFontSize`.

**Render pipeline (export):** for each row → pick design via rules → load its Fabric JSON into an
off-screen `StaticCanvas` → substitute `{field}` tokens → apply shrink-to-fit → wait for fonts →
render at 300 DPI → append to jsPDF (page size = design size) or add to ZIP. Process in chunks,
yield to the UI between rows, support cancel.

**Fonts:** curated list of ~20 certificate-friendly Google Fonts (Cinzel, Playfair Display,
EB Garamond, Lora, Great Vibes, Pinyon Script, Alex Brush, Montserrat, Poppins, …) loaded on
demand with the FontFace API, plus custom font upload stored as an asset.

**Performance:** code-split heavy libs (pdf.js, xlsx, jszip, jspdf load on first use); target
main bundle well under the current 1.3 MB.

## 7. Bugs found in the current code (fixed by the redesign)

1. Dragging an element calls `saveToSession()` (full JSON of all state, including data-URL
   images) on **every mouse move** → laggy drag.
2. `sessionStorage` 5 MB limit; generated certificates each store a full copy of their template →
   quota exceeded → save fails silently → work lost.
3. All work is lost when the tab closes (`sessionStorage`).
4. Property panel edits the **first element** when nothing is selected (`selectedElement` falls
   back to `elements[0]`).
5. Portrait / custom page sizes break: iframe and PDF export are hard-coded to 1056×747 landscape.
6. Deleting a template leaves flow nodes pointing to it; rows silently get the first template.
7. Clicking a flow edge deletes it instantly with no undo; only the first edge out of the data
   source is followed.
8. Generated certificates are stale snapshots — template edits after "Generate" don't show.
9. Unmatched placeholders (`{Roll_Number}`) silently print as literal text.
10. Pop-up editor messages are accepted without checking `event.origin`.
11. Output tab renders every certificate as live DOM/iframes → slow with large lists.
12. `ConditionNode` / `setDataset` mutate `$state.raw` items in place → UI may not refresh.
13. `xlsx` 0.18.5 known vulnerabilities.
14. "Export all" silently exports only the currently filtered subset.
15. Long names overflow — no wrapping or shrink-to-fit.
16. Asset path replacement is substring-based (`logo.png` also rewrites `my_logo.png`).
17. A data column named `id` overwrites the internal row id.

## 8. Phases (each ends in a working, manually verified build)

| Phase | Scope | Done when |
|---|---|---|
| **0. Foundation** | `redesign` branch; remove dead code and deps; `$lib` alias + shadcn-svelte init (neutral theme, light/dark); app shell (top bar, stepper, command palette, toasts) + 3-step navigation; IndexedDB autosave + project file open/save | Empty shell navigates; project persists across tab close |
| **1. Editor core** | Fabric canvas; text/field/image/shape; contextual toolbar; snapping guides; undo/redo + shortcuts; layers; page sizes; fonts; 4–6 starter templates; backgrounds/border presets | Can design a good certificate without touching a manual |
| **2. Data** | CSV/XLSX/paste import; editable table; field mapping with suggestions; preview row in editor | `{Roll_Number}`-style mismatches are caught and fixable |
| **3. Generate** | Rules builder; checks; render pipeline; PDF / ZIP / PNG / print; filename pattern; progress + cancel | 200 rows export reliably to one PDF and to a ZIP |
| **4. Canva import** | PNG/JPG/PDF background import (pdf.js); SVG import; guide text "how to export from Canva" | Free-Canva design → 200 certificates end to end |
| **4b. PPTX import (beta)** | Editable import from Canva's PowerPoint export | Text and images land as editable layers |
| **5. Extras & ship** | QR element; custom font upload; PWA offline; empty states/onboarding; update README + `.knowledge/`; build, merge, deploy | Live on codism.in/certflow |

## 9. Decisions needed from the user

| # | Question | Recommendation |
|---|---|---|
| 1 | UI style | **Decided:** calm professional shadcn-svelte style (see §3) |
| 2 | Keep raw HTML templates? (`sample/certificate.html` is one) | Keep as an "Advanced: code template" with an in-app code + preview split view (no pop-ups, no converter); or convert the sample into a native design and drop HTML entirely |
| 3 | Editor engine: Fabric.js, or keep improving the custom DOM editor? | Fabric.js |
| 4 | First Canva release: PNG/PDF/SVG import now, PPTX editable import as beta later, no Canva login (needs backend) — OK? | Yes |
| 5 | Replace node-graph flow with a simple rules list? | Yes |
| 6 | Step order Design → Data → Generate (like Canva Bulk Create)? | Yes |
| 7 | Accent: shadcn default monochrome (black primary buttons) or a brand colour (indigo, blue, emerald)? | Monochrome primary + one blue used only for canvas selection, guides and focus (Figma/Canva convention) |
