<script lang="ts">
  import { appState } from '../stores/appState.svelte';
  import { modalStore } from '../stores/modalStore.svelte';
  import { generateCertificatesFromFlow } from '../utils/flowEvaluator';
  import { 
    FileSpreadsheet, 
    LayoutTemplate, 
    GitFork, 
    Sparkles, 
    Award, 
    Play,
    RotateCcw
  } from 'lucide-svelte';

  function runGeneration() {
    const generated = generateCertificatesFromFlow(
      appState.dataset.records,
      appState.flowNodes,
      appState.flowEdges,
      appState.templates
    );
    appState.generatedCertificates = generated;
    appState.activeTab = 'output';
  }

  function switchTab(tab: 'data' | 'templates' | 'flow' | 'output') {
    appState.activeTab = tab;
    appState.saveToSession();
  }
</script>

<header class="bg-[#FEF9C3] border-b-4 border-black text-black sticky top-0 z-40 shadow-[0_4px_0_0_#000]">
  <div class="w-full max-w-[1750px] mx-auto px-4 sm:px-6">
    <div class="flex items-center justify-between h-20 gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
      
      <!-- Neo-Brutalist Brand Logo -->
      <div class="flex items-center gap-3 shrink-0">
        <img src="/logo.svg" alt="CertFlow Logo" class="w-13 h-13 p-1.5 bg-yellow-300 rounded-2xl border-3 border-black shadow-[4px_4px_0px_0px_#000] shrink-0" />
        <div class="hidden lg:block">
          <span class="font-black text-xl tracking-tight text-black uppercase">
            CertFlow
          </span>
          <span class="block text-[9px] text-black font-extrabold tracking-wider uppercase bg-lime-300 px-1.5 py-0.5 border-2 border-black rounded-md w-fit shadow-[1px_1px_0px_0px_#000]">
            Automated Certificate Generator
          </span>
        </div>
      </div>

      <!-- Main Navigation Tabs (One Clean Horizontal Line) -->
      <nav class="flex items-center gap-2 bg-yellow-100 p-1.5 rounded-2xl border-3 border-black shadow-[4px_4px_0px_0px_#000] shrink-0">
        <button
          onclick={() => appState.activeTab = 'data'}
          class={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all cursor-pointer ${
            appState.activeTab === 'data'
              ? 'bg-cyan-300 text-black border-3 border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
              : 'bg-white text-black border-2 border-black hover:bg-yellow-100'
          }`}
        >
          <FileSpreadsheet class="w-4 h-4 shrink-0" />
          <span>1. Data Import</span>
          {#if appState.dataset}
            <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-black text-white font-black shrink-0">
              {appState.dataset.records.length}
            </span>
          {/if}
        </button>

        <button
          onclick={() => appState.activeTab = 'templates'}
          class={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all cursor-pointer ${
            appState.activeTab === 'templates'
              ? 'bg-pink-300 text-black border-3 border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
              : 'bg-white text-black border-2 border-black hover:bg-yellow-100'
          }`}
        >
          <LayoutTemplate class="w-4 h-4 shrink-0" />
          <span>2. Templates</span>
          <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-black text-white font-black shrink-0">
            {appState.templates.length}
          </span>
        </button>

        <button
          onclick={() => appState.activeTab = 'flow'}
          class={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all cursor-pointer ${
            appState.activeTab === 'flow'
              ? 'bg-purple-300 text-black border-3 border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
              : 'bg-white text-black border-2 border-black hover:bg-yellow-100'
          }`}
        >
          <GitFork class="w-4 h-4 shrink-0" />
          <span>3. Flow Builder</span>
        </button>

        <button
          onclick={() => appState.activeTab = 'output'}
          class={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all cursor-pointer ${
            appState.activeTab === 'output'
              ? 'bg-lime-300 text-black border-3 border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
              : 'bg-white text-black border-2 border-black hover:bg-yellow-100'
          }`}
        >
          <Sparkles class="w-4 h-4 shrink-0" />
          <span>4. Certificates</span>
          {#if appState.generatedCertificates.length > 0}
            <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-md bg-black text-white font-black shrink-0">
              {appState.generatedCertificates.length}
            </span>
          {/if}
        </button>
      </nav>

      <!-- Action Buttons: Generate All & Clear All Data (One Clean Line) -->
      <div class="flex items-center gap-2.5 shrink-0">
        <button
          onclick={runGeneration}
          class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-lime-400 text-black font-black text-xs uppercase whitespace-nowrap border-3 border-black shadow-[4px_4px_0px_0px_#000] hover:bg-lime-300 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
        >
          <Play class="w-4 h-4 fill-black shrink-0" />
          <span>Generate All</span>
        </button>

        <button
          onclick={async () => {
            const confirmed = await modalStore.showConfirm(
              'Are you sure you want to clear all data, session cache, and reset the studio to default state?',
              'Clear All Data',
              'danger'
            );
            if (confirmed) {
              appState.clearAllDataAndReset();
            }
          }}
          class="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-400 hover:bg-rose-300 text-black font-black text-xs uppercase whitespace-nowrap border-3 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
          title="Clear session cache and reset CertFlow to default initial state"
        >
          <RotateCcw class="w-4 h-4 stroke-[2.5] shrink-0" />
          <span>Clear All Data</span>
        </button>
      </div>

    </div>
  </div>
</header>
