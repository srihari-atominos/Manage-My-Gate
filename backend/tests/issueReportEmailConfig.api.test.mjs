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
import { IssueReportConfig } from '../src/features/issueReportConfig/index.js';

describe('Issue Report Email Notification & Config — Integration Test Suite', () => {
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

    // Clean up test config & reports
    await IssueReportConfig.deleteOne({ key: 'PLATFORM_ADMIN_REPORT_EMAIL' });
    await IssueReport.deleteMany({ 'organisation.name': /Test Org EmailConfig/ });

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const timestamp = Date.now();

    // 1. Seed Test Organization
    testOrg = await Organization.create({
      name: `Test Org EmailConfig ${timestamp}`,
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
      name: 'Test Resident User',
      email: `resident_emailtest_${timestamp}@testcommunity.com`,
      username: `resident_emailtest_${timestamp}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Resident',
    });

    tenantAdminUser = await User.create({
      name: 'Test Community Admin',
      email: `commadmin_emailtest_${timestamp}@testcommunity.com`,
      username: `commadmin_emailtest_${timestamp}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Admin',
    });

    platformAdminUser = await User.create({
      name: 'Platform Super Admin User',
      email: `platformadmin_emailtest_${timestamp}@managemygate.com`,
      username: `platformadmin_emailtest_${timestamp}`,
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
    if (testOrg) {
      await IssueReport.deleteMany({ 'organisation.organisationId': testOrg._id });
      await OrgMembership.deleteMany({ orgId: testOrg._id });
      await Role.deleteMany({ orgId: testOrg._id });
      await Organization.deleteOne({ _id: testOrg._id });
    }
    if (residentUser || tenantAdminUser || platformAdminUser) {
      const userIds = [residentUser?._id, tenantAdminUser?._id, platformAdminUser?._id].filter(Boolean);
      await User.deleteMany({ _id: { $in: userIds } });
    }
    await IssueReportConfig.deleteOne({ key: 'PLATFORM_ADMIN_REPORT_EMAIL' });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. EMAIL CONFIGURATION API TESTS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('1. Platform Admin Email Configuration API', () => {
    it('1.1 should fetch default empty email config for Platform Admin', async () => {
      const res = await fetch(`${baseUrl}/platform/reports/config`, {
        headers: { Authorization: `Bearer ${platformAdminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.email, '');
    });

    it('1.2 should block unauthorized resident from changing email configuration with 403', async () => {
      const res = await fetch(`${baseUrl}/platform/reports/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentToken}`,
        },
        body: JSON.stringify({ email: 'hacker@example.com' }),
      });
      assert.equal(res.status, 403);
    });

    it('1.3 should block Community Admin from changing email configuration with 403', async () => {
      const res = await fetch(`${baseUrl}/platform/reports/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tenantAdminToken}`,
        },
        body: JSON.stringify({ email: 'commadmin@example.com' }),
      });
      assert.equal(res.status, 403);
    });

    it('1.4 should reject malformed email format with 400', async () => {
      const res = await fetch(`${baseUrl}/platform/reports/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformAdminToken}`,
        },
        body: JSON.stringify({ email: 'invalid-email-address' }),
      });
      assert.equal(res.status, 400);
    });

    it('1.5 should permit Platform Admin to configure a valid email address', async () => {
      const targetEmail = 'support-lead@platformadmin.com';
      const res = await fetch(`${baseUrl}/platform/reports/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformAdminToken}`,
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.email, targetEmail);

      // Verify in DB
      const configDoc = await IssueReportConfig.findOne({ key: 'PLATFORM_ADMIN_REPORT_EMAIL' });
      assert.ok(configDoc);
      assert.equal(configDoc.platformAdminEmail, targetEmail);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REPORT SUBMISSION & NON-BLOCKING EMAIL NOTIFICATION SUITE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('2. Issue Submission & Email Dispatch Handling', () => {
    it('2.1 should report issue successfully without image attachment', async () => {
      const payload = {
        reportType: 'BUG',
        feature: 'NOTIFICATIONS',
        title: 'Notice Board comments delayed',
        description: 'Posting comments on a notice takes 5 seconds before showing up.',
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
    });

    it('2.2 should report issue successfully with a valid PNG image attachment', async () => {
      const pngBuffer = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
        'hex'
      );

      const form = new FormData();
      form.append('reportType', 'FEATURE_REQUEST');
      form.append('feature', 'AMENITIES_BOOKING');
      form.append('title', 'Pool hours clarification');
      form.append('description', 'Attached screenshot shows pool opening hours conflict in the app.');
      form.append('screenshot', new Blob([pngBuffer], { type: 'image/png' }), 'pool_hours.png');

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
      assert.ok(json.data.reportNumber);

      const report = await IssueReport.findOne({ reportNumber: json.data.reportNumber });
      assert.ok(report);
      assert.equal(report.attachments.length, 1);
    });

    it('2.3 issue submission must remain 100% successful even if email dispatch fails or SMTP is unconfigured', async () => {
      // Temporarily clear email config
      await IssueReportConfig.updateOne(
        { key: 'PLATFORM_ADMIN_REPORT_EMAIL' },
        { $set: { platformAdminEmail: '' } }
      );

      const payload = {
        reportType: 'OTHER',
        feature: 'OTHER',
        title: 'Test issue submission with empty email config',
        description: 'Verifying that missing email config does not fail report creation API.',
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
    });
  });
});
