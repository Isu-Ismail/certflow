# Flow routing (template assignment)

## Where

- `src/lib/components/flow/FlowBuilder.svelte` — xyflow canvas, add-node buttons, Generate
- `src/lib/components/flow/nodes/{DataSourceNode,ConditionNode,TemplateNode}.svelte`
- `src/lib/utils/flowEvaluator.ts` — `evaluateCondition`, `generateCertificatesFromFlow`
- Generate is also wired in `Navbar.svelte` (`runGeneration`).

## Node types (xyflow `type` key)

| type | data | handles |
|---|---|---|
| `dataSource` | `recordCount`, `columns` (synced by `appState.setDataset`) | one output |
| `condition` | `rule: { field, operator, value }` | input; outputs `true` and `false` (sourceHandle ids) |
| `templateNode` | `templateId`, `templateName` | input |

Node data is edited inside the node components (they write back to `appState.flowNodes`).
Note: `ConditionNode` and `appState.setDataset` assign `flowNodes[i].data = {...}` in place on a
`$state.raw` array. The evaluator sees the new data (same object), but that assignment alone does
not trigger reactivity — reassign the array if UI must re-render from it.
Clicking an edge deletes it. Default graph: Data → `Position == 1` → Gold (true) / Standard (false).

## Evaluation (`generateCertificatesFromFlow`)

For each record, start at the **first** `dataSource` node and walk:

- `dataSource`: follow the **first** outgoing edge only (fan-out from data source is ignored).
- `condition`: evaluate rule; follow edge whose `sourceHandle` is `'true'`/`'false'`. An edge with
  no `sourceHandle` counts as the true branch. If no matching edge, follow **any** outgoing edge.
- `templateNode`: assign that template (unknown id → first template). Stop.
- A visited-set prevents infinite loops.
- If nothing assigned → **first template** in `appState.templates`. Every record therefore gets
  exactly one certificate; there's no "skip" outcome.
- No `dataSource` node at all → every record gets the first template.

## Operators (`evaluateCondition`)

- Values compared as trimmed, **lower-cased strings**: `==`, `!=`, `contains`, `startsWith` are
  case-insensitive.
- `>`, `<`, `>=`, `<=` compare numerically if both sides parse as numbers, else as strings.
- Missing field on record → `false`. Empty rule/field → `true`.
- `Number('')` is `0`, so an empty cell compared `< 5` is treated as numeric 0.

## IDs

Generated certificate id = `gen_<recordId>_<templateId>`; GenerationView looks up DOM nodes by
`cert_card_<id>` for export.
