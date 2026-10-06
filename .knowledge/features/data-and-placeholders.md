# Data import & placeholders

## Where

- `src/lib/utils/excelParser.ts` — `parseExcelFile(file)`, `SAMPLE_DATASETS`
- `src/lib/components/data/DataImport.svelte` — upload UI, sample picker, record table, tag copy
- `src/lib/utils/exporter.ts` — `interpolateText`, `formatExcelDate`, `resolveAssetUrls`

## Parsing

- SheetJS reads the file as an ArrayBuffer; works for `.csv`, `.xlsx`, `.xls`. **Only the first
  sheet** is read.
- `sheet_to_json(..., { defval: '', raw: false })` → values are mostly formatted strings.
- Column names = keys of the **first row**, trimmed. Columns missing from row 1 are not listed
  (but still stored on later records).
- Each record gets a synthetic `id: 'std_<n>'` (1-based). A column literally named `id` would
  overwrite it.
- Columns whose name contains "date" with a numeric value are converted from Excel serial to
  `"Month D, YYYY"` (en-US).
- Dataset `name` = filename without extension (used for the bulk PDF filename).

## Placeholders

`interpolateText(text, record)` replaces `{Key}` with `record[Key.trim()]`:

- Keys are matched **exactly** (case- and space-sensitive). Column `Roll Number` needs
  `{Roll Number}`, not `{Roll_Number}`.
- Unknown keys are left as the literal `{Key}` — no error, so typos show up in the output.
- Keys containing "date" go through `formatExcelDate` (only converts numbers in 40000–60000).
- The same function is applied to canvas element `content` **and** to the whole `customHtml`
  string, so a `{...}` anywhere in custom HTML — including CSS braces — is a candidate. CSS like
  `.a{color:red}` is safe only because no column is named `color:red`; don't name columns after
  CSS snippets.

## Assets

`resolveAssetUrls(html, assets)` regex-replaces every occurrence of each asset `name` (optionally
prefixed `./` or `/`) with its data URL. It's plain text replacement: an asset named `logo.png`
also matches inside `my_logo.png`. Uploading a file with an existing name replaces the old asset.

## Sample data

`sample/metrology_virtual_lab_teams-v3.csv` has columns `Name, Roll Number, Team, Title, Year`,
but `sample/certificate.html` uses `{Roll_Number}` and `{Team_ID}` — these two won't resolve with
that CSV unless the headers or placeholders are aligned.
