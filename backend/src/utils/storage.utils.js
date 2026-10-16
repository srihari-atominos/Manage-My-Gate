import path from 'path';
import fs from 'fs';
import HttpError from './httpError.utils.js';

export const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9_\-\.]+$/;

/**
 * Validates that a filename does not contain path traversal, special characters, or null bytes.
 * @param {string} filename 
 * @returns {string} Sanitized base filename
 */
export function validateSafeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new HttpError(400, 'File name must be a non-empty string.');
  }

  const trimmed = filename.trim();
  if (trimmed.length === 0 || trimmed.length > 255) {
    throw new HttpError(400, 'File name length is invalid.');
  }

  // Reject path traversal markers and slashes
  if (
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('\0') ||
    trimmed.includes('%')
  ) {
    throw new HttpError(400, 'Security violation: Path traversal or invalid characters detected in file name.');
  }

  if (!SAFE_FILENAME_PATTERN.test(trimmed)) {
    throw new HttpError(400, 'Security violation: File name contains disallowed characters.');
  }

  return path.basename(trimmed);
}

/**
 * Safely resolves a file path strictly bounded within the target base directory.
 * Prevents directory traversal, directory escaping, and symlink exploits.
 * @param {string} baseDirectory 
 * @param {string} filename 
 * @returns {string} Fully resolved and verified absolute file path
 */
export function resolveSecureFilePath(baseDirectory, filename) {
  const safeName = validateSafeFilename(filename);
  const resolvedBase = path.resolve(baseDirectory);
  const resolvedTarget = path.resolve(resolvedBase, safeName);

  // Strict containment check: resolved path must be directly inside resolvedBase
  const expectedPrefix = resolvedBase.endsWith(path.sep) ? resolvedBase : resolvedBase + path.sep;
  if (!resolvedTarget.startsWith(expectedPrefix)) {
    throw new HttpError(403, 'Security violation: Directory escape attempt detected.');
  }

  if (!fs.existsSync(resolvedTarget)) {
    throw new HttpError(404, 'File not found.');
  }

  try {
    const stat = fs.lstatSync(resolvedTarget);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new HttpError(404, 'File not found or invalid file type.');
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(404, 'File not found.');
  }

  return resolvedTarget;
}

/**
 * Inspects magic bytes / signatures for common file formats.
 * @param {string} filePath 
 * @param {Array<'IMAGE'|'PDF'|'DOCUMENT'|'VIDEO'>} allowedCategories 
 * @returns {Promise<boolean>}
 */
export function verifyMagicBytesSync(filePath, allowedCategories = ['IMAGE', 'PDF']) {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  let fd;
  try {
    const buffer = Buffer.alloc(16);
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    if (bytesRead < 4) {
      return false;
    }

    const categories = new Set(allowedCategories);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (categories.has('IMAGE') && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return true;
    }

    // JPEG: FF D8 FF
    if (categories.has('IMAGE') && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }

    // WebP: RIFF (52 49 46 46) and WEBP (57 45 42 50 at offset 8)
    if (categories.has('IMAGE')) {
      const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
      const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
      if (isRiff && isWebp) {
        return true;
      }
    }

    // PDF: %PDF (25 50 44 46)
    if (categories.has('PDF') && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return true;
    }

    // DOCX / XLSX / ZIP: 50 4B 03 04 or 50 4B 05 06 or 50 4B 07 08
    if (categories.has('DOCUMENT') && buffer[0] === 0x50 && buffer[1] === 0x4B) {
      if (
        (buffer[2] === 0x03 && buffer[3] === 0x04) ||
        (buffer[2] === 0x05 && buffer[3] === 0x06) ||
        (buffer[2] === 0x07 && buffer[3] === 0x08)
      ) {
        return true;
      }
    }

    // Legacy OLE DOC / XLS: D0 CF 11 E0 A1 B1 1A E1
    if (categories.has('DOCUMENT')) {
      if (
        buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0 &&
        buffer[4] === 0xA1 && buffer[5] === 0xB1 && buffer[6] === 0x1A && buffer[7] === 0xE1
      ) {
        return true;
      }
    }

    // MP4 Video: ftyp at offset 4 (66 74 79 70)
    if (categories.has('VIDEO')) {
      if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
        return true;
      }
      // WebM: 1A 45 DF A3
      if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
        return true;
      }
    }

    return false;
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
  }
}

/**
 * Safely unlinks a file from disk without throwing unhandled exceptions.
 * @param {string} filePath 
 */
export function unlinkSafe(filePath) {
  if (!filePath || typeof filePath !== 'string') return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Suppress unlink errors during background cleanup
  }
}

/**
 * Cleans up any uploaded files associated with an Express request.
 * Supports req.file and req.files (array or dictionary of arrays).
 * @param {import('express').Request} req 
 */
export function cleanUploadedFiles(req) {
  if (!req) return;

  if (req.file && req.file.path) {
    unlinkSafe(req.file.path);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach((file) => {
        if (file && file.path) unlinkSafe(file.path);
      });
    } else if (typeof req.files === 'object') {
      Object.values(req.files).forEach((group) => {
        if (Array.isArray(group)) {
          group.forEach((file) => {
            if (file && file.path) unlinkSafe(file.path);
          });
        }
      });
    }
  }
}

export default {
  SAFE_FILENAME_PATTERN,
  validateSafeFilename,
  resolveSecureFilePath,
  verifyMagicBytesSync,
  unlinkSafe,
  cleanUploadedFiles,
};
