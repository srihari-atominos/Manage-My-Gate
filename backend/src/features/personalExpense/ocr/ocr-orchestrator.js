/**
 * OCR Orchestrator
 *
 * Coordinates multi-engine receipt processing across Tesseract and OXR.
 * Supports configurable modes: 'tesseract', 'oxr', 'dual', and 'fallback'.
 * Handles parallel execution, isolated timeouts, failure tolerance,
 * and result reconciliation.
 */

import tesseractProvider from './tesseract.provider.js';
import oxrProvider from './oxr.provider.js';
import { reconcileReceiptResults } from './receipt-reconciler.js';
import { validateExtractedReceipt } from './receipt-validator.js';

// personalExpenseTransaction.receipt.ocrError is capped at 240 chars; an over-long message would fail validation on save.
const MAX_ERROR_LENGTH = 240;
const clampError = (message) => {
  const text = String(message ?? '');
  return text.length > MAX_ERROR_LENGTH ? `${text.slice(0, MAX_ERROR_LENGTH - 1)}…` : text;
};

export class OcrOrchestrator {
  constructor(providers = { tesseract: tesseractProvider, oxr: oxrProvider }) {
    this.providers = providers;
  }

  /**
   * Resolves the active processing mode based on environment variables.
   * Default is 'tesseract' for full backwards compatibility.
   */
  resolveMode(env = process.env) {
    if (env.OCR_DUAL_ENABLED === 'true') return 'dual';
    if (env.OCR_FALLBACK_ENABLED === 'true') return 'fallback';

    const explicitMode = (env.OCR_PROVIDER || env.PERSONAL_EXPENSE_OCR_PROVIDER || 'tesseract').toLowerCase();
    if (explicitMode === 'dual') return 'dual';
    if (explicitMode === 'fallback') return 'fallback';
    if (explicitMode === 'oxr') return 'oxr';
    return 'tesseract';
  }

  /**
   * Main entry point to process a receipt file.
   *
   * @param {Object} file - Receipt file object
   * @param {Object} [options] - Options (mode, env, providers, preprocess)
   * @returns {Promise<{ status: string, engineStatus: string, error: string|null, result: Object|null }>}
   */
  async processReceipt(file, options = {}) {
    const env = options.env || process.env;
    const mode = options.mode || this.resolveMode(env);

    switch (mode) {
      case 'oxr':
        return this.processOxrOnly(file, options);
      case 'dual':
        return this.processDual(file, options);
      case 'fallback':
        return this.processFallback(file, options);
      case 'tesseract':
      default:
        return this.processTesseractOnly(file, options);
    }
  }

  /**
   * Tesseract-only processing mode
   */
  async processTesseractOnly(file, options = {}) {
    const tProvider = options.providers?.tesseract || this.providers.tesseract;
    const tOutcome = await tProvider.process(file, options);

    if (tOutcome.status !== 'COMPLETED') {
      return {
        status: 'FAILED',
        engineStatus: tOutcome.status,
        error: clampError(tOutcome.error || 'Local OCR failed to extract receipt details.'),
        result: null,
      };
    }

    const validation = validateExtractedReceipt(tOutcome.extractedFields);
    const enrichedFields = {
      ...tOutcome.extractedFields,
      warnings: validation.warnings,
      needsReview: validation.needsReview,
      recognizedText: tOutcome.rawText.slice(0, 4000),
      ocrEngine: 'tesseract',
      mode: 'tesseract',
    };

    return {
      status: 'COMPLETED',
      engineStatus: 'COMPLETED',
      error: null,
      result: enrichedFields,
    };
  }

