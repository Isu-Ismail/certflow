<script lang="ts">
  import { tick } from 'svelte';
  import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/svelte';
  import { newClause, removeClause, updateNode, yesPort } from '$lib/flow/ops';
  import type { Clause, ConditionNode } from '$lib/flow/types';
  import { flowUi } from '../../flow.svelte';
  import ClauseRow from '../../form/ClauseRow.svelte';
  import NodeShell from './NodeShell.svelte';
  import { Plus } from '@lucide/svelte';

  let { id, selected }: NodeProps = $props();

  const node = $derived(flowUi.graph.nodes.find((n) => n.id === id) as ConditionNode | undefined);
  const each = $derived(node?.match === 'each');
  const count = (port: string) => flowUi.result.edgeCounts.get(`${id}:${port}`) ?? 0;
  const rows = (n: number) => `${n} ${n === 1 ? 'row' : 'rows'}`;

  const patch = (p: Partial<ConditionNode>, label: string) => flowUi.edit(label, (g) => updateNode<ConditionNode>(g, id, p));
  const setClause = (i: number, c: Clause) => node && patch({ clauses: node.clauses.map((x, k) => (k === i ? c : x)) }, 'Change condition');

  /** Leaving "each" mode drops the extra yes connections (only one yes is left). */
  const setMatch = (match: ConditionNode['match']) =>
    flowUi.edit('Change condition', (g) => {
      const next = updateNode<ConditionNode>(g, id, { match });
      return match === 'each' ? next : { ...next, edges: next.edges.filter((e) => !(e.from === id && /^y\d+$/.test(e.port))) };
    });

  // the number of outputs changes with the rows: tell Svelte Flow to measure the handles again
  const updateInternals = useUpdateNodeInternals();
  $effect(() => {
    void node?.clauses.length;
    void node?.match;
    tick().then(() => updateInternals(id));
  });

  // three rows fit; more scroll
  const scroll = $derived((node?.clauses.length ?? 0) > 3);
  const handleStyle = 'right:8px;transform:translate(0,-50%)';
</script>

{#if node}
  <NodeShell {id} {selected} title="If" tone="bg-step-soft" width="w-[460px]" flush>
    <div class="px-3 pt-2">
      <select class="nodrag h-7 w-full rounded-md border-2 border-ink bg-white px-2 text-xs font-semibold" aria-label="How the conditions are used" value={node.match} onchange={(e) => setMatch(e.currentTarget.value as ConditionNode['match'])}>
        <option value="each">Each condition has its own “yes”</option>
        <option value="all">One “yes” when all of them match</option>
        <option value="any">One “yes” when any of them matches</option>
      </select>
    </div>

    <div class="nowheel mt-1.5 {scroll ? 'max-h-[118px] overflow-y-auto' : ''}">
      {#each node.clauses as clause, i (i)}
        <div class="relative flex items-center gap-2 py-1 pr-9 pl-3">
          <div class="min-w-0 flex-1">
            <ClauseRow compact listKey={flowUi.listOf(id)} {clause} canRemove={node.clauses.length > 1} onchange={(c) => setClause(i, c)} onremove={() => flowUi.edit('Remove condition', (g) => removeClause(g, id, i))} />
          </div>
          {#if each}
            <span class="absolute right-[30px] -translate-y-px font-mono text-[10px] font-bold text-[#1f7a3d]">{count(yesPort(i))}</span>
            <Handle id={yesPort(i)} type="source" position={Position.Right} style={handleStyle} />
          {/if}
        </div>
      {/each}
    </div>

    <div class="px-3 pt-1 pb-2">
      <button class="nodrag inline-flex items-center gap-1 text-sm font-semibold text-mute hover:text-ink" onclick={() => patch({ clauses: [...node.clauses, newClause(flowUi.columnsFor(id)[0] ?? '')] }, 'Add condition')}>
        <Plus class="size-4" />Add a condition
      </button>
    </div>

    {#snippet outputs()}
      {#if !each}
        <div class="relative flex h-8 items-center justify-end border-t-2 border-ink pr-4 text-xs font-bold text-[#1f7a3d]">yes → {rows(count('true'))}<Handle id="true" type="source" position={Position.Right} /></div>
      {/if}
      <div class="relative flex h-8 items-center justify-end rounded-b-md border-t-2 border-ink pr-4 text-xs font-bold text-[#d6361f]">{each ? 'else' : 'no'} → {rows(count('false'))}<Handle id="false" type="source" position={Position.Right} /></div>
    {/snippet}
  </NodeShell>
{/if}
