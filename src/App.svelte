<script lang="ts">
  import Navbar from './lib/components/Navbar.svelte';
  import DataImport from './lib/components/data/DataImport.svelte';
  import TemplateEditor from './lib/components/templates/TemplateEditor.svelte';
  import FlowBuilder from './lib/components/flow/FlowBuilder.svelte';
  import GenerationView from './lib/components/output/GenerationView.svelte';
  import CustomModal from './lib/components/common/CustomModal.svelte';
  import { appState } from './lib/stores/appState.svelte';
  import { onMount } from 'svelte';

  onMount(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_HTML_CODE') {
        const { templateId, customHtml } = event.data;
        const targetTpl = appState.templates.find(t => t.id === templateId) || appState.activeTemplate;
        if (targetTpl) {
          appState.updateActiveTemplate({
            ...targetTpl,
            customHtml
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  });
</script>

<div class="min-h-screen flex flex-col bg-transparent text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-black">
  <Navbar />

  <main class="flex-1">
    {#if appState.activeTab === 'data'}
      <DataImport />
    {:else if appState.activeTab === 'templates'}
      <TemplateEditor />
    {:else if appState.activeTab === 'flow'}
      <FlowBuilder />
    {:else if appState.activeTab === 'output'}
      <GenerationView />
    {/if}
  </main>

  <!-- Global Custom Neo-Brutalist Modal Dialog -->
  <CustomModal />
</div>
