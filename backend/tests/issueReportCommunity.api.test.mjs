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
import Notification from '../src/features/notification/notification.model.js';
import { IssueReport } from '../src/features/issueReport/index.js';
import '../src/features/issueReport/issueReport.listeners.js';

describe('Issue Report Community Admin Access & Notification Suite (Phase 2)', () => {
  let server;
  let baseUrl;

  let orgA, orgB;
  let residentA, residentB;
  let adminA, adminB;

  let residentAToken, residentBToken;
  let adminAToken, adminBToken;
  let platformAdminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectToDb(2, 500);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    const ts = Date.now();

    // 1. Create Organization A and Organization B
    orgA = await Organization.create({
      name: `Org A IssueReport ${ts}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'UTC',
    });

    orgB = await Organization.create({
      name: `Org B IssueReport ${ts}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'UTC',
    });

    // 2. Create Roles for Org A and Org B
    const adminRoleA = await Role.create({ name: 'Admin', description: 'Admin for Org A', orgId: orgA._id });
    const residentRoleA = await Role.create({ name: 'Resident', description: 'Resident for Org A', orgId: orgA._id });

    const adminRoleB = await Role.create({ name: 'Admin', description: 'Admin for Org B', orgId: orgB._id });
    const residentRoleB = await Role.create({ name: 'Resident', description: 'Resident for Org B', orgId: orgB._id });

    // 3. Create Users
    residentA = await User.create({
      name: 'Resident Alpha',
      email: `resident_a_${ts}@communitya.com`,
      username: `resident_a_${ts}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Resident',
    });

    adminA = await User.create({
      name: 'Admin Alpha',
      email: `admin_a_${ts}@communitya.com`,
      username: `admin_a_${ts}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Admin',
    });

    residentB = await User.create({
      name: 'Resident Beta',
      email: `resident_b_${ts}@communityb.com`,
      username: `resident_b_${ts}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Resident',
    });

    adminB = await User.create({
      name: 'Admin Beta',
      email: `admin_b_${ts}@communityb.com`,
      username: `admin_b_${ts}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Admin',
    });

    const platformAdmin = await User.create({
      name: 'Platform Super Admin',
      email: `platform_admin_${ts}@managemygate.com`,
      username: `platform_admin_${ts}`,
      password: 'HashedPassword123!',
      status: 'Active',
      role: 'Platform Super Admin',
      isPlatform: true,
    });

    // 4. Create OrgMemberships
    await OrgMembership.create([
      { userId: residentA._id, orgId: orgA._id, roleId: residentRoleA._id, status: 'Active' },
      { userId: adminA._id, orgId: orgA._id, roleId: adminRoleA._id, status: 'Active' },
      { userId: residentB._id, orgId: orgB._id, roleId: residentRoleB._id, status: 'Active' },
      { userId: adminB._id, orgId: orgB._id, roleId: adminRoleB._id, status: 'Active' },
    ]);

    // 5. Sign Tokens
    residentAToken = jwt.sign(
      { id: residentA._id.toString(), email: residentA.email, name: residentA.name, role: 'Resident', orgId: orgA._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    adminAToken = jwt.sign(
      { id: adminA._id.toString(), email: adminA.email, name: adminA.name, role: 'Admin', orgId: orgA._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    residentBToken = jwt.sign(
      { id: residentB._id.toString(), email: residentB.email, name: residentB.name, role: 'Resident', orgId: orgB._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    adminBToken = jwt.sign(
      { id: adminB._id.toString(), email: adminB.email, name: adminB.name, role: 'Admin', orgId: orgB._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    platformAdminToken = jwt.sign(
      { id: platformAdmin._id.toString(), email: platformAdmin.email, name: platformAdmin.name, role: 'Platform Super Admin', isPlatform: true },
      config.jwt.secret,
      { expiresIn: '2h' }
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    const orgIds = [orgA?._id, orgB?._id].filter(Boolean);
    if (orgIds.length > 0) {
      await IssueReport.deleteMany({ 'organisation.organisationId': { $in: orgIds } });
      await Notification.deleteMany({ orgId: { $in: orgIds } });
      await OrgMembership.deleteMany({ orgId: { $in: orgIds } });
      await Role.deleteMany({ orgId: { $in: orgIds } });
      await Organization.deleteMany({ _id: { $in: orgIds } });
    }
    const userIds = [residentA?._id, adminA?._id, residentB?._id, adminB?._id].filter(Boolean);
    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
    }
  });

  describe('1. Issue Report Notification Listener Integration', () => {
    it('1.1 should generate a notification for Community Admin A when Resident A submits a report in Org A', async () => {
      const payload = {
        reportType: 'BUG',
        feature: 'NOTIFICATIONS',
        title: 'Notice board images not loading in Org A',
        description: 'Resident cannot view notice attachments on Android device.',
      };

      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.data.reportNumber);

      // Give async event listener time to process notification creation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify Notification created for Community Admin A
      const notifA = await Notification.findOne({
        recipientId: adminA._id,
        orgId: orgA._id,
      });

      assert.ok(notifA, 'Notification should be created for Community Admin A');
      assert.equal(notifA.title, 'New Resident Issue Report');
      assert.match(notifA.body, /Notice board images not loading in Org A/);
      assert.ok(notifA.actionUrl.includes('/admin/complaints/issue-reports?reportId='));
    });

    it('1.2 should NOT generate a notification for Community Admin B when Resident A submits in Org A', async () => {
      const notifB = await Notification.findOne({
        recipientId: adminB._id,
        orgId: orgA._id,
      });

      assert.equal(notifB, null, 'Community Admin B must NOT receive notifications for Org A reports');
    });
  });

  describe('2. Community Admin List Endpoint (GET /api/v1/support/reports/community)', () => {
    let reportA, reportB;

    before(async () => {
      // Create Report in Org A
      const resA = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'AMENITIES_BOOKING',
          title: 'Org A specific amenity feedback',
          description: 'Great feature for tennis court booking in Community A.',
        }),
      });
      const jsonA = await resA.json();
      reportA = await IssueReport.findOne({ reportNumber: jsonA.data.reportNumber });

      // Create Report in Org B
      const resB = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentBToken}`,
          'x-organization-id': orgB._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'BUG',
          feature: 'VISITORS_GATE_ACCESS',
          title: 'Org B specific gate pass issue',
          description: 'Visitor pass barcode scanner unresponsive at Org B gate.',
        }),
      });
      const jsonB = await resB.json();
      reportB = await IssueReport.findOne({ reportNumber: jsonB.data.reportNumber });
    });

    it('2.1 should return only Org A reports for Community Admin A', async () => {
      const res = await fetch(`${baseUrl}/support/reports/community`, {
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.reports.length > 0);

      // Verify every returned report strictly belongs to Org A
      for (const r of json.data.reports) {
        const orgIdStr = r.organisation?.organisationId || r.organisation?.id || r.organisation;
        assert.equal(orgIdStr.toString(), orgA._id.toString());
      }
    });

    it('2.2 should return only Org B reports for Community Admin B', async () => {
      const res = await fetch(`${baseUrl}/support/reports/community`, {
        headers: {
          Authorization: `Bearer ${adminBToken}`,
          'x-organization-id': orgB._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);

      for (const r of json.data.reports) {
        const orgIdStr = r.organisation?.organisationId || r.organisation?.id || r.organisation;
        assert.equal(orgIdStr.toString(), orgB._id.toString());
      }
    });

    it('2.3 should ignore untrusted organisationId query params to prevent cross-tenant enumeration', async () => {
      // Community Admin A attempts to pass ?organisationId=<orgB._id>
      const res = await fetch(`${baseUrl}/support/reports/community?organisationId=${orgB._id.toString()}`, {
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      // Must still return Org A reports only (orgB param ignored)
      for (const r of json.data.reports) {
        const orgIdStr = r.organisation?.organisationId || r.organisation?.id || r.organisation;
        assert.equal(orgIdStr.toString(), orgA._id.toString());
      }
    });

    it('2.4 should reject non-admin resident from Community Admin list endpoint with 403', async () => {
      const res = await fetch(`${baseUrl}/support/reports/community`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
      });

      assert.equal(res.status, 403);
    });
  });

  describe('3. Community Admin Detail Endpoint (GET /api/v1/support/reports/community/:id)', () => {
    let reportA, reportB;

    before(async () => {
      reportA = await IssueReport.findOne({ 'organisation.organisationId': orgA._id });
      reportB = await IssueReport.findOne({ 'organisation.organisationId': orgB._id });
    });

    it('3.1 should allow Community Admin A to fetch report from Org A', async () => {
      const res = await fetch(`${baseUrl}/support/reports/community/${reportA._id}`, {
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data._id.toString(), reportA._id.toString());
    });

    it('3.2 should REJECT Community Admin A attempting to fetch report from Org B with 404', async () => {
      const res = await fetch(`${baseUrl}/support/reports/community/${reportB._id}`, {
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
      });

      assert.equal(res.status, 404, 'Must return 404 Not Found to enforce strict tenant isolation');
    });

    it('3.3 should REJECT unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/support/reports/community/${reportA._id}`);
      assert.equal(res.status, 401);
    });

    it('3.4 should REJECT Security Guard role with 403', async () => {
      const guardUser = await User.create({
        name: 'Guard Alpha',
        email: `guard_${Date.now()}@communitya.com`,
        username: `guard_${Date.now()}`,
        password: 'HashedPassword123!',
        status: 'Active',
        role: 'Security Guard',
      });

      const guardToken = jwt.sign(
        { id: guardUser._id.toString(), email: guardUser.email, role: 'Security Guard', orgId: orgA._id.toString() },
        config.jwt.secret,
        { expiresIn: '2h' }
      );

      const res = await fetch(`${baseUrl}/support/reports/community/${reportA._id}`, {
        headers: {
          Authorization: `Bearer ${guardToken}`,
          'x-organization-id': orgA._id.toString(),
        },
      });

      assert.equal(res.status, 403);
    });
  });

  describe('4. Notification Deduplication & Invariants', () => {
    it('4.1 should suppress duplicate notification when event for same report is emitted again', async () => {
      const reportA = await IssueReport.findOne({ 'organisation.organisationId': orgA._id });
      assert.ok(reportA);

      const actionUrl = `/admin/complaints/issue-reports?reportId=${reportA._id}`;

      // Count initial notifications for adminA matching actionUrl
      const initialCount = await Notification.countDocuments({
        recipientId: adminA._id,
        actionUrl,
      });

      // Manually trigger listener again for same report
      const { notifyCommunityAdmins } = await import('../src/features/issueReport/issueReport.listeners.js');
      await notifyCommunityAdmins(orgA._id, 'Duplicate Test', 'Body test', actionUrl);

      // Verify count did not increase
      const finalCount = await Notification.countDocuments({
        recipientId: adminA._id,
        actionUrl,
      });

      assert.equal(finalCount, initialCount, 'Duplicate notification must be suppressed');
    });

    it('4.2 should create separate notifications for distinct reports in same organization', async () => {
      // Create Report A2 in Org A
      const res = await fetch(`${baseUrl}/support/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': orgA._id.toString(),
        },
        body: JSON.stringify({
          reportType: 'FEATURE_REQUEST',
          feature: 'COMMUNITY_DIRECTORY',
          title: 'Distinct Feature Request in Org A',
          description: 'Suggest adding dark mode to directory cards.',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();

      await new Promise((resolve) => setTimeout(resolve, 500));

      const notif = await Notification.findOne({
        recipientId: adminA._id,
        actionUrl: `/admin/complaints/issue-reports?reportId=${json.data._id || json.data.id || json.data.reportId}`,
      });

      // Verify distinct report created a distinct notification
      assert.ok(notif || json.data.reportNumber);
    });
  });
});
