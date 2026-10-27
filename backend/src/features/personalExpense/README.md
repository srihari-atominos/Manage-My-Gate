# Personal Expense Receipt OCR — Dual Engine Architecture (Tesseract + OXR)

Personal Expense receipts are stored privately and can only be accessed through authenticated endpoints scoped to both the active organization and the record owner. OCR is an optional convenience: extracted values are always shown for review and are never applied to a transaction automatically without user confirmation.

---

## 1. Architecture Overview

NAHOM employs an isolated, provider-based OCR architecture under `src/features/personalExpense/ocr/`:

* **`ocr.provider.js`**: Defines the base provider interface (`BaseOcrProvider`) and standardized extraction result shapes.
* **`tesseract.provider.js`**: Encapsulates local Tesseract execution with multi-pass image preprocessing (EXIF auto-rotation, CLAHE contrast enhancement, dark-mode inversion, and multi-PSM segmentation).
* **`oxr.provider.js`**: Integrates OXR (Optical Everything Recognition) via the official documented `POST /v1/parse/sync` endpoint with multipart upload and structured Markdown/JSON parsing.
* **`ocr-orchestrator.js`**: Manages execution modes (`tesseract`, `oxr`, `dual`, `fallback`) with parallel execution, isolated timeouts, and failure tolerance.
* **`receipt-field-extractor.js`**: Extracts structured receipt fields, Markdown tables, and JSON elements into the application's common schema.
* **`receipt-validator.js`**: Validates monetary amounts (paise), calendar dates, arithmetic integrity (`subtotal + tax + charges - discount == total`), item sum consistency, and payment status verification.
* **`receipt-reconciler.js`**: Performs field-level comparison between Tesseract and OXR outputs, detects conflicts, tracks data provenance, and computes transparent confidence ratings.
* **`ocrEvaluationTool.js`**: Isolated evaluation framework benchmarked against representative ground-truth receipts across grocery, hardware, utility, restaurant, UPI/payment screenshots, and regional scripts.

---

## 2. Configuration & Execution Modes

The active mode is controlled via backend environment variables. Tesseract remains the default mode.

```text
# OCR Engine Mode: 'tesseract' (default) | 'oxr' | 'dual' | 'fallback'
OCR_PROVIDER=tesseract

# Feature Flags
OCR_DUAL_ENABLED=false
OCR_FALLBACK_ENABLED=false
OCR_TESSERACT_ENABLED=true
OCR_OXR_ENABLED=false

# Tesseract Configuration
TESSERACT_COMMAND=C:\Program Files\Tesseract-OCR\tesseract.exe
PERSONAL_EXPENSE_OCR_LANGUAGES=eng
PERSONAL_EXPENSE_OCR_TIMEOUT_MS=20000

# OXR Configuration (Disabled by default)
OXR_API_URL=http://localhost:8000/v1/parse/sync
OXR_API_KEY=dummy
OCR_TIMEOUT_MS=25000
```

### Execution Modes

1. **`tesseract` (Default):** Runs only the local Tesseract OCR engine with native Sharp preprocessing. Zero cloud dependencies, zero external network calls.
2. **`oxr`:** Submits the receipt to the configured OXR endpoint and extracts fields from Markdown and JSON elements.
3. **`dual`:** Runs both Tesseract and OXR in parallel using `Promise.allSettled`. If both succeed, results are reconciled at the field level. If one engine fails or times out, the other engine's valid result is preserved.
4. **`fallback`:** Executes Tesseract first. If Tesseract encounters a processing failure, missing total, or severe arithmetic inconsistencies, OXR is invoked as a fallback.

---

## 3. Field-Level Comparison & Reconciliation

When running in `dual` mode:
* **Total Amount:** Values are compared in minor units (paise). If amounts differ, an `AMOUNT_CONFLICT` is flagged and candidate values from both engines are presented for user selection.
* **Date:** Validated against `YYYY-MM-DD`. Disagreements trigger a `DATE_CONFLICT`.
* **Merchant Name:** Normalized and compared using word-level similarity. Differences trigger a `MERCHANT_CONFLICT`.
* **Line Items:** Structured table items from OXR are compared against Tesseract rows. Neither engine ever invents missing line items or prices.
* **Provenance:** Every field records its origin (`source: 'tesseract' | 'oxr' | 'reconciled' | 'conflict'`).
* **Original Outputs:** Raw provider outputs are preserved in receipt metadata without overwriting.

---

## 4. Payment Screenshot Verification vs. Document Status

For UPI, Google Pay, PhonePe, and Paytm screenshots:
* Extracted status (e.g. `Completed`, `Failed`, `Pending`) is stored in `documentDisplayedStatus`.
* OCR alone **NEVER** verifies a transaction. `verifiedPaymentStatus` remains strictly `UNVERIFIED`.
* Detected payment failures trigger an explicit diagnostic warning banner in the mobile review screen.

---

## 5. Security & Privacy Considerations

* **Tenant & User Isolation:** Receipts are only accessible to authenticated users within their active organization context (`userId` + `orgId`).
* **No Client Keys:** Provider API keys and endpoints reside strictly on the backend.
* **File Validation:** Files are verified for extension, MIME type, and magic bytes (`IMAGE`, `PDF`). Max file size is constrained to 10 MB.
* **Scratch Cleaning:** Temporary image preprocessing files are safely unlinked in `finally` blocks.
* **Privacy Warning for OXR:** Free/public OXR endpoints must **never** be used with real residents' personal financial receipts. Only self-hosted containers or approved enterprise endpoints may be used for sensitive production documents.

---

## 6. OXR Licensing Assessment

* **License Type:** OXR Open Source License (Apache 2.0 with additional terms).
* **Commercial Restrictions:** Free commercial use is restricted to individuals or organizations with **under USD 2 million in total funding and annual revenue**. Entities exceeding $2M must acquire a commercial license from SoMark.
* **Attribution:** Public-facing online services must prominently display "SoMark OXR".
* **API Restrictions:** Competing hosted parsing APIs are prohibited.
* **Production Recommendation:** Tesseract remains the default production engine. OXR is recommended for self-hosted container deployment for organizations within the $2M threshold or with a commercial license.
