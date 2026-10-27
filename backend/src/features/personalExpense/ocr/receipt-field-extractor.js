/**
 * Receipt Field Extractor
 *
 * Normalizes and extracts structured receipt fields from OXR Markdown/JSON structures
 * and general text documents into the application's common receipt schema.
 */

import {
  parseAmount,
  minor,
  parseReceiptText,
  analyzeReceiptExtraction,
  sanitizeNumericToken,
  lastAmount,
  moneyValues,
} from './receiptParser.js';
import { createEmptyExtractedFields } from './ocr.provider.js';

// Whole-word match so items such as "Taxi fare" or "Totalizer" are not mistaken for summary rows.
const SUMMARY_ROW = /\b(?:sub\s*-?\s*total|total|tax|gst|cgst|sgst|igst|cess|vat|discount|grand\s*total|net\s*payable|round\s*off)\b/i;
const ITEM_HEADER =/item|desc|particular|product/i;
const AMOUNT_HEADER = /amount|total|net|price|rate/i;

/**
 * Extracts line items from Markdown tables.
 * Every table is evaluated with its own header row, so header/metadata tables
 * (e.g. | Bill No | Date |) are never mixed into the item table.
 *
 * Example Markdown table:
 * | Item | Qty | Price | Total |
 * | Apple | 2 | 50.00 | 100.00 |
 */
