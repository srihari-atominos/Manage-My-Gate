import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import HttpError from '../../utils/httpError.utils.js';
import { verifyMagicBytesSync, cleanUploadedFiles } from '../../utils/storage.utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const uploadDir = path.resolve(root, 'public/uploads/expenses');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const extFromMime = (mime) => {
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  if (mime === 'application/pdf') return '.pdf';
  return '.jpg';
};

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ext) ext = extFromMime(file.mimetype);
    cb(null, `expense-${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  let ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new HttpError(400, 'Only JPG, PNG, WEBP, and PDF files are allowed.'));
  }
  if (!ext && file.mimetype) {
    ext = extFromMime(file.mimetype);
  }
  if (!allowed.includes(ext)) {
    return cb(new HttpError(400, 'Only JPG, PNG, WEBP, and PDF files are allowed.'));
  }
  cb(null, true);
};

export const expenseUpload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
export const expenseFileSignatureValidator = (req, res, next) => {
  if (!req.file || !verifyMagicBytesSync(req.file.path, ['IMAGE', 'PDF'])) {
    cleanUploadedFiles(req);
    return next(new HttpError(400, 'Invalid attachment file signature.'));
  }
  next();
};
export { uploadDir };
