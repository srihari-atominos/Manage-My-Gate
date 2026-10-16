import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import config from '../src/config/config.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import IssueReport from '../src/features/issueReport/issueReport.model.js';
import User from '../src/features/user/user.model.js';
import { UPLOAD_ROOT } from '../src/features/issueReport/middlewares/upload.middleware.js';

describe('SEC-05.4 — Sensitive Attachment Cache Isolation & Access Control Suite', () => {
  let server;
  let baseUrl;

  // Organizations
  let orgA;
  let orgB;
  let orgA_Id;
  let orgB_Id;

  // Users
  const userAdminA_Id = new mongoose.Types.ObjectId().toString();
  const userAdminB_Id = new mongoose.Types.ObjectId().toString();
  const userResidentA_Id = new mongoose.Types.ObjectId().toString();
  const userPlatformAdmin_Id = new mongoose.Types.ObjectId().toString();

  // Roles
  let roleAdminA;
  let roleAdminB;
  let roleResidentA;

  // Tokens
  let tokenAdminA;
  let tokenAdminB;
  let tokenResidentA;
  let tokenPlatformAdmin;

  // Test Files
  let filenameA;
  let filePathA;
  let reportA;

  const signToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', expiresIn: '2h' });
  };

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const ts = Date.now();

    // 1. Create Isolated Organizations
    orgA = await Organization.create({
      name: `Org A SEC-05.4 ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
      allowedFeatures: ['support', 'complaints'],
      status: 'Active',
    });
    orgA_Id = orgA._id.toString();

    orgB = await Organization.create({
      name: `Org B SEC-05.4 ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
      allowedFeatures: ['support', 'complaints'],
      status: 'Active',
    });
    orgB_Id = orgB._id.toString();

    // 2. Create Roles
    roleAdminA = await Role.create({
      name: 'Community Admin',
      orgId: orgA_Id,
      permissions: ['support:read', 'support:write'],
    });

    roleAdminB = await Role.create({
      name: 'Community Admin',
      orgId: orgB_Id,
      permissions: ['support:read', 'support:write'],
    });

    roleResidentA = await Role.create({
      name: 'Resident',
      orgId: orgA_Id,
      permissions: ['support:create'],
    });

    // 3. Create Verified Users
    await User.create([
      {
        _id: userAdminA_Id,
        name: 'Admin A',
        username: `adminA_${ts}`,
        email: `adminA_${ts}@community.com`,
        password: 'HashedPassword123!',
        status: 'Active',
        emailVerified: true,
      },
      {
        _id: userAdminB_Id,
        name: 'Admin B',
        username: `adminB_${ts}`,
        email: `adminB_${ts}@community.com`,
        password: 'HashedPassword123!',
        status: 'Active',
        emailVerified: true,
      },
      {
        _id: userResidentA_Id,
        name: 'Resident A',
        username: `residentA_${ts}`,
        email: `residentA_${ts}@community.com`,
        password: 'HashedPassword123!',
        status: 'Active',
        emailVerified: true,
      },
      {
        _id: userPlatformAdmin_Id,
        name: 'Platform Super Admin',
        username: `plat_${ts}`,
        email: `platform_admin_${ts}@connectharmony.io`,
        password: 'HashedPassword123!',
        status: 'Active',
        emailVerified: true,
      },
    ]);

    // 4. Create Verified Memberships
    await OrgMembership.create({
      userId: userAdminA_Id,
      orgId: orgA_Id,
      roleIds: [roleAdminA._id],
      status: 'Active',
    });

    await OrgMembership.create({
      userId: userAdminB_Id,
      orgId: orgB_Id,
      roleIds: [roleAdminB._id],
      status: 'Active',
    });

    await OrgMembership.create({
      userId: userResidentA_Id,
      orgId: orgA_Id,
      roleIds: [roleResidentA._id],
      status: 'Active',
    });

    // 4. Issue Cryptographically Verified Tokens
    tokenAdminA = signToken({
      id: userAdminA_Id,
      _id: userAdminA_Id,
      email: `adminA_${ts}@community.com`,
      orgId: orgA_Id,
      role: 'Community Admin',
      isPlatform: false,
    });

    tokenAdminB = signToken({
      id: userAdminB_Id,
      _id: userAdminB_Id,
      email: `adminB_${ts}@community.com`,
      orgId: orgB_Id,
      role: 'Community Admin',
      isPlatform: false,
    });

    tokenResidentA = signToken({
      id: userResidentA_Id,
      _id: userResidentA_Id,
      email: `residentA_${ts}@community.com`,
      orgId: orgA_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenPlatformAdmin = signToken({
      id: userPlatformAdmin_Id,
      _id: userPlatformAdmin_Id,
      email: `platform_admin_${ts}@connectharmony.io`,
      orgId: new mongoose.Types.ObjectId().toString(),
      role: 'Platform Super Admin',
      isPlatform: true,
    });

    // 5. Create a Sensitive Test Attachment on Disk in UPLOAD_ROOT
    if (!fs.existsSync(UPLOAD_ROOT)) {
      fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
    }
    const fileUuid = crypto.randomUUID();
    filenameA = `rep-${fileUuid}.png`;
    filePathA = path.join(UPLOAD_ROOT, filenameA);

    // Write a dummy 1x1 PNG or small binary payload
    const pngMagicBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(filePathA, pngMagicBytes);

    // 6. Create Report Record in DB bound to Org A
    reportA = await IssueReport.create({
      reportNumber: `REP-SEC054-${ts}`,
      reporter: {
        userId: userResidentA_Id,
        name: 'Resident A',
        email: `residentA_${ts}@community.com`,
        role: 'Resident',
      },
      organisation: {
        organisationId: orgA_Id,
        name: orgA.name,
      },
      title: 'Confidential Security Concern',
      description: 'Private incident screenshot containing resident PII',
      reportType: 'BUG',
      feature: 'VISITORS_GATE_ACCESS',
      attachments: [
        {
          fileName: filenameA,
          url: `/uploads/issueReports/${filenameA}`,
          mimeType: 'image/png',
          size: pngMagicBytes.length,
        },
      ],
      isDeleted: false,
    });
  });

  after(async () => {
    // Clean up test file from disk
    if (filePathA && fs.existsSync(filePathA)) {
      try {
        fs.unlinkSync(filePathA);
      } catch (e) {}
    }

    // Clean up DB records
    if (orgA_Id) {
      await Organization.deleteMany({ _id: { $in: [orgA_Id, orgB_Id] } });
      await Role.deleteMany({ orgId: { $in: [orgA_Id, orgB_Id] } });
      await User.deleteMany({ _id: { $in: [userAdminA_Id, userAdminB_Id, userResidentA_Id, userPlatformAdmin_Id] } });
      await OrgMembership.deleteMany({ orgId: { $in: [orgA_Id, orgB_Id] } });
      await IssueReport.deleteMany({ 'organisation.organisationId': { $in: [orgA_Id, orgB_Id] } });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  // =========================================================================
  // 1. Authorized Access & Cache Headers (SEC-05.1-F05)
  // =========================================================================
  describe('1. Sensitive Attachment Delivery & Cache Headers', () => {
    it('authorized Community Admin in Org A can stream attachment with strict anti-caching headers', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });

      assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.equal(res.headers.get('content-type'), 'image/png');
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');

      // Verify strict anti-caching directives
      const cacheControl = res.headers.get('cache-control');
      assert.ok(cacheControl, 'Cache-Control header must be set');
      assert.ok(cacheControl.includes('no-store'), 'Cache-Control must contain no-store');
      assert.ok(cacheControl.includes('no-cache'), 'Cache-Control must contain no-cache');
      assert.ok(cacheControl.includes('must-revalidate'), 'Cache-Control must contain must-revalidate');
      assert.ok(cacheControl.includes('private'), 'Cache-Control must contain private');
      assert.ok(!cacheControl.includes('max-age=300'), 'Cache-Control must NOT allow max-age=300');

      // Verify proxy & legacy cache headers
      assert.equal(res.headers.get('pragma'), 'no-cache');
      assert.equal(res.headers.get('expires'), '0');
      assert.equal(res.headers.get('surrogate-control'), 'no-store');

      // Verify that ETag is not emitted to prevent conditional 304 caching
      assert.equal(res.headers.get('etag'), null);

      // Verify body integrity
      const buffer = await res.arrayBuffer();
      assert.ok(buffer.byteLength > 0, 'Attachment file body must be delivered');
    });

    it('conditional GET with If-None-Match or If-Modified-Since returns full 200 (never 304)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
          'If-None-Match': '"dummy-etag"',
          'If-Modified-Since': new Date().toUTCString(),
        },
      });

      assert.equal(res.status, 200, 'Conditional GET must still return full 200, never 304');
      const cacheControl = res.headers.get('cache-control');
      assert.ok(cacheControl.includes('no-store'));
    });
  });

  // =========================================================================
  // 2. Tenant Isolation & Cross-Tenant Boundary Enforcement
  // =========================================================================
  describe('2. Cross-Tenant Isolation & Access Denial', () => {
    it('Community Admin from Org B cannot retrieve attachment belonging to Org A (fails closed with 404)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminB}`,
          'x-organization-id': orgB_Id,
        },
      });

      assert.equal(res.status, 404, 'Cross-tenant request must return 404 Not Found');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.message, 'Attachment not found.');

      // Error response must also enforce no-store
      const cacheControl = res.headers.get('cache-control');
      assert.ok(cacheControl && cacheControl.includes('no-store'));
    });

    it('Org B Admin attempting to spoof Org A context via header is rejected by tenantContext (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminB}`,
          'x-organization-id': orgA_Id, // Spoofed header: user has no membership in Org A
        },
      });

      assert.equal(res.status, 403, 'Spoofed tenant header must be rejected with 403 Forbidden');
      const body = await res.json();
      assert.equal(body.success, false);
      assert.ok(body.message.includes('Forbidden') || body.message.includes('membership'));
    });

    it('user with non-privileged role (Resident in Org A) is denied access (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenResidentA}`,
          'x-organization-id': orgA_Id,
        },
      });

      assert.equal(res.status, 403, 'Non-admin role must be rejected with 403 Forbidden');
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });

  // =========================================================================
  // 3. Authentication & Context Integrity
  // =========================================================================
  describe('3. Authentication & Input Validation Integrity', () => {
    it('unauthenticated request without token is rejected with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          'x-organization-id': orgA_Id,
        },
      });

      assert.equal(res.status, 401, 'Unauthenticated request must return 401');
      const cacheControl = res.headers.get('cache-control');
      assert.ok(cacheControl && cacheControl.includes('no-store'));
    });

    it('request with missing or invalid organization context fails closed with 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': 'invalid-org-id-format',
        },
      });

      assert.equal(res.status, 400, 'Invalid organization ID format must return 400');
    });

    it('malformed filename (directory traversal attempt) is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/..%2f..%2fpackage.json`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });

      assert.equal(res.status, 400, 'Directory traversal attempt must return 400');
    });

    it('non-whitelisted file extension is rejected with 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/rep-12345678-abcd-1234.exe`, {
        headers: {
          Authorization: `Bearer ${tokenAdminA}`,
          'x-organization-id': orgA_Id,
        },
      });

      assert.equal(res.status, 400, 'Disallowed file extension must return 400');
    });
  });

  // =========================================================================
  // 4. Platform Super Admin & Infrastructure Access Controls
  // =========================================================================
  describe('4. Platform Super Admin & Storage Delivery Security', () => {
    it('Platform Super Admin can view attachment across organizations for support/auditing', async () => {
      const res = await fetch(`${baseUrl}/api/v1/support/reports/attachments/${filenameA}`, {
        headers: {
          Authorization: `Bearer ${tokenPlatformAdmin}`,
        },
      });

      assert.equal(res.status, 200, 'Platform Super Admin must be permitted access');
      assert.equal(res.headers.get('content-type'), 'image/png');
      const cacheControl = res.headers.get('cache-control');
      assert.ok(cacheControl.includes('no-store'));
    });

    it('direct static file access to /uploads/issueReports/:filename is blocked (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/uploads/issueReports/${filenameA}`);
      assert.equal(res.status, 404, 'Direct unauthenticated static access must be blocked');
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('direct static file access to /public/uploads/issueReports/:filename is also blocked (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/public/uploads/issueReports/${filenameA}`);
      assert.equal(res.status, 404, 'Direct public static access must be blocked');
      const body = await res.json();
      assert.equal(body.success, false);
    });
  });
});
