<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  import { ws } from '$lib/workspace/store.svelte';
  import { addNode, autoLayout, newCondition, newDataStart, newDesign, newSkip } from '$lib/flow/ops';
  import type { FlowNode } from '$lib/flow/types';
  import Button from '$lib/ui/Button.svelte';
  import { flowUi } from '../flow.svelte';
  import { FIT } from './build';
  import { Database, GitBranch, LayoutTemplate, Maximize, SkipForward } from '@lucide/svelte';

  const flow = useSvelteFlow();

  const W = 340, H = 200; // roughly the size of a node, for overlap checks
  const overlaps = (x: number, y: number) => flowUi.graph.nodes.some((n) => Math.abs(n.x - x) < W && Math.abs(n.y - y) < H);

  /** Where a new node goes: the middle of what you currently see, moved down (then right) until it covers nothing. */
  function centre() {
    const el = document.querySelector('.svelte-flow');
    const r = el?.getBoundingClientRect();
    const p = r ? flow.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 }) : { x: 0, y: 0 };
    let x = Math.round(p.x - 130), y = Math.round(p.y - 60);
    for (let tries = 0; overlaps(x, y) && tries < 30; tries++) {
      y += H;
      if (tries % 4 === 3) { x += W; y = Math.round(p.y - 60); }
    }
    return { x, y };
  }

  const add = (label: string, make: (x: number, y: number) => FlowNode) => {
    const { x, y } = centre();
    flowUi.edit(label, (g) => addNode(g, make(x, y)));
    setTimeout(() => flow.fitView({ duration: 250, ...FIT }), 80);
  };
</script>

<div class="flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink bg-white p-1.5 shadow-hard">
  {#if ws.lists.length > 1}
    <Button size="sm" variant="outline" onclick={() => add('Add data', (x, y) => newDataStart(ws.lists.find((l) => !flowUi.graph.nodes.some((n) => n.type === 'start' && (n.source || flowUi.defaultKey) === l.key))?.key ?? flowUi.defaultKey, x, y))}><Database class="size-4" />Data</Button>
  {/if}
  <Button size="sm" variant="step" onclick={() => add('Add condition', (x, y) => newCondition(flowUi.columnsFor()[0] ?? '', x, y))}><GitBranch class="size-4" />If</Button>
  <Button size="sm" variant="outline" onclick={() => add('Add design', (x, y) => newDesign(flowUi.designNames[0] ?? '', x, y))}>Design</Button>
  <Button size="sm" variant="outline" onclick={() => add('Add skip', (x, y) => newSkip(x, y))}><SkipForward class="size-4" />Skip</Button>
  <span class="h-5 w-0.5 bg-ink"></span>
  <Button size="sm" variant="outline" onclick={() => { flowUi.edit('Tidy layout', (g) => autoLayout(g)); setTimeout(() => flow.fitView({ duration: 250, ...FIT }), 80); }}><LayoutTemplate class="size-4" />Tidy</Button>
  <Button size="sm" variant="outline" onclick={() => flow.fitView({ duration: 250, ...FIT })}><Maximize class="size-4" />Fit</Button>
</div>
