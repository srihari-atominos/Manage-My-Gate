import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import HttpError from '../../../utils/httpError.utils.js';
import { verifyMagicBytesSync, cleanUploadedFiles } from '../../../utils/storage.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target upload directory in public/uploads/invoices
const projectRoot = path.resolve(__dirname, '../../../..');
const uploadDir = path.resolve(projectRoot, 'public/uploads/invoices');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Unguessable name: payment proofs are reachable by URL, so the name itself must not be enumerable
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `proof-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new HttpError(400, 'Security violation: Only images (JPG, PNG, WEBP) and PDF documents are allowed.'), false);
  }
};

export const invoiceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Single payment proof
  },
});

/** Verifies the stored payment proof really is an image or PDF (MIME type and extension are client-supplied). */
export const invoiceProofSignatureValidator = (req, res, next) => {
  const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
  const invalid = files.find((file) => !verifyMagicBytesSync(file.path, ['IMAGE', 'PDF']));
  if (invalid) {
    cleanUploadedFiles(req);
    return next(new HttpError(400, 'Invalid file signature detected. Only genuine images (JPG, PNG, WEBP) and PDF documents are accepted.'));
  }
  return next();
};

export default invoiceUpload;
