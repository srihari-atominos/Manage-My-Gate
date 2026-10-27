# Personal Expense receipt OCR

Personal Expense receipts are stored privately and can only be accessed through authenticated endpoints scoped to both the active organization and the record owner. OCR is an optional convenience: extracted values are always shown for review and are never applied to a transaction automatically.

## Local-only engine

This module uses the free, open-source Tesseract command-line engine on the backend host. It makes no cloud requests and needs no API key, account, or paid service.

Set these backend environment variables:

```text
PERSONAL_EXPENSE_OCR_PROVIDER=tesseract-local
# Optional: use an absolute executable path on Windows or in a custom container.
TESSERACT_COMMAND=tesseract
# Tesseract language codes, joined with +. English is the default.
PERSONAL_EXPENSE_OCR_LANGUAGES=eng
# Optional, between 1000 and 120000 milliseconds. Default: 20000.
PERSONAL_EXPENSE_OCR_TIMEOUT_MS=20000
```

Do not put these settings in the Expo/mobile environment. The mobile app uploads a protected receipt to this backend; only the backend invokes the local executable.

## Install Tesseract

Install Tesseract in the environment that runs the backend (developer machine, VM, or deployment container), then restart that backend process.

1. Install a current Tesseract build for the operating system. On Windows, use a trusted Tesseract installer and include the language data directory. On Linux/Debian-based hosts, install the distribution's `tesseract-ocr` package. For Docker deployments, add Tesseract to the backend image; installing it only on the build machine is not enough.
2. Run `tesseract --version` in that same runtime environment. If it is not on `PATH`, set `TESSERACT_COMMAND` to its absolute executable path, for example `C:\Program Files\Tesseract-OCR\tesseract.exe`.
3. Verify the installed models with `tesseract --list-langs`. `eng` must be present for the default configuration.
4. For additional languages, install the corresponding `*.traineddata` models in Tesseract's `tessdata` directory, verify them with `--list-langs`, then configure a supported combination such as `eng+tam`.

Common receipt-language model codes are `eng` (English), `tam` (Tamil), `hin` (Hindi), `tel` (Telugu), `kan` (Kannada), `mal` (Malayalam), `ben` (Bengali), `mar` (Marathi), and `guj` (Gujarati). These models are not bundled or installed by this repository.

## Supported files and outcomes

- Images: JPG/JPEG, PNG, and WEBP are scanned locally.
- PDFs: accepted and stored securely, but intentionally not OCR-scanned in this release. The user is directed to the editable manual date, amount, and item fields.
- Missing engine, missing language model, image-read error, timeout, and unreadable text return an actionable OCR status. They do not block manual transaction entry.

Tesseract is best with clear, upright, printed receipts. It is less reliable for handwriting, blurred/low-light photographs, rotated images, complex layouts, and mixed-language receipts. Item extraction is deliberately conservative; users should review and edit every suggested field before applying it.