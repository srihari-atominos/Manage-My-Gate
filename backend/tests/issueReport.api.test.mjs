import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../index.js';
import config from '../src/config/config.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Role from '../src/features/role/role.model.js';
import { IssueReport, IssueReportSequence } from '../src/features/issueReport/index.js';

describe('Issue Report Feature — API Layer Integration Suite (Phase 2)', () => {
  let server;
  let baseUrl;

  let testOrg;
  let residentUser;
  let tenantAdminUser;
  let platformAdminUser;

  let residentToken;
  let tenantAdminToken;
  let platformAdminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectToDb(2, 500);
    }


    // Clean up any test sequence or test reports from prior runs
    await IssueReport.deleteMany({ 'organisation.name': /Test Org IssueReport/ });
    await IssueReportSequence.deleteOne({ key: 'REPORT_SEQUENCE_TEST' });

    // Spin up ephemeral HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const timestamp = Date.now();

    // 1. Seed Test Organization
    testOrg = await Organization.create({
      name: `Test Org IssueReport ${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'UTC',
    });

    // 2. Seed Roles
    let residentRole = await Role.findOne({ name: 'Resident', orgId: testOrg._id });
    if (!residentRole) {
      residentRole = await Role.create({
        name: 'Resident',
        description: 'Resident role',
        orgId: testOrg._id,
      });
    }

    let adminRole = await Role.findOne({ name: 'Admin', orgId: testOrg._id });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Admin',
        description: 'Tenant admin role',
        orgId: testOrg._id,
      });
    }

    // 3. Seed Users
    residentUser = await User.create({
      name: 'John Resident',
      email: `resident_${timestamp}@testcommunity.com`,
      username: `resident_${timestamp}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Resident',
    });

    tenantAdminUser = await User.create({
      name: 'Alice Tenant Admin',
      email: `tenantadmin_${timestamp}@testcommunity.com`,
      username: `tenantadmin_${timestamp}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Admin',
    });

    platformAdminUser = await User.create({
      name: 'Super Admin User',
      email: `platformadmin_${timestamp}@managemygate.com`,
      username: `platformadmin_${timestamp}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Platform Super Admin',
      isPlatform: true,
    });

    // 4. Seed OrgMemberships
    await OrgMembership.create([
      {
        userId: residentUser._id,
        orgId: testOrg._id,
        roleId: residentRole._id,
        status: 'Active',
      },
      {
        userId: tenantAdminUser._id,
        orgId: testOrg._id,
        roleId: adminRole._id,
        status: 'Active',
      },
    ]);

    // 5. Generate Signed JWTs
    residentToken = jwt.sign(
      {
        id: residentUser._id.toString(),
        email: residentUser.email,
        name: residentUser.name,
        role: 'Resident',
        orgId: testOrg._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    tenantAdminToken = jwt.sign(
      {
        id: tenantAdminUser._id.toString(),
        email: tenantAdminUser.email,
        name: tenantAdminUser.name,
        role: 'Admin',
        orgId: testOrg._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    platformAdminToken = jwt.sign(
      {
        id: platformAdminUser._id.toString(),
        email: platformAdminUser.email,
        name: platformAdminUser.name,
        role: 'Platform Super Admin',
        isPlatform: true,
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test data
    if (testOrg) {
      await IssueReport.deleteMany({ 'organisation.organisationId': testOrg._id });
      await OrgMembership.deleteMany({ orgId: testOrg._id });
      await Organization.deleteOne({ _id: testOrg._id });
    }
    if (residentUser) await User.deleteOne({ _id: residentUser._id });
    if (tenantAdminUser) await User.deleteOne({ _id: tenantAdminUser._id });
    if (platformAdminUser) await User.deleteOne({ _id: platformAdminUser._id });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBMISSION TESTS (POST /api/v1/support/reports)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Report Submission API (POST /api/v1/support/reports)', () => {
    it('1.1 should successfully submit a valid report without screenshot', async () => {
      const payload = {
        reportType: 'BUG',
        feature: 'AMENITIES_BOOKING',
        title: 'Unable to reserve tennis court slot',
        description: 'When tapping the confirm button on the slot screen, the app displays a network spinner indefinitely.',
        technicalContext: {
          appVersion: '2.4.0',
          platform: 'android',
          deviceModel: 'Pixel 8 Pro',
          osVersion: 'Android 14',
        },
      };

      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.reportNumber);
      assert.match(json.data.reportNumber, /^NAH-\d{6}$/);

      // Verify persisted record in database
      const report = await IssueReport.findOne({ reportNumber: json.data.reportNumber });
      assert.ok(report);
      assert.equal(report.title, payload.title);
      assert.equal(report.description, payload.description);
      assert.equal(report.reportType, 'BUG');
      assert.equal(report.feature, 'AMENITIES_BOOKING');
      assert.equal(report.reporter.userId.toString(), residentUser._id.toString());
      assert.equal(report.reporter.email, residentUser.email);
      assert.equal(report.organisation.organisationId.toString(), testOrg._id.toString());
      assert.equal(report.technicalContext.platform, 'android');
      assert.equal(report.technicalContext.appVersion, '2.4.0');
    });

    it('1.2 should successfully submit a valid report with a PNG screenshot', async () => {
      // 1x1 valid PNG binary buffer (magic bytes: 89 50 4E 47)
      const pngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
        'hex'
      );

      const form = new FormData();
      form.append('reportType', 'FEATURE_REQUEST');
      form.append('feature', 'VISITORS_GATE_ACCESS');
      form.append('title', 'Add QR code brightness boost');
      form.append('description', 'It would be great if the screen automatically boosted brightness when opening the visitor pass QR code.');
      form.append(
        'technicalContext',
        JSON.stringify({
          appVersion: '2.4.0',
          platform: 'ios',
          deviceModel: 'iPhone 15 Pro',
          osVersion: 'iOS 17.5',
        })
      );
      form.append('screenshot', new Blob([pngBuffer], { type: 'image/png' }), 'gate_pass.png');

      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: form,
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.match(json.data.reportNumber, /^NAH-\d{6}$/);

      const report = await IssueReport.findOne({ reportNumber: json.data.reportNumber });
      assert.ok(report);
      assert.equal(report.attachments.length, 1);
      assert.ok(report.attachments[0].url.startsWith('/uploads/issueReports/rep-'));
      assert.equal(report.attachments[0].mimeType, 'image/png');
    });

    it('1.3 should enforce idempotency when duplicate submission is sent with same X-Request-ID', async () => {
      const requestId = `test-req-${Date.now()}`;
      const payload = {
        reportType: 'OTHER',
        feature: 'PAYMENTS',
        title: 'Payment receipt not downloaded',
        description: 'After successful transaction, clicking download receipt fails with a generic error.',
      };

      // First submission
      const res1 = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(res1.status, 201);
      const json1 = await res1.json();

      // Immediate duplicate submission with identical X-Request-ID
      const res2 = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(payload),
      });
      assert.equal(res2.status, 201);
      const json2 = await res2.json();

      // Both must return the identical report number
      assert.equal(json1.data.reportNumber, json2.data.reportNumber);

      // Verify in DB that only one document exists
      const count = await IssueReport.countDocuments({ clientRequestId: requestId });
      assert.equal(count, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION & REJECTION TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Validation & Request Constraints', () => {
    it('2.1 should reject missing reportType with 400', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify({
          feature: 'PAYMENTS',
          title: 'Valid title here',
          description: 'Valid description that has sufficient length.',
        }),
      });
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('2.2 should reject invalid reportType with 400', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'URGENT_TICKET', // Invalid enum
          feature: 'PAYMENTS',
          title: 'Valid title here',
          description: 'Valid description that has sufficient length.',
        }),
      });
      assert.equal(res.status, 400);
    });

    it('2.3 should reject invalid feature module with 400', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'ARBITRARY_MODULE', // Invalid module
          title: 'Valid title here',
          description: 'Valid description that has sufficient length.',
        }),
      });
      assert.equal(res.status, 400);
    });

    it('2.4 should reject whitespace-only title with 400', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'PAYMENTS',
          title: '     ',
          description: 'Valid description that has sufficient length.',
        }),
      });
      assert.equal(res.status, 400);
    });

    it('2.5 should reject description shorter than 10 characters with 400', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'PAYMENTS',
          title: 'Valid title',
          description: 'Too short', // 9 characters
        }),
      });
      assert.equal(res.status, 400);
    });

    it('2.6 should reject unrecognized keys in technicalContext with 400', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'PAYMENTS',
          title: 'Valid title',
          description: 'Valid description that has sufficient length.',
          technicalContext: {
            platform: 'android',
            injectedMaliciousKey: 'malware',
          },
        }),
      });
      assert.equal(res.status, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTHENTICATION & AUTHORIZATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('3. Authentication & Authorization Boundaries', () => {
    it('3.1 should reject submission without authorization token with 401', async () => {
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'PAYMENTS',
          title: 'No token title',
          description: 'Valid description that has sufficient length.',
        }),
      });
      assert.equal(res.status, 401);
    });

    it('3.2 should block normal resident from accessing platform reports with 403', async () => {
      const res = await fetch(`${baseUrl}/platform/reports`, {
        headers: {
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
      });
      assert.equal(res.status, 403);
    });

    it('3.3 should block tenant admin from accessing platform reports with 403', async () => {
      const res = await fetch(`${baseUrl}/platform/reports`, {
        headers: {
          Authorization: `Bearer ${tenantAdminToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
      });
      assert.equal(res.status, 403);
    });

    it('3.4 should permit Platform Super Admin to access platform reports with 200', async () => {
      const res = await fetch(`${baseUrl}/platform/reports`, {
        headers: {
          Authorization: `Bearer ${platformAdminToken}`,
        },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.reports));
      assert.ok(typeof json.data.total === 'number');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPLOAD SECURITY & MAGIC BYTES
  // ─────────────────────────────────────────────────────────────────────────────
  describe('4. Upload Security & Magic Bytes Inspection', () => {
    it('4.1 should reject a fake image (text file renamed to .png) via magic byte inspection', async () => {
      const fakePngBuffer = Buffer.from('This is pure text, definitely not a real PNG image!');

      const form = new FormData();
      form.append('reportType', 'BUG');
      form.append('feature', 'PAYMENTS');
      form.append('title', 'Fake image test');
      form.append('description', 'Attempting upload of a text file with .png extension.');
      form.append('screenshot', new Blob([fakePngBuffer], { type: 'image/png' }), 'fake.png');

      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: form,
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.match(json.message, /magic bytes|signature/i);
    });

    it('4.2 should reject disallowed file extension (.pdf) with 400', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 file content here...');

      const form = new FormData();
      form.append('reportType', 'BUG');
      form.append('feature', 'PAYMENTS');
      form.append('title', 'PDF upload test');
      form.append('description', 'Attempting upload of a PDF file.');
      form.append('screenshot', new Blob([pdfBuffer], { type: 'application/pdf' }), 'doc.pdf');

      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: form,
      });

      assert.equal(res.status, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PLATFORM ADMIN LISTING & DETAIL
  // ─────────────────────────────────────────────────────────────────────────────
  describe('5. Platform Admin Listing & Detail Endpoints', () => {
    let createdReportId;
    let createdReportNumber;

    before(async () => {
      // Seed a designated report for detail testing
      const payload = {
        reportType: 'BUG',
        feature: 'NOTIFICATIONS',
        title: 'Push notifications sound not playing',
        description: 'On Android 14, notifications show visual banner but no sound alert plays.',
      };

      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
          'x-organization-id': testOrg._id.toString(),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      createdReportNumber = json.data.reportNumber;
      const reportDoc = await IssueReport.findOne({ reportNumber: createdReportNumber });
      createdReportId = reportDoc._id.toString();
    });

    it('5.1 should filter platform reports by reportType', async () => {
      const res = await fetch(`${baseUrl}/platform/reports?reportType=BUG`, {
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.reports.every((r) => r.reportType === 'BUG'));
    });

    it('5.2 should search platform reports by keyword', async () => {
      const res = await fetch(`${baseUrl}/platform/reports?search=sound`, {
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.reports.length > 0);
      assert.ok(json.data.reports.some((r) => r.reportNumber === createdReportNumber));
    });

    it('5.3 should fetch single report by valid ID', async () => {
      const res = await fetch(`${baseUrl}/platform/reports/${createdReportId}`, {
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data._id, createdReportId);
      assert.equal(json.data.reportNumber, createdReportNumber);
    });

    it('5.4 should return 404 for nonexistent report ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/platform/reports/${fakeId}`, {
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      });
      assert.equal(res.status, 404);
    });

    it('5.5 should return 400 for malformed MongoDB ID', async () => {
      const res = await fetch(`${baseUrl}/platform/reports/not-a-valid-mongo-id`, {
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      });
      assert.equal(res.status, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ATOMIC SEQUENTIAL NUMBER GENERATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('6. Atomic Sequential Numbering Integrity', () => {
    it('6.1 should produce strictly sequential and collision-proof report numbers under concurrent submissions', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        fetch(`${baseUrl}/support/reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${residentToken}`,
            'x-organization-id': testOrg._id.toString(),
          },
          body: JSON.stringify({
            reportType: 'OTHER',
            feature: 'COMMUNITY_DIRECTORY',
            title: `Concurrent report submission #${i}`,
            description: `Testing atomic counter concurrency for report batch number ${i}.`,
          }),
        }).then((r) => r.json())
      );

      const results = await Promise.all(promises);
      const reportNumbers = results.map((r) => r.data.reportNumber);

      // Verify all 5 report numbers are unique
      const uniqueNumbers = new Set(reportNumbers);
      assert.equal(uniqueNumbers.size, 5);

      // Extract numeric sequence portions and verify each matches the standard 6-digit format
      const sequences = reportNumbers.map((num) => {
        assert.match(num, /^NAH-\d{6}$/);
        return parseInt(num.replace('NAH-', ''), 10);
      });

      // Sort and verify no duplicate numbers exist
      sequences.sort((a, b) => a - b);
      for (let i = 1; i < sequences.length; i++) {
        assert.ok(sequences[i] > sequences[i - 1], 'Sequence numbers must be strictly increasing');
      }
    });
  });

  after(async () => {
    try {
      if (testOrg) {
        await IssueReport.deleteMany({ 'organisation.id': testOrg._id });
        await OrgMembership.deleteMany({ orgId: testOrg._id });
        await Role.deleteMany({ orgId: testOrg._id });
        await Organization.deleteOne({ _id: testOrg._id });
      }
      if (residentUser || tenantAdminUser || platformAdminUser) {
        const userIds = [residentUser?._id, tenantAdminUser?._id, platformAdminUser?._id].filter(Boolean);
        await User.deleteMany({ _id: { $in: userIds } });
      }
      await IssueReportSequence.deleteOne({ key: 'REPORT_SEQUENCE_TEST' });
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr.message);
    } finally {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  });
});

