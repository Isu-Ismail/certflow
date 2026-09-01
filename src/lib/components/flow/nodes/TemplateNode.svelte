<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { appState } from '../../../stores/appState.svelte';
  import { Award, Trash2 } from 'lucide-svelte';

  let { data, id }: { data: any; id: string } = $props();

  let selectedTemplateId = $state('');

  $effect(() => {
    selectedTemplateId = data.templateId || appState.templates[0]?.id || '';
  });

  let currentTemplate = $derived(
    appState.templates.find(t => t.id === selectedTemplateId) || appState.templates[0]
  );

  function updateNodeTemplate() {
    const nodeIdx = appState.flowNodes.findIndex(n => n.id === id);
    if (nodeIdx !== -1 && currentTemplate) {
      appState.flowNodes[nodeIdx].data = {
        ...appState.flowNodes[nodeIdx].data,
        templateId: currentTemplate.id,
        templateName: currentTemplate.name,
        label: currentTemplate.name
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

<div class="bg-white border-3 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_#000] min-w-[220px] text-black font-bold">
  <!-- Target Input Handle (Left) -->
  <Handle
    type="target"
    position={Position.Left}
    id="input"
    class="!w-4 !h-4 !bg-cyan-400 !border-3 !border-black"
  />

  <!-- Header with Delete Button -->
  <div class="flex items-center justify-between mb-3 pb-2 border-b-3 border-black bg-cyan-300 -mx-4 -mt-4 p-3 rounded-t-xl">
    <div class="flex items-center gap-2">
      <div 
        class="p-1 rounded-lg border-2 border-black font-bold text-black"
        style="background-color: {currentTemplate?.badgeColor || '#FDE047'};"
      >
        <Award class="w-4 h-4 stroke-[2.5]" />
      </div>
      <div>
        <h4 class="font-black text-xs uppercase">Target Template</h4>
        <span class="text-[10px] font-extrabold text-black">Terminal Node</span>
      </div>
    </div>

    <button
      onclick={deleteNode}
      class="p-1 rounded-lg bg-rose-300 hover:bg-rose-400 border-2 border-black text-black shadow-[1px_1px_0px_0px_#000] cursor-pointer nodrag"
      title="Delete Template Node"
    >
      <Trash2 class="w-3.5 h-3.5 stroke-[2.5]" />
    </button>
  </div>

  <div class="space-y-2 text-xs nodrag">
    <label for={`tpl_select_${id}`} class="block text-[10px] text-slate-800 font-extrabold mb-0.5">Assigned Certificate</label>
    <select 
      id={`tpl_select_${id}`}
      bind:value={selectedTemplateId}
      onchange={updateNodeTemplate}
      class="w-full bg-yellow-100 border-2 border-black rounded-lg p-1.5 text-xs text-black font-extrabold"
    >
      {#each appState.templates as tpl}
        <option value={tpl.id}>{tpl.name}</option>
      {/each}
    </select>
  </div>
</div>
