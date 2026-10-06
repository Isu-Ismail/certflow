<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { defaultFlow, formToGraph, graphToForm, newRuleId } from '$lib/flow/convert';
  import { newClause, updateNode } from '$lib/flow/ops';
  import type { FormModel, FormRule, StartNode, Target } from '$lib/flow/types';
  import Button from '$lib/ui/Button.svelte';
  import { confirmDialog } from '$lib/ui/confirm.svelte';
  import { flowUi } from '../flow.svelte';
  import RuleCard from './RuleCard.svelte';
  import TargetSelect from './TargetSelect.svelte';
  import { Plus } from '@lucide/svelte';

  const form = $derived(graphToForm(flowUi.graph));
  const listKey = $derived(flowUi.listOf('start'));
  const columns = $derived(flowUi.columnsFor('start'));

  const commit = (label: string, next: FormModel) => flowUi.edit(label, (g) => formToGraph(next, g));
  const setRule = (i: number, rule: FormRule) => form && commit('Change rule', { ...form, rules: form.rules.map((r, k) => (k === i ? rule : r)) });

  function addRule() {
    if (!form) return;
    const target: Target = flowUi.designNames[0] ? { kind: 'design', design: flowUi.designNames[0] } : { kind: 'skip' };
    commit('Add rule', { ...form, rules: [...form.rules, { id: newRuleId(), match: 'all', clauses: [newClause(columns[0] ?? '')], target }] });
  }

  function move(i: number, delta: -1 | 1) {
    if (!form) return;
    const rules = form.rules.slice();
    [rules[i], rules[i + delta]] = [rules[i + delta], rules[i]];
    commit('Reorder rules', { ...form, rules });
  }

  const remove = (i: number) => form && commit('Delete rule', { ...form, rules: form.rules.filter((_, k) => k !== i) });

  async function resetToForm() {
    const ok = await confirmDialog({
      title: 'Replace the graph with a simple form?',
      message: 'The branching flow you built in the graph view will be removed. You can undo this.',
      confirmLabel: 'Replace',
      danger: true,
    });
    if (ok) ws.setFlow(defaultFlow(flowUi.designNames), 'Reset flow');
  }

  const rowsFor = (id: string) => flowUi.result.edgeCounts.get(`if-${id}:true`) ?? 0;
  const otherwiseRows = $derived(
    form ? (form.rules.length ? (flowUi.result.edgeCounts.get(`if-${form.rules.at(-1)!.id}:false`) ?? 0) : (flowUi.result.edgeCounts.get('start:out') ?? 0)) : 0,
  );
</script>

{#if form}
  <div class="flex min-w-0 flex-col">
    <div class="flex items-center gap-3 rounded-lg border-2 border-ink bg-step px-3 py-2 text-on-step shadow-hard">
      <span class="font-bold">Start</span>
      {#if ws.lists.length > 1}
        <label class="flex items-center gap-2 text-sm">Data
          <select class="h-8 rounded-md border-2 border-ink bg-white px-2 text-sm font-semibold text-ink" aria-label="Data for this flow" value={listKey} onchange={(e) => flowUi.edit('Change data', (g) => updateNode<StartNode>(g, 'start', { source: e.currentTarget.value }))}>
            {#each ws.lists as l (l.key)}<option value={l.key} selected={l.key === listKey}>{l.label}</option>{/each}
          </select>
        </label>
      {/if}
      <span class="text-sm">{ws.sheetOf(listKey)?.rows.length ?? 0} rows</span>
    </div>
    {#if !form.rules.length}
      <p class="ml-6 border-l-2 border-ink px-4 py-5 text-sm text-mute">
        Right now {flowUi.designNames.length > 1 ? 'everyone gets the design below' : 'everyone gets your design'}. Add a rule to give some rows a different design.
      </p>
    {/if}

    {#each form.rules as rule, i (rule.id)}
      <div class="ml-6 border-l-2 border-ink py-3 pl-5">
      <RuleCard {rule} {listKey} index={i} total={form.rules.length} rows={rowsFor(rule.id)} onchange={(r) => setRule(i, r)} onmove={(d) => move(i, d)} onremove={() => remove(i)} />
      </div>
    {/each}

    <div class="ml-6 border-l-2 border-ink py-3 pl-5">
      <Button variant="outline" size="sm" onclick={addRule} disabled={!columns.length}><Plus class="size-4" />Add a rule</Button>
    </div>

    <div class="ml-6 border-l-2 border-ink pl-5 pt-3"><section class="rounded-lg border-2 border-ink bg-white shadow-hard">
      <div class="flex flex-wrap items-center gap-2 px-3 py-3">
        <span class="font-bold">{form.rules.length ? 'Everyone else gets' : 'Everyone gets'}</span>
        <TargetSelect target={form.otherwise} allowNone onchange={(t) => commit('Change fallback', { ...form, otherwise: t })} />
        <span class="flex-1"></span>
        <span class="rounded border-[1.5px] border-ink bg-step-soft px-2 py-0.5 font-mono text-xs">{otherwiseRows} {otherwiseRows === 1 ? 'row' : 'rows'}</span>
      </div>
    </section></div>
  </div>
{:else}
  <div class="mx-auto max-w-xl rounded-lg border-2 border-ink bg-paper p-5 text-center">
    <h2 class="text-lg font-bold">This flow has branches</h2>
    <p class="mt-1 text-sm text-mute">It uses conditions inside conditions, several data lists, or other shapes that the simple form can't show. Edit it in the graph view.</p>
    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <Button variant="dark" onclick={() => flowUi.setView('graph')}>Open the graph view</Button>
      <Button variant="outline" onclick={resetToForm}>Replace with a simple form…</Button>
    </div>
  </div>
{/if}
