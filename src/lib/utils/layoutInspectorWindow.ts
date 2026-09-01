import { appState } from '../stores/appState.svelte';
import { interpolateText, resolveAssetUrls } from './exporter';

export function openLayoutInspectorInNewTab(templateId: string) {
  const template = appState.templates.find(t => t.id === templateId) || appState.activeTemplate;
  if (!template) return;

  appState.saveToSession();

  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert('Please allow popups to open the Layout Inspector Studio in a new tab.');
    return;
  }

  const dummyData = {
    id: 'preview_std',
    Name: 'John Doe',
    Roll_Number: '20261001',
    Department: 'Department of Computer Technology',
    Experiment_Name: 'Virtualization of Digital Storage Oscilloscope',
    Team_ID: 'TEAM-01',
    Issue_Date: 'August 31, 2026',
    Certificate_ID: 'CERT-2026-999',
    Position: '1',
    Course: 'Full-Stack Development',
    Project_Name: 'Virtual Equipment Project'
  };

  const assets = appState.assets || [];

  let interpolatedHtml = interpolateText(template.customHtml || '', dummyData);
  let resolvedHtml = resolveAssetUrls(interpolatedHtml, assets);

  let compiledSrcdoc = '';
  if (resolvedHtml) {
    if (!resolvedHtml.includes('<head>')) {
      compiledSrcdoc = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:${template.width}px;height:${template.height}px;overflow:hidden;box-sizing:border-box;}</style></head><body>${resolvedHtml}</body></html>`;
    } else {
      compiledSrcdoc = resolvedHtml.replace('</head>', `<style>html,body{margin:0;padding:0;width:${template.width}px;height:${template.height}px;overflow:hidden;box-sizing:border-box;}</style></head>`);
    }
  }

  const inspectorContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>📐 CAD Layout & Spacing Inspector - ${template.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&family=Fira+Code:wght@700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(#000000 1.5px, transparent 1.5px) 0 0 / 20px 20px, #FAF8F5;
      color: #0F172A;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      user-select: none;
      overflow: hidden;
    }
    
    header {
      width: 100%;
      background: #FACC15;
      border-bottom: 4px solid #000;
      color: #000;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      z-index: 100;
    }
    .brand { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }

    main {
      flex: 1;
      width: 100%;
      height: calc(100vh - 60px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .horizontal-toolbar {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      z-index: 90;
      background: #FFF;
      border: 3px solid #000;
      padding: 8px 14px;
      border-radius: 20px;
      box-shadow: 4px 4px 0px #000;
    }

    .tool-btn {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      border: 3px solid #000;
      background: #FFF;
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 2px 2px 0px #000;
      cursor: pointer;
      transition: all 0.1s ease;
      position: relative;
    }

    .tool-btn:hover {
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0px #000;
    }
    .tool-btn:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0px #000;
    }
    .tool-btn.active {
      border-color: #000;
      box-shadow: 3px 3px 0px #000;
      outline: 2px solid #000;
    }

    .btn-view { background: #3B82F6; color: #FFF; }
    .btn-pan { background: #10B981; color: #FFF; }
    .btn-cad { background: #06B6D4; color: #FFF; }
    .btn-offset { background: #F59E0B; color: #FFF; }
    .btn-clear { background: #EAB308; color: #FFF; }
    .btn-delete { background: #EF4444; color: #FFF; }
    .btn-export { background: #A855F7; color: #FFF; }

    .tool-btn::after {
      content: attr(data-tooltip);
      position: absolute;
      top: 54px;
      left: 50%;
      transform: translateX(-50%);
      background: #000;
      color: #FFF;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 100;
    }
    .tool-btn:hover::after { opacity: 1; }

    .zoom-viewport {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      margin-top: 50px;
      transition: transform 0.05s ease-out;
      transform-origin: center center;
    }

    .viewport-box {
      position: relative;
      width: ${template.width}px;
      height: ${template.height}px;
      background: #FFF;
      border: 4px solid #000;
      box-shadow: 12px 12px 0px #000;
      cursor: crosshair;
    }

    .viewport-box.mode-pan { cursor: grab; }
    .viewport-box.mode-pan:active { cursor: grabbing; }
    .viewport-box.mode-select { cursor: pointer; }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
      pointer-events: none;
    }

    #guideSvg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
    }

    .line-text {
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 800;
      fill: #FFF;
    }

    .line-interactive {
      cursor: pointer;
      pointer-events: all;
    }
    .line-interactive:hover line {
      stroke-width: 4px;
    }

    /* Modal Dialog for Line Editing */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }
    .modal-card {
      background: #FFF;
      border: 4px solid #000;
      border-radius: 20px;
      padding: 24px;
      width: 360px;
      box-shadow: 8px 8px 0px #000;
    }
    .modal-title { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 14px; }
    .input-field {
      width: 100%;
      background: #F1F5F9;
      border: 2px solid #000;
      padding: 8px 12px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 12px;
    }
    .modal-actions { display: flex; items-center; justify-content: space-between; gap: 8px; margin-top: 8px; }
    .m-btn {
      padding: 8px 14px;
      border-radius: 12px;
      border: 2px solid #000;
      font-weight: 900;
      font-size: 12px;
      cursor: pointer;
      box-shadow: 2px 2px 0px #000;
    }
    .m-btn-save { background: #4ADE80; }
    .m-btn-del { background: #FB7185; }
    .m-btn-cancel { background: #E2E8F0; }

    svg.icon { width: 22px; height: 22px; stroke-width: 2.5; }
  </style>
</head>
<body>

  <header>
    <div class="brand">📐 CAD LAYOUT & GUIDELINE LABEL INSPECTOR</div>
    <div id="statusNotice" style="font-size:12px;font-weight:800;color:#000;">
      💡 Click any <strong>Line Tag / Guideline</strong> to open dialogue to edit distance position or add a custom label!
    </div>
  </header>

  <main id="mainContainer">

    <!-- Floating Horizontal Control Toolbar -->
    <div class="horizontal-toolbar">
      
      <!-- 1. Eye View Toggle Icon (Blue) -->
      <button class="tool-btn btn-view" id="btnToggleView" data-tooltip="Toggle Plain White / Full Content">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
      </button>

      <!-- 2. Pan / Hand Icon (Green) -->
      <button class="tool-btn btn-pan active" id="btnPan" data-tooltip="Pan / Hand Tool (Drag Canvas)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5a1.5 1.5 0 113 0m0 0V11m0-5.5a1.5 1.5 0 113 0m0 0V11"/></svg>
      </button>

      <!-- 3. CAD Center Midpoints Icon (Cyan) -->
      <button class="tool-btn btn-cad active" id="btnCadCrosshair" data-tooltip="Toggle CAD Center Crosshair & Midpoints (🎯)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg>
      </button>

      <!-- 4. Parallel Line Offset Creator (Amber) -->
      <button class="tool-btn btn-offset" id="btnParallelOffset" data-tooltip="Add Parallel Line at Exact Distance">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16M12 8v8"/></svg>
      </button>

      <!-- 5. Select / Pointer Icon (White) -->
      <button class="tool-btn" id="btnSelect" data-tooltip="Select & Drag Line Position">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
      </button>

      <!-- 6. Horizontal Line Icon (White) -->
      <button class="tool-btn" id="btnHLine" data-tooltip="Add Horizontal Line (➖)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16"/></svg>
      </button>

      <!-- 7. Vertical Line Icon (White) -->
      <button class="tool-btn" id="btnVLine" data-tooltip="Add Vertical Line (┃)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16"/></svg>
      </button>

      <!-- 8. Free Drag Line Icon (White) -->
      <button class="tool-btn" id="btnFreeDraw" data-tooltip="Draw Free Drag Vector (✏️)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
      </button>

      <!-- 9. Zoom In (+) Icon -->
      <button class="tool-btn" id="btnZoomIn" data-tooltip="Zoom In (+)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"/></svg>
      </button>

      <!-- 10. Zoom Out (-) Icon -->
      <button class="tool-btn" id="btnZoomOut" data-tooltip="Zoom Out (-)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6"/></svg>
      </button>

      <!-- 11. Fit View / Reset Zoom Icon -->
      <button class="tool-btn" id="btnResetZoom" data-tooltip="Fit View / Reset 100%">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
      </button>

      <!-- 12. Delete Line Icon (Red) -->
      <button class="tool-btn btn-delete" id="btnDeleteLine" data-tooltip="Select & Delete Line (🗑️)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>

      <!-- 13. Clear All Lines Icon (Yellow) -->
      <button class="tool-btn btn-clear" id="btnClearAllLines" data-tooltip="Clear All Lines (🧼)">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0 4.142-3.358 7.5-7.5 7.5s-7.5-3.358-7.5-7.5S7.858 4.5 12 4.5s7.5 3.358 7.5 7.5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m-3-3h6"/></svg>
      </button>

      <!-- 14. Export Blueprint Icon (Purple) -->
      <button class="tool-btn btn-export" id="btnExportBlueprint" data-tooltip="Export AI Blueprint PNG Image">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
      </button>

    </div>

    <!-- Zoom Viewport Wrapper -->
    <div class="zoom-viewport" id="zoomViewport">
      <div class="viewport-box mode-pan" id="viewportBox">
        ${compiledSrcdoc ? `<iframe srcdoc="${compiledSrcdoc.replace(/"/g, '&quot;')}" id="certIframe"></iframe>` : `<div style="padding:40px;text-align:center;font-weight:bold;color:#000;">Standard Canvas Template (${template.width} x ${template.height} px)</div>`}
        
        <svg id="guideSvg" xmlns="http://www.w3.org/2000/svg">
          <!-- SVG Guidelines rendered dynamically -->
        </svg>
      </div>
    </div>
  </main>

  <!-- Interactive Modal Dialogue for Editing Line Position & Custom Label -->
  <div class="modal-overlay" id="lineModal" style="display:none;">
    <div class="modal-card">
      <div class="modal-title">✏️ Edit Guideline & Custom Label</div>
      
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px;">Position (px):</label>
      <input type="number" id="modalPosInput" class="input-field" />

      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px;">Custom Label (e.g. Header Bar, Recipient Name):</label>
      <input type="text" id="modalLabelInput" class="input-field" placeholder="e.g. Header Bar or Recipient Name" />

      <div class="modal-actions">
        <button class="m-btn m-btn-del" id="modalDelBtn">🗑️ Delete</button>
        <div>
          <button class="m-btn m-btn-cancel" id="modalCancelBtn">Cancel</button>
          <button class="m-btn m-btn-save" id="modalSaveBtn">Save</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const viewportBox = document.getElementById('viewportBox');
    const zoomViewport = document.getElementById('zoomViewport');
    const guideSvg = document.getElementById('guideSvg');
    const certIframe = document.getElementById('certIframe');

    const lineModal = document.getElementById('lineModal');
    const modalPosInput = document.getElementById('modalPosInput');
    const modalLabelInput = document.getElementById('modalLabelInput');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalDelBtn = document.getElementById('modalDelBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    // Tool Buttons
    const btnToggleView = document.getElementById('btnToggleView');
    const btnPan = document.getElementById('btnPan');
    const btnCadCrosshair = document.getElementById('btnCadCrosshair');
    const btnParallelOffset = document.getElementById('btnParallelOffset');
    const btnSelect = document.getElementById('btnSelect');
    const btnHLine = document.getElementById('btnHLine');
    const btnVLine = document.getElementById('btnVLine');
    const btnFreeDraw = document.getElementById('btnFreeDraw');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnResetZoom = document.getElementById('btnResetZoom');
    const btnDeleteLine = document.getElementById('btnDeleteLine');
    const btnClearAllLines = document.getElementById('btnClearAllLines');
    const btnExportBlueprint = document.getElementById('btnExportBlueprint');

    const width = ${template.width};
    const height = ${template.height};

    const centerX = Math.round(width / 2);
    const centerY = Math.round(height / 2);

    let showCadCrosshair = true;

    // Mode state: 'pan' | 'select' | 'hline' | 'vline' | 'freedraw' | 'delete'
    let currentMode = 'pan';
    let currentScale = 1.0;
    let showFullContent = true;

    // Pan Offsets
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    // Line Dragging State
    let draggedLineIndex = null;
    let draggedLineType = null;

    // Active Line Being Edited in Dialogue Modal
    let activeModalLineIndex = null;
    let activeModalLineType = null; // 'h' | 'v'

    // Guideline Stores with Custom Labels
    let hLines = [
      { y: 65, label: 'Top Margin' },
      { y: 140, label: 'Header Bar' },
      { y: 260, label: 'Certificate Title' },
      { y: 360, label: 'Recipient Name' },
      { y: 480, label: 'Experiment Box' },
      { y: 680, label: 'Signature Line' }
    ];

    let vLines = [
      { x: 110, label: 'Left Frame' },
      { x: 946, label: 'Right Frame' }
    ];

    let freeLines = [];

    let isDrawingFree = false;
    let freeStart = null;
    let freeTemp = null;

    function updateViewportTransform() {
      zoomViewport.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + currentScale + ')';
    }

    function setMode(mode) {
      currentMode = mode;
      btnPan.classList.toggle('active', mode === 'pan');
      btnSelect.classList.toggle('active', mode === 'select');
      btnHLine.classList.toggle('active', mode === 'hline');
      btnVLine.classList.toggle('active', mode === 'vline');
      btnFreeDraw.classList.toggle('active', mode === 'freedraw');
      btnDeleteLine.classList.toggle('active', mode === 'delete');
      
      viewportBox.className = 'viewport-box mode-' + mode;
    }

    btnPan.addEventListener('click', () => setMode('pan'));
    btnSelect.addEventListener('click', () => setMode('select'));
    btnHLine.addEventListener('click', () => setMode('hline'));
    btnVLine.addEventListener('click', () => setMode('vline'));
    btnFreeDraw.addEventListener('click', () => setMode('freedraw'));
    btnDeleteLine.addEventListener('click', () => setMode('delete'));

    btnCadCrosshair.addEventListener('click', () => {
      showCadCrosshair = !showCadCrosshair;
      btnCadCrosshair.classList.toggle('active', showCadCrosshair);
      drawGuidelines();
    });

    // Add Parallel Line at Exact Offset Distance
    btnParallelOffset.addEventListener('click', () => {
      const type = confirm('Click OK for Parallel Horizontal Line, Cancel for Parallel Vertical Line') ? 'h' : 'v';
      if (type === 'h') {
        const lastY = hLines.length > 0 ? hLines[hLines.length - 1].y : 0;
        const inputDist = prompt('Enter exact parallel pixel distance from last horizontal line (' + lastY + 'px):', '20');
        if (inputDist) {
          const dist = parseInt(inputDist, 10);
          if (!isNaN(dist)) {
            const newY = Math.max(0, Math.min(height, lastY + dist));
            hLines.push({ y: newY, label: 'Line ' + newY + 'px' });
            drawGuidelines();
          }
        }
      } else {
        const lastX = vLines.length > 0 ? vLines[vLines.length - 1].x : 0;
        const inputDist = prompt('Enter exact parallel pixel distance from last vertical line (' + lastX + 'px):', '20');
        if (inputDist) {
          const dist = parseInt(inputDist, 10);
          if (!isNaN(dist)) {
            const newX = Math.max(0, Math.min(width, lastX + dist));
            vLines.push({ x: newX, label: 'Line ' + newX + 'px' });
            drawGuidelines();
          }
        }
      }
    });

    btnClearAllLines.addEventListener('click', () => {
      hLines = [];
      vLines = [];
      freeLines = [];
      drawGuidelines();
    });

    // Toggle Plain White / Full Content View
    btnToggleView.addEventListener('click', () => {
      showFullContent = !showFullContent;
      if (certIframe) {
        certIframe.style.display = showFullContent ? 'block' : 'none';
      }
    });

    // Zoom Handlers
    function setScale(s) {
      currentScale = Math.max(0.4, Math.min(2.5, s));
      updateViewportTransform();
    }

    btnZoomIn.addEventListener('click', () => setScale(currentScale + 0.15));
    btnZoomOut.addEventListener('click', () => setScale(currentScale - 0.15));
    btnResetZoom.addEventListener('click', () => {
      panX = 0;
      panY = 0;
      setScale(1.0);
    });

    // Modal Dialogue Handlers for Editing Line & Custom Label
    window.openLineModal = function(type, index) {
      activeModalLineType = type;
      activeModalLineIndex = index;
      if (type === 'h') {
        modalPosInput.value = hLines[index].y;
        modalLabelInput.value = hLines[index].label || '';
      } else {
        modalPosInput.value = vLines[index].x;
        modalLabelInput.value = vLines[index].label || '';
      }
      lineModal.style.display = 'flex';
    };

    modalSaveBtn.addEventListener('click', () => {
      if (activeModalLineIndex !== null) {
        const newPos = parseInt(modalPosInput.value, 10);
        const newLabel = modalLabelInput.value.trim();

        if (activeModalLineType === 'h') {
          if (!isNaN(newPos)) hLines[activeModalLineIndex].y = Math.max(0, Math.min(height, newPos));
          hLines[activeModalLineIndex].label = newLabel;
        } else {
          if (!isNaN(newPos)) vLines[activeModalLineIndex].x = Math.max(0, Math.min(width, newPos));
          vLines[activeModalLineIndex].label = newLabel;
        }
        drawGuidelines();
      }
      lineModal.style.display = 'none';
    });

    modalDelBtn.addEventListener('click', () => {
      if (activeModalLineIndex !== null) {
        if (activeModalLineType === 'h') {
          hLines.splice(activeModalLineIndex, 1);
        } else {
          vLines.splice(activeModalLineIndex, 1);
        }
        drawGuidelines();
      }
      lineModal.style.display = 'none';
    });

    modalCancelBtn.addEventListener('click', () => {
      lineModal.style.display = 'none';
    });

    // Mouse Wheel Zoom Gesture
    document.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setScale(currentScale + delta);
      }
    }, { passive: false });

    function drawGuidelines() {
      hLines.sort((a, b) => a.y - b.y);
      vLines.sort((a, b) => a.x - b.x);

      let svgHtml = '';

      // Outer Edge Lines
      svgHtml += \`<line x1="0" y1="0" x2="\${width}" y2="0" stroke="#EF4444" stroke-width="4"/>\`;
      svgHtml += \`<line x1="0" y1="\${height}" x2="\${width}" y2="\${height}" stroke="#EF4444" stroke-width="4"/>\`;
      svgHtml += \`<line x1="0" y1="0" x2="0" y2="\${height}" stroke="#3B82F6" stroke-width="4"/>\`;
      svgHtml += \`<line x1="\${width}" y1="0" x2="\${width}" y2="\${height}" stroke="#3B82F6" stroke-width="4"/>\`;

      // CAD Center Midpoints Crosshair
      if (showCadCrosshair) {
        svgHtml += \`<line x1="0" y1="\${centerY}" x2="\${width}" y2="\${centerY}" stroke="#D946EF" stroke-width="2.5" stroke-dasharray="8,4"/>\`;
        svgHtml += \`<line x1="\${centerX}" y1="0" x2="\${centerX}" y2="\${height}" stroke="#D946EF" stroke-width="2.5" stroke-dasharray="8,4"/>\`;

        svgHtml += \`
          <g class="line-interactive">
            <circle cx="\${centerX}" cy="\${centerY}" r="9" fill="#D946EF" stroke="#000" stroke-width="2"/>
            <circle cx="\${centerX}" cy="\${centerY}" r="3" fill="#FFF"/>
            <rect x="\${centerX - 80}" y="\${centerY - 28}" width="160" height="22" rx="6" fill="#D946EF" stroke="#000" stroke-width="1.5"/>
            <text x="\${centerX}" y="\${centerY - 13}" class="line-text" text-anchor="middle">🎯 CENTER (\${centerX}, \${centerY})</text>
          </g>
        \`;
      }

      // Render Horizontal Lines & Custom Pill Labels
      let lastY = 0;
      hLines.forEach((item, idx) => {
        const y = item.y;
        const labelText = item.label ? \`🏷️ \${item.label} (\${y}px)\` : \`↕ \${y}px\`;
        const gap = y - lastY;
        
        // Horizontal Line
        svgHtml += \`
          <g class="line-interactive" onclick="window.openLineModal('h', \${idx})">
            <line x1="0" y1="\${y}" x2="\${width}" y2="\${y}" stroke="#EF4444" stroke-width="2" stroke-dasharray="6,4"/>
            <rect x="\${width - 240}" y="\${y - 12}" width="220" height="22" rx="6" fill="#F43F5E" stroke="#000" stroke-width="1.5"/>
            <text x="\${width - 130}" y="\${y + 3}" class="line-text" text-anchor="middle">\${labelText}</text>
          </g>
        \`;

        const midY = lastY + gap / 2;
        svgHtml += \`
          <rect x="25" y="\${midY - 10}" width="110" height="20" rx="6" fill="#EF4444" stroke="#000" stroke-width="1.5"/>
          <text x="80" y="\${midY + 4}" class="line-text" text-anchor="middle">↕ Gap: \${gap}px</text>
        \`;
        lastY = y;
      });

      const bottomGap = height - lastY;
      if (bottomGap > 0) {
        const midY = lastY + bottomGap / 2;
        svgHtml += \`
          <rect x="25" y="\${midY - 10}" width="130" height="20" rx="6" fill="#EF4444" stroke="#000" stroke-width="1.5"/>
          <text x="90" y="\${midY + 4}" class="line-text" text-anchor="middle">↕ Bottom: \${bottomGap}px</text>
        \`;
      }

      // Render Vertical Lines & Custom Pill Labels
      let lastX = 0;
      vLines.forEach((item, idx) => {
        const x = item.x;
        const labelText = item.label ? \`🏷️ \${item.label} (\${x}px)\` : \`↔ \${x}px\`;
        const gap = x - lastX;
        
        svgHtml += \`
          <g class="line-interactive" onclick="window.openLineModal('v', \${idx})">
            <line x1="\${x}" y1="0" x2="\${x}" y2="\${height}" stroke="#3B82F6" stroke-width="2" stroke-dasharray="6,4"/>
            <rect x="\${x - 90}" y="20" width="180" height="22" rx="6" fill="#2563EB" stroke="#000" stroke-width="1.5"/>
            <text x="\${x}" y="35" class="line-text" text-anchor="middle">\${labelText}</text>
          </g>
        \`;

        const midX = lastX + gap / 2;
        svgHtml += \`
          <rect x="\${midX - 55}" y="\${height - 35}" width="110" height="20" rx="6" fill="#2563EB" stroke="#000" stroke-width="1.5"/>
          <text x="\${midX}" y="\${height - 21}" class="line-text" text-anchor="middle">↔ Width: \${gap}px</text>
        \`;
        lastX = x;
      });

      // Render Free Drag Lines
      freeLines.forEach((fl) => {
        const midX = (fl.x1 + fl.x2) / 2;
        const midY = (fl.y1 + fl.y2) / 2;
        svgHtml += \`
          <line x1="\${fl.x1}" y1="\${fl.y1}" x2="\${fl.x2}" y2="\${fl.y2}" stroke="#EC4899" stroke-width="3"/>
          <circle cx="\${fl.x1}" cy="\${fl.y1}" r="5" fill="#EC4899" stroke="#000" stroke-width="1.5"/>
          <circle cx="\${fl.x2}" cy="\${fl.y2}" r="5" fill="#EC4899" stroke="#000" stroke-width="1.5"/>
          <rect x="\${midX - 45}" y="\${midY - 10}" width="90" height="20" rx="6" fill="#EC4899" stroke="#000" stroke-width="1.5"/>
          <text x="\${midX}" y="\${midY + 4}" class="line-text" text-anchor="middle">📏 \${fl.len}px</text>
        \`;
      });

      // Temporary Free Drag Preview Line
      if (isDrawingFree && freeStart && freeTemp) {
        const len = Math.round(Math.hypot(freeTemp.x - freeStart.x, freeTemp.y - freeStart.y));
        const midX = (freeStart.x + freeTemp.x) / 2;
        const midY = (freeStart.y + freeTemp.y) / 2;
        svgHtml += \`
          <line x1="\${freeStart.x}" y1="\${freeStart.y}" x2="\${freeTemp.x}" y2="\${freeTemp.y}" stroke="#F43F5E" stroke-width="3" stroke-dasharray="4,4"/>
          <rect x="\${midX - 45}" y="\${midY - 10}" width="90" height="20" rx="6" fill="#F43F5E" stroke="#000" stroke-width="1.5"/>
          <text x="\${midX}" y="\${midY + 4}" class="line-text" text-anchor="middle">📏 \${len}px</text>
        \`;
      }

      guideSvg.innerHTML = svgHtml;
    }

    // Pointer Events for Dragging, Panning & Deleting specific lines
    viewportBox.addEventListener('mousedown', (e) => {
      const rect = viewportBox.getBoundingClientRect();
      const clickX = Math.round((e.clientX - rect.left) / currentScale);
      const clickY = Math.round((e.clientY - rect.top) / currentScale);

      if (currentMode === 'delete') {
        const nearHIdx = hLines.findIndex(item => Math.abs(item.y - clickY) < 14);
        const nearVIdx = vLines.findIndex(item => Math.abs(item.x - clickX) < 14);

        if (nearHIdx !== -1) {
          hLines.splice(nearHIdx, 1);
        } else if (nearVIdx !== -1) {
          vLines.splice(nearVIdx, 1);
        }
        drawGuidelines();
      } else if (currentMode === 'select') {
        const nearHIdx = hLines.findIndex(item => Math.abs(item.y - clickY) < 14);
        const nearVIdx = vLines.findIndex(item => Math.abs(item.x - clickX) < 14);

        if (nearHIdx !== -1) {
          draggedLineIndex = nearHIdx;
          draggedLineType = 'hline';
        } else if (nearVIdx !== -1) {
          draggedLineIndex = nearVIdx;
          draggedLineType = 'vline';
        }
      } else if (currentMode === 'pan') {
        isPanning = true;
        panStartX = e.clientX - panX;
        panStartY = e.clientY - panY;
      } else if (currentMode === 'freedraw') {
        isDrawingFree = true;
        freeStart = { x: clickX, y: clickY };
        freeTemp = { x: clickX, y: clickY };
        drawGuidelines();
      } else if (currentMode === 'hline') {
        if (!hLines.some(item => item.y === clickY)) {
          hLines.push({ y: clickY, label: 'Line ' + clickY + 'px' });
          drawGuidelines();
        }
      } else if (currentMode === 'vline') {
        if (!vLines.some(item => item.x === clickX)) {
          vLines.push({ x: clickX, label: 'Line ' + clickX + 'px' });
          drawGuidelines();
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning && currentMode === 'pan') {
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        updateViewportTransform();
      } else if (draggedLineIndex !== null && currentMode === 'select') {
        const rect = viewportBox.getBoundingClientRect();
        const curX = Math.round((e.clientX - rect.left) / currentScale);
        const curY = Math.round((e.clientY - rect.top) / currentScale);

        if (draggedLineType === 'hline') {
          hLines[draggedLineIndex].y = Math.max(0, Math.min(height, curY));
        } else if (draggedLineType === 'vline') {
          vLines[draggedLineIndex].x = Math.max(0, Math.min(width, curX));
        }
        drawGuidelines();
      } else if (isDrawingFree && freeStart) {
        const rect = viewportBox.getBoundingClientRect();
        const moveX = Math.round((e.clientX - rect.left) / currentScale);
        const moveY = Math.round((e.clientY - rect.top) / currentScale);
        freeTemp = { x: moveX, y: moveY };
        drawGuidelines();
      }
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      draggedLineIndex = null;
      draggedLineType = null;

      if (isDrawingFree && freeStart && freeTemp) {
        const len = Math.round(Math.hypot(freeTemp.x - freeStart.x, freeTemp.y - freeStart.y));
        if (len > 5) {
          freeLines.push({
            x1: freeStart.x,
            y1: freeStart.y,
            x2: freeTemp.x,
            y2: freeTemp.y,
            len: len
          });
        }
        isDrawingFree = false;
        freeStart = null;
        freeTemp = null;
        drawGuidelines();
      }
    });

    // Export Blueprint Image
    btnExportBlueprint.addEventListener('click', async () => {
      btnExportBlueprint.style.opacity = '0.5';
      const canvas = await html2canvas(viewportBox, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF'
      });

      const link = document.createElement('a');
      link.download = showFullContent ? 'certificate_layout_blueprint_full.png' : 'certificate_layout_blueprint_plain.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      btnExportBlueprint.style.opacity = '1';
    });

    drawGuidelines();
  </script>

</body>
</html>
  `;

  newWindow.document.open();
  newWindow.document.write(inspectorContent);
  newWindow.document.close();
}
