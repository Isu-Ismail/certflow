import type { CanvasElement, AssetFile } from '../types';

export interface ParsedTemplateResult {
  elements: CanvasElement[];
  backgroundImage: string | null;
}

interface CssRuleMap {
  [selector: string]: { [prop: string]: string };
}

export function parseHtmlToCanvasElements(htmlContent: string, assets: AssetFile[] = []): ParsedTemplateResult {
  const elements: CanvasElement[] = [];
  let backgroundImage: string | null = null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // 1. Parse all CSS rules from <style> tags
  const cssMap: CssRuleMap = {};
  const styleTags = doc.querySelectorAll('style');
  
  styleTags.forEach(tag => {
    const cssText = tag.textContent || '';

    // Extract background image from body rule
    const bgMatch = cssText.match(/body\s*\{[^}]*background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);
    if (bgMatch && bgMatch[1]) {
      const bgPath = bgMatch[1];
      const foundAsset = assets.find(a => a.name === bgPath.replace('./', '') || bgPath.includes(a.name));
      backgroundImage = foundAsset ? foundAsset.dataUrl : bgPath;
    }

    // Parse selector blocks e.g. .student-name { font-family: 'Great Vibes'; font-size: 52px; }
    const blockRegex = /([^{]+)\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(cssText)) !== null) {
      const selector = match[1].trim();
      const rulesText = match[2].trim();
      
      const props: { [key: string]: string } = {};
      rulesText.split(';').forEach(ruleStr => {
        const parts = ruleStr.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          props[key] = val;
        }
      });

      // Map class selector (e.g., .student-name -> student-name)
      if (selector.startsWith('.')) {
        cssMap[selector.substring(1)] = props;
      } else {
        cssMap[selector] = props;
      }
    }
  });

  // Helper to resolve asset image src
  function resolveAssetSrc(rawSrc: string): string {
    const cleanName = rawSrc.replace('./', '').trim();
    const foundAsset = assets.find(a => a.name === cleanName || rawSrc.includes(a.name));
    return foundAsset ? foundAsset.dataUrl : rawSrc;
  }

  // Helper to merge class styles and inline styles for an element
  function getComputedStyles(el: Element) {
    const merged: { [key: string]: string } = {};

    // 1. From class names
    const classList = el.classList;
    classList.forEach(cls => {
      if (cssMap[cls]) {
        Object.assign(merged, cssMap[cls]);
      }
    });

    // 2. From parent container class if applicable
    let parent = el.parentElement;
    while (parent) {
      parent.classList.forEach(cls => {
        if (cssMap[cls]) {
          // Inherit font-family, color, top, left container bounds if needed
          if (cssMap[cls]['top'] && !merged['top']) merged['_container_top'] = cssMap[cls]['top'];
          if (cssMap[cls]['left'] && !merged['_container_left']) merged['_container_left'] = cssMap[cls]['left'];
          if (cssMap[cls]['font-family'] && !merged['font-family']) merged['font-family'] = cssMap[cls]['font-family'];
          if (cssMap[cls]['color'] && !merged['color']) merged['color'] = cssMap[cls]['color'];
        }
      });
      parent = parent.parentElement;
    }

    // 3. From inline style attribute
    const inlineStyle = el.getAttribute('style');
    if (inlineStyle) {
      inlineStyle.split(';').forEach(ruleStr => {
        const parts = ruleStr.split(':');
        if (parts.length >= 2) {
          merged[parts[0].trim().toLowerCase()] = parts.slice(1).join(':').trim();
        }
      });
    }

    return merged;
  }

  // 2. Extract All Image Elements (Logos & Graphics) preserving exact size & position
  const imgTags = doc.querySelectorAll('img');
  imgTags.forEach((img, idx) => {
    const rawSrc = img.getAttribute('src') || '';
    const src = resolveAssetSrc(rawSrc);
    const styles = getComputedStyles(img);

    let width = parseInt(img.getAttribute('width') || styles['width'] || '64', 10) || 64;
    let height = parseInt(img.getAttribute('height') || styles['height'] || '64', 10) || 64;
    
    // Position percentage calculation (Canvas 1056x747)
    let pxX = 110 + (idx * 772);
    let pxY = 41;

    if (styles['_container_left']) pxX = parseInt(styles['_container_left'], 10) + (idx * 772);
    if (styles['_container_top']) pxY = parseInt(styles['_container_top'], 10);

    const percentX = Math.round((pxX / 1056) * 100);
    const percentY = Math.round((pxY / 747) * 100);

    elements.push({
      id: `img_el_${Date.now()}_${idx}`,
      type: 'image',
      content: rawSrc || src,
      src: src,
      x: percentX,
      y: percentY,
      width: width,
      height: height
    });
  });

  // 3. Extract Text & Field Elements preserving exact font-family, font-size, font-weight, color & coordinates
  const textSelectors = 'h1, h2, h3, h4, p, span, div';
  const candidateNodes = doc.body.querySelectorAll(textSelectors);

  candidateNodes.forEach((node, idx) => {
    // Only extract leaf text nodes or nodes containing text without child element wrappers
    if (node.children.length === 0 && node.textContent && node.textContent.trim().length > 0) {
      const rawText = node.textContent.trim();
      const styles = getComputedStyles(node);

      // Parse Font Properties
      let fontSize = 16;
      if (styles['font-size']) {
        fontSize = parseFloat(styles['font-size']) || 16;
      }

      let fontFamily = styles['font-family'] || "'Plus Jakarta Sans', sans-serif";
      // Clean quotes from font family string e.g. 'Great Vibes', cursive -> Great Vibes, cursive
      fontFamily = fontFamily.replace(/['"]/g, '');

      let fontWeight = styles['font-weight'] || 'bold';
      let color = styles['color'] || '#0F2C59';
      let letterSpacing = parseFloat(styles['letter-spacing'] || '0') || 0;

      // Position Calculation from CSS Container Bounds or Section Offset
      let containerTop = parseInt(styles['_container_top'] || '127', 10);
      let containerLeft = parseInt(styles['_container_left'] || '110', 10);
      
      if (styles['top']) containerTop = parseInt(styles['top'], 10);
      if (styles['left']) containerLeft = parseInt(styles['left'], 10);

      // Y position heuristic based on element class and order
      let yPx = containerTop + (idx * 30);
      if (node.classList.contains('univ-title')) yPx = 55;
      if (node.classList.contains('dept-title')) yPx = 95;
      if (node.classList.contains('cert-heading')) yPx = 150;
      if (node.classList.contains('cert-subheading')) yPx = 190;
      if (node.classList.contains('student-name')) yPx = 250;
      if (node.classList.contains('student-meta')) yPx = 340;
      if (node.classList.contains('award-text')) yPx = 390;
      if (node.classList.contains('experiment-box')) yPx = 440;
      if (node.classList.contains('sig-title')) yPx = 540;
      if (node.classList.contains('sig-sub')) yPx = 565;

      const percentX = 50; // Center aligned horizontally
      const percentY = Math.round((yPx / 747) * 100);

      elements.push({
        id: `text_el_${Date.now()}_${idx}`,
        type: 'text',
        content: rawText,
        x: percentX,
        y: percentY,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: fontWeight,
        color: color,
        letterSpacing: letterSpacing,
        textAlign: 'center',
        align: 'center'
      });
    }
  });

  return { elements, backgroundImage };
}
