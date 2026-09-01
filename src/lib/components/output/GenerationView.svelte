<script lang="ts">
  import { appState } from '../../stores/appState.svelte';
  import CertificateRenderer from '../common/CertificateRenderer.svelte';
  import type { GeneratedCertificate } from '../../types';
  import { exportElementToPng, exportElementsToPdf, generatePrintCanvasImages } from '../../utils/exporter';
  import { 
    Sparkles, 
    Download, 
    Printer, 
    Search, 
    FileText, 
    Eye, 
    X, 
    Award,
    Loader2
  } from 'lucide-svelte';

  let selectedTemplateFilter = $state<string>('all');
  let searchQuery = $state<string>('');
  let previewCert = $state<GeneratedCertificate | null>(null);
  let isGeneratingPdf = $state<boolean>(false);
  let isPreparingPrint = $state<boolean>(false);
  let printImages = $state<string[]>([]);

  let progressCurrent = $state<number>(0);
  let progressTotal = $state<number>(0);
  let progressTitle = $state<string>('');

  let isAnyExporting = $derived(isGeneratingPdf || isPreparingPrint);
  let progressPercent = $derived(progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0);

  let filteredCertificates = $derived(
    appState.generatedCertificates.filter(cert => {
      const matchTemplate = selectedTemplateFilter === 'all' || cert.template.id === selectedTemplateFilter;
      const matchSearch = !searchQuery || Object.values(cert.student).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()));
      return matchTemplate && matchSearch;
    })
  );

  async function downloadSinglePng(cert: GeneratedCertificate) {
    const el = document.getElementById(`cert_card_${cert.id}`);
    if (el) {
      await exportElementToPng(el, `${cert.student.Name || 'certificate'}.png`);
    }
  }

  async function downloadSinglePdf(cert: GeneratedCertificate) {
    const el = document.getElementById(`cert_card_${cert.id}`);
    if (el) {
      await exportElementsToPdf([el], `${cert.student.Name || 'certificate'}.pdf`);
    }
  }

  async function exportAllToPdf() {
    isGeneratingPdf = true;
    progressCurrent = 0;
    progressTotal = filteredCertificates.length;
    progressTitle = 'Generating High-Resolution PDF Batch';

    try {
      const elements: HTMLElement[] = [];
      for (const cert of filteredCertificates) {
        const el = document.getElementById(`cert_card_${cert.id}`);
        if (el) elements.push(el);
      }
      await exportElementsToPdf(
        elements, 
        `${appState.dataset.name}_certificates.pdf`,
        (curr, tot) => {
          progressCurrent = curr;
          progressTotal = tot;
        }
      );
    } finally {
      isGeneratingPdf = false;
    }
  }

  async function handlePrintAll() {
    isPreparingPrint = true;
    progressCurrent = 0;
    progressTotal = filteredCertificates.length;
    progressTitle = 'Preparing Native Browser Print Pages';

    try {
      const elements: HTMLElement[] = [];
      for (const cert of filteredCertificates) {
        const el = document.getElementById(`cert_card_${cert.id}`);
        if (el) elements.push(el);
      }
      printImages = await generatePrintCanvasImages(
        elements,
        (curr, tot) => {
          progressCurrent = curr;
          progressTotal = tot;
        }
      );
      // Wait for image elements to fully hydrate in DOM
      await new Promise(r => setTimeout(r, 350));
      window.print();
    } finally {
      isPreparingPrint = false;
    }
  }
</script>