export function extractItemsFromMarkdownTable(markdown = '') {
  const lines = markdown.split(/\r?\n/).map((l) => l.trim()); // blank lines are kept: they separate tables
  const isRow = (line) => line.startsWith('|') && line.endsWith('|') && line.length > 1;
  const splitCells = (line) => line.slice(1, -1).split('|').map((c) => c.trim());
  const isSeparator = (cells) => cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));

  // Group consecutive table lines into separate tables.
  const tables = [];
  let current = null;
  for (const line of lines) {
    if (isRow(line)) {
      (current ??= []).push(splitCells(line));
    } else if (current) {
      tables.push(current);
      current = null;
    }
  }
  if (current) tables.push(current);

  const items = [];
  for (const table of tables) {
    // Standard Markdown: header row followed by a separator row. Tables without one have no header.
    const hasHeader = table.length > 1 && isSeparator(table[1]);
    const headers = hasHeader ? table[0].map((c) => c.toLowerCase()) : [];
    const rows = table.filter((cells, index) => !isSeparator(cells) && !(hasHeader && index === 0));

    const descIdx = headers.findIndex((h) => ITEM_HEADER.test(h));
    const qtyIdx = headers.findIndex((h) => /qty|quantity|nos|count/i.test(h));
    const priceIdx = headers.findIndex((h) => /rate|unit\s*price|price/i.test(h));
    const totalIdx = headers.findIndex((h) => /amount|total|net/i.test(h));

    // A headed table that has neither a description nor an amount column is metadata, not line items.
    if (hasHeader && descIdx < 0 && !headers.some((h) => AMOUNT_HEADER.test(h))) continue;

    for (const cells of rows) {
      const rowText = cells.join(' ');
      if (SUMMARY_ROW.test(rowText)) continue;

      const description = descIdx >= 0 && cells[descIdx] ? cells[descIdx] : cells[0] || '';
      let quantity = 1;
      let unitPriceMinor = null;
      let amountMinor = null;

      if (qtyIdx >= 0 && cells[qtyIdx]) {
        const q = Number(sanitizeNumericToken(cells[qtyIdx]));
        if (Number.isFinite(q) && q > 0) quantity = q;
      }
      if (priceIdx >= 0 && cells[priceIdx]) unitPriceMinor = minor(cells[priceIdx]);
      if (totalIdx >= 0 && cells[totalIdx]) {
        amountMinor = minor(cells[totalIdx]);
      } else if (cells.length > 1) {
        amountMinor = lastAmount(rowText);
      }

      if (amountMinor == null && unitPriceMinor != null) amountMinor = Math.round(unitPriceMinor * quantity);
      if (unitPriceMinor == null && amountMinor != null) unitPriceMinor = Math.round(amountMinor / quantity);

      if (description && amountMinor != null && amountMinor > 0) {
        items.push({
          description: description.replace(/[*_#`]/g, '').trim(),
          quantity,
          unitPriceMinor,
          amountMinor,
          confidence: 90,
        });
      }
    }
  }

  return items;
}

/**
 * Extracts line items from OXR's JSON elements structure
 */
export function extractItemsFromJsonStructure(jsonStructure = {}) {
  const elements = jsonStructure?.elements || [];
  const items = [];

  for (const el of elements) {
    if (el.type === 'table' && Array.isArray(el.headers) && Array.isArray(el.rows)) {
      const headers = el.headers.map((h) => String(h).toLowerCase());
      const descIdx = headers.findIndex((h) => /item|desc|particular|product/i.test(h));
      const qtyIdx = headers.findIndex((h) => /qty|quantity|count/i.test(h));
      const priceIdx = headers.findIndex((h) => /rate|unit\s*price|price/i.test(h));
      const totalIdx = headers.findIndex((h) => /amount|total|net/i.test(h));

      for (const row of el.rows) {
        if (!Array.isArray(row)) continue;
        const rowStr = row.join(' ');
        if (SUMMARY_ROW.test(rowStr)) continue;

        const description = descIdx >= 0 && row[descIdx] ? String(row[descIdx]).trim() : String(row[0] || '').trim();
        const quantity = qtyIdx >= 0 && row[qtyIdx] ? Number(sanitizeNumericToken(row[qtyIdx])) || 1 : 1;
        const unitPriceMinor = priceIdx >= 0 && row[priceIdx] ? minor(row[priceIdx]) : null;
        let amountMinor = totalIdx >= 0 && row[totalIdx] ? minor(row[totalIdx]) : null;

        if (amountMinor == null && unitPriceMinor != null) {
          amountMinor = Math.round(unitPriceMinor * quantity);
        }

        if (description && amountMinor != null && amountMinor > 0) {
          items.push({
            description: description.replace(/[*_#`]/g, '').trim(),
            quantity,
            unitPriceMinor,
            amountMinor,
            confidence: 90,
          });
        }
      }
    }
  }

  return items;
}

/**
 * Converts Markdown or structured text to a clean text representation
 * for regex and semantic parsing.
 */
export function markdownToCleanText(markdown = '') {
  return markdown
    .replace(/^#+\s+/gm, '') // Remove Markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italics
    .replace(/^\||\|$/gm, '') // Strip table borders
    .replace(/\|/g, ' ') // Replace table pipes with spaces
    .replace(/^:?-+:?$/gm, '') // Remove table separators
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Main extractor for OXR or structured OCR responses.
 *
 * @param {Object} params
 * @param {string} [params.markdown] - Raw markdown text from OXR
 * @param {Object} [params.jsonStructure] - Optional JSON structure from OXR
 * @param {string} [params.rawText] - Optional fallback raw text
 * @returns {Object} Standardized extracted receipt fields
 */
export function extractStructuredReceiptFields({ markdown = '', jsonStructure = null, rawText = '' } = {}) {
  const content = markdown || rawText || '';
  const cleanText = markdownToCleanText(content);

  // Use base parser on the clean text for amounts, dates, merchant, metadata
  const baseParsed = analyzeReceiptExtraction(parseReceiptText(cleanText));

  // Extract structured items from Markdown table or JSON structure if available
  let structuredItems = [];
  if (jsonStructure) {
    structuredItems = extractItemsFromJsonStructure(jsonStructure);
  }
  if (!structuredItems.length && markdown) {
    structuredItems = extractItemsFromMarkdownTable(markdown);
  }

  // If structured items were found, prefer them over raw text regex items
  const finalItems = structuredItems.length > 0 ? structuredItems : (baseParsed.items || []);

  const totalMinor = baseParsed.totalMinor;
  const totalAmount = baseParsed.totalAmount ?? (totalMinor != null ? totalMinor / 100 : null);

  return {
    ...createEmptyExtractedFields(),
    ...baseParsed,
    items: finalItems,
    totalMinor,
    totalAmount,
    documentDisplayedStatus: baseParsed.settlement || null,
    paymentStatus: baseParsed.settlement || null,
  };
}
