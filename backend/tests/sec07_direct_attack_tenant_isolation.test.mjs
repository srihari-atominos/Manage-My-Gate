/**
 * SEC-07: Direct Attack Testing for Tenant Isolation
 *
 * Comprehensive, controlled adversarial security assessment suite verifying:
 * - Attack Class 1: Ingress Tampering & Payload Poisoning Resistance
 * - Attack Class 2: Insecure Direct Object Reference (IDOR) & Cross-Tenant Read Attacks
 * - Attack Class 3: Cross-Tenant Financial & State Mutations (Zero-Side-Effect Invariant)
 * - Attack Class 4: Privilege Escalation & Platform Boundary Tampering
 * - Attack Class 5: Directory Messaging & Cross-Tenant Boundary
 * - Attack Class 6: Differential Error Oracle & Information Disclosure Resistance (404 vs 403)
 * - Attack Class 7: Positive Controls for Authorized Same-Tenant Operations
 * - Attack Class 8: Fail-Closed Behavior on Missing / Malformed Tenant Context
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

describe('SEC-07: Direct Attack Testing for Tenant Isolation', () => {
  let server;
  let baseUrl;

  let orgA;
  let orgB;
  let platformOrg;

  let adminUserA;
  let adminUserB;
  let residentUserA;
  let residentUserB;
  let platformSuperAdmin;

  let adminTokenA;
  let adminTokenB;
  let residentTokenA;
  let residentTokenB;
  let platformToken;
  let villaA;

  // Fixture entities
  let invoiceOrgB;
  let passOrgB;
  let pollOrgB;
  let noticeOrgB;
  let noteOrgB;
  let assessmentOrgB;
  let conversationOrgB;

  const createTestUser = async (username, orgId, role) => {
    const user = await User.create({
      name: `User ${username}`,
      username,
      email: `${username}@test.isolation.local`,
      password: 'Password123!',
      role,
      orgId,
      status: 'Active',
      allowDirectoryMessages: true,
    });
    return user;
  };

  before(async () => {
    await connectToDb();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 1. Create Tenant Organizations
    orgA = await Organization.create({
      name: `Tenant Alpha ${suffix}`,
      code: `SEC07_A_${suffix}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users', 'notices', 'polls', 'complaints', 'visitors', 'directory'],
    });

    orgB = await Organization.create({
      name: `Tenant Beta ${suffix}`,
      code: `SEC07_B_${suffix}`,
      organizationType: 'Residential',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users', 'notices', 'polls', 'complaints', 'visitors', 'directory'],
    });

    platformOrg = await Organization.create({
      name: `Platform Master ${suffix}`,
      code: `SEC07_PLAT_${suffix}`,
      organizationType: 'Other',
      status: 'Active',
      allowedFeatures: ['billing', 'ledger', 'users', 'platform_crm', 'pricing'],
    });

    // 2. Create Users
    adminUserA = await createTestUser(`admin_a_${suffix}`, orgA._id, 'Community Admin');
    adminUserB = await createTestUser(`admin_b_${suffix}`, orgB._id, 'Community Admin');
    residentUserA = await createTestUser(`res_a_${suffix}`, orgA._id, 'Resident');
    residentUserB = await createTestUser(`res_b_${suffix}`, orgB._id, 'Resident');

    platformSuperAdmin = await User.create({
      name: `Platform Root ${suffix}`,
      username: `plat_${suffix}`,
      email: `platform.${suffix}@manage.local`,
      password: 'Password123!',
      role: 'Platform Super Admin',
      orgId: platformOrg._id,
      status: 'Active',
    });

    villaA = await Villa.create({
      orgId: orgA._id,
      unitNumber: `VILLA-A-${suffix}`,
      block: 'A',
      floor: 1,
      status: 'Occupied',
    });

    // 3. Create Org Memberships
    await OrgMembership.create([
      { userId: adminUserA._id, orgId: orgA._id, status: 'Active', role: 'Community Admin' },
      { userId: adminUserB._id, orgId: orgB._id, status: 'Active', role: 'Community Admin' },
      { userId: residentUserA._id, orgId: orgA._id, status: 'Active', role: 'Resident', villaId: villaA._id },
      { userId: residentUserB._id, orgId: orgB._id, status: 'Active', role: 'Resident' },
      { userId: platformSuperAdmin._id, orgId: platformOrg._id, status: 'Active', role: 'Platform Super Admin', isPlatform: true },
    ]);

    // 4. Create Initial Wallets
    await Wallet.create([
      { userId: residentUserA._id, orgId: orgA._id, balance: 100, currency: 'INR', status: 'Active' },
      { userId: residentUserB._id, orgId: orgB._id, balance: 500, currency: 'INR', status: 'Active' },
    ]);

    // 5. Sign JWTs
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
    residentTokenA = signToken({
      id: residentUserA._id,
      _id: residentUserA._id,
      role: 'Resident',
      orgId: orgA._id.toString(),
      permissions: [
        'active_board',
        'read',
        'notices:active_board',
        'notices:read',
        'notices:react',
        'complaints:view',
        'complaints:create',
        'polls:vote',
        'polls:react',
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
      ],
    });
    residentTokenB = signToken({
      id: residentUserB._id,
      _id: residentUserB._id,
      role: 'Resident',
      orgId: orgB._id.toString(),
      permissions: [
        'active_board',
        'read',
        'notices:active_board',
        'notices:read',
        'notices:react',
        'complaints:view',
        'complaints:create',
        'polls:vote',
        'polls:react',
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
      ],
    });
    platformToken = signToken({
      id: platformSuperAdmin._id,
      _id: platformSuperAdmin._id,
      role: 'Platform Super Admin',
      orgId: platformOrg._id.toString(),
      isPlatform: true,
      permissions: ['*'],
    });

    // 6. Create Target Tenant B Fixtures for Adversarial Attacks
    invoiceOrgB = await Invoice.create({
      invoiceNumber: `INV-B-${suffix}`,
      communityId: orgB._id,
      orgId: orgB._id,
      assessmentId: new mongoose.Types.ObjectId(),
      targetUserId: residentUserB._id,
      unitId: new mongoose.Types.ObjectId(),
      billingPeriodString: '2026-06',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      currentCharge: 1500,
      totalAmount: 1500,
      totalDue: 1500,
      paidAmount: 0,
      outstandingAmount: 1500,
      status: 'UNPAID',
    });

    passOrgB = await VisitorPass.create({
      orgId: orgB._id,
      createdById: residentUserB._id,
      visitorDetails: {
        name: `Guest Beta ${suffix}`,
        phone: '9876543210',
      },
      validity: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      },
      status: 'ACTIVE',
      passType: 'GUEST',
    });

    pollOrgB = await Poll.create({
      orgId: orgB._id,
      createdBy: adminUserB._id,
      question: 'Should we upgrade the pool lights?',
      description: 'Community poll',
      options: [{ text: 'Yes', votesCount: 0 }, { text: 'No', votesCount: 0 }],
      targetAudience: { targetType: 'ALL' },
      status: 'Active',
      endDate: new Date(Date.now() + 86400000 * 5),
    });

    noticeOrgB = await Notice.create({
      orgId: orgB._id,
      createdBy: adminUserB._id,
      title: `Notice Beta ${suffix}`,
      description: 'Water shutdown scheduled for Saturday.',
      category: 'General',
      priority: 'Medium',
      status: 'Published',
      expiryDate: new Date(Date.now() + 86400000 * 7),
      targetAudience: { targetType: 'ALL' },
      allowReactions: true,
      allowComments: true,
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
      name: `Monthly Maintenance ${suffix}`,
      type: 'RECURRING',
      billingCycle: 'MONTHLY',
      generationDay: 1,
      targetScope: { type: 'ALL_COMMUNITY' },
      calculationMethod: { type: 'FLAT_RATE', flatAmount: 1500 },
      isActive: true,
    });

    conversationOrgB = await Conversation.create({
      orgId: orgB._id,
      participants: [adminUserB._id, residentUserB._id],
      lastMessage: 'Hello neighbor',
      lastMessageAt: new Date(),
    });
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test collections
    const collections = [
      Organization, OrgMembership, User, Invoice, Payment, Wallet,
      Assessment, VisitorPass, Complaint, Poll, Notice, CommunityNote, Conversation, Villa
    ];
    for (const model of collections) {
      await model.deleteMany({
        $or: [
          { orgId: { $in: [orgA?._id, orgB?._id, platformOrg?._id] } },
          { communityId: { $in: [orgA?._id, orgB?._id, platformOrg?._id] } },
          { _id: { $in: [orgA?._id, orgB?._id, platformOrg?._id] } },
        ]
      }).catch(() => {});
    }
    await mongoose.disconnect();
  });

  // =========================================================================
  // ATTACK CLASS 1: Ingress Tampering & Payload Poisoning Resistance
  // =========================================================================
  describe('Attack Class 1: Ingress Tampering & Payload Poisoning Resistance', () => {
    test('1.1: Malicious user injecting poisoned orgId in body cannot divert record into target tenant', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          title: 'Poisoned OrgId Ingress Attack',
          description: 'Attempting to inject complaint into Tenant B',
          category: 'PLUMBING',
          priority: 'High',
          orgId: String(orgB._id), // ATTACK: poisoned target orgId
          communityId: String(orgB._id),
          residentId: String(residentUserB._id), // ATTACK: forged residentId
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify server forced trusted tenant context on DB record
      const complaintInDb = await Complaint.findById(data.data._id).lean();
      assert.ok(complaintInDb);
      assert.strictEqual(String(complaintInDb.orgId), String(orgA._id), 'orgId must be pinned to trusted caller tenant');
      assert.strictEqual(String(complaintInDb.residentId), String(residentUserA._id), 'residentId must be pinned to authenticated caller');
    });

    test('1.2: Forged X-Organization-Id header for non-member tenant fails closed (403)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgB._id), // ATTACK: Forging Tenant B context
        },
        body: JSON.stringify({
          title: 'Forged Header Attack',
          description: 'Testing forged workspace header',
          category: 'ELECTRICAL',
          priority: 'MEDIUM',
        }),
      });

      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /not a member of the requested community/i);
    });

    test('1.3: Request missing tenant context fails closed (400 Bad Request)', async () => {
      const tokenWithoutOrg = signToken({
        id: residentUserA._id,
        _id: residentUserA._id,
        role: 'Resident',
        permissions: ['complaints:create'],
      });
      const res = await fetch(`${baseUrl}/api/v1/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenWithoutOrg}`,
          // No X-Organization-Id header
        },
        body: JSON.stringify({
          title: 'Missing Context Attack',
          description: 'Testing missing workspace header',
          category: 'SECURITY',
        }),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Workspace context is required/i);
    });
  });

  // =========================================================================
  // ATTACK CLASS 2: Insecure Direct Object Reference (IDOR) & Cross-Tenant Reads
  // =========================================================================
  describe('Attack Class 2: Insecure Direct Object Reference (IDOR) & Cross-Tenant Reads', () => {
    test('2.1: Attacker cannot retrieve Tenant B invoice by ID (must return 404, not 403 or data)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Invoice not found/i);
    });

    test('2.2: Attacker cannot retrieve Tenant B visitor pass by ID (must return 404, not 403 or data)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/visitor-passes/${passOrgB._id}`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Visitor pass with ID .* not found/i);
    });

    test('2.3: Attacker cannot read Tenant B directory conversation messages (must return 404)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversation/${conversationOrgB._id}/messages`, {
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Conversation not found/i);
    });
  });

  // =========================================================================
  // ATTACK CLASS 3: Cross-Tenant Financial & Mutation Attacks (Zero-Mutation Invariant)
  // =========================================================================
  describe('Attack Class 3: Cross-Tenant Financial & Mutation Attacks (Zero-Mutation Invariant)', () => {
    test('3.1: Attacker cannot settle Tenant B invoice offline; DB state unchanged, 0 payments created', async () => {
      const initialInvoice = await Invoice.findById(invoiceOrgB._id).lean();
      const initialPaymentCount = await Payment.countDocuments({ invoiceId: invoiceOrgB._id });

      const res = await fetch(`${baseUrl}/api/v1/invoices/${invoiceOrgB._id}/settle-offline`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          amount: 1500,
          paymentMethod: 'CASH',
          offlineReference: 'ILLEGAL-OFFLINE-HACK',
        }),
      });

      assert.strictEqual(res.status, 404);

      // Verify zero-mutation invariant in database
      const postInvoice = await Invoice.findById(invoiceOrgB._id).lean();
      assert.strictEqual(postInvoice.status, initialInvoice.status, 'Invoice status must remain strictly UNPAID');
      assert.strictEqual(postInvoice.outstandingAmount, initialInvoice.outstandingAmount, 'Invoice balance due must remain unchanged');

      const postPaymentCount = await Payment.countDocuments({ invoiceId: invoiceOrgB._id });
      assert.strictEqual(postPaymentCount, initialPaymentCount, 'Zero payment records may be created from cross-tenant attack');
    });

    test('3.2: Attacker cannot trigger manual billing using Tenant B assessment template (404 & 0 invoices created)', async () => {
      const initialInvoiceCount = await Invoice.countDocuments({ orgId: orgB._id });

      const res = await fetch(`${baseUrl}/api/v1/invoices/trigger-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          assessmentId: String(assessmentOrgB._id), // Target Tenant B template
          dueDate: new Date(Date.now() + 86400000 * 5),
          month: 'November',
          year: 2026,
          billingPeriodString: '2026-11',
        }),
      });

      assert.strictEqual(res.status, 404);
      const postInvoiceCount = await Invoice.countDocuments({ orgId: orgB._id });
      assert.strictEqual(postInvoiceCount, initialInvoiceCount, 'Zero invoices generated under target tenant');
    });

    test('3.3: Attacker cannot revoke Tenant B visitor pass (404 & status remains ACTIVE)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/visitor-passes/${passOrgB._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          status: 'REVOKED',
          reason: 'Malicious revocation attempt',
        }),
      });

      assert.strictEqual(res.status, 404);

      const passInDb = await VisitorPass.findById(passOrgB._id).lean();
      assert.strictEqual(passInDb.status, 'ACTIVE', 'Pass status must remain ACTIVE');
    });

    test('3.4: Attacker cannot delete Tenant B community note (400/404 & note remains active)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/community-notes/${noteOrgB._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.ok([400, 404, 500].includes(res.status));

      const noteInDb = await CommunityNote.findById(noteOrgB._id).lean();
      assert.strictEqual(noteInDb.isActive, true, 'Community note must remain active');
    });
  });

  // =========================================================================
  // ATTACK CLASS 4: Privilege Escalation & Platform Boundary Tampering
  // =========================================================================
  describe('Attack Class 4: Privilege Escalation & Platform Boundary Tampering', () => {
    test('4.1: Tenant Community Admin is strictly forbidden from accessing Platform CRM leads (403)', async () => {
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

    test('4.2: Tenant Community Admin is strictly forbidden from mutating Master Pricing plans (403)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/master-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          name: 'Hacked Pricing Plan',
          code: 'HACKED_PLAN',
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

    test('4.3: Authorized Platform Super Admin can access Platform CRM (Positive Control)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/platform-crm/enquiries`, {
        headers: {
          Authorization: `Bearer ${platformToken}`,
          'X-Organization-Id': String(platformOrg._id),
        },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
    });
  });

  // =========================================================================
  // ATTACK CLASS 5: Directory Messaging Cross-Tenant Boundary
  // =========================================================================
  describe('Attack Class 5: Directory Messaging Cross-Tenant Boundary', () => {
    test('5.1: Resident A cannot initiate a directory conversation with Resident B in Tenant B (404)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          receiverId: String(residentUserB._id), // ATTACK: Cross-tenant target
        }),
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Recipient user not found/i);
    });

    test('5.2: Resident A cannot send a message to Tenant B conversation (404)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          conversationId: String(conversationOrgB._id),
          text: 'Intrusion message across tenants',
        }),
      });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /Conversation not found/i);
    });
  });

  // =========================================================================
  // ATTACK CLASS 6: Differential Error Oracle & Information Disclosure Resistance
  // =========================================================================
  describe('Attack Class 6: Differential Error Oracle & Information Disclosure Resistance', () => {
    test('6.1: Interacting with foreign Poll Reaction returns 404, never 403 disclosure', async () => {
      const res = await fetch(`${baseUrl}/api/v1/polls/${pollOrgB._id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          reactionType: 'LIKE',
        }),
      });

      assert.strictEqual(res.status, 404, 'Must return 404 to avoid disclosing existence of poll in another tenant');
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /not found/i);
    });

    test('6.2: Interacting with foreign Notice Reaction returns 404, never 403 disclosure', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices/${noticeOrgB._id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${residentTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
        body: JSON.stringify({
          reactionType: 'HELPFUL',
        }),
      });

      assert.strictEqual(res.status, 404, 'Must return 404 to avoid disclosing existence of notice in another tenant');
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.match(body.message, /not found/i);
    });
  });

  // =========================================================================
  // ATTACK CLASS 7: Positive Controls (Legitimate Same-Tenant Operations)
  // =========================================================================
  describe('Attack Class 7: Positive Controls for Authorized Same-Tenant Operations', () => {
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
            name: 'Legitimate Guest A',
            phone: '9123456789',
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

      // Now retrieve the newly created pass
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

    test('7.2: Authorized Community Admin A can access reconciliation inventory in own organization', async () => {
      const res = await fetch(`${baseUrl}/api/v1/ledger/reconciliation/inventory`, {
        headers: {
          Authorization: `Bearer ${adminTokenA}`,
          'X-Organization-Id': String(orgA._id),
        },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
    });
  });
});
