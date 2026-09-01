import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { StudentRecord, AssetFile } from '../types';

export function formatExcelDate(value: any): string {
  if (typeof value === 'number' && value > 40000 && value < 60000) {
    const dateObj = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return dateObj.toLocaleDateString('en-US', options);
    }
  }
  return String(value);
}

export function interpolateText(text: string, student: StudentRecord): string {
  if (!text) return '';
  return text.replace(/\{([^}]+)\}/g, (_, key) => {
    const trimmedKey = key.trim();
    if (student[trimmedKey] !== undefined && student[trimmedKey] !== null) {
      let rawVal = student[trimmedKey];
      if (trimmedKey.toLowerCase().includes('date')) {
        return formatExcelDate(rawVal);
      }
      return String(rawVal);
    }
    return `{${trimmedKey}}`;
  });
}

export function resolveAssetUrls(html: string, assets: AssetFile[]): string {
  if (!html || !assets || assets.length === 0) return html;
  let resolved = html;
  for (const asset of assets) {
    if (!asset.name || !asset.dataUrl) continue;
    const escapedName = asset.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(\\.\\/|\\/)?${escapedName}`, 'g');
    resolved = resolved.replace(regex, asset.dataUrl);
  }
  return resolved;
}

// Helper to inject Google Fonts into Target Document & Wait for Readiness
async function prepareDocumentFonts(targetDoc: Document): Promise<void> {
  if (!targetDoc) return;

  if (!targetDoc.querySelector('link[href*="fonts.googleapis.com"]')) {
    const linkPre1 = targetDoc.createElement('link');
    linkPre1.rel = 'preconnect';
    linkPre1.href = 'https://fonts.googleapis.com';
    targetDoc.head.appendChild(linkPre1);

    const linkPre2 = targetDoc.createElement('link');
    linkPre2.rel = 'preconnect';
    linkPre2.href = 'https://fonts.gstatic.com';
    linkPre2.crossOrigin = 'anonymous';
    targetDoc.head.appendChild(linkPre2);

    const linkFont = targetDoc.createElement('link');
    linkFont.rel = 'stylesheet';
    linkFont.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,600&display=swap';
    targetDoc.head.appendChild(linkFont);
  }

  if (targetDoc.fonts) {
    try {
      await targetDoc.fonts.ready;
    } catch (e) {
      // Ignore font timeout
    }
  }
}

const colorParserCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const colorParserCtx = colorParserCanvas ? colorParserCanvas.getContext('2d') : null;

function convertCssColorToRgb(colorStr: string): string {
  if (!colorStr || !colorParserCtx) return colorStr;
  try {
    colorParserCtx.fillStyle = '#000000';
    colorParserCtx.fillStyle = colorStr;
    const result = colorParserCtx.fillStyle;
    if (result.startsWith('#')) {
      const r = parseInt(result.slice(1, 3), 16);
      const g = parseInt(result.slice(3, 5), 16);
      const b = parseInt(result.slice(5, 7), 16);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return result;
  } catch (e) {
    return colorStr;
  }
}

function isModernCssColor(val: string): boolean {
  if (!val) return false;
  return (
    val.includes('oklch') ||
    val.includes('oklab') ||
    val.includes('color(') ||
    val.includes('lab(') ||
    val.includes('lch(') ||
    val.includes('hwb(') ||
    val.includes('light-dark(')
  );
}

function replaceModernColorsInString(cssText: string): string {
  if (!cssText) return cssText;
  if (!isModernCssColor(cssText)) return cssText;

  const regex = /(oklch|oklab|lab|lch|hwb)\([^)]+\)/gi;
  return cssText.replace(regex, (match) => {
    const rgb = convertCssColorToRgb(match);
    return isModernCssColor(rgb) ? 'rgb(0, 0, 0)' : rgb;
  });
}

function sanitizeModernColors(clonedDoc: Document): void {
  try {
    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;

      // Reset any preview scale transform so html2canvas captures full 1056x747 unscaled certificate
      if (htmlEl.style && htmlEl.style.transform && htmlEl.style.transform.includes('scale')) {
        htmlEl.style.transform = 'none';
      }

      // Check inline style attribute and replace modern colors
      const inlineStyle = htmlEl.getAttribute('style');
      if (inlineStyle && isModernCssColor(inlineStyle)) {
        htmlEl.setAttribute('style', replaceModernColorsInString(inlineStyle));
      }

      // Sanitize computed styles for visual properties
      const computed = window.getComputedStyle(htmlEl);
      const propsToCheck = [
        'color', 
        'background-color', 
        'border-color', 
        'border-top-color', 
        'border-right-color', 
        'border-bottom-color', 
        'border-left-color', 
        'outline-color', 
        'fill', 
        'stroke',
        'box-shadow',
        'text-shadow'
      ];

      propsToCheck.forEach((propCss) => {
        const val = computed.getPropertyValue(propCss);
        if (isModernCssColor(val)) {
          const sanitizedVal = replaceModernColorsInString(val);
          htmlEl.style.setProperty(propCss, sanitizedVal, 'important');
        }
      });
    });

    // Also sanitize <style> tags inside clonedDoc
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent && isModernCssColor(styleTag.textContent)) {
        styleTag.textContent = replaceModernColorsInString(styleTag.textContent);
      }
    });
  } catch (e) {
    // Ignore error
  }
}

export async function exportElementToPng(element: HTMLElement, filename: string = 'certificate.png'): Promise<void> {
  const iframeEl = element.querySelector('iframe');
  let targetElement: HTMLElement = element;
  let canvasW = element.clientWidth || 1056;
  let canvasH = element.clientHeight || 747;

  if (iframeEl && iframeEl.contentDocument && iframeEl.contentDocument.body) {
    targetElement = iframeEl.contentDocument.body as HTMLElement;
    canvasW = 1056;
    canvasH = 747;
    await prepareDocumentFonts(iframeEl.contentDocument);
  }

  await prepareDocumentFonts(document);
  await new Promise(r => setTimeout(r, 300));

  const canvas = await html2canvas(targetElement, {
    width: canvasW,
    height: canvasH,
    windowWidth: canvasW,
    windowHeight: canvasH,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    onclone: (clonedDoc: Document) => {
      sanitizeModernColors(clonedDoc);
    }
  });

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportElementsToPdf(
  elements: HTMLElement[], 
  pdfFilename: string = 'certificates.pdf',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!elements || elements.length === 0) return;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  await prepareDocumentFonts(document);

  for (let i = 0; i < elements.length; i++) {
    if (onProgress) {
      onProgress(i + 1, elements.length);
    }

    if (i > 0) {
      pdf.addPage('a4', 'landscape');
    }

    const iframeEl = elements[i].querySelector('iframe');
    let targetElement: HTMLElement = elements[i];
    let canvasW = elements[i].clientWidth || 1056;
    let canvasH = elements[i].clientHeight || 747;

    if (iframeEl && iframeEl.contentDocument && iframeEl.contentDocument.body) {
      targetElement = iframeEl.contentDocument.body as HTMLElement;
      canvasW = 1056;
      canvasH = 747;
      await prepareDocumentFonts(iframeEl.contentDocument);
    }

    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(targetElement, {
      width: canvasW,
      height: canvasH,
      windowWidth: canvasW,
      windowHeight: canvasH,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc: Document) => {
        sanitizeModernColors(clonedDoc);
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.90);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  pdf.save(pdfFilename.endsWith('.pdf') ? pdfFilename : `${pdfFilename}.pdf`);
}

export async function printCertificates(elements: HTMLElement[]): Promise<void> {
  if (!elements || elements.length === 0) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Certificates - CertFlow</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .cert-page {
            width: 297mm;
            height: 210mm;
            page-break-after: always;
            break-after: page;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-sizing: border-box;
          }
          .cert-img {
            width: 297mm;
            height: 210mm;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
  `);

  await prepareDocumentFonts(document);

  for (let i = 0; i < elements.length; i++) {
    const iframeEl = elements[i].querySelector('iframe');
    let targetElement: HTMLElement = elements[i];
    let canvasW = elements[i].clientWidth || 1056;
    let canvasH = elements[i].clientHeight || 747;

    if (iframeEl && iframeEl.contentDocument && iframeEl.contentDocument.body) {
      targetElement = iframeEl.contentDocument.body as HTMLElement;
      canvasW = 1056;
      canvasH = 747;
      await prepareDocumentFonts(iframeEl.contentDocument);
    }

    await new Promise(r => setTimeout(r, 250));

    const canvas = await html2canvas(targetElement, {
      width: canvasW,
      height: canvasH,
      windowWidth: canvasW,
      windowHeight: canvasH,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc: Document) => {
        sanitizeModernColors(clonedDoc);
      }
    });

    const imgData = canvas.toDataURL('image/png');
    printWindow.document.write(`
      <div class="cert-page">
        <img src="${imgData}" class="cert-img" />
      </div>
    `);
  }

  printWindow.document.write(`
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export async function generatePrintCanvasImages(
  elements: HTMLElement[],
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  if (!elements || elements.length === 0) return [];
  const images: string[] = [];

  await prepareDocumentFonts(document);

  for (let i = 0; i < elements.length; i++) {
    if (onProgress) {
      onProgress(i + 1, elements.length);
    }

    const iframeEl = elements[i].querySelector('iframe');
    let targetElement: HTMLElement = elements[i];
    let canvasW = elements[i].clientWidth || 1056;
    let canvasH = elements[i].clientHeight || 747;

    if (iframeEl && iframeEl.contentDocument && iframeEl.contentDocument.body) {
      targetElement = iframeEl.contentDocument.body as HTMLElement;
      canvasW = 1056;
      canvasH = 747;
      await prepareDocumentFonts(iframeEl.contentDocument);
    }

    await new Promise(r => setTimeout(r, 150));

    const canvas = await html2canvas(targetElement, {
      width: canvasW,
      height: canvasH,
      windowWidth: canvasW,
      windowHeight: canvasH,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
      onclone: (clonedDoc: Document) => {
        sanitizeModernColors(clonedDoc);
      }
    });

    images.push(canvas.toDataURL('image/jpeg', 0.90));
  }

  return images;
}

export function triggerBrowserPrint(): void {
  window.print();
}
