import orchestrator from './ocr/ocr-orchestrator.js';
import { tesseractConfiguration } from './ocr/tesseractLocal.provider.js';

export const ocrConfiguration = (env = process.env) => tesseractConfiguration(env);

/**
 * Extracts structured transaction details from a personal expense receipt image.
 * Uses provider-based OCR architecture supporting Tesseract, OXR, Dual, and Fallback modes.
 *
 * @param {Object} file - Multer file object or { path, mimetype, size, originalname }
 * @param {Object} [options] - Optional dependency overrides for testing
 * @returns {Promise<{ status: string, engineStatus: string, error: string|null, result: Object|null }>}
 */
export async function extractReceipt(file, options = {}) {
  return orchestrator.processReceipt(file, options);
}
