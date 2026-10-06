# Design step — plan (not built yet)

_Drafted 2026-10-05. Status: phase 1 BUILT (see session_handoff). User decisions: skip the mock; simple Canva-lite editor, landscape default; missing fonts can be downloaded from Google Fonts into files/ (plus upload); Canva import via PDF/PNG/JPG (SVG, PPTX later). Remaining phases below still apply._

The Design step is where a workspace's `<Name>.cert.html` files and `files/` assets are created
and edited. It is the largest and most cluttered page, so the rule is: **calm by default, power one
click away, every panel collapsible.**

## 1. Core idea

- **The HTML file is the single source of truth.** Visual edits and code edits both change the same
  HTML string (`ws.designs[i].html`). Edit code → the page updates live. Drag something → the code
  updates. No second format.
- **Three ways to work on one design:** `Visual` (click/drag on the page), `Code` (HTML editor),
  `Split` (code left, live page right).
- **Everything undoable** through the existing `ws` history (one visual drag, or one pause/blur in the
  code editor = one undo step).

## 2. Layout (desktop ≥ 1024 px)

```
┌ explorer ──────┬──────────── stage ─────────────────────────┬ inspector ───────┐
│ DESIGNS    [+] │ Visual|Code|Split  A4 ▾  Fit ▾   ‹ Ada 3/12 ›  Real|Fields │ Page / Style /   │
│  ● Appreciation│ ┌────────────────────────────────────────┐ │ Layers           │
│    Best team   │ │                                        │ │ (contextual:     │
│ FILES      [↑] │ │            the certificate             │ │  text / image /  │
│  anna_logo.png │ │                                        │ │  position)       │
│  mit_logo.png  │ └────────────────────────────────────────┘ │                  │
│ FIELDS         │ ✓ 4 fields matched                        │                  │
│  {Name} …      │                                            │                  │
└────────────────┴────────────────────────────────────────────┴──────────────────┘
```

- **Explorer (left, ~240 px)** — three collapsible sections: *Designs*, *Files*, *Fields*. The whole
  panel collapses to a 48 px icon rail (Ctrl+B). No tabs: the explorer is the design switcher.
