import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import config from '../src/config/config.js';

import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Role from '../src/features/role/role.model.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';
import Assessment from '../src/features/assessment/assessment.model.js';
import Payment from '../src/features/payment/payment.model.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import PlatformOrder from '../src/features/platformOrder/platformOrder.model.js';
import Permission from '../src/features/permission/permission.model.js';
import RolePermission from '../src/features/rolePermission/rolePermission.model.js';

import {
  validateSafeFilename,
  resolveSecureFilePath,
  verifyMagicBytesSync,
  cleanUploadedFiles,
  unlinkSafe,
} from '../src/utils/storage.utils.js';

import { complaintFileSignatureValidator } from '../src/features/complaint/middlewares/upload.middleware.js';
import { invoiceProofSignatureValidator } from '../src/features/invoice/middlewares/invoiceUpload.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

describe('SEC — Files & Storage Tenant Isolation Security Audit Suite', () => {
  let server;
  let baseUrl;

  // Organizations
  let orgA, orgB;
  let orgA_Id, orgB_Id;

  // Villas / Units in Org A
  let villaA1, villaA2;
  let villaA1_Id, villaA2_Id;

  // Users
  let userA1, userA2, userB, adminA, platformAdmin;
  let tokenUserA1, tokenUserA2, tokenUserB, tokenAdminA, tokenPlatformAdmin;

  // Test files created on disk for cleanup
  const createdTestFiles = [];

  const signUserToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', expiresIn: '1h' });
  };

  const createDummyFile = (dirPath, filename, content) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const fullPath = path.join(dirPath, filename);
    fs.writeFileSync(fullPath, content);
    createdTestFiles.push(fullPath);
    return fullPath;
  };

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const ts = Date.now();

    // 1. Seed Organizations
    orgA = await Organization.create({
      name: `Org A Storage ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
      allowedFeatures: ['complaints', 'billing', 'notices', 'visitor', 'amenities'],
    });
    orgA_Id = orgA._id.toString();

    orgB = await Organization.create({
      name: `Org B Storage ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
      allowedFeatures: ['complaints', 'billing', 'notices', 'visitor', 'amenities'],
    });
    orgB_Id = orgB._id.toString();

    // 2. Seed Villas in Org A
    villaA1 = await Villa.create({
      orgId: orgA_Id,
      villaNumber: `V-101-${ts}`,
      blockNumber: 'A',
    });
    villaA1_Id = villaA1._id.toString();

    villaA2 = await Villa.create({
      orgId: orgA_Id,
      villaNumber: `V-102-${ts}`,
      blockNumber: 'A',
    });
    villaA2_Id = villaA2._id.toString();

    // 3. Seed Roles
    const residentRole = await Role.create({
      name: 'Resident',
      orgId: orgA_Id,
      permissions: [
        'complaints:view', 'complaints:create',
        'notices:read', 'notices:view', 'notices:active_board',
        'billing:view', 'billing:read', 'billing:dashboard', 'billing:action_center'
      ],
    });

    const residentRoleB = await Role.create({
      name: 'Resident',
      orgId: orgB_Id,
      permissions: [
        'complaints:view', 'complaints:create',
        'notices:read', 'notices:view', 'notices:active_board',
        'billing:view', 'billing:read', 'billing:dashboard', 'billing:action_center'
      ],
    });

    const neededPerms = [
      { feature: 'notices', action: 'read', name: 'notices:read' },
      { feature: 'notices', action: 'active_board', name: 'notices:active_board' },
      { feature: 'notices', action: 'view', name: 'notices:view' },
      { feature: 'complaints', action: 'view', name: 'complaints:view' },
      { feature: 'complaints', action: 'create', name: 'complaints:create' },
      { feature: 'billing', action: 'view', name: 'billing:view' },
      { feature: 'billing', action: 'dashboard', name: 'billing:dashboard' },
      { feature: 'billing', action: 'action_center', name: 'billing:action_center' },
    ];
    for (const p of neededPerms) {
      let perm = await Permission.findOne({ name: p.name });
      if (!perm) {
        perm = await Permission.create(p);
      }
      await RolePermission.create({ roleId: residentRole._id, permissionId: perm._id }).catch(() => {});
      await RolePermission.create({ roleId: residentRoleB._id, permissionId: perm._id }).catch(() => {});
    }

    const adminRole = await Role.create({
      name: 'Admin',
      orgId: orgA_Id,
      permissions: ['*'],
    });

    let platformRole = await Role.findOne({ name: 'Platform Super Admin', orgId: null });
    if (!platformRole) {
      platformRole = await Role.create({
        name: 'Platform Super Admin',
        orgId: null,
        permissions: ['*'],
      });
    }

    // 4. Seed Users
    userA1 = await User.create({
      username: `usera1_${ts}`,
      name: 'Resident A1',
      email: `user.a1.${ts}@example.com`,
      password: 'password123',
      role: 'Resident',
      roleName: 'Resident',
      roleId: residentRole._id,
      organisationId: orgA_Id,
      primaryVillaId: villaA1_Id,
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    userA2 = await User.create({
      username: `usera2_${ts}`,
      name: 'Resident A2',
      email: `user.a2.${ts}@example.com`,
      password: 'password123',
      role: 'Resident',
      roleName: 'Resident',
      roleId: residentRole._id,
      organisationId: orgA_Id,
      primaryVillaId: villaA2_Id,
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    userB = await User.create({
      username: `userb_${ts}`,
      name: 'Resident B',
      email: `user.b.${ts}@example.com`,
      password: 'password123',
      role: 'Resident',
      roleName: 'Resident',
      roleId: residentRoleB._id,
      organisationId: orgB_Id,
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    adminA = await User.create({
      username: `admina_${ts}`,
      name: 'Admin A',
      email: `admin.a.${ts}@example.com`,
      password: 'password123',
      role: 'Admin',
      roleName: 'Admin',
      roleId: adminRole._id,
      organisationId: orgA_Id,
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    platformAdmin = await User.create({
      username: `platformadmin_${ts}`,
      name: 'Super Admin',
      email: `platform.admin.${ts}@example.com`,
      password: 'password123',
      role: 'Platform Super Admin',
      roleName: 'Platform Super Admin',
      roleId: platformRole._id,
      isPlatform: true,
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    // 5. Seed Memberships
    await OrgMembership.create({
      userId: userA1._id,
      orgId: orgA_Id,
      role: 'Resident',
      roleId: residentRole._id,
      status: 'Active',
      villaId: villaA1_Id,
    });

    await OrgMembership.create({
      userId: userA2._id,
      orgId: orgA_Id,
      role: 'Resident',
      roleId: residentRole._id,
      status: 'Active',
      villaId: villaA2_Id,
    });

    await OrgMembership.create({
      userId: userB._id,
      orgId: orgB_Id,
      role: 'Resident',
      roleId: residentRoleB._id,
      status: 'Active',
    });

    await OrgMembership.create({
      userId: adminA._id,
      orgId: orgA_Id,
      role: 'Admin',
      roleId: adminRole._id,
      status: 'Active',
    });

    // 6. Sign Tokens
    tokenUserA1 = signUserToken({
      id: userA1._id.toString(),
      _id: userA1._id.toString(),
      role: 'Resident',
      roleName: 'Resident',
      orgId: orgA_Id,
      permissions: ['complaints:view', 'complaints:create', 'notices:read', 'billing:view'],
    });

    tokenUserA2 = signUserToken({
      id: userA2._id.toString(),
      _id: userA2._id.toString(),
      role: 'Resident',
      roleName: 'Resident',
      orgId: orgA_Id,
      permissions: ['complaints:view', 'complaints:create', 'notices:read', 'billing:view'],
    });

    tokenUserB = signUserToken({
      id: userB._id.toString(),
      _id: userB._id.toString(),
      role: 'Resident',
      roleName: 'Resident',
      orgId: orgB_Id,
      permissions: ['complaints:view', 'complaints:create', 'notices:read', 'billing:view'],
    });

    tokenAdminA = signUserToken({
      id: adminA._id.toString(),
      _id: adminA._id.toString(),
      role: 'Admin',
      roleName: 'Admin',
      orgId: orgA_Id,
      permissions: ['*'],
    });

    tokenPlatformAdmin = signUserToken({
      id: platformAdmin._id.toString(),
      _id: platformAdmin._id.toString(),
      role: 'Platform Super Admin',
      roleName: 'Platform Super Admin',
      isPlatform: true,
      permissions: ['*'],
    });
  });

  after(async () => {
    // Clean up created dummy test files
    for (const f of createdTestFiles) {
      unlinkSafe(f);
    }

    try {
      if (orgA_Id) {
        await Complaint.deleteMany({ orgId: orgA_Id });
        await Invoice.deleteMany({ communityId: orgA_Id });
        await Payment.deleteMany({ orgId: orgA_Id });
        await Notice.deleteMany({ orgId: orgA_Id });
        await Villa.deleteMany({ orgId: orgA_Id });
        await Role.deleteMany({ orgId: orgA_Id });
        await OrgMembership.deleteMany({ orgId: orgA_Id });
        await Organization.deleteOne({ _id: orgA_Id });
      }
      if (orgB_Id) {
        await Complaint.deleteMany({ orgId: orgB_Id });
        await Invoice.deleteMany({ communityId: orgB_Id });
        await Payment.deleteMany({ orgId: orgB_Id });
        await Notice.deleteMany({ orgId: orgB_Id });
        await Role.deleteMany({ orgId: orgB_Id });
        await OrgMembership.deleteMany({ orgId: orgB_Id });
        await Organization.deleteOne({ _id: orgB_Id });
      }
      if (userA1 || userA2 || userB || adminA || platformAdmin) {
        const uids = [userA1?._id, userA2?._id, userB?._id, adminA?._id, platformAdmin?._id].filter(Boolean);
        await User.deleteMany({ _id: { $in: uids } });
      }
    } catch (e) {
      console.warn('Test cleanup warning:', e.message);
    } finally {
      if (server) {
        await new Promise((res) => server.close(res));
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PUBLIC STATIC LOCKDOWN VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Public Static Directory Lockdown', () => {
    it('1.1 should reject unauthenticated static access to complaint attachments (/uploads/complaints/...) with 404', async () => {
      const res = await fetch(`${baseUrl}/uploads/complaints/cmp-dummy-secret.png`);
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('1.2 should reject unauthenticated static access to complaint attachments via /public/uploads/complaints/... with 404', async () => {
      const res = await fetch(`${baseUrl}/public/uploads/complaints/cmp-dummy-secret.png`);
      assert.equal(res.status, 404);
    });

    it('1.3 should reject unauthenticated static access to invoice payment proofs (/uploads/invoices/...) with 404', async () => {
      const res = await fetch(`${baseUrl}/uploads/invoices/proof-bank-transfer.png`);
      assert.equal(res.status, 404);
    });

    it('1.4 should reject unauthenticated static access to invoice payment proofs via /public/uploads/invoices/... with 404', async () => {
      const res = await fetch(`${baseUrl}/public/uploads/invoices/proof-bank-transfer.png`);
      assert.equal(res.status, 404);
    });

    it('1.5 should reject unauthenticated static access to generated PDF invoices (/invoices/...) with 404', async () => {
      const res = await fetch(`${baseUrl}/invoices/Invoice_12345.pdf`);
      assert.equal(res.status, 404);
    });

    it('1.6 should reject unauthenticated static access to generated PDF invoices via /public/invoices/... with 404', async () => {
      const res = await fetch(`${baseUrl}/public/invoices/Invoice_12345.pdf`);
      assert.equal(res.status, 404);
    });

    it('1.7 should reject unauthenticated static access to notice board images (/uploads/notices/...) with 404', async () => {
      const res = await fetch(`${baseUrl}/uploads/notices/notice-memo.png`);
      assert.equal(res.status, 404);
    });

    it('1.8 should reject unauthenticated static access to issue report attachments with 404', async () => {
      const res = await fetch(`${baseUrl}/uploads/issueReports/rep-secret.png`);
      assert.equal(res.status, 404);
    });

    it('1.9 should reject unauthenticated static access regardless of URL casing with 404', async () => {
      const res1 = await fetch(`${baseUrl}/Public/Invoices/secret.pdf`);
      assert.equal(res1.status, 404);
      const res2 = await fetch(`${baseUrl}/uploads/Complaints/photo.png`);
      assert.equal(res2.status, 404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PATH TRAVERSAL & FILENAME SANITIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Path Traversal & Filename Sanitization', () => {
    it('2.1 validateSafeFilename accepts valid generated and timestamped filenames', () => {
      assert.equal(validateSafeFilename('cmp-1784441846492-297924100.png'), 'cmp-1784441846492-297924100.png');
      assert.equal(validateSafeFilename('proof-1788851699110-370162235.jpg'), 'proof-1788851699110-370162235.jpg');
      assert.equal(validateSafeFilename('Invoice_INV-2026-9999.pdf'), 'Invoice_INV-2026-9999.pdf');
    });

    it('2.2 validateSafeFilename rejects directory traversal patterns and illegal characters', () => {
      const badFilenames = [
        '../../package.json',
        '..\\..\\windows\\win.ini',
        '/etc/passwd',
        'C:\\secrets.txt',
        'cmp-123.png/../secret.env',
        'proof-123.png\0.exe',
        'proof-123%2e%2e%2f.jpg',
        '',
        null,
        undefined,
      ];

      for (const bad of badFilenames) {
        assert.throws(() => validateSafeFilename(bad), { statusCode: 400 });
      }
    });

    it('2.3 resolveSecureFilePath prevents escaping target directory boundaries', () => {
      const tempDir = path.resolve(backendRoot, 'uploads/test_boundary');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const safeTestFile = path.join(tempDir, 'sample.txt');
      fs.writeFileSync(safeTestFile, 'hello');
      createdTestFiles.push(safeTestFile);

      // Legitimate retrieval
      const resolved = resolveSecureFilePath(tempDir, 'sample.txt');
      assert.equal(resolved, safeTestFile);

      // Traversal attempt
      assert.throws(() => resolveSecureFilePath(tempDir, '../package.json'), { statusCode: 400 });

      // Non-existent file
      assert.throws(() => resolveSecureFilePath(tempDir, 'nonexistent-file.txt'), { statusCode: 404 });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MAGIC BYTES & FILE SIGNATURE INSPECTION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. File Signature & Magic Bytes Verification', () => {
    const tempDir = path.resolve(backendRoot, 'uploads/test_magic');

    it('3.1 verifyMagicBytesSync validates authentic PNG magic bytes', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      const pngPath = createDummyFile(tempDir, 'valid.png', pngHeader);
      assert.equal(verifyMagicBytesSync(pngPath, ['IMAGE']), true);
    });

    it('3.2 verifyMagicBytesSync validates authentic JPEG magic bytes', () => {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const jpegPath = createDummyFile(tempDir, 'valid.jpg', jpegHeader);
      assert.equal(verifyMagicBytesSync(jpegPath, ['IMAGE']), true);
    });

    it('3.3 verifyMagicBytesSync validates authentic PDF magic bytes', () => {
      const pdfHeader = Buffer.from('%PDF-1.4 header content here');
      const pdfPath = createDummyFile(tempDir, 'valid.pdf', pdfHeader);
      assert.equal(verifyMagicBytesSync(pdfPath, ['PDF']), true);
    });

    it('3.4 verifyMagicBytesSync rejects spoofed files (e.g. PHP script disguised as .png)', () => {
      const fakePng = Buffer.from('<?php echo "Hello from malicious script"; ?>');
      const fakePath = createDummyFile(tempDir, 'fake.png', fakePng);
      assert.equal(verifyMagicBytesSync(fakePath, ['IMAGE', 'PDF']), false);
    });

    it('3.5 complaintFileSignatureValidator immediately unlinks fake files and returns 400', async () => {
      const fakeFilePath = createDummyFile(tempDir, 'fake-complaint.jpg', Buffer.from('Malicious text payload'));
      const fakeReq = {
        files: [{ path: fakeFilePath }],
      };

      let caughtError = null;
      complaintFileSignatureValidator(fakeReq, {}, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.equal(caughtError.statusCode, 400);
      assert.match(caughtError.message, /signature detected/i);
      // Verify file was unlinked from disk
      assert.equal(fs.existsSync(fakeFilePath), false);
    });

    it('3.6 invoiceProofSignatureValidator immediately unlinks fake files and returns 400', async () => {
      const fakeProofPath = createDummyFile(tempDir, 'fake-proof.pdf', Buffer.from('<html><body>Fake proof</body></html>'));
      const fakeReq = {
        file: { path: fakeProofPath },
      };

      let caughtError = null;
      invoiceProofSignatureValidator(fakeReq, {}, (err) => {
        caughtError = err;
      });

      assert.ok(caughtError);
      assert.equal(caughtError.statusCode, 400);
      assert.match(caughtError.message, /signature detected/i);
      // Verify file was unlinked from disk
      assert.equal(fs.existsSync(fakeProofPath), false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TENANT ISOLATION ON COMPLAINT ATTACHMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Complaint Attachments Tenant Isolation', () => {
    let complaintA1;
    let complaintA2;
    const attachmentA1Name = `cmp-${Date.now()}-101.png`;
    const attachmentA2Name = `cmp-${Date.now()}-102.png`;

    before(async () => {
      const complaintsDir = path.resolve(backendRoot, 'uploads/complaints');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      createDummyFile(complaintsDir, attachmentA1Name, pngHeader);
      createDummyFile(complaintsDir, attachmentA2Name, pngHeader);

      complaintA1 = await Complaint.create({
        orgId: orgA_Id,
        complaintNumber: `CMP-${Date.now()}-1`,
        residentId: userA1._id,
        category: 'Plumbing',
        title: 'Leaking pipe in Villa A1',
        description: 'Water leak under sink',
        attachments: [`/uploads/complaints/${attachmentA1Name}`],
      });

      complaintA2 = await Complaint.create({
        orgId: orgA_Id,
        complaintNumber: `CMP-${Date.now()}-2`,
        residentId: userA2._id,
        category: 'Electrical',
        title: 'Power tripping in Villa A2',
        description: 'Breaker keeps tripping',
        attachments: [`/uploads/complaints/${attachmentA2Name}`],
      });
    });

    it('4.1 should reject unauthenticated request to complaint attachment with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/attachments/${attachmentA1Name}`);
      assert.equal(res.status, 401);
    });

    it('4.2 should reject Tenant B accessing Tenant A complaint attachment with 404 (Fail-Closed)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/attachments/${attachmentA1Name}`, {
        headers: {
          Authorization: `Bearer ${tokenUserB}`,
          'x-organization-id': orgB_Id,
        },
      });
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('4.3 should reject Resident A2 accessing Resident A1 private complaint attachment with 404', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/attachments/${attachmentA1Name}`, {
        headers: {
          Authorization: `Bearer ${tokenUserA2}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.equal(res.status, 404);
    });

    it('4.4 should allow Resident A1 to access their own complaint attachment with 200 and security headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/attachments/${attachmentA1Name}`, {
        headers: {
          Authorization: `Bearer ${tokenUserA1}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'image/png');
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('4.5 should allow Tenant A Admin to access any complaint attachment in Tenant A with 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/attachments/${attachmentA1Name}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'image/png');
    });

    it('4.6 should reject path traversal attempts on complaint attachment endpoint with 400/404', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/attachments/..%2f..%2fpackage.json`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.ok([400, 404].includes(res.status));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. TENANT ISOLATION ON INVOICE PAYMENT PROOFS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Invoice Payment Proofs Tenant Isolation', () => {
    const proofA_Name = `proof-${Date.now()}-bankA.png`;

    before(async () => {
      const invoicesDir = path.resolve(backendRoot, 'public/uploads/invoices');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      createDummyFile(invoicesDir, proofA_Name, pngHeader);

      const assessmentA = await Assessment.create({
        communityId: orgA_Id,
        name: 'Quarterly Maintenance Assessment',
        type: 'RECURRING',
        billingCycle: 'MONTHLY',
        generationDay: 1,
        billingPeriodString: '2026-09',
        calculationMethod: {
          type: 'FLAT_RATE',
          flatAmount: 5000,
        },
        lateFineRule: {
          type: 'NONE',
        },
        targetScope: {
          type: 'ALL_COMMUNITY',
          scopeIds: [],
          targetRole: 'OWNER',
        },
      });

      const invoiceA = await Invoice.create({
        communityId: orgA_Id,
        orgId: orgA_Id,
        assessmentId: assessmentA._id,
        targetUserId: userA1._id,
        unitId: villaA1._id,
        billingPeriodString: '2026-03',
        currentCharge: 5000,
        totalAmount: 5000,
        outstandingAmount: 5000,
        dueDate: new Date(Date.now() + 15 * 86400000),
        status: 'VERIFICATION_PENDING',
        paymentScreenshot: `/uploads/invoices/${proofA_Name}`,
      });

      await Payment.create({
        orgId: orgA_Id,
        userId: userA1._id,
        referenceId: invoiceA._id,
        referenceType: 'Invoice',
        amount: 5000,
        paymentMethod: 'Bank Transfer',
        proofDocument: `/uploads/invoices/${proofA_Name}`,
        status: 'pending',
      });
    });

    it('5.1 should reject unauthenticated request to payment proof with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/proofs/${proofA_Name}`);
      assert.equal(res.status, 401);
    });

    it('5.2 should reject Tenant B accessing Tenant A invoice payment proof with 404 (Fail-Closed)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/proofs/${proofA_Name}`, {
        headers: {
          Authorization: `Bearer ${tokenUserB}`,
          'x-organization-id': orgB_Id,
        },
      });
      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('5.3 should allow Tenant A Admin to access Tenant A payment proof with 200 and security headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/proofs/${proofA_Name}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'image/png');
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('5.4 should reject path traversal attacks on payment proofs endpoint with 400/404', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/proofs/..%2f..%2fpackage.json`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.ok([400, 404].includes(res.status));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. TENANT ISOLATION ON NOTICE BOARD ATTACHMENTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Notice Board Attachments Tenant Isolation', () => {
    const noticeA_ImageName = `notice-${Date.now()}-pic.png`;

    before(async () => {
      const noticesDir = path.resolve(backendRoot, 'public/uploads/notices');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      createDummyFile(noticesDir, noticeA_ImageName, pngHeader);

      await Notice.create({
        orgId: orgA_Id,
        title: 'Annual General Meeting 2026',
        description: 'Notice is hereby given for the AGM.',
        content: 'Notice is hereby given for the AGM.',
        createdBy: adminA._id,
        category: 'General',
        status: 'Published',
        expiryDate: new Date(Date.now() + 7 * 86400000),
        images: [
          {
            url: `/public/uploads/notices/${noticeA_ImageName}`,
            filename: 'meeting.png',
            uploadTimestamp: new Date(),
          },
        ],
      });
    });

    it('6.1 should reject unauthenticated request to notice attachment with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/attachments/${noticeA_ImageName}`);
      assert.equal(res.status, 401);
    });

    it('6.2 should reject Tenant B accessing Tenant A notice attachment with 404 (Fail-Closed)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/attachments/${noticeA_ImageName}`, {
        headers: {
          Authorization: `Bearer ${tokenUserB}`,
          'x-organization-id': orgB_Id,
        },
      });
      assert.equal(res.status, 404);
    });

    it('6.3 should allow Tenant A resident to access Tenant A notice attachment with 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/attachments/${noticeA_ImageName}`, {
        headers: {
          Authorization: `Bearer ${tokenUserA1}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'image/png');
    });

    it('6.4 should reject path traversal on notice attachment endpoint with 400/404', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/attachments/..%2f..%2fpackage.json`, {
        headers: {
          Authorization: `Bearer ${tokenUserA1}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.ok([400, 404].includes(res.status));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. PLATFORM ORDER INVOICE TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('7. Platform Order Invoices Tenant Isolation', () => {
    let orderA;
    const invoicePdfName = `Invoice_ORD-${Date.now()}.pdf`;

    before(async () => {
      const invoicesDir = path.resolve(backendRoot, 'public/invoices');
      createDummyFile(invoicesDir, invoicePdfName, Buffer.from('%PDF-1.4 tax invoice dummy'));

      orderA = await PlatformOrder.create({
        orderNumber: `ORD-${Date.now()}`,
        quoteId: new mongoose.Types.ObjectId(),
        organisationId: orgA_Id,
        organizationId: orgA_Id,
        billingCycle: 'ANNUAL',
        unitCount: 10,
        subtotal: 100000,
        taxAmount: 15000,
        totalAmount: 115000,
        pricingChecksum: 'CHECKSUM_123',
        pricingSnapshot: {
          planName: 'Enterprise',
          basePrice: 100000,
        },
        customerSnapshot: {
          customerName: 'Test Customer',
          contactEmail: 'customer@test.com',
        },
        communitySnapshot: {
          organizationName: 'Org A Storage',
          villaCount: 10,
        },
        status: 'CONFIRMED',
        invoiceUrl: `/invoices/${invoicePdfName}`,
      });
    });

    it('7.1 should reject unauthenticated request to order invoice with 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-orders/${orderA._id}/invoice`);
      assert.equal(res.status, 401);
    });

    it('7.2 should allow Platform Admin to securely download order invoice with 200 application/pdf', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-orders/${orderA._id}/invoice`, {
        headers: {
          Authorization: `Bearer ${tokenPlatformAdmin}`,
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('7.3 should reject non-platform tenant user accessing platform order invoice with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-orders/${orderA._id}/invoice`, {
        headers: {
          Authorization: `Bearer ${tokenUserA1}`,
          'x-organization-id': orgA_Id,
        },
      });
      assert.equal(res.status, 403);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. STORAGE CLEANUP UTILITIES & ORPHAN PREVENTION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('8. Storage Cleanup Utilities & Orphan Prevention', () => {
    const tempDir = path.resolve(backendRoot, 'uploads/test_cleanup');

    it('8.1 cleanUploadedFiles unlinks single req.file safely', () => {
      const testFile = createDummyFile(tempDir, 'single-clean.txt', 'test single');
      assert.equal(fs.existsSync(testFile), true);

      cleanUploadedFiles({ file: { path: testFile } });
      assert.equal(fs.existsSync(testFile), false);
    });

    it('8.2 cleanUploadedFiles unlinks multiple req.files (array) safely', () => {
      const file1 = createDummyFile(tempDir, 'arr-1.txt', 'test array 1');
      const file2 = createDummyFile(tempDir, 'arr-2.txt', 'test array 2');
      assert.equal(fs.existsSync(file1), true);
      assert.equal(fs.existsSync(file2), true);

      cleanUploadedFiles({ files: [{ path: file1 }, { path: file2 }] });
      assert.equal(fs.existsSync(file1), false);
      assert.equal(fs.existsSync(file2), false);
    });

    it('8.3 cleanUploadedFiles unlinks multiple req.files (object of arrays) safely', () => {
      const fileA = createDummyFile(tempDir, 'map-a.txt', 'map a');
      const fileB = createDummyFile(tempDir, 'map-b.txt', 'map b');
      assert.equal(fs.existsSync(fileA), true);
      assert.equal(fs.existsSync(fileB), true);

      cleanUploadedFiles({
        files: {
          images: [{ path: fileA }],
          documents: [{ path: fileB }],
        },
      });
      assert.equal(fs.existsSync(fileA), false);
      assert.equal(fs.existsSync(fileB), false);
    });
  });
});
