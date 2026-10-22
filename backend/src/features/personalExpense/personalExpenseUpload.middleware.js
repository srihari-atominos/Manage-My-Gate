import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import HttpError from '../../utils/httpError.utils.js';
import { cleanUploadedFiles, verifyMagicBytesSync } from '../../utils/storage.utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const receiptUploadDir = path.resolve(root, 'private/uploads/personal-expense-receipts');
if (!fs.existsSync(receiptUploadDir)) fs.mkdirSync(receiptUploadDir, { recursive: true });
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const storage = multer.diskStorage({ destination: receiptUploadDir, filename: (_req, file, done) => done(null, `receipt-${crypto.randomBytes(20).toString('hex')}${path.extname(file.originalname).toLowerCase()}`) });
const fileFilter = (_req, file, done) => {
  if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(path.extname(file.originalname).toLowerCase())) return done(new HttpError(400, 'Only JPG, PNG, WEBP, and PDF receipts are allowed.'));
  return done(null, true);
};
export const receiptUpload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
export const receiptSignatureValidator = (req, _res, next) => {
  if (!req.file || !verifyMagicBytesSync(req.file.path, ['IMAGE', 'PDF'])) { cleanUploadedFiles(req); return next(new HttpError(400, 'Invalid receipt file signature.')); }
  return next();
};