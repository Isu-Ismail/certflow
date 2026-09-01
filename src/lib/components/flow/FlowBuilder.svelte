<script lang="ts">
  import { 
    SvelteFlow, 
    Controls, 
    Background, 
    MiniMap,
    addEdge,
    type NodeTypes,
    type Edge,
    type Connection
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { appState } from '../../stores/appState.svelte';
  import { generateCertificatesFromFlow } from '../../utils/flowEvaluator';
  import DataSourceNode from './nodes/DataSourceNode.svelte';
  import ConditionNode from './nodes/ConditionNode.svelte';
  import TemplateNode from './nodes/TemplateNode.svelte';
  import { Plus, Play, GitBranch, HelpCircle, Eraser } from 'lucide-svelte';

  const nodeTypes: NodeTypes = {
    dataSource: DataSourceNode as any,
    condition: ConditionNode as any,
    templateNode: TemplateNode as any
  };

  function handleConnect(connection: Connection) {
    appState.flowEdges = addEdge(connection, appState.flowEdges);
    appState.saveToSession();
  }

  function handleNodeDragStop() {
    appState.saveToSession();
  }

  function addConditionNode() {
    const id = `node-cond-${Date.now()}`;
    const newCount = appState.flowNodes.length;
    appState.flowNodes = [
      ...appState.flowNodes,
      {
        id,
        type: 'condition',
        position: { x: 350, y: 100 + newCount * 60 },
        data: {
          label: 'Position == 1',
          type: 'condition',
          rule: { field: appState.dataset.columns[0] || 'Position', operator: '==', value: '1' }
        }
      }
    ];
    appState.saveToSession();
  }

  function addTemplateNode() {
    const id = `node-tpl-${Date.now()}`;
    const newCount = appState.flowNodes.length;
    appState.flowNodes = [
      ...appState.flowNodes,
      {
        id,
        type: 'templateNode',
        position: { x: 680, y: 100 + newCount * 60 },
        data: {
          label: appState.templates[0]?.name || 'Template Node',
          type: 'templateNode',
          templateId: appState.templates[0]?.id || ''
        }
      }
    ];
    appState.saveToSession();
  }

  function clearAllConnections() {
    appState.flowEdges = [];
    appState.saveToSession();
  }

  function handleEdgeClick(edgeObj: { edge: Edge }) {
    if (edgeObj && edgeObj.edge) {
      appState.flowEdges = appState.flowEdges.filter(e => e.id !== edgeObj.edge.id);
      appState.saveToSession();
    }
  }

  function handleGenerate() {
    const generated = generateCertificatesFromFlow(
      appState.dataset.records,
      appState.flowNodes,
      appState.flowEdges,
      appState.templates
    );
    appState.generatedCertificates = generated;
    appState.activeTab = 'output';
  }
</script>

<div class="h-[calc(100vh-5rem)] flex flex-col bg-amber-50">
  
  <!-- Flow Builder Header Toolbar -->
  <header class="p-4 border-b-4 border-black bg-white flex items-center justify-between gap-4 flex-wrap z-10 shadow-[0_4px_0_0_#000]">
    <div class="flex items-center gap-3">
      <div class="p-2.5 rounded-2xl bg-purple-300 border-3 border-black shadow-[3px_3px_0px_0px_#000] text-black font-black">
        <GitBranch class="w-6 h-6 stroke-[2.5]" />
      </div>
      <div>
        <h3 class="font-black text-black text-base uppercase">Visual Certificate Routing Flow</h3>
        <p class="text-xs text-slate-800 font-bold">
          Connect dataset records through condition nodes to target certificate templates
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
      <button
        onclick={addConditionNode}
        class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-yellow-300 hover:bg-yellow-400 text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4 text-black stroke-[3]" />
        <span>Add Condition Node</span>
      </button>

      <button
        onclick={addTemplateNode}
        class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-cyan-300 hover:bg-cyan-400 text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4 text-black stroke-[3]" />
        <span>Add Template Node</span>
      </button>

      {#if appState.flowEdges.length > 0}
        <button
          onclick={clearAllConnections}
          class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-rose-300 hover:bg-rose-400 text-black font-black text-xs uppercase border-3 border-black shadow-[3px_3px_0px_0px_#000] transition-all cursor-pointer"
          title="Clear all connections/edges"
        >
          <Eraser class="w-4 h-4 stroke-[2.5]" />
          <span>Clear Connections</span>
        </button>
      {/if}

      <button
        onclick={handleGenerate}
        class="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-lime-400 hover:bg-lime-300 text-black font-black text-xs uppercase border-3 border-black shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ml-2"
      >
        <Play class="w-4 h-4 fill-black" />
        <span>Run Flow & Generate</span>
      </button>
    </div>
  </header>

  <!-- Svelte Flow Interactive Visual Canvas -->
  <main class="flex-1 relative w-full h-full bg-amber-50/40">
    <SvelteFlow
      bind:nodes={appState.flowNodes}
      bind:edges={appState.flowEdges}
      {nodeTypes}
      onconnect={handleConnect}
      onedgeclick={handleEdgeClick}
      onnodedragstop={handleNodeDragStop}
      deleteKey={['Delete', 'Backspace']}
      fitView
      class="bg-transparent"
    >
      <Controls position="top-left" class="!bg-white !border-3 !border-black !shadow-[3px_3px_0px_0px_#000] !rounded-xl !m-4" />
      <Background patternColor="#000" gap={24} size={2} />
      <MiniMap position="bottom-right" class="!bg-white !border-3 !border-black !shadow-[4px_4px_0px_0px_#000] !rounded-2xl !m-4" />
    </SvelteFlow>

    <!-- Interactive Flow Guide Overlay (Bottom-Left - Clean & Unoverlapped) -->
    <div class="absolute bottom-6 left-6 bg-white border-3 border-black rounded-3xl p-4 text-xs text-black max-w-sm shadow-[6px_6px_0px_0px_#000] z-20 pointer-events-auto">
      <div class="flex items-center gap-1.5 text-black font-black uppercase mb-1">
        <HelpCircle class="w-4 h-4 text-purple-600 stroke-[3]" />
        <span>Routing Engine Flow Guide</span>
      </div>
      <p class="text-[11px] font-bold text-slate-800 leading-relaxed">
        1. Click any node's <strong class="bg-rose-300 px-1 border border-black rounded">🗑️ Trash Button</strong> to delete node.<br />
        2. Click any <strong class="bg-yellow-300 px-1 border border-black rounded">Connection Line</strong> or press <code class="bg-yellow-200 px-1 font-mono">Delete</code> to remove connection.<br />
        3. Click <strong class="bg-rose-200 px-1 border border-black rounded">Clear Connections</strong> to wipe all graph links.
      </p>
    </div>
  </main>

</div>
