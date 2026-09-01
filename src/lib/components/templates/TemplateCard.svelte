<script lang="ts">
  import type { CertificateTemplate } from '../../types';
  import { appState } from '../../stores/appState.svelte';
  import { modalStore } from '../../stores/modalStore.svelte';
  import { Trash2, Award } from 'lucide-svelte';

  let { template }: { template: CertificateTemplate } = $props();

  let isActive = $derived(appState.activeTemplateId === template.id);
</script>

<div
  role="button"
  tabindex="0"
  onclick={() => appState.activeTemplateId = template.id}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') appState.activeTemplateId = template.id; }}
  class={`group relative p-4 rounded-2xl border-3 border-black text-left cursor-pointer transition-all ${
    isActive
      ? 'bg-pink-300 shadow-[5px_5px_0px_0px_#000] -translate-y-1'
      : 'bg-white hover:bg-yellow-100 hover:shadow-[4px_4px_0px_0px_#000]'
  }`}
>
  <div class="flex items-start justify-between gap-3">
    <div class="flex items-center gap-3">
      <div 
        class="w-10 h-10 rounded-xl border-2 border-black neo-shadow flex items-center justify-center font-black text-black shadow-[2px_2px_0px_0px_#000]"
        style="background-color: {template.badgeColor || '#FDE047'};"
      >
        <Award class="w-5 h-5 text-black stroke-[2.5]" />
      </div>
      <div>
        <h4 class="font-black text-sm text-black uppercase">
          {template.name}
        </h4>
        <span class="text-[11px] text-slate-800 font-extrabold">
          {template.width} × {template.height} px • {template.elements.length} elements
        </span>
      </div>
    </div>

    <!-- Delete template button with custom Neo-Brutalist modal confirm -->
    <button
      onclick={async (e) => {
        e.stopPropagation();
        const confirmed = await modalStore.showConfirm(
          `Are you sure you want to delete the template "${template.name}"?`,
          'Delete Template',
          'danger'
        );
        if (confirmed) {
          appState.deleteTemplate(template.id);
        }
      }}
      class="p-1.5 rounded-lg border-2 border-black bg-rose-300 text-black hover:bg-rose-400 transition-colors shadow-[2px_2px_0px_0px_#000]"
      title="Delete Template"
    >
      <Trash2 class="w-4 h-4 stroke-[2.5]" />
    </button>
  </div>

  {#if template.description}
    <p class="text-xs text-slate-800 font-semibold mt-3 line-clamp-2">
      {template.description}
    </p>
  {/if}
</div>
