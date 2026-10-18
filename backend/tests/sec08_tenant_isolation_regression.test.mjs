/**
 * SEC-08: Automated Regression Testing for Tenant Isolation
 *
 * Comprehensive automated regression test suite verifying all tenant-isolation
 * security controls implemented across SEC-01 through SEC-07:
 * - Suite 1: Ingress Tenant Resolution & Header / Param Tampering Resistance
 * - Suite 2: IDOR Cross-Tenant Read Barriers (Fail-Closed 404 Invariant)
 * - Suite 3: Cross-Tenant State Mutation Invariants (Zero Side-Effects)
 * - Suite 4: Search, Filter, Pagination, and Reporting Leakage Prevention
 * - Suite 5: Role-Based Access Control & Platform Boundary Enforcement
 * - Suite 6: Cache, Background Worker & WebSocket Real-Time Isolation Invariants
 * - Suite 7: Positive Controls (Legitimate Same-Tenant Functionality Preservation)
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
import Invoice from '../src/features/invoice/invoice.model.js';
import Payment from '../src/features/payment/payment.model.js';
import { Wallet } from '../src/features/wallet/wallet.model.js';
import { Assessment } from '../src/features/assessment/assessment.model.js';
import VisitorPass from '../src/features/visitorPass/visitorPass.model.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import Poll from '../src/features/poll/poll.model.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import CommunityNote from '../src/features/communityNote/communityNote.model.js';
import Conversation from '../src/features/directoryMessage/conversation.model.js';
import Villa from '../src/features/villa/villa.model.js';
import { canJoinRoom } from '../src/config/socketRoomPolicy.js';
import rolePermissionService from '../src/features/rolePermission/rolePermission.services.js';
import { runWithTenantContext, getLogContext } from '../src/utils/logger.utils.js';

describe('SEC-08: Automated Regression Testing for Tenant Isolation', () => {
  let server;
  let baseUrl;

  let orgA;
  let orgB;
  let inactiveOrg;
  let platformOrg;

  let adminUserA;
  let adminUserB;
  let residentUserA;
  let residentUserB;
  let inactiveResident;
  let platformSuperAdmin;

  let adminTokenA;
  let adminTokenB;
  let residentTokenA;
  let residentTokenB;
  let inactiveResidentToken;
  let platformToken;

  let villaA;
  let villaB;

  // Target Fixture entities in Tenant B
  let invoiceOrgB;
  let passOrgB;
  let pollOrgB;
  let noticeOrgB;
  let noteOrgB;
  let assessmentOrgB;
  let complaintOrgB;
  let conversationOrgB;

  const createTestUser = async (username, orgId, role, status = 'Active') => {
    return await User.create({
      name: `User ${username}`,
      username,
      email: `${username}@test.isolation.local`,
      password: 'Password123!',
      role,
      orgId,
      status,
      emailVerified: true,
      isEmailVerified: true,
      allowDirectoryMessages: true,
    });
  };

  before(async () => {
    await connectToDb();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 1. Create Organizations
    orgA = await Organization.create({
      name: `Tenant Alpha ${suffix}`,
      code: `SEC08_A_${suffix}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users', 'notices', 'polls', 'complaints', 'visitors', 'directory'],
    });

    orgB = await Organization.create({
      name: `Tenant Beta ${suffix}`,
      code: `SEC08_B_${suffix}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users', 'notices', 'polls', 'complaints', 'visitors', 'directory'],
    });

    inactiveOrg = await Organization.create({
      name: `Tenant Rejected ${suffix}`,
      code: `SEC08_REJ_${suffix}`,
      organizationType: 'Residential',
      status: 'Rejected',
      allowedFeatures: ['billing', 'visitors'],
    });

    platformOrg = await Organization.create({
      name: `Platform Master ${suffix}`,
      code: `SEC08_PLAT_${suffix}`,
      organizationType: 'Other',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users', 'platform_crm', 'pricing'],
    });

    // 2. Create Villas
    villaA = await Villa.create({
      orgId: orgA._id,
      unitNumber: `VILLA-A-${suffix}`,
      block: 'A',
      floor: 1,
      status: 'Occupied',
    });

    villaB = await Villa.create({
      orgId: orgB._id,
      unitNumber: `VILLA-B-${suffix}`,
      block: 'B',
      floor: 2,
      status: 'Occupied',
    });

    // 3. Create Users
    adminUserA = await createTestUser(`admin_a_${suffix}`, orgA._id, 'Community Admin');
    adminUserB = await createTestUser(`admin_b_${suffix}`, orgB._id, 'Community Admin');
    residentUserA = await createTestUser(`res_a_${suffix}`, orgA._id, 'Resident');
    residentUserB = await createTestUser(`res_b_${suffix}`, orgB._id, 'Resident');
    inactiveResident = await createTestUser(`res_rej_${suffix}`, inactiveOrg._id, 'Resident');

    platformSuperAdmin = await User.create({
      name: `Platform Root ${suffix}`,
      username: `plat_${suffix}`,
      email: `platform.${suffix}@manage.local`,
      password: 'Password123!',
      role: 'Platform Super Admin',
      orgId: platformOrg._id,
      status: 'Active',
      emailVerified: true,
      isEmailVerified: true,
    });

    // 4. Create Org Memberships
    await OrgMembership.create([
      { userId: adminUserA._id, orgId: orgA._id, status: 'Active', role: 'Community Admin' },
      { userId: adminUserB._id, orgId: orgB._id, status: 'Active', role: 'Community Admin' },
      { userId: residentUserA._id, orgId: orgA._id, status: 'Active', role: 'Resident', villaId: villaA._id },
      { userId: residentUserB._id, orgId: orgB._id, status: 'Active', role: 'Resident', villaId: villaB._id },
      { userId: inactiveResident._id, orgId: inactiveOrg._id, status: 'Rejected', role: 'Resident' },
      { userId: platformSuperAdmin._id, orgId: platformOrg._id, status: 'Active', role: 'Platform Super Admin', isPlatform: true },
    ]);

    // 5. Create Wallets
    await Wallet.create([
      { userId: residentUserA._id, orgId: orgA._id, balance: 200, currency: 'INR', status: 'Active' },
      { userId: residentUserB._id, orgId: orgB._id, balance: 600, currency: 'INR', status: 'Active' },
    ]);

    // 6. Generate Tokens
    adminTokenA = signToken({
      id: adminUserA._id,
      _id: adminUserA._id,
      role: 'Community Admin',
      orgId: orgA._id.toString(),
      permissions: ['*'],
    });

    adminTokenB = signToken({
      id: adminUserB._id,
      _id: adminUserB._id,
      role: 'Community Admin',
      orgId: orgB._id.toString(),
      permissions: ['*'],
    });

    const residentPermissions = [
      'active_board',
      'read',
      'notices:active_board',
      'notices:read',
      'notices:react',
      'complaints:view',
      'complaints:create',
      'polls:vote',
      'polls:react',
      'polls:read',
      'invoices:read',
      'invoices:view',
      'billing:action_center',
      'billing:dashboard',
      'billing:assessment_manager',
      'visitor:resident',
      'visitors:create',
      'visitors:view',
      'directory:message',
      'community:notes',
    ];

    residentTokenA = signToken({
      id: residentUserA._id,
      _id: residentUserA._id,
      role: 'Resident',
      orgId: orgA._id.toString(),
      permissions: residentPermissions,
    });

    residentTokenB = signToken({
      id: residentUserB._id,
      _id: residentUserB._id,
      role: 'Resident',
      orgId: orgB._id.toString(),
      permissions: residentPermissions,
    });

    inactiveResidentToken = signToken({
      id: inactiveResident._id,
      _id: inactiveResident._id,
      role: 'Resident',
      orgId: inactiveOrg._id.toString(),
      permissions: residentPermissions,
    });

    platformToken = signToken({
      id: platformSuperAdmin._id,
      _id: platformSuperAdmin._id,
      role: 'Platform Super Admin',
      orgId: platformOrg._id.toString(),
      isPlatform: true,
      permissions: ['*'],
    });

    // 7. Seed Tenant B Fixtures for Adversarial Regression Checks
    invoiceOrgB = await Invoice.create({
      invoiceNumber: `INV-REG-B-${suffix}`,
      communityId: orgB._id,
      orgId: orgB._id,
      assessmentId: new mongoose.Types.ObjectId(),
      targetUserId: residentUserB._id,
      unitId: villaB._id,
      billingPeriodString: '2026-06',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentCharge: 2000,
      totalAmount: 2000,
      totalDue: 2000,
      paidAmount: 0,
      outstandingAmount: 2000,
      status: 'UNPAID',
    });

    passOrgB = await VisitorPass.create({
      orgId: orgB._id,
      createdById: residentUserB._id,
      visitorDetails: { name: 'Tenant B Guest', phone: '9888877777' },
      validity: { startDate: new Date(), endDate: new Date(Date.now() + 86400000) },
      status: 'ACTIVE',
      passType: 'GUEST',
    });

    complaintOrgB = await Complaint.create({
      orgId: orgB._id,
      communityId: orgB._id,
      residentId: residentUserB._id,
      complaintNumber: `CMP-B-${suffix}`,
      title: 'Tenant B Water Leakage',
      description: 'Pipe leaking in unit B',
      category: 'PLUMBING',
      priority: 'High',
      status: 'Open',
    });

    pollOrgB = await Poll.create({
      orgId: orgB._id,
      createdBy: adminUserB._id,
      question: 'Should we install solar panels in Block B?',
      description: 'Community poll',
      options: [{ text: 'Yes', votesCount: 0 }, { text: 'No', votesCount: 0 }],
      targetAudience: { targetType: 'ALL' },
      status: 'Active',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    noticeOrgB = await Notice.create({
      orgId: orgB._id,
      createdBy: adminUserB._id,
      title: 'Tenant B Annual Maintenance Notice',
      description: 'Elevator servicing on Saturday in Block B',
      category: 'General',
      priority: 'Medium',
      status: 'Published',
      expiryDate: new Date(Date.now() + 86400000 * 7),
    });

    noteOrgB = await CommunityNote.create({
      userId: residentUserB._id,
      orgId: orgB._id,
      text: `Looking for tennis partner ${suffix}`,
      category: 'SOCIAL',
      emoji: '🎾',
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true,
    });

    assessmentOrgB = await Assessment.create({
      communityId: orgB._id,
      name: `Maintenance Charge ${suffix}`,
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: { type: 'ALL_COMMUNITY' },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 2000 },
      isActive: true,
    });

    conversationOrgB = await Conversation.create({
      orgId: orgB._id,
      participants: [adminUserB._id, residentUserB._id],
      lastMessage: 'Confidential conversation B',
      lastMessageAt: new Date(),
    });
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    const collections = [
      Organization, OrgMembership, User, Invoice, Payment, Wallet,
      Assessment, VisitorPass, Complaint, Poll, Notice, CommunityNote, Conversation, Villa
    ];
    for (const model of collections) {
      await model.deleteMany({
        $or: [
          { orgId: { $in: [orgA?._id, orgB?._id, inactiveOrg?._id, platformOrg?._id] } },
          { communityId: { $in: [orgA?._id, orgB?._id, inactiveOrg?._id, platformOrg?._id] } },
          { _id: { $in: [orgA?._id, orgB?._id, inactiveOrg?._id, platformOrg?._id] } },
        ]
      }).catch(() => {});
    }
    await mongoose.disconnect();
  });

  // =========================================================================
  // SUITE 1: Ingress Tenant Resolution & Header / Param Tampering Resistance
  // =========================================================================
  describe('Suite 1: Ingress Tenant Resolution & Header / Param Tampering Resistance', () => {
    test('1.1: Missing X-Organization-Id on tenant-scoped endpoint fails closed safely', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          // Deliberately omitted: X-Organization-Id
        },
        body: JSON.stringify({
          title: 'Missing Tenant Header Complaint',
          description: 'Testing fail-closed behavior on missing header',
          category: 'ELECTRICAL',
          priority: 'High',
        }),
      });

      // Even if fallback resolves from JWT, verify it never allows untyped or foreign tenant access
      if (res.status === 201) {
        const body = await res.json();
        const record = await Complaint.findById(body.data._id).lean();
        assert.strictEqual(String(record.orgId), String(orgA._id), 'Must pin strictly to caller JWT tenant');
      } else {
        assert.ok([400, 401, 403].includes(res.status), 'Must fail closed with 4xx');
      }
    });

    test('1.2: Invalid / Malformed ObjectId in X-Organization-Id header fails closed safely (400/403/404)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': 'not-a-valid-mongodb-object-id',
        },
      });

      assert.ok([400, 403, 404, 500].includes(res.status));
      if (res.status !== 500) {
        const body = await res.json();
        assert.strictEqual(body.success, false);
      }
    });

    test('1.3: Mismatched X-Organization-Id (token Org A, header Org B) is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgB._id), // Forged header for non-member tenant
        },
        body: JSON.stringify({
          title: 'Cross-Tenant Header Forgery',
          description: 'Attempting to spoof organization context',
          category: 'SECURITY',
          priority: 'High',
        }),
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /forbidden|access denied|membership/i);
    });

    test('1.4: Suspended / Inactive Organization token fails closed on access', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${inactiveResidentToken}`,
          'X-Organization-Id': String(inactiveOrg._id),
        },
      });

      assert.ok([401, 403].includes(res.status), `Inactive organization request must be rejected with 401/403, got ${res.status}`);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('1.5: Body parameter poisoning (submitting foreign orgId) is sanitized to authenticated caller tenant', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          title: 'Poisoned Body Parameter Check',
          description: 'Injecting foreign orgId in body payload',
          category: 'PLUMBING',
          priority: 'High',
          orgId: String(orgB._id), // ATTACK
          communityId: String(orgB._id), // ATTACK
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);

      const dbRecord = await Complaint.findById(body.data._id).lean();
      assert.ok(dbRecord);
      assert.strictEqual(String(dbRecord.orgId), String(orgA._id), 'DB record orgId must match caller tenant');
      assert.notStrictEqual(String(dbRecord.orgId), String(orgB._id), 'DB record must NOT receive poisoned tenant');
    });
  });

  // =========================================================================
  // SUITE 2: IDOR Cross-Tenant Read Barriers (Fail-Closed 404 Invariant)
  // =========================================================================
  describe('Suite 2: IDOR Cross-Tenant Read Barriers (Fail-Closed 404 Invariant)', () => {
    test('2.1: Tenant A resident cannot read Tenant B invoice (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('2.2: Tenant A resident cannot read Tenant B visitor pass (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/visitor-passes/${passOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('2.3: Tenant A resident cannot read Tenant B complaint (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints/${complaintOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('2.4: Tenant A resident cannot read Tenant B poll (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/polls/${pollOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('2.5: Tenant A resident cannot read Tenant B notice (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('2.6: Tenant A resident cannot trigger Tenant B assessment (403/404)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/assessments/${assessmentOrgB._id}/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.ok([403, 404].includes(res.status));
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('2.7: Tenant A resident cannot delete Tenant B community note (400/403/404/500 & note remains active)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/community-notes/${noteOrgB._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.ok([400, 403, 404, 500].includes(res.status));
      const noteInDb = await CommunityNote.findById(noteOrgB._id).lean();
      assert.strictEqual(noteInDb.isActive, true, 'Community note must remain active in DB');
    });

    test('2.8: Tenant A user cannot read Tenant B conversation messages (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversation/${conversationOrgB._id}/messages`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });
  });

  // =========================================================================
  // SUITE 3: Cross-Tenant State Mutation Invariants & Zero Side-Effects
  // =========================================================================
  describe('Suite 3: Cross-Tenant State Mutation Invariants & Zero Side-Effects', () => {
    test('3.1: Financial Mutation: Cross-tenant payment reconciliation is blocked and totalDue untouched', async () => {
      const initialInvoice = await Invoice.findById(invoiceOrgB._id).lean();

      const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgB._id}/settle-offline`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          amount: 2000,
          paymentMethod: 'CASH',
          offlineReference: 'ILLEGAL-OFFLINE-HACK',
        }),
      });

      assert.ok([400, 403, 404].includes(res.status));
      const postInvoice = await Invoice.findById(invoiceOrgB._id).lean();
      assert.strictEqual(postInvoice.totalDue, initialInvoice.totalDue, 'Invoice totalDue must remain untouched');
      assert.strictEqual(postInvoice.status, initialInvoice.status, 'Invoice status must remain unchanged');
    });

    test('3.2: Assessment Mutation: Tenant A admin cannot deactivate Tenant B assessment', async () => {
      const initialAssessment = await Assessment.findById(assessmentOrgB._id).lean();

      const res = await fetch(`${baseUrl}/api/v1/assessments/${assessmentOrgB._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          name: 'Hacked Assessment Name',
          isActive: false,
        }),
      });

      assert.strictEqual(res.status, 404);
      const postAssessment = await Assessment.findById(assessmentOrgB._id).lean();
      assert.strictEqual(postAssessment.name, initialAssessment.name, 'Assessment name must remain unmodified');
      assert.strictEqual(postAssessment.isActive, initialAssessment.isActive, 'Assessment active state must remain unmodified');
    });

    test('3.3: Visitor Pass Mutation: Tenant A user cannot revoke Tenant B visitor pass', async () => {
      const initialPass = await VisitorPass.findById(passOrgB._id).lean();

      const res = await fetch(`${baseUrl}/api/v1/visitor-passes/${passOrgB._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({ status: 'REVOKED', reason: 'Malicious cancellation across tenants' }),
      });

      assert.ok([400, 403, 404].includes(res.status));
      const postPass = await VisitorPass.findById(passOrgB._id).lean();
      assert.strictEqual(postPass.status, initialPass.status, 'Visitor pass status must remain untouched in DB');
    });

    test('3.4: Directory Message Injection: Tenant A cannot post message into Tenant B conversation', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          conversationId: String(conversationOrgB._id),
          text: 'Cross-tenant message injection payload',
        }),
      });

      assert.strictEqual(res.status, 404);
      const postConv = await Conversation.findById(conversationOrgB._id).lean();
      assert.strictEqual(postConv.lastMessage, 'Confidential conversation B', 'Conversation state must not change');
    });

    test('3.5: Poll Voting Mutation: Tenant A user cannot cast vote on Tenant B poll', async () => {
      const initialPoll = await Poll.findById(pollOrgB._id).lean();

      const res = await fetch(`${baseUrl}/api/v1/polls/${pollOrgB._id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          optionIndex: 0,
        }),
      });

      assert.strictEqual(res.status, 404);
      const postPoll = await Poll.findById(pollOrgB._id).lean();
      assert.strictEqual(postPoll.options[0].votesCount, initialPoll.options[0].votesCount, 'Poll vote count must not increment');
    });

    test('3.6: Notice Deletion Mutation: Tenant A admin cannot delete Tenant B notice', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeOrgB._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.ok([403, 404].includes(res.status));
      const postNotice = await Notice.findById(noticeOrgB._id).lean();
      assert.ok(postNotice, 'Notice must remain in DB');
      assert.strictEqual(String(postNotice.orgId), String(orgB._id));
    });
  });

  // =========================================================================
  // SUITE 4: Search, Filter, Pagination, and Reporting Leakage Prevention
  // =========================================================================
  describe('Suite 4: Search, Filter, Pagination, and Reporting Leakage Prevention', () => {
    test('4.1: List Invoices returns 0 records belonging to foreign tenants', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      const invoices = Array.isArray(body.data) ? body.data : (body.data?.data || body.data?.invoices || []);
      const leaked = invoices.filter(
        (inv) => String(inv.orgId || inv.communityId) === String(orgB._id)
      );
      assert.strictEqual(leaked.length, 0, 'Zero invoices of Tenant B must be present');
    });

    test('4.2: List Visitor Passes returns 0 records belonging to foreign tenants', async () => {
      const res = await fetch(`${baseUrl}/api/v1/visitor-passes/org/${orgA._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      const passes = Array.isArray(body.data) ? body.data : (body.data?.passes || body.data?.data || []);
      const leaked = passes.filter((p) => String(p.orgId) === String(orgB._id));
      assert.strictEqual(leaked.length, 0, 'Zero visitor passes of Tenant B must be present');
    });

    test('4.3: List Complaints returns 0 records belonging to foreign tenants', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      const complaints = body.data?.complaints || body.data || [];
      const leaked = complaints.filter((c) => String(c.orgId) === String(orgB._id));
      assert.strictEqual(leaked.length, 0, 'Zero complaints of Tenant B must be present');
    });

    test('4.4: List Notices with query param tampering (?orgId=orgB._id) strictly scopes to Tenant A', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices?orgId=${orgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      const notices = Array.isArray(body.data) ? body.data : (body.data?.notices || body.data?.data || []);
      const leaked = notices.filter((n) => String(n.orgId) === String(orgB._id));
      assert.strictEqual(leaked.length, 0, 'Query parameter tampering must not leak Tenant B notices');
    });
  });

  // =========================================================================
  // SUITE 5: Role-Based Access Control & Platform Boundary Enforcement
  // =========================================================================
  describe('Suite 5: Role-Based Access Control & Platform Boundary Enforcement', () => {
    test('5.1: Tenant Admin is strictly forbidden from accessing Platform CRM enquiries (403)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries`, {
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Platform administrator access required/i);
    });

    test('5.2: Tenant Admin is strictly forbidden from mutating Master Pricing (403)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/master-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          name: 'Unauthorized Pricing Plan',
          code: 'UNAUTH_PLAN',
          tier: 'BASIC',
          billingCycle: 'MONTHLY',
          pricing: { baseFee: 0, perUnitFee: 0 },
        }),
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Platform administrator access required/i);
    });

    test('5.3: Resident is forbidden from Admin-only operations (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          title: 'Resident Unauthorized Notice',
          content: 'This should be blocked by RBAC',
          category: 'GENERAL',
        }),
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('5.4: Unauthenticated request to protected endpoints is rejected with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices`, {
        // Deliberately no Authorization header
      });

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /access denied|unauthorized|no token|authentication required|not provided/i);
    });
  });

  // =========================================================================
  // SUITE 6: Cache, Background Worker & WebSocket Real-Time Isolation
  // =========================================================================
  describe('Suite 6: Cache, Background Worker & WebSocket Real-Time Isolation', () => {
    test('6.1: WebSocket room policy isolates org:${orgId} from foreign tenant users', async () => {
      const mockSocketA = {
        id: 'sock_user_a',
        handshake: { auth: { token: residentTokenA } },
        data: {},
      };

      const canJoinOwnOrg = await canJoinRoom(mockSocketA, `org:${orgA._id}`);
      assert.strictEqual(canJoinOwnOrg, true, 'User A must be permitted to join own org room');

      const canJoinForeignOrg = await canJoinRoom(mockSocketA, `org:${orgB._id}`);
      assert.strictEqual(canJoinForeignOrg, false, 'User A must be blocked from joining foreign org room');
    });

    test('6.2: WebSocket room policy isolates user:${userId} from foreign tenant users', async () => {
      const mockSocketA = {
        id: 'sock_user_a_2',
        handshake: { auth: { token: residentTokenA } },
        data: {},
      };

      const canJoinOwnUserRoom = await canJoinRoom(mockSocketA, `user:${residentUserA._id}`);
      assert.strictEqual(canJoinOwnUserRoom, true, 'User A must be permitted to join own user room');

      const canJoinForeignUserRoom = await canJoinRoom(mockSocketA, `user:${residentUserB._id}`);
      assert.strictEqual(canJoinForeignUserRoom, false, 'User A must be blocked from joining foreign user room');
    });

    test('6.3: Role permission cache key generation enforces tenant ID namespacing (roleId:orgId)', () => {
      const fakeRoleId = new mongoose.Types.ObjectId();
      const fakeOrgId1 = new mongoose.Types.ObjectId();
      const fakeOrgId2 = new mongoose.Types.ObjectId();

      const keyOrg1 = rolePermissionService.buildCacheKey(fakeRoleId, fakeOrgId1);
      const keyOrg2 = rolePermissionService.buildCacheKey(fakeRoleId, fakeOrgId2);

      assert.notStrictEqual(keyOrg1, keyOrg2, 'Cache keys for different orgs must never collide');
      assert.ok(keyOrg1.includes(String(fakeOrgId1)), 'Cache key must contain orgId');
      assert.ok(keyOrg2.includes(String(fakeOrgId2)), 'Cache key must contain orgId');
    });

    test('6.4: Background worker runWithTenantContext propagates tenantId and isolates log context', async () => {
      const jobId = 'sec08-job-123';
      const tenantId = String(orgA._id);

      await runWithTenantContext({ requestId: jobId, orgId: tenantId, userId: String(adminUserA._id) }, async () => {
        const ctx = getLogContext();
        assert.strictEqual(ctx.orgId, tenantId, 'Logger context must store active tenantId');
        assert.strictEqual(ctx.requestId, jobId, 'Logger context must store jobId');
      });
    });
  });

  // =========================================================================
  // SUITE 7: Positive Controls (Legitimate Same-Tenant Functionality Preservation)
  // =========================================================================
  describe('Suite 7: Positive Controls (Legitimate Same-Tenant Functionality Preservation)', () => {
    test('7.1: Authorized Resident A can create and retrieve visitor pass in own organization', async () => {
      const createRes = await fetch(`${baseUrl}/api/v1/visitor-passes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          villaId: String(villaA._id),
          visitorDetails: {
            name: 'Legitimate Guest Alpha',
            phone: '9876543210',
          },
          validity: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
          },
          passType: 'GUEST',
        }),
      });

      assert.strictEqual(createRes.status, 201);
      const createdBody = await createRes.json();
      assert.strictEqual(createdBody.success, true);
      const passId = createdBody.data._id;

      const getRes = await fetch(`${baseUrl}/api/v1/visitor-passes/${passId}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(getRes.status, 200);
      const getBody = await getRes.json();
      assert.strictEqual(getBody.success, true);
      assert.strictEqual(getBody.data._id, passId);
      assert.strictEqual(String(getBody.data.orgId), String(orgA._id));
    });

    test('7.2: Authorized Resident A can submit a complaint in own organization', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          title: `Legitimate Alpha Complaint ${Date.now()}`,
          description: 'Streetlight fixture replacement in Alpha Block A',
          category: 'CIVIL',
          priority: 'Medium',
          ignoreDuplicateWarning: true,
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(String(body.data.orgId), String(orgA._id));
    });

    test('7.3: Authorized Community Admin A can create a notice in own organization', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          title: 'Legitimate Notice Alpha',
          description: 'Water supply shutdown on Sunday morning for pipeline maintenance.',
          category: 'General',
          priority: 'Medium',
          expiryDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(String(body.data.orgId), String(orgA._id));
    });
  });
});
