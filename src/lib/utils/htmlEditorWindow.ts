import { appState } from '../stores/appState.svelte';
import { interpolateText, resolveAssetUrls } from './exporter';

export function openHtmlEditorInNewTab(templateId: string) {
  const template = appState.templates.find(t => t.id === templateId) || appState.activeTemplate;
  if (!template) return;

  appState.saveToSession();

  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    alert('Please allow popups to open the full-screen HTML Code Editor in a new tab.');
    return;
  }

  const dummyData = {
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

  const columns = appState.dataset?.columns || Object.keys(dummyData);
  const assets = appState.assets || [];

  const editorTabContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HTML Code Studio - ${template.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&family=Fira+Code:wght@500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    /* Top Header */
    header {
      background: #FACC15;
      border-bottom: 4px solid #000;
      color: #000;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    .actions { display: flex; align-items: center; gap: 12px; }
    .btn {
      background: #A3E635;
      color: #000;
      border: 3px solid #000;
      font-weight: 900;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 12px;
      box-shadow: 3px 3px 0px #000;
      cursor: pointer;
      text-transform: uppercase;
      transition: all 0.1s ease;
    }
    .btn:hover { background: #86EFAC; }
    .btn:active { transform: translate(2px, 2px); box-shadow: 0px 0px 0px #000; }
    .btn-close { background: #FDA4AF; }
    .btn-close:hover { background: #F43F5E; color: #FFF; }

    /* Main Split Screen Container */
    main {
      flex: 1;
      display: flex;
      height: calc(100vh - 64px);
      overflow: hidden;
    }
    
    /* Left Code Editor Pane (50%) */
    .editor-pane {
      width: 50%;
      border-right: 4px solid #000;
      background: #1E293B;
      display: flex;
      flex-direction: column;
    }

    .toolbar {
      background: #0F172A;
      border-bottom: 2px solid #334155;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .toolbar-label { font-size: 11px; font-weight: 800; color: #EC4899; text-transform: uppercase; }
    .pill {
      background: #334155;
      color: #FACC15;
      border: 1px solid #475569;
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      cursor: pointer;
    }
    .pill:hover { background: #475569; color: #FFF; }

    textarea {
      flex: 1;
      width: 100%;
      background: #090D16;
      color: #FACC15;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      line-height: 1.6;
      padding: 20px;
      border: none;
      resize: none;
      outline: none;
    }

    /* Right Preview Pane (50%) */
    .preview-pane {
      width: 50%;
      background: #334155;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
      position: relative;
    }

    .canvas-card {
      background: #FFF;
      border: 4px solid #000;
      box-shadow: 10px 10px 0px #000;
      border-radius: 20px;
      position: relative;
      overflow: hidden;
      display: inline-block;
    }

    .iframe-wrapper {
      position: relative;
      overflow: hidden;
      border-radius: 16px;
    }

    iframe {
      width: ${template.width}px;
      height: ${template.height}px;
      border: none;
      background: #FFF;
      transform-origin: 0 0;
      display: block;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand font-black text-sm uppercase">CertFlow HTML Code Studio</div>
    <div class="actions">
      <button class="btn" id="saveBtn">💾 Save & Sync App</button>
      <button class="btn btn-close" id="closeBtn">✖ Close Tab</button>
    </div>
  </header>

  <main>
    <!-- Left Pane: Code Editor -->
    <div class="editor-pane">
      <div class="toolbar">
        <span class="toolbar-label">+ Insert Placeholder:</span>
        ${columns.map(col => `<button class="pill" onclick="insertTag('${col}')">+{${col}}</button>`).join('')}
      </div>
      <textarea id="codeArea" spellcheck="false">${template.customHtml || ''}</textarea>
    </div>

    <!-- Right Pane: Real-Time Live Preview -->
    <div class="preview-pane">
      <div class="canvas-card">
        <div class="iframe-wrapper" id="iframeWrapper">
          <iframe id="previewIframe" title="Live Preview"></iframe>
        </div>
      </div>
    </div>
  </main>

  <script>
    const codeArea = document.getElementById('codeArea');
    const previewIframe = document.getElementById('previewIframe');
    const iframeWrapper = document.getElementById('iframeWrapper');
    const saveBtn = document.getElementById('saveBtn');
    const closeBtn = document.getElementById('closeBtn');

    const dummyData = ${JSON.stringify(dummyData)};
    const assets = ${JSON.stringify(assets)};
    const templateWidth = ${template.width};
    const templateHeight = ${template.height};

    // Calculate scale to fit preview box cleanly without white margins
    function updateIframeScale() {
      const containerWidth = document.querySelector('.preview-pane').clientWidth - 60;
      const containerHeight = document.querySelector('.preview-pane').clientHeight - 60;
      const scaleX = containerWidth / templateWidth;
      const scaleY = containerHeight / templateHeight;
      const scale = Math.min(scaleX, scaleY, 0.65);

      previewIframe.style.transform = 'scale(' + scale + ')';
      previewIframe.style.transformOrigin = '0 0';

      const scaledW = Math.round(templateWidth * scale);
      const scaledH = Math.round(templateHeight * scale);

      iframeWrapper.style.width = scaledW + 'px';
      iframeWrapper.style.height = scaledH + 'px';
    }

    function interpolateText(text, data) {
      return text.replace(/\\{([^}]+)\\}/g, (_, key) => {
        const k = key.trim();
        return data[k] !== undefined ? String(data[k]) : '{' + k + '}';
      });
    }

    function resolveAssetUrls(html, assetList) {
      if (!html || !assetList) return html;
      let res = html;
      for (const asset of assetList) {
        if (!asset.name || !asset.dataUrl) continue;
        const esc = asset.name.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');
        const reg = new RegExp('(\\\\.\\\\/|\\\\/)?' + esc, 'g');
        res = res.replace(reg, asset.dataUrl);
      }
      return res;
    }

    function updatePreview() {
      const code = codeArea.value;
      let interpolated = interpolateText(code, dummyData);
      let resolved = resolveAssetUrls(interpolated, assets);

      let srcdoc = '';
      if (!resolved.includes('<head>')) {
        srcdoc = '<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;width:' + templateWidth + 'px;height:' + templateHeight + 'px;overflow:hidden;box-sizing:border-box;}</style></head><body>' + resolved + '</body></html>';
      } else {
        srcdoc = resolved.replace('</head>', '<style>html,body{margin:0;padding:0;width:' + templateWidth + 'px;height:' + templateHeight + 'px;overflow:hidden;box-sizing:border-box;}</style></head>');
      }

      previewIframe.srcdoc = srcdoc;
    }

    function insertTag(tag) {
      const start = codeArea.selectionStart;
      const end = codeArea.selectionEnd;
      const val = codeArea.value;
      const tagStr = '{' + tag + '}';
      codeArea.value = val.substring(0, start) + tagStr + val.substring(end);
      codeArea.selectionStart = codeArea.selectionEnd = start + tagStr.length;
      codeArea.focus();
      updatePreview();
    }

    function saveChanges() {
      const newHtml = codeArea.value;
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'SYNC_HTML_CODE', templateId: '${template.id}', customHtml: newHtml }, '*');
      }
      saveBtn.innerText = '✅ Saved & Synced!';
      setTimeout(() => saveBtn.innerText = '💾 Save & Sync App', 2000);
    }

    codeArea.addEventListener('input', updatePreview);
    saveBtn.addEventListener('click', saveChanges);
    closeBtn.addEventListener('click', () => {
      saveChanges();
      window.close();
    });

    window.addEventListener('resize', updateIframeScale);

    // Initial render
    updateIframeScale();
    updatePreview();
  </script>

</body>
</html>
  `;

  newWindow.document.open();
  newWindow.document.write(editorTabContent);
  newWindow.document.close();
}