<div class="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
  
  <!-- Header Bar with Filters and Batch Action Buttons -->
  <div class="bg-white border-3 border-black rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[6px_6px_0px_0px_#000]">
    <div class="flex items-center gap-3 w-full md:w-auto">
      <div class="p-3 rounded-2xl bg-lime-400 border-3 border-black text-black shadow-[3px_3px_0px_0px_#000]">
        <Sparkles class="w-7 h-7 stroke-[2.5]" />
      </div>
      <div>
        <h2 class="text-lg font-black uppercase text-black">Generated Certificates Portfolio</h2>
        <p class="text-xs text-slate-800 font-bold">
          Showing <span class="bg-yellow-300 px-2 py-0.5 border border-black rounded font-black">{filteredCertificates.length}</span> of {appState.generatedCertificates.length} certificates generated
        </p>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex items-center gap-3 flex-wrap w-full md:w-auto">
      <!-- Search Input -->
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black font-bold" />
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="Search student..."
          class="pl-9 pr-4 py-2 rounded-xl bg-yellow-100 border-2 border-black text-xs font-bold text-black placeholder-slate-600 focus:outline-none shadow-[2px_2px_0px_0px_#000]"
        />
      </div>

      <!-- Template Filter -->
      <select 
        bind:value={selectedTemplateFilter}
        class="bg-cyan-200 border-2 border-black rounded-xl px-3 py-2 text-xs font-black text-black focus:outline-none shadow-[2px_2px_0px_0px_#000]"
      >
        <option value="all">All Templates ({appState.templates.length})</option>
        {#each appState.templates as tpl}
          <option value={tpl.id}>{tpl.name}</option>
        {/each}
      </select>

      <!-- Batch PDF Download -->
      <button
        disabled={isAnyExporting || filteredCertificates.length === 0}
        onclick={exportAllToPdf}
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 border-3 border-black text-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
      >
        <FileText class="w-4 h-4 stroke-[2.5]" />
        <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Batch'}</span>
      </button>

      <!-- Browser Print -->
      <button
        disabled={isAnyExporting || filteredCertificates.length === 0}
        onclick={handlePrintAll}
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-300 hover:bg-cyan-400 border-3 border-black text-black font-black text-xs uppercase shadow-[4px_4px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
      >
        <Printer class="w-4 h-4 stroke-[2.5]" />
        <span>{isPreparingPrint ? 'Preparing Print...' : 'Print All'}</span>
      </button>
    </div>
  </div>

  <!-- Certificates Grid -->
  {#if filteredCertificates.length === 0}
    <div class="bg-white border-3 border-black rounded-3xl p-12 text-center text-slate-800 shadow-[6px_6px_0px_0px_#000]">
      <Award class="w-16 h-16 text-black mx-auto mb-3 stroke-[2]" />
      <h3 class="font-black text-black text-lg uppercase">No Certificates Generated Yet</h3>
      <p class="text-xs text-slate-800 font-bold mt-1">
        Go to <strong class="bg-yellow-300 px-1.5 py-0.5 border border-black rounded">Flow Builder</strong> and click "Run Flow & Generate" to route records automatically.
      </p>
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {#each filteredCertificates as cert (cert.id)}
        <div class="bg-white border-3 border-black rounded-3xl p-5 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between group hover:shadow-[8px_8px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
          
          <!-- Card Header Info -->
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="px-2.5 py-1 rounded-lg bg-pink-300 border-2 border-black text-[10px] font-black text-black shadow-[2px_2px_0px_0px_#000]">
                {cert.template.name}
              </span>
              <span class="text-[10px] text-black font-mono font-bold">
                {cert.student.Certificate_ID || cert.student.id}
              </span>
            </div>

            <h3 class="font-black text-black text-base uppercase group-hover:text-amber-600 transition-colors">
              {cert.student.Name || 'Student Certificate'}
            </h3>
            <p class="text-xs text-slate-700 font-bold mt-0.5">
              {cert.student.Project_Name || cert.student.Course || 'Achievement'} • Position: #{cert.student.Position || cert.student.Grade || 'N/A'}
            </p>

            <!-- Scaled Certificate Renderer Thumbnail -->
            <div 
              role="button"
              tabindex="0"
              onclick={() => previewCert = cert}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') previewCert = cert; }}
              class="mt-4 rounded-2xl overflow-hidden border-3 border-black bg-slate-950 p-2 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform relative group/thumb shadow-[3px_3px_0px_0px_#000]"
            >
              <CertificateRenderer 
                elementId={`cert_card_${cert.id}`}
                template={cert.template}
                student={cert.student}
                scale={0.28}
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                <span class="px-3.5 py-2 rounded-xl bg-yellow-300 text-black font-black text-xs flex items-center gap-1.5 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                  <Eye class="w-4 h-4 stroke-[2.5]" /> Full Preview
                </span>
              </div>
            </div>
          </div>

          <!-- Card Actions (Includes Individual Download PNG & Download PDF) -->
          <div class="mt-4 pt-4 border-t-3 border-black flex items-center justify-between gap-2 flex-wrap">
            <button
              onclick={() => previewCert = cert}
              class="flex items-center gap-1 text-xs font-black text-black hover:underline cursor-pointer"
            >
              <Eye class="w-4 h-4" />
              <span>Inspect</span>
            </button>

            <div class="flex items-center gap-2">
              <button
                onclick={() => downloadSinglePng(cert)}
                class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-300 hover:bg-yellow-400 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                title="Download individual certificate as PNG image"
              >
                <Download class="w-3.5 h-3.5 stroke-[2.5]" />
                <span>PNG</span>
              </button>

              <button
                onclick={() => downloadSinglePdf(cert)}
                class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-xs font-black text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                title="Download individual certificate as PDF document"
              >
                <FileText class="w-3.5 h-3.5 stroke-[2.5]" />
                <span>PDF</span>
              </button>
            </div>
          </div>

        </div>
      {/each}
    </div>
  {/if}

  <!-- Full Preview Modal with Dual Individual Download Actions -->
  {#if previewCert}
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-white border-4 border-black rounded-3xl p-6 max-w-5xl w-full max-h-[90vh] flex flex-col justify-between shadow-[12px_12px_0px_0px_#000] overflow-y-auto">
        <div class="flex items-center justify-between mb-4 border-b-3 border-black pb-4 flex-wrap gap-2">
          <div>
            <h3 class="font-black text-black text-xl uppercase">{previewCert.student.Name}</h3>
            <span class="text-xs font-bold text-slate-800">Template: {previewCert.template.name}</span>
          </div>

          <div class="flex items-center gap-2.5">
            <button
              onclick={() => previewCert && downloadSinglePng(previewCert)}
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-3 border-black text-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] cursor-pointer"
            >
              <Download class="w-4 h-4 stroke-[2.5]" />
              <span>Download PNG</span>
            </button>

            <button
              onclick={() => previewCert && downloadSinglePdf(previewCert)}
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 border-3 border-black text-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] cursor-pointer"
            >
              <FileText class="w-4 h-4 stroke-[2.5]" />
              <span>Download PDF</span>
            </button>

            <button
              onclick={() => previewCert = null}
              class="p-2 rounded-xl bg-rose-300 border-2 border-black text-black hover:bg-rose-400 transition-colors shadow-[2px_2px_0px_0px_#000] cursor-pointer"
            >
              <X class="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        </div>

        <div class="flex items-center justify-center p-4 bg-amber-50 rounded-2xl overflow-hidden border-3 border-black">
          <CertificateRenderer
            template={previewCert.template}
            student={previewCert.student}
            scale={0.7}
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- High-Energy Batch Progress Modal Overlay -->
  {#if isAnyExporting}
    <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-white border-4 border-black rounded-3xl p-8 max-w-md w-full shadow-[12px_12px_0px_0px_#000] text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        <div class="flex items-center justify-center gap-3">
          <div class="p-3 bg-lime-400 border-3 border-black rounded-2xl shadow-[3px_3px_0px_0px_#000] text-black">
            <Loader2 class="w-8 h-8 stroke-[3] animate-spin" />
          </div>
          <div class="text-left">
            <h3 class="font-black text-black text-base uppercase tracking-tight">{progressTitle}</h3>
            <p class="text-xs text-slate-700 font-bold mt-0.5">
              Processing certificate <span class="bg-yellow-300 px-1.5 py-0.5 border border-black rounded font-black text-black">{progressCurrent}</span> of {progressTotal}
            </p>
          </div>
        </div>

        <!-- Neo-Brutalist Animated Progress Bar -->
        <div class="w-full bg-slate-100 border-3 border-black rounded-2xl p-1 shadow-[4px_4px_0px_0px_#000] relative overflow-hidden">
          <div 
            class="h-6 rounded-xl bg-gradient-to-r from-yellow-400 via-lime-400 to-emerald-400 border-2 border-black transition-all duration-200 flex items-center justify-end pr-2 font-black text-[11px] text-black shadow-[1px_1px_0px_0px_#000]"
            style="width: {Math.max(progressPercent, 6)}%;"
          >
            {progressPercent}%
          </div>
        </div>

        <div class="bg-amber-100 border-2 border-black rounded-xl p-3 text-[11px] font-bold text-black flex items-center justify-center gap-2">
          <Sparkles class="w-4 h-4 text-purple-700 stroke-[2.5]" />
          <span>Rendering high-DPI graphics & typography...</span>
        </div>
      </div>
    </div>
  {/if}

</div>

<!-- Native Browser Print Container (Fires window.print() displaying pre-rendered A4 Landscape pages in default print dialog) -->
{#if printImages.length > 0}
  <div id="certflow_native_print_area" class="font-sans">
    {#each printImages as imgUrl}
      <div class="page-break">
        <img src={imgUrl} alt="Certificate Print Page" class="cert-print-img" />
      </div>
    {/each}
  </div>
{/if}

<style>
  #certflow_native_print_area {
    display: none;
  }

  @media print {
    @page {
      size: A4 landscape;
      margin: 0;
    }

    :global(body) {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    
    :global(body *) {
      visibility: hidden !important;
    }

    #certflow_native_print_area,
    #certflow_native_print_area * {
      visibility: visible !important;
    }

    #certflow_native_print_area {
      display: block !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }

    .page-break {
      width: 100vw !important;
      height: 100vh !important;
      max-height: 100vh !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    .cert-print-img {
      width: 100% !important;
      height: 100% !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      object-fit: contain !important;
      display: block !important;
    }
  }
</style>
