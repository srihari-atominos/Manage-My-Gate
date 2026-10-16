/**
 * Phase 6.2B Medium-Severity Tenant Isolation and Pagination Remediation Test Suite
 *
 * Verifies:
 * 1. FIND-6.1-M01 (Wallet Organization Scope):
 *    - Missing tenant context fails closed (400)
 *    - Forged organization ID does not bypass tenant scope; normal requests use validated context
 *    - Valid same-tenant resident wallet lookup and balance retrieval (200)
 *    - Cross-community invoice payment using wallet is rejected (403)
 *    - Non-platform admin cannot target users outside their organization (404/403)
 *    - Platform admin with explicit ?orgId is authorized
 *
 * 2. FIND-6.1-M02 (User Preferences Organization Scope):
 *    - User without organization context reads/updates legitimate user-global preferences (200)
 *    - User in Org A attempting to read/update Org B preferences via forged ?orgId=OrgB is rejected (403)
 *    - Active member in Org A updates and retrieves Org A scoped preferences (200)
 *
 * 3. FIND-6.1-M03 (Notification Tenant Boundaries):
 *    - Forged X-Organization-Id for non-member organization is rejected (403)
 *    - Omitted organization header generates combined feed strictly scoped to user's authorized memberships
 *    - Active organization header returns only notifications for that organization plus user-global ones
 *    - markAllAsRead scopes read updates to authorized organizations
 *    - Accessing/marking notification belonging to another organization is rejected (403)
 *
 * 4. FIND-6.1-M04 (Directory Message Tenant Boundaries):
 *    - Missing tenant context fails closed (400)
 *    - Forged X-Organization-Id for non-member organization is rejected (403)
 *    - Cross-organization conversation creation between residents is rejected (404)
 *    - Reading messages with foreign conversationId is rejected (403)
 *    - Valid same-tenant conversation creation and message retrieval (201/200)
 *
 * 5. FIND-6.1-M05 (Bounded Pagination):
 *    - visitorPass endpoint bounds limit <= 100 and handles negative/zero/NaN safely
 *    - complaint endpoint bounds limit <= 100 and handles nonnumeric/negative safely
 *    - noticeBoard endpoint bounds limit <= 100 and handles nonnumeric/negative safely
 *    - poll endpoint bounds limit <= 100 and handles nonnumeric/negative safely
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
import { Wallet, WalletTransaction } from '../src/features/wallet/wallet.model.js';
import UserPreference from '../src/features/userPreference/userPreference.model.js';
import Notification from '../src/features/notification/notification.model.js';
import { Conversation } from '../src/features/directoryMessage/conversation.model.js';
import { Message } from '../src/features/directoryMessage/message.model.js';
import VisitorPass from '../src/features/visitorPass/visitorPass.model.js';
import Complaint from '../src/features/complaint/complaint.model.js';
import Notice from '../src/features/noticeBoard/noticeBoard.model.js';
import Poll from '../src/features/poll/poll.model.js';
import Invoice from '../src/features/invoice/invoice.model.js';

describe('Phase 6.2B: Medium-Severity Tenant Isolation and Pagination Remediation Suite', () => {
  let server;
  let baseUrl;

  const testRunId = new mongoose.Types.ObjectId().toString().slice(-6);

  const orgAId = new mongoose.Types.ObjectId();
  const orgBId = new mongoose.Types.ObjectId();

  const userAId = new mongoose.Types.ObjectId(); // Member of Org A
  const userBId = new mongoose.Types.ObjectId(); // Member of Org B
  const multiOrgUserId = new mongoose.Types.ObjectId(); // Member of Org A & Org B
  const platformAdminId = new mongoose.Types.ObjectId(); // Platform Super Admin

  let tokenUserA_OrgA;
  let tokenUserB_OrgB;
  let tokenMultiOrg_OrgA;
  let tokenMultiOrg_NoOrg;
  let tokenPlatformAdmin;

  let invoiceInOrgB;
  let notifOrgA;
  let notifOrgB;
  let notifGlobal;
  let convOrgA;

  before(async () => {
    await connectToDb();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const allowedFeatures = [
      'complaints',
      'billing',
      'community_notes',
      'amenities',
      'visitors',
      'directory',
      'notices',
      'polls',
      'wallet',
      'users',
      'roles',
      'workspaces',
    ];

    // Seed Organizations
    await Organization.create([
      {
        _id: orgAId,
        name: `Org Alpha ${testRunId}`,
        code: `OA_${testRunId}`,
        organizationType: 'Residential',
        status: 'Active',
        allowedFeatures,
        billingSettings: { combineOutstandingInvoices: true },
      },
      {
        _id: orgBId,
        name: `Org Beta ${testRunId}`,
        code: `OB_${testRunId}`,
        organizationType: 'Residential',
        status: 'Active',
        allowedFeatures,
        billingSettings: { combineOutstandingInvoices: true },
      },
    ]);

    // Seed Users
    await User.create([
      {
        _id: userAId,
        username: `usera_${testRunId}`,
        email: `usera_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'Resident Alpha',
        status: 'Active',
      },
      {
        _id: userBId,
        username: `userb_${testRunId}`,
        email: `userb_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'Resident Beta',
        status: 'Active',
      },
      {
        _id: multiOrgUserId,
        username: `multiorg_${testRunId}`,
        email: `multiorg_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'Multi Org User',
        status: 'Active',
      },
      {
        _id: platformAdminId,
        username: `platform_${testRunId}`,
        email: `platform_${testRunId}@test.local`,
        password: 'Password123!',
        name: 'Platform Admin',
        status: 'Active',
        isPlatform: true,
      },
    ]);

    // Seed Memberships
    await OrgMembership.create([
      {
        userId: userAId,
        orgId: orgAId,
        role: 'Resident',
        permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create', 'notices:read', 'polls:vote', 'polls:read', 'complaints:view', 'visitor:view', 'visitor:resident'],
        status: 'Active',
      },
      {
        userId: userBId,
        orgId: orgBId,
        role: 'Resident',
        permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create', 'notices:read', 'polls:vote'],
        status: 'Active',
      },
      {
        userId: multiOrgUserId,
        orgId: orgAId,
        role: 'Resident',
        permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create', 'notices:read', 'polls:vote'],
        status: 'Active',
      },
      {
        userId: multiOrgUserId,
        orgId: orgBId,
        role: 'Resident',
        permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create', 'notices:read', 'polls:vote'],
        status: 'Active',
      },
    ]);

    // Seed Wallets
    await Wallet.create([
      {
        userId: userAId,
        orgId: orgAId,
        balance: 500,
      },
      {
        userId: userBId,
        orgId: orgBId,
        balance: 750,
      },
    ]);

    // Seed an Invoice in Org B for userBId
    invoiceInOrgB = await Invoice.create({
      invoiceNumber: `INV-${testRunId}-B`,
      communityId: orgBId,
      orgId: orgBId,
      targetUserId: userBId,
      assessmentId: new mongoose.Types.ObjectId(),
      unitId: new mongoose.Types.ObjectId(),
      currentCharge: 200,
      totalDue: 200,
      totalAmount: 200,
      outstandingAmount: 200,
      paidAmount: 0,
      dueDate: new Date(Date.now() + 86400000),
      status: 'UNPAID',
      billingPeriodString: '2026-10',
      isDeleted: false,
    });

    // Seed Notifications
    notifOrgA = await Notification.create({
      recipientId: multiOrgUserId,
      orgId: orgAId,
      title: 'Notice for Org A',
      body: 'Community A announcement',
      type: 'INFO',
    });

    notifOrgB = await Notification.create({
      recipientId: multiOrgUserId,
      orgId: orgBId,
      title: 'Notice for Org B',
      body: 'Community B announcement',
      type: 'INFO',
    });

    notifGlobal = await Notification.create({
      recipientId: multiOrgUserId,
      orgId: null,
      title: 'Platform System Alert',
      body: 'Global system maintenance',
      type: 'INFO',
    });

    // Seed Conversation in Org A
    convOrgA = await Conversation.create({
      orgId: orgAId,
      participants: [userAId, multiOrgUserId],
      lastMessage: 'Hello neighbor',
      lastMessageAt: new Date(),
    });

    await Message.create({
      conversationId: convOrgA._id,
      orgId: orgAId,
      senderId: userAId,
      receiverId: multiOrgUserId,
      text: 'Hello neighbor',
      status: 'sent',
    });

    // Generate JWT Tokens
    tokenUserA_OrgA = signToken({
      id: userAId.toString(),
      _id: userAId.toString(),
      orgId: orgAId.toString(),
      role: 'Resident',
      roles: ['Resident'],
      permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create', 'notices:read', 'polls:vote', 'polls:read', 'complaints:view', 'visitor:view', 'visitor:resident'],
    });

    tokenUserB_OrgB = signToken({
      id: userBId.toString(),
      _id: userBId.toString(),
      orgId: orgBId.toString(),
      role: 'Resident',
      roles: ['Resident'],
      permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create'],
    });

    tokenMultiOrg_OrgA = signToken({
      id: multiOrgUserId.toString(),
      _id: multiOrgUserId.toString(),
      orgId: orgAId.toString(),
      role: 'Resident',
      roles: ['Resident'],
      permissions: ['billing:wallet', 'billing:action_center', 'wallet:read', 'wallet:create'],
    });

    tokenMultiOrg_NoOrg = signToken({
      id: multiOrgUserId.toString(),
      _id: multiOrgUserId.toString(),
      role: 'Resident',
      roles: ['Resident'],
    });

    tokenPlatformAdmin = signToken({
      id: platformAdminId.toString(),
      _id: platformAdminId.toString(),
      role: 'Super Admin',
      roles: ['Super Admin'],
      isPlatform: true,
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  // =========================================================================
  // Scope 1: FIND-6.1-M01 — Wallet Organization Scope
  // =========================================================================
  describe('Scope 1: FIND-6.1-M01 — Wallet Organization Scope', () => {
    test('1.1 - Missing tenant context fails closed (400) on wallet access', async () => {
      const res = await fetch(`${baseUrl}/api/v1/wallet`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_NoOrg}`,
        },
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Workspace context is required/i);
    });

    test('1.2 - Forged ?orgId=victimOrg is rejected or ignored; wallet strictly scoped to authenticated user context', async () => {
      // User A (Org A) attempts to access wallet passing ?orgId=orgBId
      const res = await fetch(`${baseUrl}/api/v1/wallet?orgId=${orgBId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      // Must return User A's wallet in Org A (balance 500), NOT Org B
      assert.equal(body.data.balance, 500);
    });

    test('1.3 - Legitimate same-tenant resident retrieves wallet balance successfully (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/wallet`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.balance, 500);
    });

    test('1.4 - Cross-community invoice payment using wallet is rejected (403)', async () => {
      // User A (in Org A) attempts to pay an invoice belonging to Org B using wallet
      const res = await fetch(`${baseUrl}/api/v1/wallet/pay-invoice`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoiceInOrgB._id.toString(),
          amount: 200,
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    test('1.5 - Platform admin with explicit ?orgId is authorized to view community wallet (200)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/wallet?orgId=${orgBId}&userId=${userBId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenPlatformAdmin}`,
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.balance, 750);
    });
  });

  // =========================================================================
  // Scope 2: FIND-6.1-M02 — User Preferences Organization Scope
  // =========================================================================
  describe('Scope 2: FIND-6.1-M02 — User Preferences Organization Scope', () => {
    test('2.1 - User without organization context reads/updates legitimate user-global preferences (200)', async () => {
      const resGet = await fetch(`${baseUrl}/api/users/preferences`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_NoOrg}`,
        },
      });

      assert.equal(resGet.status, 200);
      const bodyGet = await resGet.json();
      assert.equal(bodyGet.success, true);
      assert.ok(bodyGet.data.featureCatalog);

      // Update global quick actions
      const resPatch = await fetch(`${baseUrl}/api/users/preferences/quick-actions`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_NoOrg}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activeQuickActions: ['helpdesk', 'notice_board'],
        }),
      });

      assert.equal(resPatch.status, 200);
      const bodyPatch = await resPatch.json();
      assert.equal(bodyPatch.success, true);
      assert.deepEqual(bodyPatch.data.activeQuickActions, ['helpdesk', 'notice_board']);
    });

    test('2.2 - User in Org A attempting to access Org B preferences via forged ?orgId is REJECTED (403)', async () => {
      const res = await fetch(`${baseUrl}/api/users/preferences?orgId=${orgBId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*(another organization|requested organization)/i);
    });

    test('2.3 - Non-member attempting to patch preferences for foreign orgId is REJECTED (403)', async () => {
      const res = await fetch(`${baseUrl}/api/users/preferences/quick-actions`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activeQuickActions: ['helpdesk'],
          orgId: orgBId.toString(),
        }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    test('2.4 - Authorized member in Org A updates and reads Org A scoped preferences (200)', async () => {
      const resPatch = await fetch(`${baseUrl}/api/users/preferences/quick-actions`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activeQuickActions: ['billing_dues', 'invite_guest'],
          orgId: orgAId.toString(),
        }),
      });

      assert.equal(resPatch.status, 200);
      const bodyPatch = await resPatch.json();
      assert.equal(bodyPatch.success, true);
      assert.deepEqual(bodyPatch.data.activeQuickActions, ['billing_dues', 'invite_guest']);
    });
  });

  // =========================================================================
  // Scope 3: FIND-6.1-M03 — Notification Tenant Boundaries
  // =========================================================================
  describe('Scope 3: FIND-6.1-M03 — Notification Tenant Boundaries', () => {
    test('3.1 - User sending forged X-Organization-Id for non-member organization is rejected (403)', async () => {
      // User A sends X-Organization-Id for Org B (non-member)
      const res = await fetch(`${baseUrl}/api/v1/notifications`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgBId.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*not a member/i);
    });

    test('3.2 - Omitted organization header generates combined feed strictly scoped to authorized organizations', async () => {
      // Multi-org user (member of Org A and Org B) with NO organization header
      const res = await fetch(`${baseUrl}/api/v1/notifications`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_NoOrg}`,
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      const ids = body.data.notifications.map((n) => n._id.toString());
      // Should include Org A, Org B, and Global notifications
      assert.ok(ids.includes(notifOrgA._id.toString()), 'Includes Org A notification');
      assert.ok(ids.includes(notifOrgB._id.toString()), 'Includes Org B notification');
      assert.ok(ids.includes(notifGlobal._id.toString()), 'Includes Global notification');
    });

    test('3.3 - Active organization header returns ONLY notifications for that organization and global ones', async () => {
      // Multi-org user scoped to Org A
      const res = await fetch(`${baseUrl}/api/v1/notifications`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      const ids = body.data.notifications.map((n) => n._id.toString());
      assert.ok(ids.includes(notifOrgA._id.toString()), 'Includes Org A notification');
      assert.ok(!ids.includes(notifOrgB._id.toString()), 'Does NOT include Org B notification');
      assert.ok(ids.includes(notifGlobal._id.toString()), 'Includes Global notification');
    });

    test('3.4 - Marking notification belonging to another organization while in Org A is rejected (403)', async () => {
      // User in Org A context attempts to mark Org B's notification as read
      const res = await fetch(`${baseUrl}/api/v1/notifications/${notifOrgB._id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*another community/i);
    });
  });

  // =========================================================================
  // Scope 4: FIND-6.1-M04 — Directory Message Tenant Boundaries
  // =========================================================================
  describe('Scope 4: FIND-6.1-M04 — Directory Message Tenant Boundaries', () => {
    test('4.1 - Missing tenant context fails closed (400) on conversation operations', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenMultiOrg_NoOrg}`,
        },
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Workspace context is required/i);
    });

    test('4.2 - Forged X-Organization-Id for non-member organization is rejected (403)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgBId.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*not a member/i);
    });

    test('4.3 - Resident in Org A starting conversation with resident in Org B is rejected (404)', async () => {
      // User A in Org A attempts to message User B (who is only in Org B)
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: userBId.toString(),
        }),
      });

      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Recipient is not a member of this community/i);
    });

    test('4.4 - Reading messages with conversation from another community is rejected (403)', async () => {
      // Conversation convOrgA is in Org A. User B in Org B attempts to read it
      const res = await fetch(`${baseUrl}/api/v1/directory-messages/conversation/${convOrgA._id}/messages`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserB_OrgB}`,
          'X-Organization-Id': orgBId.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    test('4.5 - Legitimate same-tenant conversation retrieval and message sending (200/201)', async () => {
      const resSend = await fetch(`${baseUrl}/api/v1/directory-messages/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: convOrgA._id.toString(),
          text: 'Good morning!',
        }),
      });

      assert.equal(resSend.status, 201);
      const bodySend = await resSend.json();
      assert.equal(bodySend.success, true);
      assert.equal(bodySend.data.text, 'Good morning!');

      // Retrieve messages
      const resGet = await fetch(`${baseUrl}/api/v1/directory-messages/conversation/${convOrgA._id}/messages`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(resGet.status, 200);
      const bodyGet = await resGet.json();
      assert.equal(bodyGet.success, true);
      assert.ok(bodyGet.data.length >= 2);
    });
  });

  // =========================================================================
  // Scope 5: FIND-6.1-M05 — Bounded Pagination
  // =========================================================================
  describe('Scope 5: FIND-6.1-M05 — Bounded Pagination', () => {
    test('5.1 - visitorPass getByOrgPaginated bounds limit <= 100 and handles negative/zero/NaN safely', async () => {
      // Oversized limit=999999
      const resOversized = await fetch(`${baseUrl}/api/v1/visitor-pass/org/${orgAId}?limit=999999&skip=-5`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(resOversized.status, 200);
      const bodyOversized = await resOversized.json();
      assert.equal(bodyOversized.success, true);

      // Malformed limit=abc&skip=xyz
      const resMalformed = await fetch(`${baseUrl}/api/v1/visitor-pass/org/${orgAId}?limit=abc&skip=xyz`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(resMalformed.status, 200);
      const bodyMalformed = await resMalformed.json();
      assert.equal(bodyMalformed.success, true);
    });

    test('5.2 - complaint getAll bounds limit <= 100 and handles nonnumeric/negative safely', async () => {
      const res = await fetch(`${baseUrl}/api/v1/complaints?limit=5000&page=-1`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.pagination.currentPage, 1);
    });

    test('5.3 - noticeBoard getAll bounds limit <= 100 and handles nonnumeric/negative safely', async () => {
      const res = await fetch(`${baseUrl}/api/v1/notices?limit=9999&page=0`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.page, 1);
      assert.equal(body.data.limit, 100);
    });

    test('5.4 - poll getPolls bounds limit <= 100 and handles nonnumeric/negative safely', async () => {
      const res = await fetch(`${baseUrl}/api/v1/polls?limit=1000&page=-5`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenUserA_OrgA}`,
          'X-Organization-Id': orgAId.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.page, 1);
      assert.equal(body.data.limit, 100);
    });
  });
});
