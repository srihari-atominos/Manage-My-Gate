import fs from 'node:fs/promises';

const MAX_PAGES = 5;
const MIN_TEXT_LENGTH = 20;
const LINE_TOLERANCE = 3;

/**
 * Reads the text layer of a digital invoice PDF (utility bills, vendor invoices, bank advices).
 * Returns null for scanned PDFs without a text layer or unreadable files; those need manual entry.
 */
export async function extractPdfText(filePath) {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(await fs.readFile(filePath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false, disableFontFace: true, verbosity: 0 }).promise;
    const pages = [];
    for (let number = 1; number <= Math.min(doc.numPages, MAX_PAGES); number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      const rows = [];
      for (const item of content.items) {
        if (!item.str || !item.str.trim()) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        const row = rows.find((candidate) => Math.abs(candidate.y - y) <= LINE_TOLERANCE);
        if (row) row.items.push({ x, str: item.str }); else rows.push({ y, items: [{ x, str: item.str }] });
      }
      rows.sort((a, b) => b.y - a.y);
      pages.push(rows.map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.str.trim()).join(' ')).join('\n'));
    }
    await doc.cleanup?.();
    const text = pages.join('\n').trim();
    return text.length >= MIN_TEXT_LENGTH ? text : null;
  } catch {
    return null;
  }
}
