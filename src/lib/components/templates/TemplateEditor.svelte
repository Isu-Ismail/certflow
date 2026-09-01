<script lang="ts">
  import { appState } from '../../stores/appState.svelte';
  import { modalStore } from '../../stores/modalStore.svelte';
  import CertificateRenderer from '../common/CertificateRenderer.svelte';
  import TemplateCard from './TemplateCard.svelte';
  import type { CanvasElement, CertificateTemplate, AssetFile } from '../../types';
  import { openHtmlEditorInNewTab } from '../../utils/htmlEditorWindow';
  import { openLayoutInspectorInNewTab } from '../../utils/layoutInspectorWindow';
  import { parseHtmlToCanvasElements } from '../../utils/htmlParser';
  import { 
    Plus, 
    Type, 
    Trash2, 
    Tag, 
    Layout, 
    Move,
    Image as ImageIcon,
    FileCode,
    ZoomIn,
    ZoomOut,
    Eraser,
    FolderOpen,
    Copy,
    Check,
    Ruler,
    Zap,
    ExternalLink,
    Lightbulb,
    X
  } from 'lucide-svelte';

  let activeTemplate = $derived(appState.activeTemplate);
  let selectedElementId = $state<string | null>(null);
  let canvasScale = $state<number>(0.65);
  let isEditingHtml = $state<boolean>(false);
  let copiedAssetPath = $state<string | null>(null);

  // Derive selected element safely
  let selectedElement = $derived(
    activeTemplate.elements.find(el => el.id === selectedElementId) || activeTemplate.elements[0] || null
  );

  function createNewTemplate() {
    const newTpl: CertificateTemplate = {
      id: `tpl_${Date.now()}`,
      name: `Custom Template ${appState.templates.length + 1}`,
      description: 'Custom certificate layout',
      badgeColor: '#22D3EE',
      width: 1056,
      height: 747,
      aspectRatioName: 'A4 Landscape',
      backgroundColor: '#FFFFFF',
      borderColor: '#000000',
      secondaryBorderColor: '#EC4899',
      borderWidth: 8,
      borderPadding: 16,
      borderStyle: 'solid',
      elements: []
    };
    appState.addTemplate(newTpl);
    selectedElementId = null;
  }

  // Handle Asset File Upload to Virtual File Explorer
  function handleAssetUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newAsset: AssetFile = {
          id: `asset_${Date.now()}`,
          name: file.name,
          path: `./${file.name}`,
          dataUrl,
          size: file.size,
          type: file.type
        };
        appState.addAsset(newAsset);
      };
      reader.readAsDataURL(file);
    }
  }

  function copyAssetPath(path: string) {
    navigator.clipboard.writeText(path);
    copiedAssetPath = path;
    setTimeout(() => copiedAssetPath = null, 2000);
  }

  // Add a new editable Text Box layer directly to canvas
  function addTextBox(presetContent: string = 'Enter text or {Name}') {
    const ts = Date.now();
    const newEl: CanvasElement = {
      id: `el_${ts}`,
      type: 'text',
      x: 50,
      y: 50,
      content: presetContent,
      fontSize: 28,
      fontFamily: 'serif',
      fontWeight: 'bold',
      color: activeTemplate.backgroundColor === '#FFFFFF' ? '#000000' : '#FACC15',
      textAlign: 'center'
    };

    const updatedElements = [...activeTemplate.elements, newEl];
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: updatedElements
    });
    selectedElementId = newEl.id;
  }

  // Handle Logo / Image Upload to Canvas
  function handleLogoUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgDataUrl = e.target?.result as string;
        // Also register in Virtual Asset Store
        appState.addAsset({
          id: `asset_${Date.now()}`,
          name: file.name,
          path: `./${file.name}`,
          dataUrl: imgDataUrl
        });

        const newImgEl: CanvasElement = {
          id: `el_img_${Date.now()}`,
          type: 'image',
          x: 50,
          y: 75,
          width: 120,
          height: 120,
          content: `./${file.name}`
        };
        const updatedElements = [...activeTemplate.elements, newImgEl];
        appState.updateActiveTemplate({
          ...activeTemplate,
          elements: updatedElements
        });
        selectedElementId = newImgEl.id;
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle Custom HTML File Upload
  function handleHtmlFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const htmlContent = e.target?.result as string;
        const newHtmlTpl: CertificateTemplate = {
          id: `tpl_html_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          description: 'Uploaded custom HTML template',
          badgeColor: '#EC4899',
          width: 1056,
          height: 747,
          aspectRatioName: 'A4 Landscape',
          backgroundColor: '#FFFFFF',
          borderColor: '#000000',
          borderStyle: 'none',
          customHtml: htmlContent,
          elements: []
        };
        appState.addTemplate(newHtmlTpl);
      };
      reader.readAsText(file);
    }
  }

  // Handle Background Image Upload
  function handleBackgroundImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgDataUrl = e.target?.result as string;
        // Register in virtual asset store
        appState.addAsset({
          id: `asset_${Date.now()}`,
          name: file.name,
          path: `./${file.name}`,
          dataUrl: imgDataUrl
        });
        updateTemplateProperty('backgroundImage', `./${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }

  function deleteSelectedElement(targetId: string | null = selectedElementId) {
    if (!targetId) return;
    const updatedElements = activeTemplate.elements.filter(el => el.id !== targetId);
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: updatedElements
    });
    selectedElementId = updatedElements[0]?.id || null;
  }

  function clearAllElements() {
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: []
    });
    selectedElementId = null;
  }

  function convertHtmlToCanvasElements() {
    if (!activeTemplate.customHtml) return;
    const parsed = parseHtmlToCanvasElements(activeTemplate.customHtml, appState.assets);
    
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: parsed.elements,
      backgroundImage: parsed.backgroundImage || activeTemplate.backgroundImage,
      customHtml: undefined
    });

    selectedElementId = null;
    modalStore.showAlert(
      'Successfully converted HTML template to interactive drag & resize canvas elements! You can now drag and resize all images, logos, and text elements live on screen.',
      'HTML Canvas Converted',
      'success'
    );
  }

  function insertTagIntoSelected(tag: string) {
    if (!selectedElement) return;
    const updatedContent = selectedElement.content + ` {${tag}}`;
    updateSelectedElementProperty('content', updatedContent);
  }

  function updateSelectedElementContent(id: string, newContent: string) {
    const updatedElements = activeTemplate.elements.map(el => {
      if (el.id === id) {
        return { ...el, content: newContent };
      }
      return el;
    });
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: updatedElements
    });
  }

  function updateSelectedElementProperty(key: keyof CanvasElement, value: any) {
    if (!selectedElement) return;
    const updatedElements = activeTemplate.elements.map(el => {
      if (el.id === selectedElement.id) {
        return { ...el, [key]: value };
      }
      return el;
    });
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: updatedElements
    });
  }

  function updateSelectedElementPosition(id: string, x: number, y: number) {
    const updatedElements = activeTemplate.elements.map(el => {
      if (el.id === id) {
        return { ...el, x, y };
      }
      return el;
    });
    appState.updateActiveTemplate({
      ...activeTemplate,
      elements: updatedElements
    });
  }

  function updateTemplateProperty(key: keyof CertificateTemplate, value: any) {
    appState.updateActiveTemplate({
      ...activeTemplate,
      [key]: value
    });
  }
