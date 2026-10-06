import type { TextRun } from './surface';

// Small PDF helpers (pdf-lib is loaded only when a run starts).
const PT = 0.75; // 1 css px = 0.75 pt

/**
 * A one-page PDF with a picture of the page, sized exactly like the design. With `runs`, the page's text is added too, as
 * invisible text laid exactly over the picture: it looks the same, but can be selected, searched and copied.
 * (Standard PDF fonts only: letters outside Latin-1 stay in the picture only.)
 */
export async function pdfFromJpeg(jpeg: Uint8Array, width: number, height: number, runs: TextRun[] = []): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, TextRenderingMode, beginText, endText, moveText, setCharacterSqueeze, setFontAndSize, setTextRenderingMode, showText } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(jpeg);
  const page = pdf.addPage([width * PT, height * PT]);
  page.drawImage(image, { x: 0, y: 0, width: width * PT, height: height * PT });
  if (runs.length) {
    const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) };
    const keys = { regular: page.node.newFontDictionary(fonts.regular.name, fonts.regular.ref), bold: page.node.newFontDictionary(fonts.bold.name, fonts.bold.ref) };
    const sets = { regular: new Set(fonts.regular.getCharacterSet()), bold: new Set(fonts.bold.getCharacterSet()) };
    for (const run of runs) {
      const which = run.bold ? 'bold' : 'regular';
      const font = fonts[which];
      const text = [...run.text].map((c) => (sets[which].has(c.codePointAt(0)!) ? c : ' ')).join('');
      if (!text.trim()) continue;
      const natural = font.widthOfTextAtSize(text, run.size * PT);
      if (!natural) continue;
      page.pushOperators(
        beginText(),
        setTextRenderingMode(TextRenderingMode.Invisible),
        setFontAndSize(keys[which], run.size * PT),
        setCharacterSqueeze((run.width * PT / natural) * 100), // stretch or squeeze the line to the width it has on the page
        moveText(run.x * PT, (height - run.y) * PT),
        showText(font.encodeText(text)),
        endText(),
      );
    }
  }
  pdf.setProducer('CertFlow');
  pdf.setCreator('CertFlow');
  return pdf.save();
}

/** Joins one-page (or longer) PDFs into one file, in the given order. */
export async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  out.setProducer('CertFlow');
  out.setCreator('CertFlow');
  return out.save();
}
