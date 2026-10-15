import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import fs from 'fs';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'staff-photos-'));
process.env.STAFF_PHOTO_UPLOAD_PATH = tmp;

const photo = await import('../src/utils/staffPhoto.utils.js');
const technicianService = (await import('../src/features/technician/technician.service.js')).default;
const technicianRepo = (await import('../src/features/technician/technician.repository.js')).default;
const Technician = (await import('../src/features/technician/technician.model.js')).default;

const ORG = '507f1f77bcf86cd799439011';
const TECH = '507f1f77bcf86cd799439088';

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32)]);

function stub(target, impls) {
  const orig = {};
  for (const [k, v] of Object.entries(impls)) {
    orig[k] = target[k];
    target[k] = v;
  }
  return () => Object.assign(target, orig);
}

test('detects real image types from content, not names', () => {
  assert.equal(photo.detectImageType(JPEG), 'jpg');
  assert.equal(photo.detectImageType(PNG), 'png');
  assert.equal(photo.detectImageType(WEBP), 'webp');
  assert.equal(photo.detectImageType(Buffer.from('<?php echo 1; ?>' + ' '.repeat(20))), null);
  assert.equal(photo.detectImageType(Buffer.from('GIF89a' + ' '.repeat(20))), null);
});

test('assertValidPhoto rejects missing, oversized and non-image files', () => {
  assert.throws(() => photo.assertValidPhoto(undefined), (e) => e.statusCode === 400);
  assert.throws(() => photo.assertValidPhoto({ buffer: Buffer.alloc(photo.MAX_PHOTO_BYTES + 1, 0xff) }), (e) => e.statusCode === 413);
  assert.throws(
    () => photo.assertValidPhoto({ originalname: 'evil.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('not an image at all, really') }),
    (e) => e.statusCode === 400
  );
  assert.equal(photo.assertValidPhoto({ buffer: PNG }), 'png');
});

test('signed URLs verify, and break when the key or signature is altered', () => {
  const url = photo.buildStaffPhotoUrl({ _id: TECH, photoKey: 'abc.jpg' });
  assert.ok(url.startsWith(`/technicians/${TECH}/photo?v=abc.jpg&sig=`));
  assert.equal(/sig=([0-9a-f]{32})$/.test(url), true);
  const sig = /sig=([0-9a-f]+)/.exec(url)[1];
  assert.equal(photo.verifyPhotoSignature(TECH, 'abc.jpg', sig), true);
  assert.equal(photo.verifyPhotoSignature(TECH, 'other.jpg', sig), false);
  assert.equal(photo.verifyPhotoSignature('507f1f77bcf86cd799439099', 'abc.jpg', sig), false);
  assert.equal(photo.verifyPhotoSignature(TECH, 'abc.jpg', 'zz'), false);
  assert.equal(photo.buildStaffPhotoUrl({ _id: TECH }), null);
});

test('technician JSON exposes photoUrl but never the storage key', () => {
  const withPhoto = new Technician({ orgId: ORG, name: 'A', phone: '1', department: 'Others', type: 'In-House Staff', photoKey: 'k1.jpg' }).toJSON();
  assert.ok(withPhoto.photoUrl.includes('/photo?v=k1.jpg&sig='));
  assert.equal('photoKey' in withPhoto, false);
  const without = new Technician({ orgId: ORG, name: 'A', phone: '1', department: 'Others', type: 'In-House Staff' }).toJSON();
  assert.equal(without.photoUrl, null);
});

test('upload, replace and remove: old files are deleted and stale links stop working', async () => {
  let currentKey = null;
  const restore = stub(technicianRepo, {
    setPhotoKey: async (id, orgId, key) => {
      const before = { _id: id, photoKey: currentKey };
      currentKey = key;
      return before;
    },
    findById: async () => ({ _id: TECH, orgId: ORG, photoKey: currentKey }),
    findPhotoKeyById: async () => ({ photoKey: currentKey }),
  });
  try {
    await technicianService.setStaffPhoto(TECH, ORG, { buffer: JPEG });
    const firstKey = currentKey;
    assert.ok(fs.existsSync(path.join(tmp, firstKey)));
    const firstSig = /sig=([0-9a-f]+)/.exec(photo.buildStaffPhotoUrl({ _id: TECH, photoKey: firstKey }))[1];

    const served = await technicianService.openSignedPhoto(TECH, firstKey, firstSig);
    assert.equal(served.mime, 'image/jpeg');
    served.stream.destroy();

    await technicianService.setStaffPhoto(TECH, ORG, { buffer: PNG });
    assert.notEqual(currentKey, firstKey);
    assert.equal(fs.existsSync(path.join(tmp, firstKey)), false, 'replaced file must be deleted');
    await assert.rejects(technicianService.openSignedPhoto(TECH, firstKey, firstSig), (e) => e.statusCode === 404);

    const secondKey = currentKey;
    await technicianService.removeStaffPhoto(TECH, ORG);
    assert.equal(currentKey, null);
    assert.equal(fs.existsSync(path.join(tmp, secondKey)), false);
  } finally {
    restore();
  }
});

test('failed upload for an unknown staff member leaves no orphan file', async () => {
  const restore = stub(technicianRepo, { setPhotoKey: async () => null });
  const before = fs.readdirSync(tmp).length;
  try {
    await assert.rejects(technicianService.setStaffPhoto(TECH, ORG, { buffer: WEBP }), (e) => e.statusCode === 404);
    assert.equal(fs.readdirSync(tmp).length, before);
  } finally {
    restore();
  }
});

test('path traversal in a stored key cannot escape the photo folder', () => {
  assert.equal(photo.openPhotoStream('../../package.json'), null);
  assert.equal(photo.openPhotoStream('..\..\package.json'), null);
});

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