- **Stage (centre)** — one slim toolbar, the page, one status line ("4 fields matched · 1 unmatched
  → Fix"). Zoom: Fit (default), 25–200 %, Ctrl+wheel.
- **Inspector (right, ~280 px)** — changes with the selection; collapsible (Ctrl+I). Nothing
  selected → *Page* (size, background colour/image). Text selected → font, size, weight, colour,
  align, spacing, **Shrink to fit**. Image selected → source, size, opacity. Always: position/size
  numbers and a *Layers* list (rename, reorder, hide, lock).
- **Tablet (768–1023):** explorer is the rail; panels open as overlays.
- **Phone (< 768):** page full width; bottom bar with Designs · Files · Style · Code, each opening a
  modal/bottom sheet. Visual and Code are not shown together.
- Collapse state is remembered (localStorage).

## 3. File explorer

- **Designs:** list of `.cert.html`. Click = open. `⋯` menu: Rename, Duplicate, Delete (confirm),
  Download. `+` opens the *New design* modal. Names are sanitised (no `/ \ : * ? " < > |`) and kept
  unique. Renaming must later also patch `flow.json` rules that point to the design.
- **Files (`files/`):** thumbnails + names + "used by N designs". Upload button, **drag-and-drop**
  anywhere on the explorer (drop on the page = insert at that spot). `⋯`: Insert into page, Copy
  path (`files/logo.png`), Replace, Delete (warns if used). Accepts PNG/JPG/SVG/WebP/GIF and
  fonts (TTF/OTF/WOFF/WOFF2 → auto `@font-face`). Warn above 5 MB. Exact-path references only.
- **Fields:** the data columns as `{tokens}` (click = insert at caret / into selected text, or new
  text box). Unmatched tokens used by the design show in amber with the mapping dropdown (same logic
  as the Data page: `resolveColumn`).

## 4. Modals (all use one shared `Modal` with pinned header + footer, only the middle scrolls)

1. **New design** — left list: *Blank* (pick page size) · *Starter templates* (live thumbnails using
   the first data row) · *Import HTML file* · *Import from Canva* · *Duplicate existing*. Name field
   in the footer. Starter flow adds a **Bind fields** step: each starter token ({Name}, {Title}…) is
   matched to one of the user's columns (auto-suggested); creating the design writes the user's
   *exact column names* into the HTML, so no mapping needed later.
2. **Import from Canva** — explains the 3 steps; accepts PDF / PNG / JPG / SVG. PDF is rendered to
   an image with pdf.js (lazy). Result: the file goes to `files/` and a new design uses it as a
   locked full-page background. Optional later: PPTX import (editable).
3. **Files manager** (optional, from the Files header) — big thumbnails, bulk delete, rename.
4. Confirm dialogs (existing) for delete / destructive replace.

## 5. How the HTML is treated

- **Page size:** `<meta name="certflow:page" content="1056x747">` (A4 landscape default). Presets:
  A4 / Letter × landscape/portrait + custom. Same size drives preview, PDF, PNG.
- **Layers:** the page root's direct children (`.cert` or `<body>`). Anything with
  `position:absolute` is draggable; a non-absolute element is converted to absolute on first drag.
  Selection is tracked by child-index path (no attributes written into the user's HTML).
- **Fields:** `{Name}` in text and in `alt`/`title`. Filled by walking DOM text nodes (never regex on
  raw HTML, so CSS braces are safe). `Fields` view shows tokens as highlighted chips instead of data.
- **Assets:** `files/x.png` (also `./files/x.png`) in `src`, `srcset`, CSS `url()` → blob URLs at
  render time. Missing files show a visible placeholder + a warning in the status line.
- **Shrink to fit:** `data-fit="shrink"` on an element; done by a small measure-and-reduce routine
  run by the app after render (the preview iframe has no scripts). Shared with export so output is
  identical.
- **Safety:** preview is `<iframe sandbox="allow-same-origin" srcdoc>` — scripts in a design never
  run, but the app can read/modify the iframe DOM for visual editing. Importing HTML with
  `<script>` shows a notice. External (https) images/fonts still load; the status line flags them
  (they break offline).
- **Serialisation:** visual edits re-serialise the DOM (attribute quoting/whitespace may be
  normalised on the first visual edit); pure code edits are stored untouched.

## 6. Visual editing behaviour

Click select · hover outline · drag move · 8 resize handles · arrow keys nudge (Shift = 10 px) ·
snap guides (page centre/edges and other layers) · double-click text = edit in place · Delete ·
Ctrl+D duplicate · Esc deselect · Tab / Shift+Tab cycles layers. Later: multi-select, rotation,
align/distribute.

## 7. Code editor

CodeMirror 6, **lazy-loaded** only when Code/Split is opened (HTML highlighting, line numbers,
auto-close tags, search, bracket match, `{token}` highlighted). Wrapped in one `CodeEditor.svelte`
so it can be swapped. Live preview debounced ~150 ms; one undo step per pause/blur. Syntax
problems never block the preview (browser parses leniently).

## 8. Code organisation (every file < 300 lines)

```
src/lib/ui/Modal.svelte            shared dialog (pinned header/footer); ConfirmDialog + PageHelp move onto it
src/lib/render/                    compile.ts (tokens + assets → srcdoc), page.ts (size meta), fit.ts,
                                   assets.ts (blob URL cache), serialize.ts
src/lib/templates/                 starter templates (.cert.html strings) + token metadata
src/steps/design/DesignStep.svelte layout + collapsible panels
  design.svelte.ts                 UI state: active design, mode, selection, zoom, preview row, panel state
  explorer/  Explorer, DesignList, FileList, FieldList, ItemMenu
  stage/     Toolbar, PagePreview, VisualLayer (select/drag/resize), CodePane, StatusLine
  inspector/ Inspector, PageSettings, TextStyle, ImageStyle, Geometry, Layers
  modals/    NewDesignModal, StarterGallery, BindFields, CanvaImport, FilesManager
```

## 9. Build order (each phase ends in a working build the user checks)

0. **Mock** `design_example.html` (single page, like `workspace_example.html`) to approve the layout.
1. **Shell + designs:** shared `Modal`; Design step layout with collapsible explorer/inspector;
   Designs list (new blank, rename, duplicate, delete); iframe preview with real data, row
   switcher, fit/zoom, Real/Fields toggle; New design modal (Blank + Import HTML).
2. **Code + files:** Code/Split/Visual toggle; CodeMirror live editing with undo integration;
   Files section (upload, drag-drop, delete, usage, copy path, insert); asset resolution; fonts.
3. **Visual editing:** select/drag/resize/nudge/snap/inline text; inspector (text, image,
   geometry, page); layers list.
4. **Templates & Canva:** starter gallery + Bind fields; Canva import (PNG/JPG/PDF/SVG).
5. **Polish:** shrink-to-fit, status checks, thumbnails, phone sheets, shortcuts, help text.

## 10. Open questions

1. HTML as the single source of truth with Visual + Code + Split — confirm.
2. Code editor: CodeMirror 6 (lazy, ~150 kB when opened) vs a plain textarea (no dependency, no
   highlighting).
3. Layout: Explorer | Stage | Inspector with Fields inside the explorer — confirm.
4. Starter templates: how many, and which looks? Proposal: Classic (the sample), Modern, Gold
   award, Minimal. Fonts come from Google Fonts (needs internet; uploaded fonts work offline).
5. Do the mock first (recommended) or go straight to phase 1?
