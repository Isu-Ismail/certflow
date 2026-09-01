<script lang="ts">
  import { appState } from '../../stores/appState.svelte';
  import { parseExcelFile, SAMPLE_DATASETS } from '../../utils/excelParser';
  import { 
    Upload, 
    FileSpreadsheet, 
    Check, 
    Copy, 
    Sparkles, 
    Search, 
    Database,
    Tag,
    AlertCircle,
    Zap,
    FileText,
    ArrowUpRight
  } from 'lucide-svelte';

  let isDragging = $state(false);
  let searchQuery = $state('');
  let copiedTag = $state<string | null>(null);
  let uploadError = $state<string | null>(null);
  let isUploading = $state(false);

  let filteredRecords = $derived(
    appState.dataset.records.filter(record => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return Object.values(record).some(val => String(val).toLowerCase().includes(q));
    })
  );

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      await processFile(target.files[0]);
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      await processFile(event.dataTransfer.files[0]);
    }
  }

  async function processFile(file: File) {
    isUploading = true;
    uploadError = null;
    try {
      const dataset = await parseExcelFile(file);
      appState.setDataset(dataset);
    } catch (err: any) {
      uploadError = err?.message || 'Failed to parse CSV/Excel file.';
    } finally {
      isUploading = false;
    }
  }

  function copyTag(col: string) {
    const tag = `{${col}}`;
    navigator.clipboard.writeText(tag);
    copiedTag = col;
    setTimeout(() => copiedTag = null, 2000);
  }

  function selectSampleDataset(sampleIdx: number) {
    appState.setDataset(SAMPLE_DATASETS[sampleIdx]);
  }
</script>

