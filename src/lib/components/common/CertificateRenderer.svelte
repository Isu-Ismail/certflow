<script lang="ts">
  import type { CertificateTemplate, StudentRecord, CanvasElement } from '../../types';
  import { interpolateText, resolveAssetUrls } from '../../utils/exporter';
  import { appState } from '../../stores/appState.svelte';
  import { Check, Tag, Edit3, Trash2, Maximize2 } from 'lucide-svelte';

  export interface CertificateRendererProps {
    template: CertificateTemplate;
    student?: StudentRecord | null;
    scale?: number;
    elementId?: string;
    selectedElementId?: string | null;
    onSelectElement?: ((id: string) => void) | null;
    onDragElement?: ((id: string, newX: number, newY: number) => void) | null;
    onUpdateElementContent?: ((id: string, newContent: string) => void) | null;
    onDeleteElement?: ((id: string) => void) | null;
  }

  let { 
    template, 
    student = null, 
    scale = 1, 
    elementId = '',
    selectedElementId = null,
    onSelectElement = null,
    onDragElement = null,
    onUpdateElementContent = null,
    onDeleteElement = null
  }: CertificateRendererProps = $props();

  const dummyStudent: StudentRecord = {
    id: 'preview_std',
    Name: 'John Doe',
    Position: '1',
    Project_Name: 'Innovation AI System',
    Track: 'Artificial Intelligence',
    Score: '98',
    Course: 'Full-Stack Development',
    Grade: 'A+',
    Issue_Date: 'August 31, 2026',
    Certificate_ID: 'CERT-2026-999',
    Roll_Number: '20261001',
    Department: 'Department of Computer Technology',
    Experiment_Name: 'Virtualization of Digital Storage Oscilloscope',
    Team_ID: 'TEAM-01'
  };

  let activeData = $derived(student || dummyStudent);
  let scaledWidth = $derived(template.width * scale);
  let scaledHeight = $derived(template.height * scale);

  let resolvedBgImage = $derived(
    template.backgroundImage ? resolveAssetUrls(template.backgroundImage, appState.assets) : ''
  );

  // Formulate isolated srcdoc for HTML template iframe rendering
  let compiledIframeSrcdoc = $derived.by(() => {
    if (!template.customHtml) return '';
    let interpolated = interpolateText(template.customHtml, activeData);
    let resolved = resolveAssetUrls(interpolated, appState.assets);
    
    if (!resolved.includes('<head>')) {
      return `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:${template.width}px;height:${template.height}px;overflow:hidden;box-sizing:border-box;}</style></head><body>${resolved}</body></html>`;
    }
    return resolved.replace('</head>', `<style>html,body{margin:0;padding:0;width:${template.width}px;height:${template.height}px;overflow:hidden;box-sizing:border-box;}</style></head>`);
  });

  let isDragging = $state(false);
  let dragTargetId = $state<string | null>(null);
  let editingElementId = $state<string | null>(null);
  let editingTextValue = $state<string>('');
  let canvasContainerRef = $state<HTMLDivElement | null>(null);

  function focusElement(node: HTMLTextAreaElement) {
    node.focus();
  }

  function handleMouseDown(e: MouseEvent, elId: string) {
    if (!onDragElement) return;
    if (editingElementId === elId) return;
    e.stopPropagation();
    isDragging = true;
    dragTargetId = elId;
    if (onSelectElement) onSelectElement(elId);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging || !dragTargetId || !canvasContainerRef) return;
      const rect = canvasContainerRef.getBoundingClientRect();
      const mouseX = (moveEvent.clientX - rect.left) / scale;
      const mouseY = (moveEvent.clientY - rect.top) / scale;

      const percentX = Math.round(Math.max(0, Math.min(100, (mouseX / template.width) * 100)));
      const percentY = Math.round(Math.max(0, Math.min(100, (mouseY / template.height) * 100)));

      if (onDragElement) {
        onDragElement(dragTargetId, percentX, percentY);
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      dragTargetId = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function handleImageResizeMouseDown(e: MouseEvent, el: CanvasElement) {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = el.width || 120;
    const startHeight = el.height || 120;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      el.width = Math.max(30, Math.round(startWidth + deltaX));
      el.height = Math.max(30, Math.round(startHeight + deltaY));
      appState.saveToSession();
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function startInlineEditing(el: CanvasElement) {
    if (!onUpdateElementContent || el.type === 'image') return;
    editingElementId = el.id;
    editingTextValue = el.content;
  }

  function saveInlineEditing() {
    if (editingElementId && onUpdateElementContent) {
      onUpdateElementContent(editingElementId, editingTextValue);
    }
    editingElementId = null;
  }

  function insertTagInline(tag: string) {
    editingTextValue += ` {${tag}}`;
    if (editingElementId && onUpdateElementContent) {
      onUpdateElementContent(editingElementId, editingTextValue);
    }
  }
</script>

<!-- Scaled Outer Box Container -->
<div 
  class="relative inline-block overflow-hidden" 
  style="width: {scaledWidth}px; height: {scaledHeight}px;"
>
  <div
    id={elementId}
    bind:this={canvasContainerRef}
    class="relative overflow-hidden shadow-2xl transition-transform origin-top-left select-none"
    style="
      width: {template.width}px;
      height: {template.height}px;
      transform: scale({scale});
      background-color: {template.backgroundColor || '#0F172A'};
      {template.backgroundGradient ? `background-image: ${template.backgroundGradient};` : ''}
      {resolvedBgImage ? `background-image: url('${resolvedBgImage}'); background-size: cover; background-position: center;` : ''}
    "
  >
    <!-- Isolated Iframe Rendering for Custom HTML Templates -->
    {#if template.customHtml}
      <iframe
        title="Custom HTML Certificate Template"
        srcdoc={compiledIframeSrcdoc}
        sandbox="allow-same-origin allow-scripts"
        class="w-full h-full border-none pointer-events-none select-none block"
        style="width: 100%; height: 100%; min-width: {template.width}px; min-height: {template.height}px; border: none; overflow: hidden;"
      ></iframe>
    {:else}
      <!-- Multiple Custom Canva-Style Borders -->
      {#if template.borderStyle === 'gold-classic'}
        <div 
          class="absolute pointer-events-none rounded-sm border-2 border-amber-400/80"
          style="inset: {template.borderPadding || 16}px; box-shadow: inset 0 0 20px rgba(234, 179, 8, 0.2);"
        ></div>
        <div 
          class="absolute pointer-events-none rounded-sm border border-amber-500/40"
          style="inset: {(template.borderPadding || 16) + 16}px;"
        ></div>
        
        <div class="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-amber-400 pointer-events-none"></div>
        <div class="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-amber-400 pointer-events-none"></div>
        <div class="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-amber-400 pointer-events-none"></div>
        <div class="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-amber-400 pointer-events-none"></div>

      {:else if template.borderStyle === 'triple-gold'}
        <div 
          class="absolute pointer-events-none" 
          style="inset: {template.borderPadding || 12}px; border: {template.borderWidth || 8}px solid {template.borderColor || '#EAB308'};"
        ></div>
        <div 
          class="absolute pointer-events-none" 
          style="inset: {(template.borderPadding || 12) + (template.borderWidth || 8) + 6}px; border: 2px solid {template.secondaryBorderColor || '#FACC15'};"
        ></div>
        <div 
          class="absolute pointer-events-none" 
          style="inset: {(template.borderPadding || 12) + (template.borderWidth || 8) + 14}px; border: 1px solid {template.borderColor || '#EAB308'};"
        ></div>

      {:else if template.borderStyle === 'canvas-frame'}
        <div 
          class="absolute pointer-events-none" 
          style="inset: {template.borderPadding || 16}px; border: {template.borderWidth || 10}px solid {template.borderColor || '#000000'};"
        ></div>
        <div 
          class="absolute pointer-events-none" 
          style="inset: {(template.borderPadding || 16) + (template.borderWidth || 10) + 8}px; border: 3px solid {template.secondaryBorderColor || '#EC4899'};"
        ></div>

      {:else if template.borderStyle === 'double'}
        <div 
          class="absolute pointer-events-none border-8 border-double" 
          style="inset: {template.borderPadding || 16}px; border-color: {template.borderColor || '#3B82F6'};"
        ></div>

      {:else if template.borderStyle === 'solid'}
        <div 
          class="absolute pointer-events-none" 
          style="inset: {template.borderPadding || 20}px; border: {template.borderWidth || 8}px solid {template.borderColor || '#3B82F6'};"
        ></div>
      {/if}

      <!-- Canvas Elements (Text & Images) -->
      {#each template.elements as el (el.id)}
        <div
          role="button"
          tabindex="0"
          onmousedown={(e) => handleMouseDown(e, el.id)}
          ondblclick={() => startInlineEditing(el)}
          class={`absolute transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap cursor-move transition-shadow ${
            onDragElement ? 'hover:outline hover:outline-2 hover:outline-amber-400 hover:outline-dashed' : ''
          } ${
            selectedElementId === el.id ? 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-black rounded-lg shadow-xl z-20' : ''
          }`}
          style="
            left: {el.x}%;
            top: {el.y}%;
            color: {el.color || '#FFFFFF'};
            font-size: {el.fontSize || 18}px;
            font-family: {el.fontFamily || 'sans-serif'};
            font-weight: {el.fontWeight || 'normal'};
            text-align: {el.textAlign || 'center'};
            letter-spacing: {el.letterSpacing || 0}px;
            opacity: {el.opacity ?? 1};
          "
        >
          {#if editingElementId === el.id}
            <!-- PowerPoint Style In-Place Editable Text Box -->
            <div class="relative z-30 flex flex-col items-center">
              <div class="absolute -top-16 left-1/2 -translate-x-1/2 bg-yellow-300 border-3 border-black rounded-2xl p-2 shadow-[5px_5px_0px_0px_#000] flex items-center gap-2 z-40 max-w-2xl overflow-x-auto whitespace-nowrap scrollbar-none">
                <span class="text-xs font-black text-black px-1.5 uppercase flex items-center gap-1.5 shrink-0">
                  <Tag class="w-4 h-4 text-pink-600 stroke-[2.5]" /> Insert Tag:
                </span>
                <div class="flex items-center gap-1.5 overflow-x-auto max-w-md py-0.5">
                  {#each appState.dataset.columns as col}
                    <button
                      type="button"
                      onmousedown={(e) => { e.preventDefault(); e.stopPropagation(); insertTagInline(col); }}
                      class="px-2.5 py-1 rounded-xl bg-white hover:bg-yellow-100 border-2 border-black text-xs font-mono font-bold text-black shadow-[2px_2px_0px_0px_#000] cursor-pointer shrink-0 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                    >
                      +{col}
                    </button>
                  {/each}
                </div>
                <button
                  type="button"
                  onmousedown={(e) => { e.preventDefault(); e.stopPropagation(); saveInlineEditing(); }}
                  class="px-3.5 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 border-2 border-black text-xs font-black text-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1 ml-1 shrink-0 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <Check class="w-4 h-4 stroke-[3]" /> Done
                </button>
              </div>

              <textarea
                use:focusElement
                bind:value={editingTextValue}
                onblur={saveInlineEditing}
                onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveInlineEditing(); } }}
                class="bg-white border-3 border-black text-black font-extrabold rounded-2xl p-3 shadow-[5px_5px_0px_0px_#000] min-w-[320px] text-center focus:outline-none"
                style="font-size: {Math.max(16, Math.min(32, (el.fontSize || 18) * 0.8))}px; color: #000000;"
              ></textarea>
            </div>
          {:else if el.type === 'image'}
            <div class="relative group">
              <img 
                src={resolveAssetUrls(el.src || el.content, appState.assets)} 
                alt="Logo Element" 
                class="pointer-events-none object-contain select-none"
                style="width: {el.width || 120}px; height: {el.height || 120}px;"
              />
              
              <!-- Live Image Resize Handle (Bottom Right Corner) -->
              {#if selectedElementId === el.id && onDragElement}
                <div
                  role="button"
                  tabindex="0"
                  onmousedown={(e) => handleImageResizeMouseDown(e, el)}
                  class="absolute -bottom-2 -right-2 w-6 h-6 bg-cyan-400 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000] cursor-nwse-resize flex items-center justify-center z-30 active:scale-125 transition-transform"
                  title="Drag corner to resize image live"
                >
                  <Maximize2 class="w-3.5 h-3.5 text-black stroke-[3]" />
                </div>
              {/if}
            </div>
          {:else}
            <span>{resolveAssetUrls(interpolateText(el.content, activeData), appState.assets)}</span>
          {/if}

          <!-- Quick In-Place Edit & Delete Toolbar -->
          {#if selectedElementId === el.id && onDragElement && editingElementId !== el.id}
            <div class="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-cyan-300 text-black text-[10px] font-black px-2 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_#000] whitespace-nowrap z-20">
              {#if el.type !== 'image'}
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); startInlineEditing(el); }}
                  class="flex items-center gap-1 text-black font-black uppercase hover:underline"
                >
                  <Edit3 class="w-3 h-3 stroke-[2.5]" />
                  <span>Type Text</span>
                </button>
                <span class="text-slate-600">|</span>
              {:else}
                <span>Size: {el.width || 120}x{el.height || 120}px</span>
                <span class="text-slate-600">|</span>
              {/if}
              <span>{el.x}%, {el.y}%</span>

              {#if onDeleteElement}
                <span class="text-slate-600">|</span>
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }}
                  class="p-0.5 rounded text-black bg-rose-300 hover:bg-rose-400 border border-black shadow-[1px_1px_0px_0px_#000]"
                  title="Delete element"
                >
                  <Trash2 class="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>
