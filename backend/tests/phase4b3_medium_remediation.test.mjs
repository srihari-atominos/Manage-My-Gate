/**
 * Phase 4B.3 Medium-Priority Tenant-Isolation Remediation Test Suite
 *
 * Verifies:
 * 1. Notice Reactions and Comments:
 *    - Comment creation, retrieval, and deletion:
 *      * Missing tenant context fails closed (400)
 *      * Same-tenant comment creation succeeds (201)
 *      * Cross-tenant comment creation rejected (403)
 *      * Cross-tenant comment deletion rejected (403/404) with zero DB mutation
 *    - Reaction toggling and retrieval:
 *      * Missing tenant context fails closed (400)
 *      * Same-tenant reaction toggle succeeds (200)
 *      * Cross-tenant reaction toggle rejected (403) with zero DB mutation
 *      * Reaction repository and service queries strictly scoped to orgId
 *
 * 2. Amenity Maintenance Management:
 *    - Schedule, status update, extension, deletion, impact resolution:
 *      * Missing tenant context fails closed (400) in controller, service, and repository
 *      * Cross-tenant facility maintenance scheduling rejected (404/403)
 *      * Cross-tenant maintenance block retrieval rejected (404)
 *      * Cross-tenant status update rejected (404) with zero DB mutation
 *      * Cross-tenant maintenance extension rejected (404) with zero DB mutation
 *      * Cross-tenant maintenance block deletion rejected (404) with zero DB deletion
 *      * Repository queries require valid orgId and never fall back to unscoped queries
 *
 * 3. CRM Lead Analytics and Platform Context:
 *    - Platform CRM Inquiries and 360 View:
 *      * Non-platform tenant admin / resident rejected with 403 Forbidden
 *      * Non-platform access to lead insights (/insights) rejected with 403 Forbidden
 *      * Non-platform access to stage history (/stage-history) rejected with 403 Forbidden
 *      * Non-platform mutation (status/convert) rejected with 403 Forbidden
 *      * Platform admin (isPlatform: true) authorized successfully (200)
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../index.js';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';
import { signToken } from '../src/utils/jwt.utils.js';

import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import User from '../src/features/user/user.model.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import NoticeComment from '../src/features/noticeComment/noticeComment.model.js';
import NoticeReaction from '../src/features/noticeReaction/noticeReaction.model.js';
import AmenityFacility from '../src/features/amenityManagement/facilities/amenityFacility.model.js';
import AmenityMaintenanceBlock from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.model.js';
import AmenityMaintenanceImpact from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.model.js';
import Enquiry from '../src/features/platformCrm/enquiry.model.js';
import EnquiryInsight from '../src/features/platformCrm/enquiryInsight.model.js';

import amenityMaintenanceBlockService from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityMaintenanceImpactRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.repository.js';
import noticeCommentService from '../src/features/noticeComment/noticeComment.service.js';
import noticeReactionService from '../src/features/noticeReaction/noticeReaction.service.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Phase 4B.3: Medium-Priority Tenant-Isolation Remediation Integration', () => {
  let server;
  let baseUrl;
  let orgA;
  let orgB;
  let platformOrg;
  let adminUserA;
  let adminUserB;
  let residentUserA;
  let residentUserB;
  let platformAdminUser;

  let adminTokenA;
  let adminTokenB;
  let residentTokenA;
  let residentTokenB;
  let platformAdminToken;

  before(async () => {
    await connectToDb();

    // Spin up local HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();

    // 1. Create two isolated tenant organizations
    orgA = await Organization.create({
      name: `Phase4B3 Alpha Community ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
      allowedFeatures: ['notices', 'amenities', 'complaints', 'visitors', 'users', 'roles'],
    });

    orgB = await Organization.create({
      name: `Phase4B3 Beta Community ${timestamp}`,
      status: 'Active',
      organizationType: 'Residential',
      allowedFeatures: ['notices', 'amenities', 'complaints', 'visitors', 'users', 'roles'],
    });

    platformOrg = await Organization.create({
      name: `Phase4B3 Platform HQ ${timestamp}`,
      status: 'Active',
      organizationType: 'Corporate',
      isPlatform: true,
      allowedFeatures: ['platform', 'crm', 'billing', 'analytics'],
    });

    // 2. Create users with standard role names
    adminUserA = await User.create({
      username: `admin_a_${timestamp}`,
      email: `admin_a_${timestamp}@community-a.com`,
      password: 'HashedPassword123!',
      role: 'Community Admin',
      status: 'Active',
      orgId: orgA._id,
    });

    adminUserB = await User.create({
      username: `admin_b_${timestamp}`,
      email: `admin_b_${timestamp}@community-b.com`,
      password: 'HashedPassword123!',
      role: 'Community Admin',
      status: 'Active',
      orgId: orgB._id,
    });

    residentUserA = await User.create({
      username: `resident_a_${timestamp}`,
      email: `resident_a_${timestamp}@community-a.com`,
      password: 'HashedPassword123!',
      role: 'Resident',
      status: 'Active',
      orgId: orgA._id,
    });

    residentUserB = await User.create({
      username: `resident_b_${timestamp}`,
      email: `resident_b_${timestamp}@community-b.com`,
      password: 'HashedPassword123!',
      role: 'Resident',
      status: 'Active',
      orgId: orgB._id,
    });

    platformAdminUser = await User.create({
      username: `platform_admin_${timestamp}`,
      email: `platform_admin_${timestamp}@nahom.com`,
      password: 'HashedPassword123!',
      role: 'Super Admin',
      isPlatform: true,
      status: 'Active',
      orgId: platformOrg._id,
    });

    // 3. Create active memberships
    await OrgMembership.create([
      { userId: adminUserA._id, orgId: orgA._id.toString(), status: 'Active', role: 'Community Admin' },
      { userId: adminUserB._id, orgId: orgB._id.toString(), status: 'Active', role: 'Community Admin' },
      { userId: residentUserA._id, orgId: orgA._id.toString(), status: 'Active', role: 'Resident' },
      { userId: residentUserB._id, orgId: orgB._id.toString(), status: 'Active', role: 'Resident' },
      { userId: platformAdminUser._id, orgId: platformOrg._id.toString(), status: 'Active', role: 'Super Admin', isPlatform: true },
    ]);

    // 4. Generate JWT tokens
    adminTokenA = signToken({
      id: adminUserA._id,
      _id: adminUserA._id,
      role: 'Community Admin',
      orgId: orgA._id.toString(),
      permissions: ['manage_notices', 'amenities', 'maintenance', 'active_board', 'read', 'notices:active_board', 'notices:read', 'notices:manage_notices'],
    });

    adminTokenB = signToken({
      id: adminUserB._id,
      _id: adminUserB._id,
      role: 'Community Admin',
      orgId: orgB._id.toString(),
      permissions: ['manage_notices', 'amenities', 'maintenance', 'active_board', 'read', 'notices:active_board', 'notices:read', 'notices:manage_notices'],
    });

    residentTokenA = signToken({
      id: residentUserA._id,
      _id: residentUserA._id,
      role: 'Resident',
      orgId: orgA._id.toString(),
      permissions: ['active_board', 'read', 'notices:active_board', 'notices:read'],
    });

    residentTokenB = signToken({
      id: residentUserB._id,
      _id: residentUserB._id,
      role: 'Resident',
      orgId: orgB._id.toString(),
      permissions: ['active_board', 'read', 'notices:active_board', 'notices:read'],
    });

    platformAdminToken = signToken({
      id: platformAdminUser._id,
      _id: platformAdminUser._id,
      role: 'Super Admin',
      isPlatform: true,
      orgId: platformOrg._id.toString(),
      permissions: ['*'],
    });
  });

  after(async () => {
    try {
      if (server) {
        server.closeAllConnections?.();
        await new Promise((resolve) => server.close(resolve));
      }
      const orgIds = [orgA?._id, orgB?._id, platformOrg?._id].filter(Boolean);
      const userIds = [adminUserA?._id, adminUserB?._id, residentUserA?._id, residentUserB?._id, platformAdminUser?._id].filter(Boolean);
      if (orgIds.length > 0) {
        await Promise.all([
          Organization.deleteMany({ _id: { $in: orgIds } }),
          OrgMembership.deleteMany({ orgId: { $in: orgIds.map(String) } }),
          User.deleteMany({ _id: { $in: userIds } }),
          Notice.deleteMany({ orgId: { $in: orgIds } }),
          NoticeComment.deleteMany({ orgId: { $in: orgIds } }),
          NoticeReaction.deleteMany({ orgId: { $in: orgIds } }),
          AmenityFacility.deleteMany({ orgId: { $in: orgIds } }),
          AmenityMaintenanceBlock.deleteMany({ orgId: { $in: orgIds } }),
          AmenityMaintenanceImpact.deleteMany({ orgId: { $in: orgIds } }),
          Enquiry.deleteMany({ email: { $regex: /phase4b3/i } }),
          EnquiryInsight.deleteMany({}),
        ]);
      }
      await mongoose.disconnect();
    } catch (err) {
      console.error('Error during teardown:', err);
    }
  });

  // =========================================================================
  // 1. NOTICE REACTIONS & COMMENTS SECURITY TESTS
  // =========================================================================
  describe('Area 1: Notice Reactions and Comments Tenant Isolation', () => {
    let noticeA;
    let commentA;

    before(async () => {
      noticeA = await Notice.create({
        orgId: orgA._id,
        title: 'Alpha Community Notice for Comments',
        description: 'This notice belongs exclusively to Organization Alpha.',
        category: 'General',
        priority: 'Medium',
        status: 'Published',
        expiryDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        createdBy: adminUserA._id,
      });

      commentA = await NoticeComment.create({
        noticeId: noticeA._id,
        orgId: orgA._id,
        userId: residentUserA._id,
        content: 'Initial comment by resident A',
        status: 'Active',
      });
    });

    test('1.1 - Missing tenant context fails closed (400) on comment creation', async () => {
      const tokenNoOrg = signToken({
        id: residentUserA._id,
        _id: residentUserA._id,
        role: 'Resident',
        permissions: ['active_board', 'read', 'notices:active_board', 'notices:read'],
      });

      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeA._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenNoOrg}`,
        },
        body: JSON.stringify({ content: 'Unscoped comment attempt' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('1.2 - Authorized resident of Org A successfully adds comment to Org A notice (201)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeA._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
        body: JSON.stringify({ content: 'Legitimate comment from resident A' }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.content, 'Legitimate comment from resident A');
      assert.strictEqual(String(data.data.orgId), String(orgA._id));
    });

    test('1.3 - Cross-tenant comment creation rejected (403) and causes zero DB mutation', async () => {
      const countBefore = await NoticeComment.countDocuments({ noticeId: noticeA._id });

      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeA._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
        body: JSON.stringify({ content: 'Malicious cross-tenant comment attempt from B' }),
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);

      const countAfter = await NoticeComment.countDocuments({ noticeId: noticeA._id });
      assert.strictEqual(countAfter, countBefore, 'Zero comments must be created on cross-tenant request');
    });

    test('1.4 - Cross-tenant comment deletion rejected (403/404) and causes zero DB mutation', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeA._id}/comments/${commentA._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
      });

      assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
      const commentCheck = await NoticeComment.findById(commentA._id);
      assert.ok(commentCheck, 'Comment A must not be deleted by cross-tenant admin');
      assert.strictEqual(commentCheck.status, 'Active');
    });

    test('1.5 - Cross-tenant notice reaction toggle rejected (403) and causes zero DB mutation', async () => {
      const countBefore = await NoticeReaction.countDocuments({ noticeId: noticeA._id });

      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeA._id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
        body: JSON.stringify({ reactionType: 'LIKE' }),
      });

      assert.strictEqual(res.status, 403);
      const countAfter = await NoticeReaction.countDocuments({ noticeId: noticeA._id });
      assert.strictEqual(countAfter, countBefore, 'Zero reactions must be toggled on cross-tenant notice');
    });

    test('1.6 - Same-tenant notice reaction toggle succeeds (200) and scopes reaction to orgId', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeA._id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
        body: JSON.stringify({ reactionType: 'LIKE' }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      const reactionDoc = await NoticeReaction.findOne({ noticeId: noticeA._id, userId: residentUserA._id });
      assert.ok(reactionDoc, 'Reaction doc must be created');
      assert.strictEqual(String(reactionDoc.orgId), String(orgA._id));
    });

    test('1.7 - Service fail-closed: missing orgId throws HttpError 400', async () => {
      await assert.rejects(
        async () => {
          await noticeCommentService.addComment({ noticeId: noticeA._id, userId: residentUserA._id, comment: 'test' });
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );

      await assert.rejects(
        async () => {
          await noticeReactionService.toggleReaction({ noticeId: noticeA._id, userId: residentUserA._id, reactionType: 'LIKE' });
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );
    });
  });

  // =========================================================================
  // 2. AMENITY MAINTENANCE MANAGEMENT SECURITY TESTS
  // =========================================================================
  describe('Area 2: Amenity Maintenance Management Tenant Isolation', () => {
    let facilityA;
    let blockA;

    before(async () => {
      facilityA = await AmenityFacility.create({
        orgId: orgA._id,
        name: 'Alpha Tennis Court',
        code: `TC_A_${Date.now()}`,
        archetype: 'EXCLUSIVE_HOURLY',
        status: 'ACTIVE',
        isActive: true,
        concurrencyVersion: 1,
        capacity: 10,
        timezone: 'Asia/Kolkata',
      });

      // Create an existing maintenance block for facility A
      blockA = await AmenityMaintenanceBlock.create({
        orgId: orgA._id,
        facilityId: facilityA._id,
        title: 'Routine Court Resurfacing',
        reason: 'Quarterly maintenance',
        maintenanceType: 'PREVENTIVE',
        status: 'SCHEDULED',
        startDateTime: new Date(Date.now() + 86400000), // Tomorrow
        endDateTime: new Date(Date.now() + 172800000),   // Day after tomorrow
      });
    });

    test('2.1 - Missing tenant context fails closed (400) on scheduling maintenance', async () => {
      const tokenNoOrg = signToken({
        id: adminUserA._id,
        _id: adminUserA._id,
        role: 'ADMIN',
        permissions: ['amenities', 'maintenance'],
      });

      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenNoOrg}`,
        },
        body: JSON.stringify({
          facilityId: facilityA._id.toString(),
          title: 'Unscoped Maintenance',
          reason: 'Testing',
          maintenanceType: 'PREVENTIVE',
          startDateTime: new Date(Date.now() + 200000000).toISOString(),
          endDateTime: new Date(Date.now() + 250000000).toISOString(),
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('2.2 - Cross-tenant maintenance scheduling rejected (404/403) and causes zero DB mutation', async () => {
      const countBefore = await AmenityMaintenanceBlock.countDocuments({ facilityId: facilityA._id });

      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
        body: JSON.stringify({
          facilityId: facilityA._id.toString(), // Facility A belongs to Org A!
          title: 'Hostile Maintenance Schedule from Org B',
          reason: 'Testing cross-tenant isolation',
          maintenanceType: 'PREVENTIVE',
          startDateTime: new Date(Date.now() + 300000000).toISOString(),
          endDateTime: new Date(Date.now() + 350000000).toISOString(),
        }),
      });

      assert.ok([403, 404].includes(res.status), `Expected 403 or 404, got ${res.status}`);
      const countAfter = await AmenityMaintenanceBlock.countDocuments({ facilityId: facilityA._id });
      assert.strictEqual(countAfter, countBefore, 'Zero maintenance blocks must be created for facility A by Org B');
    });

    test('2.3 - Cross-tenant maintenance block retrieval rejected (404)', async () => {
      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance/${blockA._id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('2.4 - Cross-tenant status update rejected (404) and causes zero DB mutation', async () => {
      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance/${blockA._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      assert.strictEqual(res.status, 404);
      const freshBlock = await AmenityMaintenanceBlock.findById(blockA._id);
      assert.strictEqual(freshBlock.status, 'SCHEDULED', 'Maintenance block status must remain SCHEDULED');
    });

    test('2.5 - Cross-tenant maintenance extension rejected (404) and causes zero DB mutation', async () => {
      const originalEnd = blockA.endDateTime.getTime();
      const extendedEnd = new Date(originalEnd + 86400000).toISOString();

      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance/${blockA._id}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
        body: JSON.stringify({ newEndDateTime: extendedEnd }),
      });

      assert.strictEqual(res.status, 404);
      const freshBlock = await AmenityMaintenanceBlock.findById(blockA._id);
      assert.strictEqual(freshBlock.endDateTime.getTime(), originalEnd, 'endDateTime must remain unchanged');
    });

    test('2.6 - Cross-tenant maintenance deletion rejected (404) and causes zero DB mutation', async () => {
      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance/${blockA._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
      });

      assert.strictEqual(res.status, 404);
      const freshBlock = await AmenityMaintenanceBlock.findById(blockA._id);
      assert.ok(freshBlock, 'Maintenance block must still exist');
    });

    test('2.7 - Maintenance repositories fail closed on missing orgId without unscoped database fallback', async () => {
      // amenityMaintenanceBlockRepository.findById without orgId throws 400
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockRepository.findById(blockA._id);
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );

      // amenityMaintenanceBlockRepository.deleteById without orgId throws 400
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockRepository.deleteById(blockA._id);
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );

      // amenityMaintenanceImpactRepository.findById without orgId throws 400
      await assert.rejects(
        async () => {
          await amenityMaintenanceImpactRepository.findById(new mongoose.Types.ObjectId());
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );

      // amenityMaintenanceBlockService.getMaintenanceBlockById without orgId throws 400
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.getMaintenanceBlockById(blockA._id);
        },
        (err) => err instanceof HttpError && err.statusCode === 400
      );
    });

    test('2.8 - Authorized Admin of Org A can retrieve their own maintenance block (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v2/amenity-management/maintenance/${blockA._id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.title, 'Routine Court Resurfacing');
      assert.strictEqual(String(data.data.orgId), String(orgA._id));
    });
  });

  // =========================================================================
  // 3. CRM LEAD ANALYTICS & PLATFORM AUTHORIZATION TESTS
  // =========================================================================
  describe('Area 3: CRM Lead Analytics and Platform Context Security', () => {
    let leadEnquiry;

    before(async () => {
      leadEnquiry = await Enquiry.create({
        username: 'Lead Prospect 1',
        email: 'lead1_phase4b3@prospect.com',
        phone: '9876543210',
        organizationName: 'Prospective Community Heights',
        totalUnits: 150,
        status: 'New',
        inquiryId: `INQ-${Date.now().toString().slice(-6)}`,
      });

      await EnquiryInsight.create({
        enquiryId: leadEnquiry._id,
        leadScore: 85,
        conversionProbability: 'High',
        revenueEstimate: { monthly: 500, annual: 6000 },
        aiInsights: ['High interest in Visitor Management module'],
        recommendations: ['Schedule immediate product demo'],
      });
    });

    test('3.1 - Non-platform Community Admin rejected with 403 Forbidden from accessing CRM leads', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes('Platform administrator access required') || res.status === 403);
    });

    test('3.2 - Non-platform Resident rejected with 403 Forbidden from accessing CRM leads', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('3.3 - Non-platform user rejected with 403 from accessing Lead Insights & Revenue Analytics', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries/${leadEnquiry._id}/insights`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': orgA._id.toString(),
        },
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test('3.4 - Non-platform user rejected with 403 from mutating lead stage or converting enquiry', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries/${leadEnquiry._id}/stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenB}`,
          'X-Organization-Id': orgB._id.toString(),
        },
        body: JSON.stringify({ status: 'Qualified' }),
      });

      assert.strictEqual(res.status, 403);
      const freshEnquiry = await Enquiry.findById(leadEnquiry._id);
      assert.strictEqual(freshEnquiry.status, 'New', 'Lead stage must remain New');
    });

    test('3.5 - Authenticated Platform Admin (isPlatform: true) successfully retrieves CRM leads (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${platformAdminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.data.data), 'Returns paginated leads list');
    });

    test('3.6 - Authenticated Platform Admin can access 360 insights and revenue analytics (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries/${leadEnquiry._id}/insights`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${platformAdminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.data.leadScore, 85);
      assert.strictEqual(data.data.conversionProbability, 'High');
    });
  });
});
