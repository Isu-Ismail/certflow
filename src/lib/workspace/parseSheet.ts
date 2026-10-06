import type { Sheet } from './types';

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return [',', '\t', ';']
    .map((d) => [d, firstLine.split(d).length] as const)
    .sort((a, b) => b[1] - a[1])[0][0];
}

/** Small RFC 4180 parser: quoted cells, escaped quotes, CRLF. */
function parseTable(text: string, delimiter: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); out.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out;
}

function toSheet(table: string[][], fileName: string, format: 'csv' | 'xlsx' = 'csv'): Sheet {
  const filled = table.filter((r) => r.some((c) => c.trim() !== ''));
  if (filled.length < 2) throw new Error('The file needs a header row and at least one data row.');
  const seen = new Map<string, number>();
  const columns = filled[0].map((h, i) => {
    const base = h.trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} ${n}` : base;
  });
  const rows = filled.slice(1).map((r) => Object.fromEntries(columns.map((c, i) => [c, (r[i] ?? '').trim()])));
  return { fileName, columns, rows, format };
}

export function parseDelimited(text: string, fileName = 'data.csv'): Sheet {
  const clean = text.replace(/^﻿/, '');
  return toSheet(parseTable(clean, detectDelimiter(clean)), fileName);
}

type Xlsx = typeof import('xlsx');
let xlsxLib: Xlsx | null = null;
/** Loads the Excel library (needed before a workbook can be written). */
export const loadXlsx = () => import('xlsx').then((m) => (xlsxLib = m));
export const xlsxLoaded = () => xlsxLib !== null;

/** CSV / TSV / Excel. The Excel library is only loaded when an Excel file is used. */
export async function parseSheetFile(file: File): Promise<Sheet> {
  if (/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)) {
    const XLSX = await import('xlsx');
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const table = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[book.SheetNames[0]], { header: 1, raw: false, defval: '' });
    xlsxLib = XLSX;
    return toSheet(table.map((r) => r.map(String)), file.name, 'xlsx');
  }
  return parseDelimited(await file.text(), file.name);
}

const escapeCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function sheetToCsv(sheet: Sheet): string {
  const lines = [sheet.columns, ...sheet.rows.map((r) => sheet.columns.map((c) => r[c] ?? ''))];
  return lines.map((l) => l.map(escapeCell).join(',')).join('\n') + '\n';
}

const xlsxCache = new WeakMap<Sheet, Blob>(); // sheets are replaced, never changed: one workbook per sheet

/** The sheet as an .xlsx file (null while the Excel library is not loaded yet). */
export function sheetToXlsx(sheet: Sheet): Blob | null {
  if (!xlsxLib) return null;
  let blob = xlsxCache.get(sheet);
  if (!blob) {
    const book = xlsxLib.utils.book_new();
    xlsxLib.utils.book_append_sheet(book, xlsxLib.utils.aoa_to_sheet([sheet.columns, ...sheet.rows.map((r) => sheet.columns.map((c) => r[c] ?? ''))]), 'Sheet1');
    blob = new Blob([xlsxLib.write(book, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    xlsxCache.set(sheet, blob);
  }
  return blob;
}