<div class="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
  
  <!-- Section 1: Upload & Sample Datasets -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
    
    <!-- Ultra-Entertaining Neo-Brutalist Drag & Drop Upload Zone -->
    <div class="lg:col-span-2 flex flex-col justify-between">
      <div 
        role="region"
        aria-label="CSV or Excel File Upload Dropzone"
        class={`relative flex-1 border-4 border-black rounded-3xl p-8 py-10 text-center transition-all flex flex-col items-center justify-between min-h-[300px] overflow-hidden cursor-pointer active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0px_0px_#000] ${
          isDragging 
            ? 'bg-amber-300 scale-[1.01] shadow-[10px_10px_0px_0px_#000]' 
            : 'bg-gradient-to-br from-amber-200 via-yellow-100 to-lime-200 shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] hover:-translate-y-1'
        }`}
        ondragover={(e) => { e.preventDefault(); isDragging = true; }}
        onmouseleave={() => isDragging = false}
        ondrop={handleDrop}
      >
        <!-- Background Neo-Brutalist Decorative Badges -->
        <div class="absolute -top-6 -left-6 w-24 h-24 bg-pink-300 rounded-full border-3 border-black opacity-30 pointer-events-none"></div>
        <div class="absolute -bottom-8 -right-8 w-32 h-32 bg-cyan-300 rounded-full border-3 border-black opacity-30 pointer-events-none"></div>
        
        <input 
          type="file" 
          accept=".csv, .xlsx, .xls" 
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
          onchange={handleFileSelect}
        />

        <!-- Center Interactive Icon & Call to Action -->
        <div class="flex flex-col items-center justify-center gap-3 my-2 z-10 pointer-events-none">
          <div class="group relative">
            <div class="w-20 h-20 rounded-3xl bg-cyan-300 border-4 border-black shadow-[5px_5px_0px_0px_#000] flex items-center justify-center text-black group-hover:bg-lime-400 group-hover:scale-110 transition-all">
              <Upload class="w-10 h-10 stroke-[3] text-black" />
            </div>
            <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-pink-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <Sparkles class="w-4 h-4 text-black fill-black" />
            </div>
          </div>

          <div>
            <h3 class="text-xl font-black uppercase text-black tracking-tight flex items-center justify-center gap-2">
              <span>Drop Student CSV / Excel Here</span>
            </h3>
            <p class="text-xs font-bold text-slate-800 mt-1">
              or click anywhere to browse local spreadsheet files
            </p>
          </div>

          <!-- Supported Extension Pills -->
          <div class="flex items-center justify-center gap-2 mt-1">
            <span class="bg-pink-400 text-black px-3 py-1 rounded-xl border-2 border-black font-mono font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:scale-105 transition-transform">.csv</span>
            <span class="bg-lime-400 text-black px-3 py-1 rounded-xl border-2 border-black font-mono font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:scale-105 transition-transform">.xlsx</span>
            <span class="bg-cyan-300 text-black px-3 py-1 rounded-xl border-2 border-black font-mono font-black text-xs shadow-[2px_2px_0px_0px_#000] hover:scale-105 transition-transform">.xls</span>
          </div>

          {#if isUploading}
            <span class="text-xs text-black font-black bg-lime-300 px-4 py-1.5 border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_#000] animate-pulse mt-1">
              ⚡ Parsing Spreadsheet Records...
            </span>
          {/if}
        </div>

        <!-- Bottom Action CTA Bar -->
        <div class="w-full flex items-center justify-center gap-2 bg-white/80 backdrop-blur-xs p-2 rounded-2xl border-3 border-black shadow-[3px_3px_0px_0px_#000] z-10">
          <FileText class="w-4 h-4 text-black stroke-[2.5]" />
          <span class="text-xs font-black text-black uppercase">Click to Select CSV File</span>
          <ArrowUpRight class="w-4 h-4 text-black stroke-[3]" />
        </div>
      </div>

      {#if uploadError}
        <div class="mt-3 p-3 rounded-2xl bg-rose-200 border-3 border-black shadow-[4px_4px_0px_0px_#000] flex items-center gap-2 text-xs font-bold text-black">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      {/if}
    </div>

    <!-- Sample Datasets Selector Card -->
    <div class="bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_#000] flex flex-col justify-between min-h-[300px]">
      <div>
        <div class="flex items-center gap-2 text-black font-black text-sm uppercase mb-3 border-b-3 border-black pb-2">
          <Sparkles class="w-4 h-4 text-pink-500 fill-pink-500" />
          <span>Or Load Sample Data</span>
        </div>
        <p class="text-xs text-slate-700 font-semibold mb-4">
          Test immediately with pre-configured student datasets containing positions, grades, and certificates.
        </p>

        <div class="space-y-3">
          {#each SAMPLE_DATASETS as sample, idx}
            <button
              onclick={() => selectSampleDataset(idx)}
              class={`w-full text-left p-3.5 rounded-2xl border-3 border-black text-xs transition-all flex items-center justify-between font-bold cursor-pointer ${
                appState.dataset.name === sample.name
                  ? 'bg-lime-300 text-black shadow-[4px_4px_0px_0px_#000] -translate-y-0.5'
                  : 'bg-slate-50 text-slate-900 hover:bg-yellow-100 hover:shadow-[3px_3px_0px_0px_#000]'
              }`}
            >
              <div class="flex items-center gap-2.5">
                <FileSpreadsheet class="w-4 h-4 text-black stroke-[2.5]" />
                <span class="truncate">{sample.name}</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-lg bg-black text-white font-extrabold shrink-0">
                {sample.records.length} rows
              </span>
            </button>
          {/each}
        </div>
      </div>

      <div class="mt-4 pt-4 border-t-3 border-black text-xs text-black font-bold flex items-center justify-between">
        <span>Active Dataset:</span>
        <span class="bg-cyan-300 px-2.5 py-1 rounded-xl border-2 border-black font-extrabold shadow-[2px_2px_0px_0px_#000]">{appState.dataset.name}</span>
      </div>
    </div>
  </div>

  <!-- Section 2: Detected Placeholder Tags -->
  <div class="bg-white border-3 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_#000]">
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div class="flex items-center gap-2 text-black font-black text-sm uppercase">
        <Tag class="w-4 h-4 text-black" />
        <span>Available Field Placeholders ({appState.dataset.columns.length})</span>
      </div>
      <span class="text-xs text-slate-700 font-semibold">Click tag to copy placeholder into your clipboard</span>
    </div>

    <div class="flex flex-wrap gap-2.5">
      {#each appState.dataset.columns as col}
        <button
          onclick={() => copyTag(col)}
          class="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-yellow-200 border-2 border-black text-xs font-mono font-bold text-black shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-300 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
        >
          <span>{`{${col}}`}</span>
          {#if copiedTag === col}
            <Check class="w-3.5 h-3.5 text-black stroke-[3]" />
          {:else}
            <Copy class="w-3.5 h-3.5 text-slate-800" />
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Section 3: Records Data Table -->
  <div class="bg-white border-3 border-black rounded-3xl overflow-hidden shadow-[6px_6px_0px_0px_#000]">
    <div class="p-4 border-b-3 border-black bg-cyan-200 flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-2">
        <Database class="w-5 h-5 text-black stroke-[2.5]" />
        <h3 class="font-black text-black text-sm uppercase">Imported Records ({filteredRecords.length})</h3>
      </div>

      <div class="relative w-full sm:w-64">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black font-bold" />
        <input 
          type="text" 
          bind:value={searchQuery}
          placeholder="Filter records..."
          class="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-bold text-black placeholder-slate-500 focus:outline-none shadow-[2px_2px_0px_0px_#000]"
        />
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs text-black">
        <thead class="bg-yellow-300 text-black font-black uppercase border-b-3 border-black">
          <tr>
            <th class="py-3 px-4 w-12 border-r-2 border-black">#</th>
            {#each appState.dataset.columns as col}
              <th class="py-3 px-4 whitespace-nowrap border-r-2 border-black last:border-r-0">{col}</th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y-2 divide-black">
          {#each filteredRecords as record, idx}
            <tr class="hover:bg-yellow-50 transition-colors font-semibold">
              <td class="py-3 px-4 font-mono font-bold border-r-2 border-black">{idx + 1}</td>
              {#each appState.dataset.columns as col}
                <td class="py-3 px-4 whitespace-nowrap border-r-2 border-black last:border-r-0">
                  {record[col] ?? '-'}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

</div>