  /**
   * OXR-only processing mode
   */
  async processOxrOnly(file, options = {}) {
    const oProvider = options.providers?.oxr || this.providers.oxr;
    const oOutcome = await oProvider.process(file, options);

    if (oOutcome.status !== 'COMPLETED') {
      return {
        status: 'FAILED',
        engineStatus: oOutcome.status,
        error: clampError(oOutcome.error || 'OXR failed to extract receipt details.'),
        result: null,
      };
    }

    const validation = validateExtractedReceipt(oOutcome.extractedFields);
    const enrichedFields = {
      ...oOutcome.extractedFields,
      warnings: validation.warnings,
      needsReview: validation.needsReview,
      recognizedText: oOutcome.rawText.slice(0, 4000),
      ocrEngine: 'oxr',
      mode: 'oxr',
    };

    return {
      status: 'COMPLETED',
      engineStatus: 'COMPLETED',
      error: null,
      result: enrichedFields,
    };
  }

  /**
   * Dual processing mode: runs both engines in parallel, reconciles when both succeed,
   * gracefully falls back if one fails.
   */
  async processDual(file, options = {}) {
    const tProvider = options.providers?.tesseract || this.providers.tesseract;
    const oProvider = options.providers?.oxr || this.providers.oxr;

    // Run both providers concurrently with independent error isolation
    const [tResultSettled, oResultSettled] = await Promise.allSettled([
      tProvider.process(file, options),
      oProvider.process(file, options),
    ]);

    const tOutcome = tResultSettled.status === 'fulfilled' ? tResultSettled.value : { status: 'FAILED', error: tResultSettled.reason?.message };
    const oOutcome = oResultSettled.status === 'fulfilled' ? oResultSettled.value : { status: 'FAILED', error: oResultSettled.reason?.message };

    const tSuccess = tOutcome.status === 'COMPLETED';
    const oSuccess = oOutcome.status === 'COMPLETED';

    // Case 1: Both failed
    if (!tSuccess && !oSuccess) {
      return {
        status: 'FAILED',
        engineStatus: 'BOTH_FAILED',
        error: clampError(`Both OCR engines failed. Tesseract: ${tOutcome.error || 'failed'}, OXR: ${oOutcome.error || 'failed'}. Enter details manually.`),
        result: null,
      };
    }

    // Case 2: Only Tesseract succeeded (OXR failed)
    if (tSuccess && !oSuccess) {
      const validation = validateExtractedReceipt(tOutcome.extractedFields);
      return {
        status: 'COMPLETED',
        engineStatus: 'DUAL_TESSERACT_ONLY',
        error: null,
        result: {
          ...tOutcome.extractedFields,
          warnings: [
            { code: 'OXR_ENGINE_FAILED', message: `OXR engine failed: ${oOutcome.error}. Displaying Tesseract results.` },
            ...validation.warnings,
          ],
          needsReview: validation.needsReview,
          recognizedText: tOutcome.rawText.slice(0, 4000),
          ocrEngine: 'tesseract',
          mode: 'dual',
          singleEngineFallback: 'tesseract',
          providerStatuses: { tesseract: 'COMPLETED', oxr: oOutcome.status },
        },
      };
    }

    // Case 3: Only OXR succeeded (Tesseract failed)
    if (!tSuccess && oSuccess) {
      const validation = validateExtractedReceipt(oOutcome.extractedFields);
      return {
        status: 'COMPLETED',
        engineStatus: 'DUAL_OXR_ONLY',
        error: null,
        result: {
          ...oOutcome.extractedFields,
          warnings: [
            { code: 'TESSERACT_ENGINE_FAILED', message: `Tesseract engine failed: ${tOutcome.error}. Displaying OXR results.` },
            ...validation.warnings,
          ],
          needsReview: validation.needsReview,
          recognizedText: oOutcome.rawText.slice(0, 4000),
          ocrEngine: 'oxr',
          mode: 'dual',
          singleEngineFallback: 'oxr',
          providerStatuses: { tesseract: tOutcome.status, oxr: 'COMPLETED' },
        },
      };
    }

    // Case 4: Both succeeded -> Reconcile results
    const reconciliation = reconcileReceiptResults(tOutcome, oOutcome);

    return {
      status: 'COMPLETED',
      engineStatus: 'DUAL_RECONCILED',
      error: null,
      result: {
        ...reconciliation.reconciledFields,
        recognizedText: (oOutcome.rawText || tOutcome.rawText).slice(0, 4000),
        ocrEngine: 'dual',
        mode: 'dual',
        disagreements: reconciliation.disagreements,
        provenance: reconciliation.provenance,
        providerStatuses: { tesseract: 'COMPLETED', oxr: 'COMPLETED' },
        rawProviderOutputs: {
          tesseract: {
            confidence: tOutcome.confidence,
            totalMinor: tOutcome.extractedFields?.totalMinor,
            receiptDate: tOutcome.extractedFields?.receiptDate,
            merchant: tOutcome.extractedFields?.merchant,
            itemsCount: tOutcome.extractedFields?.items?.length || 0,
          },
          oxr: {
            confidence: oOutcome.confidence,
            totalMinor: oOutcome.extractedFields?.totalMinor,
            receiptDate: oOutcome.extractedFields?.receiptDate,
            merchant: oOutcome.extractedFields?.merchant,
            itemsCount: oOutcome.extractedFields?.items?.length || 0,
          },
        },
      },
    };
  }

