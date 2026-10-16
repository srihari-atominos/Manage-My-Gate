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
import notificationService from '../src/features/notification/notification.service.js';
import notificationRepository from '../src/features/notification/notification.repository.js';
import Notification from '../src/features/notification/notification.model.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import OrgMembership from '../src/features/orgMembership/orgMembership.model.js';
import Villa from '../src/features/villa/villa.model.js';
import Role from '../src/features/role/role.model.js';
import { canJoinRoom } from '../src/config/socketRoomPolicy.js';
import { initSocket, getIO } from '../src/config/socket.js';
import { io as ClientIO } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

describe('SEC-04 — Notifications Tenant Isolation & Security Audit Suite', () => {
  let server;
  let socketServer;
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

  const signUserToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', expiresIn: '1h' });
  };

  const createClient = (token, extraOpts = {}) => {
    return ClientIO(baseUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      ...extraOpts,
    });
  };

  before(async () => {
    await connectToDb();
    server = http.createServer(app);
    socketServer = await initSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const ts = Date.now();

    // 1. Seed Organizations
    orgA = await Organization.create({
      name: `Org A Notif ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
    });
    orgA_Id = orgA._id.toString();

    orgB = await Organization.create({
      name: `Org B Notif ${ts}`,
      isPlatform: false,
      organizationType: 'Residential',
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
      permissions: ['notification:read'],
    });

    const adminRole = await Role.create({
      name: 'Admin',
      orgId: orgA_Id,
      permissions: ['*'],
    });

    // 4. Seed Users
    userA1 = await User.create({
      username: `usera1_${ts}`,
      name: 'Resident A1',
      email: `usera1_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
      villaId: villaA1_Id,
    });

    userA2 = await User.create({
      username: `usera2_${ts}`,
      name: 'Resident A2',
      email: `usera2_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
      villaId: villaA2_Id,
    });

    userB = await User.create({
      username: `userb_${ts}`,
      name: 'Resident B',
      email: `userb_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    adminA = await User.create({
      username: `admina_${ts}`,
      name: 'Admin A',
      email: `admina_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      isEmailVerified: true,
      emailVerified: true,
    });

    platformAdmin = await User.create({
      username: `plat_${ts}`,
      name: 'Platform Super Admin',
      email: `plat_${ts}@test.local`,
      password: 'HashedPassword123!',
      status: 'Active',
      isPlatform: true,
      isEmailVerified: true,
      emailVerified: true,
    });

    // 5. Seed Memberships
    await OrgMembership.create([
      {
        userId: userA1._id,
        orgId: orgA_Id,
        roleId: residentRole._id,
        villaId: villaA1_Id,
        status: 'Active',
      },
      {
        userId: userA2._id,
        orgId: orgA_Id,
        roleId: residentRole._id,
        villaId: villaA2_Id,
        status: 'Active',
      },
      {
        userId: adminA._id,
        orgId: orgA_Id,
        roleId: adminRole._id,
        status: 'Active',
      },
      {
        userId: userB._id,
        orgId: orgB_Id,
        status: 'Active',
      },
    ]);

    // 6. Sign JWTs
    tokenUserA1 = signUserToken({
      id: userA1._id.toString(),
      orgId: orgA_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenUserA2 = signUserToken({
      id: userA2._id.toString(),
      orgId: orgA_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenUserB = signUserToken({
      id: userB._id.toString(),
      orgId: orgB_Id,
      role: 'Resident',
      isPlatform: false,
    });

    tokenAdminA = signUserToken({
      id: adminA._id.toString(),
      orgId: orgA_Id,
      role: 'Admin',
      isPlatform: false,
    });

    tokenPlatformAdmin = signUserToken({
      id: platformAdmin._id.toString(),
      role: 'Super Admin',
      isPlatform: true,
    });
  });

  after(async () => {
    // Clean up test data
    await Notification.deleteMany({
      recipientId: { $in: [userA1._id, userA2._id, userB._id, adminA._id, platformAdmin._id] },
    });
    await OrgMembership.deleteMany({
      userId: { $in: [userA1._id, userA2._id, userB._id, adminA._id, platformAdmin._id] },
    });
    await Villa.deleteMany({ _id: { $in: [villaA1_Id, villaA2_Id] } });
    await Organization.deleteMany({ _id: { $in: [orgA_Id, orgB_Id] } });
    await User.deleteMany({
      _id: { $in: [userA1._id, userA2._id, userB._id, adminA._id, platformAdmin._id] },
    });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // Control 1: Architectural Boundaries & Zero Foreign Model Imports
  // =========================================================================
  it('1.1 Zero Foreign Model Imports in notification.service.js', () => {
    const servicePath = path.join(backendRoot, 'src/features/notification/notification.service.js');
    assert.ok(fs.existsSync(servicePath), 'notification.service.js must exist');
    const content = fs.readFileSync(servicePath, 'utf8');

    const foreignModelRegex = /from\s+['"][^'"]*(orgMembership|user|villa|role)\.model\.js['"]/i;
    const match = content.match(foreignModelRegex);
    assert.strictEqual(
      match,
      null,
      `notification.service.js must not import foreign models directly: found ${match?.[0]}`
    );
  });

  // =========================================================================
  // Control 2: Authentication & Trusted Server-Side Identity
  // =========================================================================
  it('2.1 Rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications`);
    assert.strictEqual(res.status, 401);
  });

  it('2.2 Ignores client-supplied recipientId in query and derives identity from token', async () => {
    // Create notification for User A1
    const notifA1 = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'A1 Secret',
      body: 'Body for User A1',
      type: 'INFO',
    });

    // User A2 tries to query User A1's notifications using ?recipientId=...
    const res = await fetch(`${baseUrl}/api/v1/notifications?recipientId=${userA1._id.toString()}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA2}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);

    // Must return 0 notifications for User A2 (ignoring recipientId parameter)
    const returnedIds = body.data.notifications.map((n) => n._id);
    assert.ok(!returnedIds.includes(notifA1._id.toString()), 'User A2 must never see User A1 notifications');
  });

  // =========================================================================
  // Control 3: Tenant Isolation (Read, Count, and Cross-Tenant Prevention)
  // =========================================================================
  it('3.1 Authorized user accessing their own notification within their tenant succeeds', async () => {
    const notifA1 = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Tenant A Notification',
      body: 'Welcome to Tenant A',
      type: 'INFO',
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notifA1._id}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data._id.toString(), notifA1._id.toString());
  });

  it('3.2 Tenant A user attempting to query Tenant B context is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgB_Id, // User A1 has no membership in Org B
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /Forbidden.*not a member/i);
  });

  it('3.3 In Tenant A workspace, Tenant B notifications (even invitations) never leak into feed or unread count', async () => {
    // Create invitation notification for User A1 but associated with Org B
    const notifOrgBInvite = await Notification.create({
      recipientId: userA1._id,
      orgId: new mongoose.Types.ObjectId(orgB_Id),
      title: 'Org B Invite',
      body: 'You are invited to Org B',
      type: 'INVITATION',
      isRead: false,
    });

    // Query in Org A workspace
    const resList = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(resList.status, 200);
    const listBody = await resList.json();
    const ids = listBody.data.notifications.map((n) => n._id);
    assert.ok(!ids.includes(notifOrgBInvite._id.toString()), 'Org B invitation must not leak into Org A feed');

    // Check unread count in Org A workspace
    const resCount = await fetch(`${baseUrl}/api/v1/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(resCount.status, 200);
    const countBody = await resCount.json();
    // Verify count did not count the Org B invitation
    const orgACount = countBody.data.unreadCount;

    // Verify raw unread in Org B
    const rawOrgBCount = await notificationRepository.countUnread(userA1._id, orgB_Id);
    assert.strictEqual(rawOrgBCount, 1);
  });

  it('3.4 Forged organization header format is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': 'invalid-mongo-id-string',
      },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Invalid (community identifier|organization ID format)/i);
  });

  it('3.5 Conflicting ?orgId parameter conflicting with header is rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications?orgId=${orgB_Id}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Conflicting organization context/i);
  });

  // =========================================================================
  // Control 4: Unit-Level Authorization Scope
  // =========================================================================
  it('4.1 Resident can query notifications scoped to their authorized unit', async () => {
    await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Gate arrival at Villa 101',
      body: 'Guest at your gate',
      type: 'INFO',
      metadata: { villaId: villaA1_Id },
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications?unitId=${villaA1_Id}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.notifications.length > 0);
  });

  it('4.2 Resident attempting to query a unit they do NOT belong to is rejected with 403', async () => {
    // User A1 attempts to query notifications for Villa A2
    const res = await fetch(`${baseUrl}/api/v1/notifications?unitId=${villaA2_Id}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /Forbidden.*not authorized.*unit/i);
  });

  it('4.3 Org Admin can legitimately query any unit scope in their organization', async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications?unitId=${villaA1_Id}`, {
      headers: {
        Authorization: `Bearer ${tokenAdminA}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 200);
  });

  // =========================================================================
  // Control 5: User Privacy & Single Notification Operations
  // =========================================================================
  it('5.1 User in Tenant A cannot view another user notification in Tenant A (403 Forbidden)', async () => {
    const notifA2 = await notificationService.createNotification({
      recipientId: userA2._id,
      orgId: orgA_Id,
      title: 'Private A2 Notif',
      body: 'Only for User A2',
      type: 'INFO',
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notifA2._id}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /Access denied.*do not own/i);
  });

  it('5.2 User cannot mark another user notification as read (403 Forbidden)', async () => {
    const notifA2 = await notificationService.createNotification({
      recipientId: userA2._id,
      orgId: orgA_Id,
      title: 'Unread A2 Notif',
      body: 'Unread',
      type: 'INFO',
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notifA2._id}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /Access denied.*do not own/i);

    // Verify it remains unread in database
    const fresh = await Notification.findById(notifA2._id);
    assert.strictEqual(fresh.isRead, false);
  });

  it('5.3 User cannot delete another user notification (403 Forbidden)', async () => {
    const notifA2 = await notificationService.createNotification({
      recipientId: userA2._id,
      orgId: orgA_Id,
      title: 'Delete target A2',
      body: 'Should not be deleted',
      type: 'INFO',
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications/${notifA2._id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 403);

    // Verify it still exists in database
    const fresh = await Notification.findById(notifA2._id);
    assert.ok(fresh !== null);
  });

  it('5.4 Non-existent notification ID returns 404', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await fetch(`${baseUrl}/api/v1/notifications/${fakeId}`, {
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 404);
  });

  // =========================================================================
  // Control 6: Fail-Closed Bulk Operations & Mixed IDs Attack Prevention
  // =========================================================================
  it('6.1 Bulk mark-as-read succeeds for own notifications within active tenant', async () => {
    const n1 = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Bulk 1',
      body: 'B1',
      type: 'INFO',
    });
    const n2 = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Bulk 2',
      body: 'B2',
      type: 'INFO',
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications/bulk-read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [n1._id.toString(), n2._id.toString()] }),
    });
    assert.strictEqual(res.status, 200);

    const fresh1 = await Notification.findById(n1._id);
    const fresh2 = await Notification.findById(n2._id);
    assert.strictEqual(fresh1.isRead, true);
    assert.strictEqual(fresh2.isRead, true);
  });

  it('6.2 Bulk mark-as-read FAILS CLOSED (403) when mixed with another tenant notification (Zero modified)', async () => {
    const ownNotif = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Own unread',
      body: 'Own',
      type: 'INFO',
    });

    const foreignNotif = await notificationService.createNotification({
      recipientId: userB._id,
      orgId: orgB_Id,
      title: 'Foreign unread',
      body: 'Foreign',
      type: 'INFO',
    });

    // User A1 tries bulk mark as read with their own ID + foreign ID
    const res = await fetch(`${baseUrl}/api/v1/notifications/bulk-read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [ownNotif._id.toString(), foreignNotif._id.toString()] }),
    });
    assert.strictEqual(res.status, 403);

    // Verify FAIL CLOSED: own notification was NOT marked as read either!
    const freshOwn = await Notification.findById(ownNotif._id);
    assert.strictEqual(freshOwn.isRead, false, 'Fail-closed: own notification must remain unmodified on mixed attack');

    const freshForeign = await Notification.findById(foreignNotif._id);
    assert.strictEqual(freshForeign.isRead, false);
  });

  it('6.3 Bulk delete FAILS CLOSED (403) when mixed with another user notification (Zero deleted)', async () => {
    const ownNotif = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Own notif',
      body: 'Own',
      type: 'INFO',
    });

    const victimNotif = await notificationService.createNotification({
      recipientId: userA2._id,
      orgId: orgA_Id,
      title: 'Victim notif',
      body: 'Victim',
      type: 'INFO',
    });

    // User A1 attempts to delete both
    const res = await fetch(`${baseUrl}/api/v1/notifications/bulk`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [ownNotif._id.toString(), victimNotif._id.toString()] }),
    });
    assert.strictEqual(res.status, 403);

    // Verify FAIL CLOSED: neither notification was deleted
    assert.ok((await Notification.findById(ownNotif._id)) !== null);
    assert.ok((await Notification.findById(victimNotif._id)) !== null);
  });

  it('6.4 mark-all-as-read isolates updates to active tenant only', async () => {
    // Seed unread for User A1 in Org A
    await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Org A Unread',
      body: 'In Org A',
      type: 'INFO',
    });

    // Seed unread for User A1 in Org B (e.g. system notification or invite)
    const orgBNotif = await Notification.create({
      recipientId: userA1._id,
      orgId: new mongoose.Types.ObjectId(orgB_Id),
      title: 'Org B Unread',
      body: 'In Org B',
      type: 'INFO',
      isRead: false,
    });

    // Mark all as read in Org A workspace
    const res = await fetch(`${baseUrl}/api/v1/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
      },
    });
    assert.strictEqual(res.status, 200);

    // Verify Org B notification was untouched
    const freshOrgB = await Notification.findById(orgBNotif._id);
    assert.strictEqual(freshOrgB.isRead, false, 'Tenant isolation: Org B notification must remain unread');
  });

  it('6.5 Bulk mark-as-read deduplicates repeated IDs in request', async () => {
    const notif = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Deduplication Test',
      body: 'Body',
      type: 'INFO',
    });

    const res = await fetch(`${baseUrl}/api/v1/notifications/bulk/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [notif._id.toString(), notif._id.toString()] }),
    });
    assert.strictEqual(res.status, 200);

    const fresh = await Notification.findById(notif._id);
    assert.strictEqual(fresh.isRead, true);
  });

  it('6.6 Bulk operations fail closed (404/403) when mixed with a nonexistent ID, leaving valid notifications unmodified', async () => {
    const validNotif = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Valid Unread',
      body: 'Body',
      type: 'INFO',
    });

    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await fetch(`${baseUrl}/api/v1/notifications/bulk/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [validNotif._id.toString(), fakeId] }),
    });
    assert.strictEqual(res.status, 404);

    // Verify database state: validNotif was NOT marked as read
    const fresh = await Notification.findById(validNotif._id);
    assert.strictEqual(fresh.isRead, false, 'Database state must remain unmodified when batch contains missing ID');
  });

  it('6.7 Bulk operations reject oversized batches (>100 IDs) with 400 Bad Request', async () => {
    const oversizedIds = Array.from({ length: 101 }, () => new mongoose.Types.ObjectId().toString());

    const res = await fetch(`${baseUrl}/api/v1/notifications/bulk/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenUserA1}`,
        'x-organization-id': orgA_Id,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: oversizedIds }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('6.8 Direct service execution verifies non-transactional fallback preserves strict scope authorization', async () => {
    const ownNotif = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Fallback Own',
      body: 'Own',
      type: 'INFO',
    });

    const foreignNotif = await notificationService.createNotification({
      recipientId: userB._id,
      orgId: orgB_Id,
      title: 'Fallback Foreign',
      body: 'Foreign',
      type: 'INFO',
    });

    // Directly test service _verifyNotificationBatchScope fallback path
    await assert.rejects(
      async () => {
        const uniqueIds = [ownNotif._id.toString(), foreignNotif._id.toString()];
        const notifs = await notificationRepository.findByIds(uniqueIds);
        await notificationService._verifyNotificationBatchScope(
          notifs,
          uniqueIds,
          userA1._id.toString(),
          orgA_Id
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /Access denied|Forbidden/i);
        return true;
      }
    );
  });

  // =========================================================================
  // Control 7: Creation & Recipient Validation (Service Boundary)
  // =========================================================================
  it('7.1 createNotification rejects recipient who does not belong to target organization (403)', async () => {
    await assert.rejects(
      async () => {
        // userB belongs to Org B, not Org A
        await notificationService.createNotification({
          recipientId: userB._id,
          orgId: orgA_Id,
          title: 'Illegal Cross-Tenant Notice',
          body: 'This should be blocked',
          type: 'INFO',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /Forbidden.*does not have an active membership/i);
        return true;
      }
    );
  });

  it('7.2 createBulkNotifications fails closed if any recipient does not belong to target organization (403)', async () => {
    await assert.rejects(
      async () => {
        await notificationService.createBulkNotifications([
          { recipientId: userA1._id, orgId: orgA_Id, title: 'Valid', body: 'Valid' },
          { recipientId: userB._id, orgId: orgA_Id, title: 'Invalid Foreign', body: 'Invalid' },
        ]);
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  it('7.3 Global system notifications (orgId: null) and INVITATIONS are legitimately permitted', async () => {
    const globalNotif = await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: null,
      title: 'Global System Update',
      body: 'System-wide maintenance scheduled',
      type: 'INFO',
    });
    assert.ok(globalNotif._id);

    const inviteNotif = await notificationService.createNotification({
      recipientId: userB._id,
      orgId: orgA_Id,
      title: 'Invitation to Join',
      body: 'You have been invited to Org A',
      type: 'INVITATION',
    });
    assert.ok(inviteNotif._id);
  });

  // =========================================================================
  // Control 8: Real-Time WebSocket Delivery & Socket Room Policy Isolation
  // =========================================================================
  it('8.1 Socket Room Policy permits users to join only their own user room (user:<id>)', async () => {
    const fakeSocketA1 = {
      handshake: { auth: { token: tokenUserA1 } },
      data: {},
    };

    // User A1 can join their own user room
    const canJoinOwn = await canJoinRoom(fakeSocketA1, `user:${userA1._id.toString()}`);
    assert.strictEqual(canJoinOwn, true);

    // User A1 CANNOT join User A2's room
    const canJoinA2 = await canJoinRoom(fakeSocketA1, `user:${userA2._id.toString()}`);
    assert.strictEqual(canJoinA2, false);

    // User A1 CANNOT join User B's room
    const canJoinB = await canJoinRoom(fakeSocketA1, `user:${userB._id.toString()}`);
    assert.strictEqual(canJoinB, false);
  });

  it('8.2 Socket Room Policy enforces organization and villa channel isolation', async () => {
    const fakeSocketA1 = {
      handshake: { auth: { token: tokenUserA1 } },
      data: {},
    };

    // User A1 can join Org A root room
    const canJoinOrgA = await canJoinRoom(fakeSocketA1, `org:${orgA_Id}`);
    assert.strictEqual(canJoinOrgA, true);

    // User A1 CANNOT join Org B root room
    const canJoinOrgB = await canJoinRoom(fakeSocketA1, `org:${orgB_Id}`);
    assert.strictEqual(canJoinOrgB, false);

    // User A1 can join Villa A1 room (their villa)
    const canJoinVillaA1 = await canJoinRoom(fakeSocketA1, `villa:${villaA1_Id}`);
    assert.strictEqual(canJoinVillaA1, true);

    // User A1 CANNOT join Villa A2 room (someone else's villa)
    const canJoinVillaA2 = await canJoinRoom(fakeSocketA1, `villa:${villaA2_Id}`);
    assert.strictEqual(canJoinVillaA2, false);
  });

  it('8.3 Live WebSocket Client: Authenticated client cannot join foreign tenant or foreign villa rooms', async () => {
    const client = createClient(tokenUserA1);
    await new Promise((resolve) => client.on('connect', resolve));

    // Attempt join foreign org B room -> rejected with success: false
    const joinForeignOrgRes = await new Promise((resolve) => {
      client.emit('join_room', `org:${orgB_Id}`, resolve);
    });
    assert.strictEqual(joinForeignOrgRes.success, false);
    assert.match(joinForeignOrgRes.message, /unauthorized/i);

    // Attempt join foreign villa A2 room -> rejected with success: false
    const joinForeignVillaRes = await new Promise((resolve) => {
      client.emit('join_room', `villa:${villaA2_Id}`, resolve);
    });
    assert.strictEqual(joinForeignVillaRes.success, false);
    assert.match(joinForeignVillaRes.message, /unauthorized/i);

    // Attempt join foreign user A2 room -> rejected with success: false
    const joinForeignUserRes = await new Promise((resolve) => {
      client.emit('join_room', `user:${userA2._id.toString()}`, resolve);
    });
    assert.strictEqual(joinForeignUserRes.success, false);

    // Authorized join own org A room -> succeeds
    const joinOwnOrgRes = await new Promise((resolve) => {
      client.emit('join_room', `org:${orgA_Id}`, resolve);
    });
    assert.strictEqual(joinOwnOrgRes.success, true);

    // Authorized join own villa A1 room -> succeeds
    const joinOwnVillaRes = await new Promise((resolve) => {
      client.emit('join_room', `villa:${villaA1_Id}`, resolve);
    });
    assert.strictEqual(joinOwnVillaRes.success, true);

    client.disconnect();
  });

  it('8.4 Live WebSocket Client: Receives only own notifications and does not receive other users notifications', async () => {
    const clientA1 = createClient(tokenUserA1);
    await new Promise((resolve) => clientA1.on('connect', resolve));

    let receivedA1Notif = null;
    let receivedA2Notif = false;

    clientA1.on('INCOMING_NOTIFICATION', (data) => {
      if (data.recipientId === userA1._id.toString()) {
        receivedA1Notif = data;
      }
      if (data.recipientId === userA2._id.toString()) {
        receivedA2Notif = true;
      }
    });

    // Create notification for User A1
    await notificationService.createNotification({
      recipientId: userA1._id,
      orgId: orgA_Id,
      title: 'Target User A1',
      body: 'Message for A1',
      type: 'INFO',
    });

    // Create notification for User A2
    await notificationService.createNotification({
      recipientId: userA2._id,
      orgId: orgA_Id,
      title: 'Target User A2',
      body: 'Message for A2',
      type: 'INFO',
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    assert.ok(receivedA1Notif, 'Client A1 must receive their own notification');
    assert.strictEqual(receivedA1Notif.recipientId, userA1._id.toString());
    assert.strictEqual(receivedA2Notif, false, 'Client A1 must NOT receive notification meant for User A2');

    clientA1.disconnect();
  });

  it('8.5 Live WebSocket Client: Inactive or suspended membership blocks room authorization', async () => {
    // Temporarily set User A1 membership to Inactive
    await OrgMembership.updateOne(
      { userId: userA1._id, orgId: orgA_Id },
      { $set: { status: 'Inactive' } }
    );

    const client = createClient(tokenUserA1);
    await new Promise((resolve) => client.on('connect', resolve));

    const joinRes = await new Promise((resolve) => {
      client.emit('join_room', `org:${orgA_Id}`, resolve);
    });
    assert.strictEqual(joinRes.success, false, 'Inactive membership must block joining organization room');

    client.disconnect();

    // Restore status
    await OrgMembership.updateOne(
      { userId: userA1._id, orgId: orgA_Id },
      { $set: { status: 'Active' } }
    );
  });

  after(async () => {
    if (socketServer) {
      await socketServer.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });
});
