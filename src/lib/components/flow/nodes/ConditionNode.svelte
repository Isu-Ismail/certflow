<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { appState } from '../../../stores/appState.svelte';
  import { GitBranch, Trash2 } from 'lucide-svelte';

  let { data, id }: { data: any; id: string } = $props();

  let field = $state('');
  let operator = $state('==');
  let value = $state('1');

  $effect(() => {
    field = data.rule?.field || appState.dataset.columns[0] || 'Position';
    operator = data.rule?.operator || '==';
    value = data.rule?.value || '1';
  });

  function updateRule() {
    const nodeIdx = appState.flowNodes.findIndex(n => n.id === id);
    if (nodeIdx !== -1) {
      appState.flowNodes[nodeIdx].data = {
        ...appState.flowNodes[nodeIdx].data,
        rule: { field, operator, value },
        label: `${field} ${operator} ${value}`
      };
      appState.saveToSession();
    }
  }

  function deleteNode(e: MouseEvent) {
    e.stopPropagation();
    appState.flowNodes = appState.flowNodes.filter(n => n.id !== id);
    appState.flowEdges = appState.flowEdges.filter(e => e.source !== id && e.target !== id);
    appState.saveToSession();
  }
</script>

<div class="bg-white border-3 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_#000] min-w-[240px] text-black font-bold relative">
  <!-- Target Input Handle (Left) -->
  <Handle
    type="target"
    position={Position.Left}
    id="input"
    class="!w-4 !h-4 !bg-amber-400 !border-3 !border-black"
  />

  <!-- Node Header with Delete Button -->
  <div class="flex items-center justify-between mb-3 pb-2 border-b-3 border-black bg-yellow-300 -mx-4 -mt-4 p-3 rounded-t-xl">
    <div class="flex items-center gap-2">
      <div class="p-1 rounded-lg bg-black text-white">
        <GitBranch class="w-4 h-4" />
      </div>
      <div>
        <h4 class="font-black text-xs uppercase">Condition Routing Rule</h4>
        <span class="text-[10px] font-extrabold text-black">Logical Branching</span>
      </div>
    </div>

    <button
      onclick={deleteNode}
      class="p-1 rounded-lg bg-rose-300 hover:bg-rose-400 border-2 border-black text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer nodrag"
      title="Delete Condition Node"
    >
      <Trash2 class="w-3.5 h-3.5 stroke-[2.5]" />
    </button>
  </div>

  <!-- Rule Expression Form -->
  <div class="space-y-2 text-xs nodrag">
    <div>
      <label for={`cond_field_${id}`} class="block text-[10px] text-slate-800 font-extrabold mb-0.5">If Field</label>
      <select 
        id={`cond_field_${id}`}
        bind:value={field}
        onchange={updateRule}
        class="w-full bg-cyan-100 border-2 border-black rounded-lg p-1.5 text-xs text-black font-bold"
      >
        {#each appState.dataset.columns as col}
          <option value={col}>{col}</option>
        {/each}
      </select>
    </div>

    <div class="grid grid-cols-3 gap-1.5">
      <div>
        <label for={`cond_op_${id}`} class="block text-[10px] text-slate-800 font-extrabold mb-0.5">Operator</label>
        <select 
          id={`cond_op_${id}`}
          bind:value={operator}
          onchange={updateRule}
          class="w-full bg-yellow-100 border-2 border-black rounded-lg p-1.5 text-xs text-black font-bold"
        >
          <option value="==">==</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value="<">&lt;</option>
          <option value=">=">&gt;=</option>
          <option value="<=">&lt;=</option>
          <option value="contains">contains</option>
        </select>
      </div>

      <div class="col-span-2">
        <label for={`cond_val_${id}`} class="block text-[10px] text-slate-800 font-extrabold mb-0.5">Value</label>
        <input 
          id={`cond_val_${id}`}
          type="text" 
          bind:value={value}
          oninput={updateRule}
          placeholder="e.g. 1 or Gold"
          class="w-full bg-white border-2 border-black rounded-lg p-1.5 text-xs text-black font-extrabold"
        />
      </div>
    </div>
  </div>

  <!-- Output Handles (Right): True (Top Right) & False (Bottom Right) -->
  <div class="absolute -right-3.5 top-10 flex flex-col items-center">
    <Handle
      type="source"
      position={Position.Right}
      id="true"
      class="!w-4 !h-4 !bg-lime-400 !border-3 !border-black"
    />
    <span class="text-[10px] font-black bg-lime-300 px-1 rounded border border-black text-black mt-0.5 mr-7 shadow-[1px_1px_0px_0px_#000]">True</span>
  </div>

  <div class="absolute -right-3.5 bottom-6 flex flex-col items-center">
    <Handle
      type="source"
      position={Position.Right}
      id="false"
      class="!w-4 !h-4 !bg-rose-400 !border-3 !border-black"
    />
    <span class="text-[10px] font-black bg-rose-300 px-1 rounded border border-black text-black mt-0.5 mr-7 shadow-[1px_1px_0px_0px_#000]">False</span>
  </div>
</div>