  /**
   * Fallback mode: tries Tesseract first. If Tesseract fails or has missing total
   * or severe arithmetic problems, invokes OXR.
   */
  async processFallback(file, options = {}) {
    const tProvider = options.providers?.tesseract || this.providers.tesseract;
    const tOutcome = await tProvider.process(file, options);

    const tSuccess = tOutcome.status === 'COMPLETED';
    const totalMissing = tOutcome.extractedFields?.totalMinor == null;
    const hasSevereWarning = (tOutcome.extractedFields?.warnings || []).some((w) => w.code === 'TOTAL_MISMATCH');

    // If Tesseract produced a clean extraction with total and no severe warning, use it
    if (tSuccess && !totalMissing && !hasSevereWarning) {
      const validation = validateExtractedReceipt(tOutcome.extractedFields);
      return {
        status: 'COMPLETED',
        engineStatus: 'COMPLETED',
        error: null,
        result: {
          ...tOutcome.extractedFields,
          warnings: validation.warnings,
          needsReview: validation.needsReview,
          recognizedText: tOutcome.rawText.slice(0, 4000),
          ocrEngine: 'tesseract',
          mode: 'fallback',
        },
      };
    }

    // Otherwise, invoke OXR as fallback
    const oProvider = options.providers?.oxr || this.providers.oxr;
    const oOutcome = await oProvider.process(file, options);

    if (oOutcome.status === 'COMPLETED') {
      const validation = validateExtractedReceipt(oOutcome.extractedFields);
      return {
        status: 'COMPLETED',
        engineStatus: 'FALLBACK_OXR_COMPLETED',
        error: null,
        result: {
          ...oOutcome.extractedFields,
          warnings: [
            { code: 'FALLBACK_TO_OXR', message: 'Tesseract extraction was incomplete. Re-extracted using OXR.' },
            ...validation.warnings,
          ],
          needsReview: validation.needsReview,
          recognizedText: oOutcome.rawText.slice(0, 4000),
          ocrEngine: 'oxr',
          mode: 'fallback',
        },
      };
    }

    // If OXR also failed but Tesseract had some result, return Tesseract with warnings
    if (tSuccess) {
      const validation = validateExtractedReceipt(tOutcome.extractedFields);
      return {
        status: 'COMPLETED',
        engineStatus: 'FALLBACK_TESSERACT_PARTIAL',
        error: null,
        result: {
          ...tOutcome.extractedFields,
          warnings: [
            { code: 'OXR_FALLBACK_FAILED', message: `OXR fallback failed: ${oOutcome.error}` },
            ...validation.warnings,
          ],
          needsReview: true,
          recognizedText: tOutcome.rawText.slice(0, 4000),
          ocrEngine: 'tesseract',
          mode: 'fallback',
        },
      };
    }

    return {
      status: 'FAILED',
      engineStatus: 'BOTH_FAILED',
      error: clampError(`Receipt OCR failed across both engines. Tesseract: ${tOutcome.error || 'failed'}, OXR: ${oOutcome.error || 'failed'}.`),
      result: null,
    };
  }
}

export default new OcrOrchestrator();
