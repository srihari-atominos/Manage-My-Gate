import { BaseOcrProvider, createEmptyExtractedFields } from './ocr.provider.js';
import { runTesseract, checkTesseractRuntime, tesseractConfiguration, validateOcrFile } from './tesseractLocal.provider.js';
import { parseReceiptText, analyzeReceiptExtraction } from './receiptParser.js';
import { needsHeaderPass, mergeHeaderIdentity, trimMerchantNoise } from './headerBand.js';
import { buildReceiptVariants } from './receiptPreprocess.js';

const MAX_OCR_RUNS = 4;

const extractionScore = (result) =>
  (result.receiptDate || result.expenseDate ? 2 : 0) +
  (result.totalMinor != null ? 4 : 0) +
  (result.merchant ? 2 : 0) +
  (result.transactionReference ? 2 : 0) +
  (result.isPaymentScreenshot ? 2 : 0) +
  Math.min(result.items?.length || 0, 5);

const hasConsistencyProblem = (result) =>
  (result.warnings || []).some((w) => w.code === 'TOTAL_MISMATCH' || w.code === 'ITEMS_MISMATCH');

export class TesseractProvider extends BaseOcrProvider {
  constructor(config = {}) {
    super('tesseract', config);
  }

  getConfig(env = process.env) {
    const baseConfig = tesseractConfiguration(env);
    const configured =
      baseConfig.provider === 'tesseract-local' ||
      env.OCR_PROVIDER === 'tesseract' ||
      env.OCR_PROVIDER === 'dual' ||
      env.OCR_PROVIDER === 'fallback' ||
      env.OCR_DUAL_ENABLED === 'true' ||
      env.OCR_FALLBACK_ENABLED === 'true' ||
      env.OCR_TESSERACT_ENABLED === 'true' ||
      !env.PERSONAL_EXPENSE_OCR_PROVIDER;

    return {
      ...baseConfig,
      configured,
      ...this.config,
    };
  }

  async isAvailable(env = process.env, spawnImpl) {
    const config = this.getConfig(env);
    if (!config.configured) {
      return { available: false, reason: 'Tesseract provider is disabled in configuration.' };
    }
    const runtime = await checkTesseractRuntime(config, spawnImpl);
    if (runtime.status === 'READY') {
      return { available: true, usableLanguages: runtime.usableLanguages };
    }
    if (runtime.status === 'LANGUAGE_UNAVAILABLE' && runtime.usableLanguages?.length) {
      return { available: true, usableLanguages: runtime.usableLanguages, warning: runtime.error };
    }
    return { available: false, reason: runtime.error || 'Tesseract engine unavailable.' };
  }

