# CLAUDE.md

Instructions for any agent working in this repository (Claude, Codex, Gemini, etc.).

## Read first

1. [`README.md`](./README.md) — what CertFlow is, stack, layout, deploy.
2. [`.knowledge/session_handoff.md`](./.knowledge/session_handoff.md) — current state and where
   the last session left off.
3. Before structural changes: [`.knowledge/architecture.md`](./.knowledge/architecture.md).
   Before touching a feature: the matching file in [`.knowledge/features/`](./.knowledge/features/).

## Project rules

- **The redesign is `main`** (plan: `.knowledge/redesign_plan.md`, UI mock: `workspace_example.html`). Steps: Data → Design → Flow → Generate (all built; read `.knowledge/session_handoff.md`).
- **No component library.** Hand-built components with Tailwind 4. Style = clean brutalism (paper/ink, 2px borders, hard shadows, one colour per step via `body[data-step]` → `bg-step`, `text-on-step`, `bg-step-soft`). Tokens in `src/app.css`. **Light theme only, no dark mode.**
- **Fully responsive** (mobile first; `sm:`/`md:`/`lg:` up). Shell is `h-dvh` with the stage scrolling internally.
- **Keep files small:** split any component over ~300 lines into child components in the same folder.
- **Svelte 5 runes only.** Alias `$lib` → `src/lib`. Layout: `src/lib/{ui,layout,workspace}`, `src/steps/<step>/`.
- **One store:** `ws` in `src/lib/workspace/store.svelte.ts`. Data fields are `$state.raw` and replaced, never mutated (so they go straight into IndexedDB). Call `ws.touch()` after any change (debounced autosave).
- **Workspace = a folder** made by CertFlow: `config/workspace.json` (the mark with a SHA-256 fingerprint), `data/` (CSV and Excel files), `designs/<Name>.cert.html`, `files/`, `config/*.config.json`, `output/`. Folders without a valid mark are refused; broken config files give a red error and nothing is loaded (`lib/workspace/inspect.ts`). `.cert.html` is the source of truth for a design; the editor edits HTML directly (no Fabric).
- **UI calls `src/lib/workspace/actions.ts`** (they handle errors + toasts); don't put file/parse logic in components.
- **Heavy libs load lazily** (`xlsx`, `jszip` via dynamic import).
- **No tests, no linter.** Verify with `pnpm build` + `pnpm dlx svelte-check --workspace .` and manually in `pnpm dev`.
- **Deploy = commit `dist/`** (the workflow copies it). Never commit `dist/` changes unless the user asks for a deploy; restore with `git checkout -- dist && git clean -fd dist` after a test build.
- Don't rename the `certificate_genrator` spelling.

## Mandatory: session handoff

**After every edit you make to this project, update `.knowledge/session_handoff.md` before
ending your turn.** Do this without being asked — it's not optional. Write what you changed, why,
what's still in progress, and what the next agent should know. Keep it current, not a log:
overwrite stale "in progress" items once they're done, don't just append forever. There is one
`session_handoff.md` — overwrite it, don't create a new file per session.

If your edit changes a feature's behavior, architecture, or file layout, also update the relevant
file in `.knowledge/` (and `README.md` if user-visible) in the same turn.

## SEO

If asked to improve discoverability (meta tags, sitemap, Open Graph, Search Console), use the
`search-engine-optimization` skill instead of improvising. Note this is a single-page app with
one `index.html` and no per-route meta, and a CSP `<meta>` lives in `index.html`.
