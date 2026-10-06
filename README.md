# CertFlow — Certificate Generator

CertFlow is a browser-only tool for generating certificates in bulk. Load a CSV/Excel sheet of
recipients, design one or more certificate templates (either on a drag-and-drop canvas or as raw
HTML), wire up a small node flow that decides which template each recipient gets, then export
the results as PNG, a multi-page PDF, or print them.

Everything runs client-side. There is no backend, no account, and no data leaves the browser
(except Google Fonts requests). State is cached in `sessionStorage`, so it survives reloads but
is cleared when the tab closes.

- **Live site:** http://codism.in/certflow/ (GitHub Pages, served from the `deploy` branch)
- **Repo:** `git@github.com:Isu-Ismail/certflow.git`
- **UI style:** neo-brutalist (thick black borders, hard drop shadows, yellow/lime/cyan palette)

## How it works (user flow)

The app has four tabs, in order:

1. **Data** — upload `.csv` / `.xlsx` (first sheet only) or pick a built-in sample dataset. Column
   headers become placeholders such as `{Name}`.
2. **Templates** — create/edit templates. Two kinds:
   - *Canvas templates*: positioned text/image elements with built-in border styles.
   - *Custom HTML templates*: upload an `.html` file; it renders inside an iframe with `{Column}`
     placeholders substituted. Assets (logos, backgrounds) are uploaded to a virtual file store
     and referenced by relative path, e.g. `./mit_logo.png`.
3. **Flow** — a node graph (`@xyflow/svelte`): Data Source → Condition nodes (true/false
   branches) → Template nodes. Each record walks the graph to pick its template.
4. **Output** — generated certificates; filter/search, download single PNG/PDF, export all to one
   PDF, or print all.

## Stack

| Concern | Tool |
|---|---|
| Framework | Svelte 5 (runes: `$state`, `$derived`, `$props`) — plain Vite SPA, **not** SvelteKit |
| Build | Vite 8, `@sveltejs/vite-plugin-svelte` |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`), plus a few helpers in `src/app.css` |
| Flow editor | `@xyflow/svelte` |
| Spreadsheet parsing | `xlsx` (SheetJS 0.18.5) |
| Export | `html2canvas` + `jspdf` |
| Icons | `lucide-svelte` (`@lucide/svelte` is also installed but unused) |
| Package manager | pnpm |

Component scripts use `lang="ts"` and stores/utils are `.ts`; Vite strips types. There is no
`tsconfig.json`, no type-check script, no linter, and no test suite.

## Folder layout

```
index.html                  App shell; contains a CSP <meta> tag
vite.config.js              base: './' (relative paths so it works under /certflow/)
src/
  main.js                   Mounts App.svelte
  App.svelte                Tab switcher + postMessage listener for the popup HTML editor
  app.css                   Tailwind import + neo-brutalist helpers + dot-grid background
  lib/
    types.ts                All shared types (Dataset, CertificateTemplate, CanvasElement, ...)
    stores/
      appState.svelte.ts    Single global state class + default templates/flow + sessionStorage
      modalStore.svelte.ts  Promise-based alert/confirm modal
    utils/
      excelParser.ts        CSV/XLSX -> Dataset; also SAMPLE_DATASETS
      flowEvaluator.ts      Condition evaluation + per-record graph walk
      exporter.ts           {placeholder} interpolation, asset URL resolution, PNG/PDF/print export
      htmlParser.ts         Best-effort custom HTML -> canvas elements converter
      htmlEditorWindow.ts   Opens a full-screen HTML code editor in a new tab
      layoutInspectorWindow.ts  Opens a layout/blueprint inspector in a new tab
    components/
      Navbar.svelte         Tabs, "Generate" shortcut, reset-all button
      common/               CertificateRenderer (shared renderer), CustomModal
      data/DataImport.svelte
      templates/            TemplateEditor (main editor), TemplateCard
      flow/                 FlowBuilder + nodes/ (DataSource, Condition, Template)
      output/GenerationView.svelte
    Counter.svelte          Leftover from Vite template, unused
  assets/                   Leftover Vite template images, unused
public/                     favicon/logo SVGs, copied to dist/
dist/                       Built output — COMMITTED to git on purpose (see Deploy)
sample/                     Example custom HTML certificate + logos + team CSV for manual testing
.github/workflows/deploy.yml
```

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # outputs to dist/
pnpm preview    # serve dist/ locally
```

To try the custom HTML flow: in the Templates tab, upload `sample/anna_logo.png` and
`sample/mit_logo.png` as assets, then upload `sample/certificate.html` as a template, and load
`sample/metrology_virtual_lab_teams-v3.csv` in the Data tab.

## Deploy

Deployment does **not** build in CI. The workflow copies the committed `dist/` folder:

1. Run `pnpm build` locally.
2. Commit, including `dist/`, with a commit message that contains `build` or `Build`.
3. Push to `main`. `.github/workflows/deploy.yml` runs only when the head commit message
   contains "build"; it publishes `./dist` to the orphan `deploy` branch via
   `peaceiris/actions-gh-pages`.
4. GitHub Pages serves the `deploy` branch at http://codism.in/certflow/.

If you push source changes without rebuilding, the live site does not change.

## Known quirks

- The package/folder name is spelled `certificate_genrator` (typo). Leave it; renaming breaks paths.
- Canvas size is fixed at 1056×747 px (A4 landscape ratio) almost everywhere, including export.
- Placeholders that don't match a column stay as literal `{Key}` text in the output.
- `sessionStorage` has a ~5 MB quota. Large uploaded images (stored as data URLs) can make saves
  fail silently (only a `console.warn`).
- Records the flow doesn't route to any template fall back to the first template.
- The HTML→canvas converter (`htmlParser.ts`) is heuristic and tuned to `sample/certificate.html`'s
  class names; expect to reposition elements by hand for other HTML.

More detail: [`.knowledge/architecture.md`](.knowledge/architecture.md) and
[`.knowledge/features/`](.knowledge/features/).
