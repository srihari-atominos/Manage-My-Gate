import { parseReceiptText } from './ocr/receiptParser.js';
import { runTesseract, tesseractConfiguration, validateOcrFile } from './ocr/tesseractLocal.provider.js';

export const ocrConfiguration = () => tesseractConfiguration();

export async function extractReceipt(file) {
  const validFile = validateOcrFile(file);
  if (!validFile.valid) return { status: 'FAILED', engineStatus: validFile.status, error: validFile.error, result: null };

  const config = ocrConfiguration();
  if (!config.configured) {
    return {
      status: 'FAILED',
      engineStatus: 'NOT_CONFIGURED',
      error: 'Local receipt OCR is not enabled. Enter the transaction details manually.',
      result: null,
    };
  }

  const outcome = await runTesseract(file, config);
  if (outcome.status !== 'COMPLETED') {
    return { status: 'FAILED', engineStatus: outcome.status, error: outcome.error, result: null };
  }

  return { status: 'COMPLETED', engineStatus: 'COMPLETED', error: null, result: parseReceiptText(outcome.text) };
}