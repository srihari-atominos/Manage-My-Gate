# Community Expense receipt OCR

Community Expense receipt scanning uses the free, local Tesseract executable on the backend server. It makes no cloud request and requires no Google account, API key, bank card, or paid OCR subscription.

Configure the deployed backend environment, then restart the backend service:

```env
EXPENSE_OCR_PROVIDER=tesseract-local
# TESSERACT_COMMAND=tesseract
# EXPENSE_OCR_LANGUAGES=eng
# EXPENSE_OCR_TIMEOUT_MS=20000
# Optional: self-hosted OXR fallback for complex tables and scanned PDFs.
# It is attempted only when local OCR cannot confidently recover the core fields.
EXPENSE_OCR_OXR_ENABLED=false
# OXR_API_URL=http://localhost:8000/v1/parse/sync
# OXR_API_KEY=
```

Install Tesseract and its language data in the same environment that runs the backend. Verify both before use:

```text
tesseract --version
tesseract --list-langs
```

JPG/JPEG, PNG, and WEBP receipts are scanned locally. PDFs can be attached but are not OCR-scanned; users can enter the date, amount, and items manually. Missing Tesseract, missing language data, timeouts, unreadable images, and incomplete extraction all retain the manual entry workflow.

English (`eng`) is the default. Install the relevant Tesseract `*.traineddata` model and set `EXPENSE_OCR_LANGUAGES`, for example `eng+tam`, before using another language.