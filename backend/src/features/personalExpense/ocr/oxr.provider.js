/**
 * OXR (Optical Everything Recognition) Provider
 *
 * Implements document parsing via the official SoMarkAI/OXR API.
 * Uses the documented endpoint: POST /v1/parse/sync
 * Parses structured Markdown & JSON output into standardized receipt fields.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseOcrProvider, createEmptyExtractedFields } from './ocr.provider.js';
import { extractStructuredReceiptFields } from './receipt-field-extractor.js';

const DEFAULT_OXR_URL = 'http://localhost:8000/v1/parse/sync';
const DEFAULT_TIMEOUT_MS = 25_000;
const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export class OxrProvider extends BaseOcrProvider {
  constructor(config = {}) {
    super('oxr', config);
  }

  getConfig(env = process.env) {
    const enabled = env.OCR_OXR_ENABLED === 'true' || env.PERSONAL_EXPENSE_OXR_ENABLED === 'true' || env.EXPENSE_OCR_OXR_ENABLED === 'true';
    const apiUrl = env.OXR_API_URL || this.config.apiUrl || DEFAULT_OXR_URL;
    const apiKey = env.OXR_API_KEY || this.config.apiKey || 'dummy';
    const timeout = Number(env.OCR_TIMEOUT_MS || env.PERSONAL_EXPENSE_OCR_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    const timeoutMs = Number.isFinite(timeout) && timeout >= 1000 && timeout <= 120_000 ? timeout : DEFAULT_TIMEOUT_MS;

    return {
      enabled,
      apiUrl,
      apiKey,
      timeoutMs,
      ...this.config,
    };
  }

  async isAvailable(env = process.env) {
    const config = this.getConfig(env);
    if (!config.enabled) {
      return { available: false, reason: 'OXR provider is disabled in configuration.' };
    }
    if (!config.apiUrl) {
      return { available: false, reason: 'OXR API URL is not configured.' };
    }
    return { available: true, endpoint: config.apiUrl };
  }

  /**
   * Process a receipt through the OXR API endpoint.
   *
   * @param {Object} file - File descriptor with path, mimetype, originalname, size
   * @param {Object} [options] - Overrides for testing (fetchImpl, env, timeoutMs)
   * @returns {Promise<import('./ocr.provider.js').ProviderOcrResult>}
   */
  async process(file, options = {}) {
    const startTime = Date.now();
    const env = options.env || process.env;
    const config = { ...this.getConfig(env), ...options };
    const fetchImpl = options.fetchImpl || globalThis.fetch;

    if (!file?.path) {
      return {
        provider: 'oxr',
        status: 'FAILED',
        error: 'A receipt file is required.',
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    }

    if (file.mimetype && !supportedMimeTypes.has(file.mimetype)) {
      return {
        provider: 'oxr',
        status: 'UNSUPPORTED',
        error: 'OXR supports JPG, PNG, WEBP, and PDF documents only.',
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    }

    if (!config.enabled) {
      return {
        provider: 'oxr',
        status: 'UNAVAILABLE',
        error: 'OXR provider is disabled in configuration.',
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    }

    // Read file buffer safely
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(file.path);
    } catch (readErr) {
      return {
        provider: 'oxr',
        status: 'FAILED',
        error: `Could not read receipt file for OXR processing: ${readErr.message}`,
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    }

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const formData = new FormData();
      const filename = path.basename(file.originalname || file.path || 'receipt.jpg');
      const blob = new Blob([fileBuffer], { type: file.mimetype || 'image/jpeg' });
      formData.append('file', blob, filename);
      formData.append('api_key', config.apiKey);
      formData.append('output_formats', 'markdown');
      formData.append('output_formats', 'json');

      const response = await fetchImpl(config.apiUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      // The abort timer stays armed until the body is read (cleared in `finally`), so a stalled body cannot hang the request.
      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {}

        if (response.status === 429) {
          return {
            provider: 'oxr',
            status: 'FAILED',
            error: 'OXR API rate limit exceeded. Please retry shortly.',
            rawText: '',
            confidence: null,
            structuredData: null,
            extractedFields: createEmptyExtractedFields(),
            durationMs: Date.now() - startTime,
          };
        }

        return {
          provider: 'oxr',
          status: 'FAILED',
          error: `OXR endpoint returned HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
          rawText: '',
          confidence: null,
          structuredData: null,
          extractedFields: createEmptyExtractedFields(),
          durationMs: Date.now() - startTime,
        };
      }

      let jsonResponse;
      try {
        jsonResponse = await response.json();
      } catch {
        return {
          provider: 'oxr',
          status: 'FAILED',
          error: 'OXR endpoint returned invalid JSON.',
          rawText: '',
          confidence: null,
          structuredData: null,
          extractedFields: createEmptyExtractedFields(),
          durationMs: Date.now() - startTime,
        };
      }

      // Check official response structure: { code: 200, data: { results: { markdown, json_structure } } }
      const results = jsonResponse?.data?.results || jsonResponse?.results || {};
      const markdown = results.markdown || (typeof results === 'string' ? results : '');
      const jsonStructure = results.json_structure || null;

      if (!markdown && !jsonStructure) {
        return {
          provider: 'oxr',
          status: 'FAILED',
          error: 'OXR returned empty or malformed extraction results.',
          rawText: '',
          confidence: null,
          structuredData: jsonResponse?.data || null,
          extractedFields: createEmptyExtractedFields(),
          durationMs: Date.now() - startTime,
        };
      }

      const extractedFields = extractStructuredReceiptFields({
        markdown,
        jsonStructure,
        rawText: markdown,
      });

      return {
        provider: 'oxr',
        status: 'COMPLETED',
        error: null,
        rawText: markdown,
        confidence: extractedFields.confidence ?? 85,
        structuredData: jsonStructure || jsonResponse?.data || null,
        extractedFields,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      const isTimeout = err.name === 'AbortError' || /timeout|aborted/i.test(err.message);
      return {
        provider: 'oxr',
        status: isTimeout ? 'TIMEOUT' : 'FAILED',
        error: isTimeout
          ? `OXR request timed out after ${config.timeoutMs}ms.`
          : `OXR connection error: ${err.message}`,
        rawText: '',
        confidence: null,
        structuredData: null,
        extractedFields: createEmptyExtractedFields(),
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}

export default new OxrProvider();
