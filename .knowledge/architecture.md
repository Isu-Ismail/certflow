# Architecture

## Overview

Single-page Svelte 5 app, no router, no backend. `src/main.js` mounts `App.svelte`, which
renders `Navbar` plus one of four tab components based on `appState.activeTab`:

| Tab | Component | Purpose |
|---|---|---|
| `data` | `components/data/DataImport.svelte` | Load dataset, browse/search records, copy `{tag}`s |
| `templates` | `components/templates/TemplateEditor.svelte` | Edit templates, assets, open popups |
| `flow` | `components/flow/FlowBuilder.svelte` | Routing graph, "Generate" |
| `output` | `components/output/GenerationView.svelte` | Preview + export |

`CustomModal` is mounted once globally and driven by `modalStore`.

## State

`src/lib/stores/appState.svelte.ts` exports a singleton `appState` (class `AppState`):

| Field | Kind | Notes |
|---|---|---|
| `activeTab` | `$state` | Current tab |
| `dataset` | `$state<Dataset>` | `{ name, fileName, columns, records }`; each record has `id` plus column keys |
| `templates` | `$state<CertificateTemplate[]>` | Starts with 2 `DEFAULT_TEMPLATES` (gold, standard) |
| `activeTemplateId` | `$state` | `activeTemplate` getter falls back to first template, then a blank one |
| `assets` | `$state<AssetFile[]>` | Uploaded files as data URLs; unique by `name` (re-upload replaces) |
| `flowNodes` / `flowEdges` | `$state.raw` | xyflow nodes/edges; must be reassigned, not mutated |
| `generatedCertificates` | `$state` | Output of the last "Generate" run |

Persistence: every mutating method calls `saveToSession()`, which JSON-serialises all fields to
`sessionStorage['certflow_session_cache_v1']`. The constructor restores from it. Components that
mutate `appState` directly (e.g. FlowBuilder edge handlers) call `saveToSession()` themselves.
`clearAllDataAndReset()` (Navbar reset button) wipes the key and restores defaults — the default
flow graph is duplicated there and in the field initialisers.

`modalStore.svelte.ts`: `showAlert()` / `showConfirm()` return a `Promise<boolean>` resolved by
`CustomModal` buttons.

## Data flow

```
CSV/XLSX ──excelParser.parseExcelFile──▶ appState.setDataset() ──▶ also updates dataSource node
                                                                   (recordCount, columns)
templates + assets (TemplateEditor) ──▶ appState.templates / assets
flowNodes + flowEdges (FlowBuilder)
        │
        ▼  "Generate" (FlowBuilder or Navbar)
flowEvaluator.generateCertificatesFromFlow(records, nodes, edges, templates)
        │
        ▼
appState.generatedCertificates = [{ id, student, template, generatedAt }]   (template is a copy)
        │
        ▼  GenerationView renders each via CertificateRenderer in a DOM node #cert_card_<id>
exporter.ts: html2canvas(DOM node or iframe body) ──▶ PNG / jsPDF / print images
```

Note `GeneratedCertificate.template` is a snapshot at generation time; editing a template later
does not change already-generated certificates until you generate again.

## Rendering

`components/common/CertificateRenderer.svelte` is the single renderer used by the editor (with
drag/edit callbacks) and the output view (read-only):

- If `template.customHtml` is set: render an `<iframe srcdoc>` with placeholders interpolated
  (`interpolateText`) and asset paths replaced by data URLs (`resolveAssetUrls`), plus injected
  CSS forcing `html,body` to template width/height.
- Otherwise: draw background/gradient/image, the border style (`gold-classic`, `triple-gold`,
  `canvas-frame`, `double`, `solid`, `none`), and each `CanvasElement` absolutely positioned at
  `x%`/`y%`, centred on that point.
- With no `student`, it uses a hard-coded dummy record (John Doe ...).
- `scale` prop shrinks the preview via CSS transform; exporters reset `scale` transforms in the
  cloned DOM.

## Popup windows

`utils/htmlEditorWindow.ts` and `utils/layoutInspectorWindow.ts` call `window.open('', '_blank')`
and `document.write` a complete standalone page (styles + inline script) built from a template
literal. Data is embedded at open time (template HTML, columns, assets as JSON).

- HTML editor → saves back via `window.opener.postMessage({ type: 'SYNC_HTML_CODE', templateId,
  customHtml }, '*')`. `App.svelte` listens for that message and calls `updateActiveTemplate`.
  The listener does not check `event.origin`.
- Layout inspector → view-only; can download a blueprint PNG. No message back.

## Build & deploy

- `vite.config.js`: `base: './'` so built asset URLs are relative (site lives under `/certflow/`).
- `index.html` has a CSP `<meta>` allowing `'unsafe-inline' 'unsafe-eval'`, `data:`, `blob:`, and
  any `https:` — needed for iframe srcdoc, data-URL images, Google Fonts, and popup scripts.
- `dist/` is committed. `.github/workflows/deploy.yml` runs on push to `main`/`master` **only if
  the head commit message contains "build"/"Build"**, and publishes `./dist` to the orphan
  `deploy` branch. GitHub Pages (legacy build, source `deploy:/`) serves it at
  http://codism.in/certflow/ (custom domain inherited from the owner's user site).

## Leftovers

`src/lib/Counter.svelte`, `src/assets/*` are from the Vite starter and unused. `@lucide/svelte`
is installed but code imports `lucide-svelte`.
