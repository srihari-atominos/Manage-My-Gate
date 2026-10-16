import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../../../config/config.js';
import crypto from 'crypto';
import HttpError from '../../../utils/httpError.utils.js';
import { verifyMagicBytesSync, cleanUploadedFiles } from '../../../utils/storage.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve target upload directory relative to project root
const projectRoot = path.resolve(__dirname, '../../../..');
const uploadDir = path.resolve(projectRoot, 'uploads/complaints');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Unguessable name: attachments are reachable by URL, so the name itself must not be enumerable
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cmp-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4', 'video/webm'
  ];
  
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.webp',
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.mp4', '.webm'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Security violation: Invalid file type or extension for file ${file.originalname}.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Limit number of files to 5
  },
});

/**
 * The browser-supplied MIME type and file extension are trivially spoofed, so check the real file
 * signature after multer has stored the files. Anything that is not an image, PDF, Office document or
 * mp4/webm video is deleted immediately.
 */
export const complaintFileSignatureValidator = (req, res, next) => {
  const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
  const allowed = ['IMAGE', 'PDF', 'DOCUMENT', 'VIDEO'];
  const invalid = files.find((file) => !verifyMagicBytesSync(file.path, allowed));
  if (invalid) {
    cleanUploadedFiles(req);
    return next(new HttpError(400, 'Invalid file signature detected. The uploaded file content does not match an allowed file type.'));
  }
  return next();
};

export default upload;