  async process(file, options = {}) {
    const startTime = Date.now();
    const env = options.env || process.env;
    const config = { ...this.getConfig(env), ...options, withConfidence: true };
    const run = options.run || runTesseract;
    const preprocess = options.preprocess || buildReceiptVariants;

    const validCheck = validateOcrFile(file);
    if (!validCheck.valid) {
      return {
        provider: 'tesseract',
        status: validCheck.status === 'UNSUPPORTED_FILE' ? 'UNSUPPORTED' : 'FAILED',
        error: validCheck.error,
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    }

    if (!config.configured) {
      return {
        provider: 'tesseract',
        status: 'FAILED',
        error: 'Local receipt OCR is not configured. Enter the transaction details manually.',
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    }

    let prepared = { variants: [], cleanup: async () => {} };
    try {
      prepared = await preprocess(file.path);
    } catch {
      // Fallback to original image if preprocessing encounters an error
    }

    try {
      const attempts = [];
      prepared.variants?.forEach((variant, index) => {
        const modes = index === 0 ? [3, 4, 6] : [3, 4];
        modes.forEach((mode) => attempts.push({ variant, mode }));
      });
      attempts.push({ variant: { label: 'original', path: file.path }, mode: 3 });

      let best = null;
      let firstFailure = null;
      const completedRuns = [];

      for (const { variant, mode } of attempts.slice(0, MAX_OCR_RUNS)) {
        const outcome = await run(
          { ...file, path: variant.path },
          { ...config, pageSegmentationMode: mode },
          options.spawnImpl
        );

        if (outcome.status !== 'COMPLETED') {
          firstFailure ??= outcome;
          // A missing engine will not recover between passes; don't burn the remaining attempts on it.
          if (outcome.status === 'ENGINE_UNAVAILABLE') break;
          continue;
        }
        config.runtime ??= outcome.runtime;

        const parsed = analyzeReceiptExtraction(parseReceiptText(outcome.text), {
          ocrConfidence: outcome.confidence ?? null,
        });

        const consistencyPenalty = hasConsistencyProblem(parsed) ? 4 : 0;
        const rank = extractionScore(parsed) - consistencyPenalty;

        completedRuns.push({
          result: parsed,
          rank,
          text: outcome.text,
          mode,
          variant: variant.label,
          confidence: outcome.confidence,
          wordDetails: outcome.wordDetails,
        });

        if (!best || rank > best.rank) {
          best = {
            result: parsed,
            rank,
            text: outcome.text,
            mode,
            variant: variant.label,
            confidence: outcome.confidence,
            wordDetails: outcome.wordDetails,
          };
        }

        const hasCore4 =
          parsed.merchant &&
          (parsed.expenseDate || parsed.receiptDate) &&
          parsed.totalMinor != null &&
          (parsed.receiptNumber || parsed.transactionReference);

        if (hasCore4 && !hasConsistencyProblem(parsed)) {
          break;
        }
      }

      if (!best) {
        return {
          provider: 'tesseract',
          status: 'FAILED',
          error: firstFailure?.error || 'No readable text was found on this receipt. Enter the details manually.',
          rawText: '',
          confidence: null,
          structuredData: null,
          extractedFields: createEmptyExtractedFields(),
          durationMs: Date.now() - startTime,
        };
      }

      // Reconcile core fields (merchant & bill number) across all completed passes:
      const commercialKeywords = /\b(?:enterprises?|agency|agencies|solutions?|services?|traders?|stores?|mart|company|co|ltd|limited|pvt|electricals?|hardware|plumbing|sanitation|consulting|industries|stationery|hospital|pharmacy|bhavan|restaurant|hotel|foods?|motors?|power|telecom|fibernet)\b/i;
      const tamilCommercial = /(?:மளிகை|ஸ்டோர்|என்டர்பிரைசஸ்|நிலையம்|அங்காடி|ஏஜென்சி|டிரேடர்ஸ்|கடை)/u;

      for (const r of completedRuns) {
        // 1. Merchant: Prioritize merchant with commercial suffix or signature block over generic strings
        if (!best.result.merchant && r.result.merchant) {
          best.result.merchant = r.result.merchant;
        } else if (r.result.merchant && r.result.merchant !== best.result.merchant) {
          const currentHasComm = commercialKeywords.test(best.result.merchant) || tamilCommercial.test(best.result.merchant);
          const candidateHasComm = commercialKeywords.test(r.result.merchant) || tamilCommercial.test(r.result.merchant);
          if (!currentHasComm && candidateHasComm) {
            best.result.merchant = r.result.merchant;
          }
        }

        // 2. Preserve invoice/receipt numbers and payment references as distinct fields.
        // A UPI/bank reference is proof of payment, not an invoice number.
        if (r.result.receiptNumber) {
          const str = String(r.result.receiptNumber).trim();
          if (!best.result.receiptNumber || (/^\d{3,6}$/.test(str) && !/^\d{3,6}$/.test(String(best.result.receiptNumber)))) {
            best.result.receiptNumber = str;
          }
        }
        if (!best.result.transactionReference && r.result.transactionReference) {
          best.result.transactionReference = String(r.result.transactionReference).trim();
        }
      }

      // Supplementary inverted pass for white-on-black total banners if total is missing or derived
      const needsMore = best.result.totalMinor == null || best.result.totalDerived || hasConsistencyProblem(best.result);
      if (needsMore && prepared.inverted) {
        const outcome = await run(
          { ...file, path: prepared.inverted.path },
          { ...config, pageSegmentationMode: 6 },
          options.spawnImpl
        );
        if (outcome.status === 'COMPLETED') {
          const combinedText = `${best.text}\n${outcome.text}`;
          const parsed = analyzeReceiptExtraction(parseReceiptText(combinedText), {
            ocrConfidence: best.confidence ?? outcome.confidence ?? null,
          });
          const rank = extractionScore(parsed) - (hasConsistencyProblem(parsed) ? 4 : 0);
          if (rank > best.rank && !parsed.totalDerived) {
            best = {
              result: parsed,
              rank,
              text: combinedText,
              mode: 6,
              variant: `${best.variant}+inverted`,
              confidence: best.confidence,
              wordDetails: outcome.wordDetails,
            };
          }
        }
      }

      // Header-band pass: fill identity fields (bill no, date, vendor) that the full-page pass missed or garbled.
      if (prepared.header && needsHeaderPass(best.result, best.text)) {
        const outcome = await run(
          { ...file, path: prepared.header.path },
          { ...config, pageSegmentationMode: 6 },
          options.spawnImpl
        );
        if (outcome.status === 'COMPLETED') {
          const filled = mergeHeaderIdentity(best.result, best.text, outcome.text);
          if (Object.keys(filled).length) {
            best = {
              ...best,
              result: analyzeReceiptExtraction({ ...best.result, ...filled }, { ocrConfidence: best.confidence ?? null }),
              variant: `${best.variant}+header`,
            };
          }
        }
      }

      best.result.merchant = trimMerchantNoise(best.result.merchant, best.text);

      const extractedFields = {
        ...createEmptyExtractedFields(),
        ...best.result,
        totalAmount: best.result.totalAmount ?? (best.result.totalMinor != null ? best.result.totalMinor / 100 : null),
        documentDisplayedStatus: best.result.settlement || null,
        paymentStatus: best.result.settlement || null,
      };

      return {
        provider: 'tesseract',
        status: 'COMPLETED',
        error: null,
        rawText: best.text || '',
        confidence: best.confidence ?? null,
        structuredData: best.wordDetails ? { wordDetails: best.wordDetails } : null,
        extractedFields,
        durationMs: Date.now() - startTime,
      };
    } finally {
      await prepared.cleanup();
    }
  }
}

export default new TesseractProvider();