</script>

<div class="h-[calc(100vh-5rem)] flex flex-col lg:flex-row overflow-hidden bg-amber-50">
  
  <!-- Left Sidebar: Templates Manager, HTML Importer & Asset File Explorer -->
  <aside class="w-full lg:w-80 border-r-4 border-black bg-white p-4 flex flex-col gap-4 overflow-y-auto">
    <div class="flex items-center justify-between">
      <h3 class="font-black text-black text-sm uppercase">Templates Library</h3>
      <div class="flex items-center gap-1.5">
        <button
          onclick={createNewTemplate}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-lime-300 border-2 border-black text-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5 stroke-[3]" />
          <span>New</span>
        </button>
      </div>
    </div>

    <!-- Upload Custom HTML Template Button -->
    <div class="p-3 rounded-2xl bg-cyan-200 border-3 border-black shadow-[3px_3px_0px_0px_#000]">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-black uppercase text-black flex items-center gap-1.5">
          <FileCode class="w-4 h-4 stroke-[2.5]" />
          Import HTML Template
        </span>
      </div>
      <p class="text-[11px] font-bold text-slate-800 mb-2">
        Upload an .html file with placeholders like <code class="bg-white px-1 border border-black">{`{Name}`}</code> & images like <code class="bg-white px-1 border border-black">&lt;img src="./logo.png"&gt;</code>
      </p>
      <label class="block w-full text-center px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-100 cursor-pointer">
        <span>+ Choose HTML File</span>
        <input type="file" accept=".html, .htm" class="hidden" onchange={handleHtmlFileUpload} />
      </label>
    </div>

    <!-- Asset Files Explorer (For HTML & Template Assets) -->
    <div class="p-3 rounded-2xl bg-yellow-200 border-3 border-black shadow-[3px_3px_0px_0px_#000] space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-black uppercase text-black flex items-center gap-1.5">
          <FolderOpen class="w-4 h-4 text-black stroke-[2.5]" />
          Project Asset Files ({appState.assets.length})
        </span>
      </div>
      <p class="text-[11px] font-bold text-slate-800">
        Upload logos & backgrounds to use paths like <code class="bg-white px-1 border border-black">./logo.png</code> inside HTML:
      </p>

      <label class="block w-full text-center px-3 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] hover:bg-lime-300 cursor-pointer">
        <span>+ Upload Asset Image</span>
        <input type="file" accept="image/*" class="hidden" onchange={handleAssetUpload} />
      </label>

      {#if appState.assets.length > 0}
        <div class="space-y-1.5 pt-2 border-t-2 border-black max-h-36 overflow-y-auto">
          {#each appState.assets as asset (asset.id)}
            <div class="flex items-center justify-between bg-white border-2 border-black rounded-xl p-1.5 text-xs font-bold text-black shadow-[1px_1px_0px_0px_#000]">
              <div class="flex items-center gap-1.5 truncate">
                <img src={asset.dataUrl} alt={asset.name} class="w-5 h-5 rounded object-cover border border-black" />
                <span class="truncate font-mono text-[11px]">{asset.path}</span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  onclick={() => copyAssetPath(asset.path)}
                  class="p-1 rounded bg-yellow-300 border border-black hover:bg-yellow-400 text-[10px]"
                  title="Copy path for HTML src attribute"
                >
                  {#if copiedAssetPath === asset.path}
                    <Check class="w-3 h-3 text-black stroke-[3]" />
                  {:else}
                    <Copy class="w-3 h-3 stroke-[2.5]" />
                  {/if}
                </button>
                <button
                  type="button"
                  onclick={() => appState.deleteAsset(asset.id)}
                  class="p-1 rounded bg-rose-300 border border-black hover:bg-rose-400 text-[10px]"
                  title="Delete asset file"
                >
                  <Trash2 class="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Template Cards -->
    <div class="space-y-3">
      {#each appState.templates as tpl (tpl.id)}
        <TemplateCard template={tpl} />
      {/each}
    </div>

    <!-- Column Tags Assistant -->
    <div class="mt-auto pt-4 border-t-3 border-black">
      <div class="flex items-center gap-1.5 text-xs text-black font-black uppercase mb-2">
        <Tag class="w-4 h-4 text-pink-500 fill-pink-500" />
        <span>Insert Data Placeholders</span>
      </div>
      <p class="text-[11px] text-slate-700 font-semibold mb-2">
        Click to append column tag into active text element:
      </p>
      <div class="flex flex-wrap gap-1.5">
        {#each appState.dataset.columns as col}
          <button
            onclick={() => insertTagIntoSelected(col)}
            class="px-2.5 py-1 rounded-lg bg-yellow-200 hover:bg-yellow-300 border-2 border-black text-[11px] font-mono font-bold text-black shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer"
          >
            +{col}
          </button>
        {/each}
      </div>
    </div>
  </aside>

  <!-- Center Canvas Workspace with Interactive Drag & Drop -->
  <main class="flex-1 bg-amber-50/40 p-6 flex flex-col items-center justify-between overflow-auto relative">
    
    <!-- Single Horizontal Line Toolbar (Scrollable Horizontally, Generous Vertical Padding py-4 for Zero Clipping) -->
    <div class="w-full flex items-center justify-between gap-3 mb-2 py-4 px-2 overflow-x-auto whitespace-nowrap scrollbar-none">
      
      <!-- Left Controls: Name Input + Action Buttons (Single Row) -->
      <div class="flex items-center gap-2.5 shrink-0">
        <div class="flex items-center gap-2 shrink-0">
          <label for="tpl_name_input" class="text-xs font-black text-black uppercase shrink-0">Template Name:</label>
          <input 
            id="tpl_name_input"
            type="text" 
            value={activeTemplate.name}
            oninput={(e) => updateTemplateProperty('name', e.currentTarget.value)}
            class="bg-yellow-100 border-2 border-black px-3 py-1.5 rounded-xl text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] focus:outline-none w-48 shrink-0"
          />
        </div>

        {#if activeTemplate.customHtml}
          <button 
            onclick={convertHtmlToCanvasElements}
            class="px-3.5 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all whitespace-nowrap shrink-0"
            title="Convert HTML template to interactive drag & drop, resizable canvas elements"
          >
            <Zap class="w-4 h-4 fill-black stroke-[2.5] shrink-0" />
            <span>Convert HTML to Canvas</span>
          </button>

          <button 
            onclick={() => openHtmlEditorInNewTab(activeTemplate.id)}
            class="px-3.5 py-1.5 rounded-xl bg-pink-300 hover:bg-pink-400 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all whitespace-nowrap shrink-0"
            title="Open full-screen HTML Code Studio in a new tab"
          >
            <FileCode class="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Open HTML Editor</span>
            <ExternalLink class="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          </button>

          <button 
            onclick={() => openLayoutInspectorInNewTab(activeTemplate.id)}
            class="px-3.5 py-1.5 rounded-xl bg-cyan-300 hover:bg-cyan-400 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all whitespace-nowrap shrink-0"
            title="Open Layout & Spacing Blueprint Inspector in a new tab"
          >
            <Ruler class="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Layout Inspector</span>
            <ExternalLink class="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          </button>
        {/if}

        {#if !activeTemplate.customHtml}
          <button
            onclick={() => addTextBox('Enter text or {Name}')}
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-yellow-300 hover:bg-yellow-400 border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Type class="w-4 h-4 stroke-[3] shrink-0" />
            <span>+ Add Text Box</span>
          </button>

          <label class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pink-300 hover:bg-pink-400 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer whitespace-nowrap shrink-0">
            <ImageIcon class="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>+ Add Image</span>
            <input type="file" accept="image/*" class="hidden" onchange={handleLogoUpload} />
          </label>

          {#if activeTemplate.elements.length > 0}
            <button
              onclick={clearAllElements}
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-300 hover:bg-rose-400 border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Clear all elements from canvas"
            >
              <Eraser class="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Clear Canvas</span>
            </button>
          {/if}
        {/if}
      </div>

      <!-- Right Zoom Controls (On Same Line) -->
      <div class="flex items-center gap-2 bg-yellow-200 px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0">
        <ZoomOut class="w-4 h-4 text-black cursor-pointer hover:scale-110 shrink-0" onclick={() => canvasScale = Math.max(0.3, canvasScale - 0.05)} />
        <span class="text-xs font-black w-10 text-center shrink-0">{Math.round(canvasScale * 100)}%</span>
        <ZoomIn class="w-4 h-4 text-black cursor-pointer hover:scale-110 shrink-0" onclick={() => canvasScale = Math.min(1.2, canvasScale + 0.05)} />
      </div>

    </div>

    <!-- Centered Canvas Container with Interactive Drag & Drop -->
    <div class="flex-1 flex items-center justify-center p-4 w-full">
      <div class="p-4 rounded-3xl bg-white border-4 border-black shadow-[10px_10px_0px_0px_#000] flex items-center justify-center">
        <CertificateRenderer 
          template={activeTemplate} 
          scale={canvasScale} 
          selectedElementId={selectedElementId}
          onSelectElement={(id: string) => selectedElementId = id}
          onDragElement={(id: string, newX: number, newY: number) => updateSelectedElementPosition(id, newX, newY)}
          onUpdateElementContent={(id: string, newContent: string) => updateSelectedElementContent(id, newContent)}
          onDeleteElement={(id: string) => deleteSelectedElement(id)}
        />
      </div>
    </div>
    
    <div class="text-[11px] font-black uppercase text-slate-800 bg-yellow-300 px-3 py-1 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_#000] flex items-center gap-1.5">
      <Lightbulb class="w-4 h-4 text-black stroke-[2.5]" />
      <span>Tip: Use <code class="bg-white px-1 border border-black font-bold">./logo.png</code> in HTML to load images from Project Asset Files!</span>
    </div>
  </main>

  <!-- Right Inspector Panel -->
  <aside class="w-full lg:w-80 border-l-4 border-black bg-white p-4 overflow-y-auto space-y-6">
    
    <!-- Template Background & Multiple Borders Settings -->
    <div class="space-y-4">
      <div class="flex items-center gap-2 text-black font-black text-sm uppercase border-b-3 border-black pb-2">
        <Layout class="w-4 h-4 text-black stroke-[2.5]" />
        <span>Canvas Styles & Frames</span>
      </div>

      <div class="space-y-3 text-xs">
        
        <!-- Upload Custom Background Image -->
        <div>
          <label class="block text-slate-800 font-bold mb-1 flex items-center gap-1.5">
            <ImageIcon class="w-4 h-4 text-pink-500" />
            Background Image
          </label>
          <div class="flex items-center gap-2">
            <label class="flex-1 text-center px-3 py-1.5 rounded-xl bg-yellow-200 border-2 border-black text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-300 cursor-pointer">
              <span>{activeTemplate.backgroundImage ? 'Change Image' : 'Upload Background'}</span>
              <input type="file" accept="image/*" class="hidden" onchange={handleBackgroundImageUpload} />
            </label>
            {#if activeTemplate.backgroundImage}
              <button 
                onclick={() => updateTemplateProperty('backgroundImage', undefined)}
                class="px-2 py-1.5 rounded-xl bg-rose-300 border-2 border-black font-bold text-xs shadow-[2px_2px_0px_0px_#000]"
                title="Remove background image"
              >
                <X class="w-4 h-4" />
              </button>
            {/if}
          </div>
        </div>

        <div>
          <span class="block text-slate-800 font-bold mb-1">Dimensions</span>
          <div class="grid grid-cols-2 gap-2">
            <button 
              onclick={() => { updateTemplateProperty('width', 1056); updateTemplateProperty('height', 747); updateTemplateProperty('aspectRatioName', 'A4 Landscape'); }}
              class={`p-2 rounded-xl border-2 border-black text-center font-bold ${activeTemplate.width === 1056 ? 'bg-lime-300 text-black shadow-[3px_3px_0px_0px_#000]' : 'bg-slate-50 text-slate-800'}`}
            >
              A4 Landscape
            </button>
            <button 
              onclick={() => { updateTemplateProperty('width', 747); updateTemplateProperty('height', 1056); updateTemplateProperty('aspectRatioName', 'A4 Portrait'); }}
              class={`p-2 rounded-xl border-2 border-black text-center font-bold ${activeTemplate.width === 747 ? 'bg-lime-300 text-black shadow-[3px_3px_0px_0px_#000]' : 'bg-slate-50 text-slate-800'}`}
            >
              A4 Portrait
            </button>
          </div>
        </div>

        <!-- Multiple Borders Style Selector -->
        <div>
          <label for="tpl_border_style" class="block text-slate-800 font-bold mb-1">Border & Frame Style</label>
          <select 
            id="tpl_border_style"
            value={activeTemplate.borderStyle || 'gold-classic'}
            onchange={(e) => updateTemplateProperty('borderStyle', e.currentTarget.value)}
            class="w-full bg-yellow-100 border-2 border-black rounded-xl p-2 font-bold text-black focus:outline-none"
          >
            <option value="gold-classic">Gold Classic Ornate Frame</option>
            <option value="triple-gold">Triple Layer Gold Frame</option>
            <option value="canvas-frame">Canva Multi-Color Frame</option>
            <option value="double">Modern Double Border</option>
            <option value="solid">Simple Solid Border</option>
            <option value="none">No Border</option>
          </select>
        </div>

        <!-- Colors & Padding -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="tpl_bg_color" class="block text-slate-800 font-bold mb-1">Background</label>
            <input 
              id="tpl_bg_color"
              type="color" 
              value={activeTemplate.backgroundColor || '#0F172A'}
              oninput={(e) => updateTemplateProperty('backgroundColor', e.currentTarget.value)}
              class="w-full h-9 bg-white border-2 border-black rounded-xl cursor-pointer"
            />
          </div>
          <div>
            <label for="tpl_border_color" class="block text-slate-800 font-bold mb-1">Primary Frame</label>
            <input 
              id="tpl_border_color"
              type="color" 
              value={activeTemplate.borderColor || '#EAB308'}
              oninput={(e) => updateTemplateProperty('borderColor', e.currentTarget.value)}
              class="w-full h-9 bg-white border-2 border-black rounded-xl cursor-pointer"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="tpl_sec_border" class="block text-slate-800 font-bold mb-1">Inner Frame</label>
            <input 
              id="tpl_sec_border"
              type="color" 
              value={activeTemplate.secondaryBorderColor || '#EC4899'}
              oninput={(e) => updateTemplateProperty('secondaryBorderColor', e.currentTarget.value)}
              class="w-full h-9 bg-white border-2 border-black rounded-xl cursor-pointer"
            />
          </div>
          <div>
            <label for="tpl_padding" class="block text-slate-800 font-bold mb-1">Frame Padding ({activeTemplate.borderPadding || 16}px)</label>
            <input 
              id="tpl_padding"
              type="range" 
              min="0" 
              max="40"
              value={activeTemplate.borderPadding || 16}
              oninput={(e) => updateTemplateProperty('borderPadding', Number(e.currentTarget.value))}
              class="w-full accent-black"
            />
          </div>
        </div>

      </div>
    </div>

    <!-- Active Element Inspector -->
    {#if !activeTemplate.customHtml}
      <div class="space-y-4 pt-4 border-t-3 border-black">
        <div class="flex items-center justify-between border-b-3 border-black pb-2">
          <div class="flex items-center gap-2 text-black font-black text-sm uppercase">
            <Type class="w-4 h-4 text-black stroke-[2.5]" />
            <span>Element Inspector</span>
          </div>
          {#if selectedElement}
            <button 
              onclick={() => deleteSelectedElement(selectedElement.id)} 
              class="text-black bg-rose-300 border-2 border-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] hover:bg-rose-400 cursor-pointer"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Delete Layer</span>
            </button>
          {/if}
        </div>

        {#if activeTemplate.elements.length === 0}
          <div class="p-4 bg-yellow-100 border-2 border-black rounded-2xl text-center text-xs font-bold text-slate-800">
            No layers on canvas. Click <strong class="text-black uppercase">+ Add Text Box</strong> above to create a layer!
          </div>
        {:else}
          <!-- Select Element Dropdown -->
          <div>
            <label for="layer_el_select" class="block text-xs text-slate-800 font-bold mb-1">Select Layer Element ({activeTemplate.elements.length})</label>
            <select 
              id="layer_el_select"
              value={selectedElement?.id}
              onchange={(e) => selectedElementId = e.currentTarget.value}
              class="w-full bg-cyan-100 border-2 border-black rounded-xl p-2 text-xs font-bold text-black focus:outline-none shadow-[2px_2px_0px_0px_#000]"
            >
              {#each activeTemplate.elements as el}
                <option value={el.id}>{el.type === 'image' ? `🖼️ Image (${el.content})` : el.content.slice(0, 25) || 'Text Element'}</option>
              {/each}
            </select>
          </div>

          {#if selectedElement}
            <div class="space-y-3 text-xs font-bold">
              
              {#if selectedElement.type === 'image'}
                <!-- Image Properties (Width / Height) -->
                <div>
                  <label for="img_path_input" class="block text-slate-800 mb-1">Image Path / Source</label>
                  <input 
                    id="img_path_input"
                    type="text"
                    value={selectedElement.content}
                    oninput={(e) => updateSelectedElementProperty('content', e.currentTarget.value)}
                    placeholder="e.g. ./logo.png"
                    class="w-full bg-white border-2 border-black rounded-xl p-2 text-black font-mono text-xs focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label for="img_width_input" class="block text-slate-800 mb-1">Logo Width ({selectedElement.width || 120}px)</label>
                  <input 
                    id="img_width_input"
                    type="range" 
                    min="40" 
                    max="400" 
                    value={selectedElement.width || 120}
                    oninput={(e) => updateSelectedElementProperty('width', Number(e.currentTarget.value))}
                    class="w-full accent-black"
                  />
                </div>

                <div>
                  <label for="img_height_input" class="block text-slate-800 mb-1">Logo Height ({selectedElement.height || 120}px)</label>
                  <input 
                    id="img_height_input"
                    type="range" 
                    min="40" 
                    max="400" 
                    value={selectedElement.height || 120}
                    oninput={(e) => updateSelectedElementProperty('height', Number(e.currentTarget.value))}
                    class="w-full accent-black"
                  />
                </div>
              {:else}
                <!-- Text Element Properties -->
                <div>
                  <label for="el_content_text" class="block text-slate-800 mb-1">Text Content / Placeholder</label>
                  <textarea 
                    id="el_content_text"
                    rows="2"
                    value={selectedElement.content}
                    oninput={(e) => updateSelectedElementProperty('content', e.currentTarget.value)}
                    class="w-full bg-white border-2 border-black rounded-xl p-2 text-black font-mono text-xs focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                  ></textarea>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="el_font_size" class="block text-slate-800 mb-1">Size ({selectedElement.fontSize || 18}px)</label>
                    <input 
                      id="el_font_size"
                      type="range" 
                      min="10" 
                      max="100" 
                      value={selectedElement.fontSize || 18}
                      oninput={(e) => updateSelectedElementProperty('fontSize', Number(e.currentTarget.value))}
                      class="w-full accent-black"
                    />
                  </div>

                  <div>
                    <label for="el_text_color" class="block text-slate-800 mb-1">Text Color</label>
                    <input 
                      id="el_text_color"
                      type="color" 
                      value={selectedElement.color || '#FFFFFF'}
                      oninput={(e) => updateSelectedElementProperty('color', e.currentTarget.value)}
                      class="w-full h-8 bg-white border-2 border-black rounded-xl cursor-pointer"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="el_font_family" class="block text-slate-800 mb-1">Font Family</label>
                    <select 
                      id="el_font_family"
                      value={selectedElement.fontFamily || 'serif'}
                      onchange={(e) => updateSelectedElementProperty('fontFamily', e.currentTarget.value)}
                      class="w-full bg-yellow-100 border-2 border-black rounded-xl p-1.5 text-black font-bold"
                    >
                      <option value="serif">Classic Serif</option>
                      <option value="sans-serif">Modern Sans</option>
                      <option value="monospace">Monospace</option>
                      <option value="cursive">Cursive</option>
                    </select>
                  </div>

                  <div>
                    <label for="el_font_weight" class="block text-slate-800 mb-1">Font Weight</label>
                    <select 
                      id="el_font_weight"
                      value={selectedElement.fontWeight || 'normal'}
                      onchange={(e) => updateSelectedElementProperty('fontWeight', e.currentTarget.value)}
                      class="w-full bg-yellow-100 border-2 border-black rounded-xl p-1.5 text-black font-bold"
                    >
                      <option value="normal">Normal</option>
                      <option value="semibold">Semi-Bold</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                </div>
              {/if}

              <!-- Drag & Drop Position Sliders -->
              <div class="space-y-2 pt-2 border-t-2 border-black">
                <div class="flex items-center gap-1 text-black font-extrabold">
                  <Move class="w-3.5 h-3.5 stroke-[3]" />
                  <span>Drag & Position (X / Y)</span>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label for="el_pos_x" class="block text-[11px] text-slate-800 font-bold">X Pos ({selectedElement.x}%)</label>
                    <input 
                      id="el_pos_x"
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedElement.x}
                      oninput={(e) => updateSelectedElementProperty('x', Number(e.currentTarget.value))}
                      class="w-full accent-black"
                    />
                  </div>

                  <div>
                    <label for="el_pos_y" class="block text-[11px] text-slate-800 font-bold">Y Pos ({selectedElement.y}%)</label>
                    <input 
                      id="el_pos_y"
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedElement.y}
                      oninput={(e) => updateSelectedElementProperty('y', Number(e.currentTarget.value))}
                      class="w-full accent-black"
                    />
                  </div>
                </div>
              </div>

            </div>
          {/if}
        {/if}
      </div>
    {/if}

  </aside>

</div>

<!-- Custom HTML Code Editor Modal -->
{#if isEditingHtml}
  <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-white border-4 border-black rounded-3xl p-6 max-w-4xl w-full max-h-[85vh] flex flex-col justify-between shadow-[12px_12px_0px_0px_#000]">
      <div class="flex items-center justify-between mb-3 pb-3 border-b-3 border-black">
        <h3 class="font-black text-black text-lg uppercase flex items-center gap-2">
          <FileCode class="w-5 h-5 text-pink-500" />
          <span>Edit Custom HTML Template Code</span>
        </h3>
        <button 
          onclick={() => isEditingHtml = false} 
          class="p-1.5 rounded-xl bg-rose-300 border-2 border-black text-black font-bold shadow-[2px_2px_0px_0px_#000]"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <textarea
        rows="16"
        value={activeTemplate.customHtml || ''}
        oninput={(e) => updateTemplateProperty('customHtml', e.currentTarget.value)}
        class="w-full bg-slate-900 text-yellow-300 font-mono text-xs p-4 border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] focus:outline-none"
      ></textarea>

      <div class="mt-4 flex justify-end">
        <button
          onclick={() => isEditingHtml = false}
          class="px-5 py-2 rounded-xl bg-lime-400 border-3 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000]"
        >
          Save & Close
        </button>
      </div>
    </div>
  </div>
{/if}
