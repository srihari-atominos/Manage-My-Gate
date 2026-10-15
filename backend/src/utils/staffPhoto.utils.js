import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/config.js';
import HttpError from './httpError.utils.js';
import { getActiveQrSecret } from './staffQr.utils.js';

/**
 * Staff photo helpers: content sniffing, a tiny storage layer, and signed URLs.
 *
 * Photos are personal data, so they are never exposed as public static files. Responses carry a signed,
 * unguessable URL tied to the current photo version: replacing or removing a photo invalidates every
 * old link, and no login header is needed to render the image in a plain <Image>.
 *
 * The storage layer (save/read/remove) is the only place that touches the disk, so moving to S3 or
 * Cloudinary later means swapping those three functions.
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const photoDir = path.resolve(projectRoot, config.staffPhotoUploadPath || 'uploads/staff-photos');

const TYPES = {
  jpg: { mime: 'image/jpeg' },
  png: { mime: 'image/png' },
  webp: { mime: 'image/webp' },
};

/** Detects the real image type from the file's first bytes (the client-supplied name/mime is untrusted). */
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export const mimeForKey = (key) => TYPES[path.extname(String(key || '')).slice(1)]?.mime || 'application/octet-stream';

/** Validates an uploaded file and returns its detected extension. */
export function assertValidPhoto(file) {
  if (!file || !file.buffer) {
    throw new HttpError(400, 'A photo file is required (field name: photo).');
  }
  if (file.buffer.length > MAX_PHOTO_BYTES) {
    throw new HttpError(413, 'Photo is too large. Please use an image under 2 MB.');
  }
  const ext = detectImageType(file.buffer);
  if (!ext) {
    throw new HttpError(400, 'Only JPEG, PNG or WebP photos are allowed.');
  }
  return ext;
}

// ---------------- storage layer ----------------

export async function savePhoto(buffer, ext) {
  await fs.promises.mkdir(photoDir, { recursive: true });
  const key = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  await fs.promises.writeFile(path.join(photoDir, key), buffer, { flag: 'wx' });
  return key;
}

const safePath = (key) => {
  const name = path.basename(String(key || ''));
  return name && name === key ? path.join(photoDir, name) : null;
};

export function openPhotoStream(key) {
  const file = safePath(key);
  if (!file || !fs.existsSync(file)) return null;
  return fs.createReadStream(file);
}

export async function removePhoto(key) {
  const file = safePath(key);
  if (!file) return;
  await fs.promises.unlink(file).catch(() => {});
}

// ---------------- signed URLs ----------------

const sign = (techId, photoKey) =>
  crypto.createHmac('sha256', getActiveQrSecret()).update(`staff-photo:${techId}:${photoKey}`).digest('hex').slice(0, 32);

export function verifyPhotoSignature(techId, photoKey, signature) {
  if (!photoKey || typeof signature !== 'string' || !/^[0-9a-f]{32}$/.test(signature)) return false;
  const expected = Buffer.from(sign(String(techId), photoKey), 'hex');
  const provided = Buffer.from(signature, 'hex');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

/**
 * API-relative URL (resolve against the client's API base). Null when the staff member has no photo.
 */
export function buildStaffPhotoUrl(tech) {
  if (!tech?.photoKey || !tech?._id) return null;
  const id = String(tech._id);
  return `/technicians/${id}/photo?v=${encodeURIComponent(tech.photoKey)}&sig=${sign(id, tech.photoKey)}`;
}
