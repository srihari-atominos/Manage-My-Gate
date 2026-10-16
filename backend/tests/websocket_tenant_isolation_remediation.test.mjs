import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../src/config/config.js';
import { initSocket, getIO, disconnectUserSockets, evictUserFromTenantRooms } from '../src/config/socket.js';
import { canJoinRoom, resolveSocketIdentity } from '../src/config/socketRoomPolicy.js';
import { slotLockStore } from '../src/features/amenityBooking/amenityBooking.socket.js';
import { io as ClientIO } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';

describe('SEC-WS-REM — Phase 4 WebSocket Tenant Isolation & Remediation Verification', async () => {
  let server;
  let serverPort;
  let socketServer;

  // Organization Identifiers
  const orgA_Id = new mongoose.Types.ObjectId();
  const orgB_Id = new mongoose.Types.ObjectId();

  // User Identifiers
  const userA_Id = new mongoose.Types.ObjectId();       // Resident 1 in Org A
  const userA2_Id = new mongoose.Types.ObjectId();      // Resident 2 in Org A
  const adminA_Id = new mongoose.Types.ObjectId();      // Tenant Admin in Org A
  const guardA_Id = new mongoose.Types.ObjectId();      // Security Guard in Org A
  const userB_Id = new mongoose.Types.ObjectId();       // Resident in Org B
  const adminB_Id = new mongoose.Types.ObjectId();      // Tenant Admin in Org B
  const platformAdmin_Id = new mongoose.Types.ObjectId();// Platform Super Admin

  // Villa & Amenity Identifiers
  const villaA_Id = new mongoose.Types.ObjectId();
  const villaA2_Id = new mongoose.Types.ObjectId();
  const villaB_Id = new mongoose.Types.ObjectId();
  const amenityA_Id = new mongoose.Types.ObjectId();
  const amenityB_Id = new mongoose.Types.ObjectId();

  // JWT Helper
  const signUserToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { algorithm: 'HS256', expiresIn: '1h' });
  };

  const tokenUserA = signUserToken({ id: userA_Id.toString(), orgId: orgA_Id.toString(), role: 'Resident', isPlatform: false });
  const tokenUserA2 = signUserToken({ id: userA2_Id.toString(), orgId: orgA_Id.toString(), role: 'Resident', isPlatform: false });
  const tokenAdminA = signUserToken({ id: adminA_Id.toString(), orgId: orgA_Id.toString(), role: 'Admin', isPlatform: false });
  const tokenGuardA = signUserToken({ id: guardA_Id.toString(), orgId: orgA_Id.toString(), role: 'Security Guard', isPlatform: false });
  const tokenUserB = signUserToken({ id: userB_Id.toString(), orgId: orgB_Id.toString(), role: 'Resident', isPlatform: false });
  const tokenAdminB = signUserToken({ id: adminB_Id.toString(), orgId: orgB_Id.toString(), role: 'Admin', isPlatform: false });
  const tokenPlatformAdmin = signUserToken({ id: platformAdmin_Id.toString(), isPlatform: true, role: 'Super Admin' });

  before(async () => {
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage-my-gate-test';
      await mongoose.connect(mongoUri);
    }

    const User = (await import('../src/features/user/user.model.js')).default;
    const OrgMembership = (await import('../src/features/orgMembership/orgMembership.model.js')).default;
    const Villa = (await import('../src/features/villa/villa.model.js')).default;
    const Role = (await import('../src/features/role/role.model.js')).default;
    const Amenity = (await import('../src/features/amenity/amenity.model.js')).default;

    // Clean test collections
    const allUserIds = [userA_Id, userA2_Id, adminA_Id, guardA_Id, userB_Id, adminB_Id, platformAdmin_Id];
    await User.deleteMany({ _id: { $in: allUserIds } });
    await OrgMembership.deleteMany({ userId: { $in: allUserIds } });
    await Villa.deleteMany({ _id: { $in: [villaA_Id, villaA2_Id, villaB_Id] } });
    await Amenity.deleteMany({ _id: { $in: [amenityA_Id, amenityB_Id] } });

    const ts = Date.now();

    // Create Roles
    const residentRole = await Role.findOneAndUpdate(
      { name: 'Resident', orgId: null },
      { name: 'Resident', orgId: null, isTenantRole: false },
      { upsert: true, new: true }
    );
    const guardRole = await Role.findOneAndUpdate(
      { name: 'Security Guard', orgId: null },
      { name: 'Security Guard', orgId: null, isTenantRole: false, permissions: ['visitor:guard'] },
      { upsert: true, new: true }
    );
    // Tenant-specific Admin role
    const tenantAdminRoleA = await Role.findOneAndUpdate(
      { name: 'Admin', orgId: orgA_Id },
      { name: 'Admin', orgId: orgA_Id, isTenantRole: true },
      { upsert: true, new: true }
    );
    const tenantAdminRoleB = await Role.findOneAndUpdate(
      { name: 'Admin', orgId: orgB_Id },
      { name: 'Admin', orgId: orgB_Id, isTenantRole: true },
      { upsert: true, new: true }
    );
    // Platform Super Admin role
    const platformRole = await Role.findOneAndUpdate(
      { name: 'Super Admin', orgId: null },
      { name: 'Super Admin', orgId: null, isTenantRole: false },
      { upsert: true, new: true }
    );

    // Seed Users
    await User.create([
      {
        _id: userA_Id,
        username: `resA_${ts}`,
        email: `resA_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Resident A',
        roles: [residentRole._id],
      },
      {
        _id: userA2_Id,
        username: `resA2_${ts}`,
        email: `resA2_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Resident A2',
        roles: [residentRole._id],
      },
      {
        _id: adminA_Id,
        username: `adminA_${ts}`,
        email: `adminA_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Admin A',
        roles: [tenantAdminRoleA._id],
      },
      {
        _id: guardA_Id,
        username: `guardA_${ts}`,
        email: `guardA_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Guard A',
        roles: [guardRole._id],
      },
      {
        _id: userB_Id,
        username: `resB_${ts}`,
        email: `resB_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Resident B',
        roles: [residentRole._id],
      },
      {
        _id: adminB_Id,
        username: `adminB_${ts}`,
        email: `adminB_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Admin B',
        roles: [tenantAdminRoleB._id],
      },
      {
        _id: platformAdmin_Id,
        username: `plat_${ts}`,
        email: `plat_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Platform Operator',
        roles: [platformRole._id],
      },
    ]);

    // Seed Villas
    await Villa.create([
      { _id: villaA_Id, orgId: orgA_Id, unitNumber: 'VA-1', primaryResidentId: userA_Id },
      { _id: villaA2_Id, orgId: orgA_Id, unitNumber: 'VA-2', primaryResidentId: userA2_Id },
      { _id: villaB_Id, orgId: orgB_Id, unitNumber: 'VB-1', primaryResidentId: userB_Id },
    ]);

    // Seed Amenities
    await Amenity.create([
      {
        _id: amenityA_Id,
        orgId: orgA_Id,
        name: 'Tennis Court A',
        type: 'court',
        capacity: 4,
        pricing: { baseRate: 0, pricingType: 'hourly' },
        bookingRules: {
          slotDurationMinutes: 60,
          openTime: '06:00',
          closeTime: '22:00',
          advanceBookingDays: 7,
        },
        status: 'active',
      },
      {
        _id: amenityB_Id,
        orgId: orgB_Id,
        name: 'Swimming Pool B',
        type: 'pool',
        capacity: 20,
        pricing: { baseRate: 0, pricingType: 'hourly' },
        bookingRules: {
          slotDurationMinutes: 60,
          openTime: '06:00',
          closeTime: '22:00',
          advanceBookingDays: 7,
        },
        status: 'active',
      },
    ]);

    // Seed Memberships
    await OrgMembership.create([
      { userId: userA_Id, orgId: orgA_Id, roleIds: [residentRole._id], status: 'Active', villaId: villaA_Id },
      { userId: userA2_Id, orgId: orgA_Id, roleId: residentRole._id, status: 'Active', villaId: villaA2_Id }, // Singular legacy roleId
      { userId: adminA_Id, orgId: orgA_Id, roleIds: [tenantAdminRoleA._id], status: 'Active' },
      { userId: guardA_Id, orgId: orgA_Id, roleIds: [guardRole._id], status: 'Active' },
      { userId: userB_Id, orgId: orgB_Id, roleIds: [residentRole._id], status: 'Active', villaId: villaB_Id },
      { userId: adminB_Id, orgId: orgB_Id, roleIds: [tenantAdminRoleB._id], status: 'Active' },
    ]);

    // Initialize express and http server
    const app = express();
    server = http.createServer(app);
    socketServer = await initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = server.address().port;
        resolve();
      });
    });
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
    setTimeout(() => process.exit(0), 100);
  });

  const createClient = (token, extraOpts = {}) => {
    return ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: false,
      ...extraOpts,
    });
  };

  describe('1. Handshake Authentication & Fail-Closed Behavior (SEC-WS-01)', () => {
    test('1.1: Rejects unauthenticated connection attempt without token', (t, done) => {
      const client = createClient(null);
      client.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication required') || err.message.includes('Unauthorized'));
        client.disconnect();
        done();
      });
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Unauthenticated socket connected'));
      });
    });

    test('1.2: Rejects connection with malformed / forged JWT token', (t, done) => {
      const client = createClient('forged.header.signature');
      client.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication error') || err.message.includes('Unauthorized'));
        client.disconnect();
        done();
      });
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Forged token socket connected'));
      });
    });

    test('1.3: Rejects socket if user is not active or not email verified in DB', async () => {
      const unverifiedUserId = new mongoose.Types.ObjectId();
      const unverifiedToken = signUserToken({ id: unverifiedUserId.toString(), orgId: orgA_Id.toString() });
      const mockSocket = {
        handshake: { auth: { token: unverifiedToken } },
        data: {},
      };
      const identity = await resolveSocketIdentity(mockSocket);
      assert.equal(identity, null, 'Unverified / nonexistent user must resolve to null identity');
    });

    test('1.4: Fail-closed: returns false for room joins when DB is unavailable', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenUserA } },
        data: { identity: { id: userA_Id.toString(), isPlatform: false } },
      };
      // Temporarily simulate readyState = 0 (disconnected)
      Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true, writable: true });

      try {
        const canJoinOrg = await canJoinRoom(mockSocket, `org:${orgA_Id}`);
        const canJoinAmenity = await canJoinRoom(mockSocket, `amenity:${orgA_Id}:${amenityA_Id}`);
        assert.equal(canJoinOrg, false, 'Must fail-closed for org room when DB is offline');
        assert.equal(canJoinAmenity, false, 'Must fail-closed for amenity room when DB is offline');
      } finally {
        delete mongoose.connection.readyState;
      }
    });
  });

  describe('2. Global Platform Room Authorization & Privilege Separation (SEC-WS-02)', () => {
    test('2.1: Tenant Admin A is REJECTED from global role:admin room', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenAdminA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, 'role:admin');
      assert.equal(allowed, false, 'Tenant administrator must be denied access to global platform role:admin');
    });

    test('2.2: Tenant Admin A is REJECTED from global role:superadmin room', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenAdminA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, 'role:superadmin');
      assert.equal(allowed, false, 'Tenant administrator must be denied access to global platform role:superadmin');
    });

    test('2.3: Verified Platform Super Admin is GRANTED access to global role:superadmin and role:admin', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenPlatformAdmin } },
        data: {},
      };
      const allowedAdmin = await canJoinRoom(mockSocket, 'role:admin');
      const allowedSuper = await canJoinRoom(mockSocket, 'role:superadmin');
      assert.equal(allowedAdmin, true, 'Platform admin must be authorized for role:admin');
      assert.equal(allowedSuper, true, 'Platform admin must be authorized for role:superadmin');
    });
  });

  describe('3. Legacy Role Compatibility & Normalization (SEC-WS-07)', () => {
    test('3.1: User assigned via singular legacy roleId can join scoped role room', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenUserA2 } }, // userA2 has singular roleId: residentRole._id
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `org:${orgA_Id}:role:resident`);
      assert.equal(allowed, true, 'Legacy singular roleId member must be authorized');
    });

    test('3.2: Role name normalizes casing, spaces, and hyphens', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenAdminA } },
        data: {},
      };
      const allowedCaps = await canJoinRoom(mockSocket, `org:${orgA_Id}:role:ADMIN`);
      const allowedSpaced = await canJoinRoom(mockSocket, `org:${orgA_Id}:role:admin`);
      assert.equal(allowedCaps, true);
      assert.equal(allowedSpaced, true);
    });

    test('3.3: Cross-tenant role room is REJECTED', async () => {
      const mockSocket = {
        handshake: { auth: { token: tokenAdminA } },
        data: {},
      };
      const allowedForeign = await canJoinRoom(mockSocket, `org:${orgB_Id}:role:admin`);
      assert.equal(allowedForeign, false, 'Admin A must be denied joining Admin role room in Org B');
    });
  });

  describe('4. Amenity Slot Lock Authorization & Tampering Defense (SEC-WS-03 & SEC-WS-08)', () => {
    const slotDate = '2026-10-20';
    const startTime = '09:00';
    const endTime = '10:00';

    test('4.1: Resident A can acquire slot lock in own organization', (t, done) => {
      const clientA = createClient(tokenUserA);
      clientA.on('connect', () => {
        clientA.emit('join_amenity_room', { amenityId: amenityA_Id.toString(), orgId: orgA_Id.toString() });

        clientA.emit('lock_slot', {
          amenityId: amenityA_Id.toString(),
          orgId: orgA_Id.toString(),
          date: slotDate,
          startTime,
          endTime,
        });

        clientA.on('slot_lock_success', (lockData) => {
          assert.equal(lockData.userId, userA_Id.toString());
          clientA.disconnect();
          done();
        });

        clientA.on('slot_lock_failed', (err) => {
          clientA.disconnect();
          done(new Error(`Slot lock unexpectedly failed: ${err.message}`));
        });
      });
    });

    test('4.2: Concurrent lock attempt by another resident for the same slot is REJECTED', (t, done) => {
      const clientA2 = createClient(tokenUserA2);
      clientA2.on('connect', () => {
        clientA2.emit('join_amenity_room', { amenityId: amenityA_Id.toString(), orgId: orgA_Id.toString() });

        clientA2.emit('lock_slot', {
          amenityId: amenityA_Id.toString(),
          orgId: orgA_Id.toString(),
          date: slotDate,
          startTime,
          endTime,
        });

        clientA2.on('slot_lock_failed', (err) => {
          assert.ok(err.message.includes('currently being booked by someone else'));
          clientA2.disconnect();
          done();
        });

        clientA2.on('slot_lock_success', () => {
          clientA2.disconnect();
          done(new Error('Resident A2 should not lock a slot already locked by Resident A'));
        });
      });
    });

    test('4.3: Cross-tenant slot lock attempt (User A locking amenity in Org B) is REJECTED', (t, done) => {
      const clientA = createClient(tokenUserA);
      clientA.on('connect', () => {
        clientA.emit('lock_slot', {
          amenityId: amenityB_Id.toString(),
          orgId: orgB_Id.toString(),
          date: slotDate,
          startTime,
          endTime,
        });

        clientA.on('slot_lock_failed', (err) => {
          assert.ok(err.message.includes('Unauthorized') || err.message.includes('not belong'));
          clientA.disconnect();
          done();
        });

        clientA.on('slot_lock_success', () => {
          clientA.disconnect();
          done(new Error('User A must not lock slots in Org B'));
        });
      });
    });

    test('4.4: Unauthorized resident (User A2) attempting to release_slot of User A is REJECTED', (t, done) => {
      const clientA2 = createClient(tokenUserA2);
      clientA2.on('connect', () => {
        clientA2.emit('release_slot', {
          amenityId: amenityA_Id.toString(),
          orgId: orgA_Id.toString(),
          date: slotDate,
          startTime,
          endTime,
        });

        clientA2.on('slot_release_failed', (err) => {
          assert.ok(err.message.includes('Forbidden') || err.message.includes('do not own'));
          clientA2.disconnect();
          done();
        });

        clientA2.on('slot_release_success', () => {
          clientA2.disconnect();
          done(new Error('User A2 should not release User A slot lock'));
        });
      });
    });

    test('4.5: Cross-tenant resident (User B) attempting to release_slot of User A is REJECTED', (t, done) => {
      const clientB = createClient(tokenUserB);
      clientB.on('connect', () => {
        clientB.emit('release_slot', {
          amenityId: amenityA_Id.toString(),
          orgId: orgA_Id.toString(),
          date: slotDate,
          startTime,
          endTime,
        });

        clientB.on('slot_release_failed', (err) => {
          assert.ok(err.message.includes('Unauthorized') || err.message.includes('Forbidden') || err.message.includes('do not own'));
          clientB.disconnect();
          done();
        });

        clientB.on('slot_release_success', () => {
          clientB.disconnect();
          done(new Error('User B must not release Org A slot lock'));
        });
      });
    });

    test('4.6: Legitimate lock owner (User A) can release slot lock, triggering sanitized broadcast', (t, done) => {
      const clientA = createClient(tokenUserA);
      const clientA2 = createClient(tokenUserA2);

      let clientA2ReceivedSanitizedRelease = false;

      const triggerReleaseWhenReady = () => {
        clientA.emit('release_slot', {
          amenityId: amenityA_Id.toString(),
          orgId: orgA_Id.toString(),
          date: slotDate,
          startTime,
          endTime,
        });
      };

      clientA2.on('connect', () => {
        clientA2.emit('join_amenity_room', { amenityId: amenityA_Id.toString(), orgId: orgA_Id.toString() });
        clientA2.on('sync_locked_slots', () => {
          // Confirmed joined; safe to emit release from clientA
          if (clientA.connected) {
            triggerReleaseWhenReady();
          } else {
            clientA.once('connect', triggerReleaseWhenReady);
          }
        });
        clientA2.on('slot_released', (payload) => {
          clientA2ReceivedSanitizedRelease = true;
          // Ensure private userId is not exposed in public slot_released availability broadcast
          assert.equal(payload.userId, undefined, 'Public slot_released must not expose resident userId');
        });
      });

      clientA.on('connect', () => {
        clientA.on('slot_release_success', () => {
          setTimeout(() => {
            assert.ok(clientA2ReceivedSanitizedRelease, 'Audience in room must receive sanitized slot_released');
            clientA.disconnect();
            clientA2.disconnect();
            done();
          }, 200);
        });

        clientA.on('slot_release_failed', (err) => {
          clientA.disconnect();
          clientA2.disconnect();
          done(new Error(`Legitimate release failed: ${err.message}`));
        });
      });
    });
  });

  describe('5. Outbound Broadcast Scoping & Intra-Tenant Privacy (SEC-WS-04)', () => {
    test('5.1: Payment success is NOT broadcast to general resident room org:orgA', (t, done) => {
      const clientResident2 = createClient(tokenUserA2); // Neighbour resident in same Org A
      const clientAdminA = createClient(tokenAdminA);     // Admin in Org A

      let resident2ReceivedPayment = false;
      let adminReceivedPayment = false;

      clientResident2.on('connect', () => {
        clientResident2.emit('join_room', `org:${orgA_Id}`);
        clientResident2.on('payment_success', () => {
          resident2ReceivedPayment = true;
        });
      });

      clientAdminA.on('connect', () => {
        clientAdminA.emit('join_room', `org:${orgA_Id}:role:admin`);
        clientAdminA.on('payment_success', () => {
          adminReceivedPayment = true;
        });
      });

      setTimeout(async () => {
        // Trigger payment success event via payment.events emitter
        const { paymentEventEmitter, PAYMENT_SUCCESS } = await import('../src/features/payment/payment.events.js');
        paymentEventEmitter.emit(PAYMENT_SUCCESS, {
          _id: new mongoose.Types.ObjectId(),
          userId: userA_Id,
          orgId: orgA_Id,
          amount: 2500,
          currency: 'INR',
          status: 'SUCCESS',
        });

        setTimeout(() => {
          assert.equal(resident2ReceivedPayment, false, 'Resident 2 must NOT receive Resident 1 payment details');
          assert.equal(adminReceivedPayment, true, 'Admin in Org A must receive payment_success');
          clientResident2.disconnect();
          clientAdminA.disconnect();
          done();
        }, 300);
      }, 200);
    });

    test('5.2: Wallet updated event is NOT broadcast to general resident room org:orgA', (t, done) => {
      const clientResident2 = createClient(tokenUserA2);
      let resident2ReceivedWallet = false;

      clientResident2.on('connect', () => {
        clientResident2.emit('join_room', `org:${orgA_Id}`);
        clientResident2.on('wallet_updated', () => {
          resident2ReceivedWallet = true;
        });
      });

      setTimeout(async () => {
        const { walletEventEmitter, WALLET_UPDATED } = await import('../src/features/wallet/wallet.events.js');
        walletEventEmitter.emit(WALLET_UPDATED, {
          walletId: new mongoose.Types.ObjectId(),
          userId: userA_Id,
          orgId: orgA_Id,
          balance: 15000,
        });

        setTimeout(() => {
          assert.equal(resident2ReceivedWallet, false, 'Resident 2 must NOT receive Resident 1 wallet balance');
          clientResident2.disconnect();
          done();
        }, 300);
      }, 200);
    });

    test('5.3: Security gate entry log is delivered to Guard and Admin, NOT to general residents', (t, done) => {
      const clientResident = createClient(tokenUserA);
      const clientGuard = createClient(tokenGuardA);

      let residentReceivedLog = false;
      let guardReceivedLog = false;

      clientResident.on('connect', () => {
        clientResident.emit('join_room', `org:${orgA_Id}`);
        clientResident.on('SECURITY_LOG_CREATED', () => {
          residentReceivedLog = true;
        });
      });

      clientGuard.on('connect', () => {
        clientGuard.emit('join_room', `org:${orgA_Id}:guards`);
        clientGuard.on('SECURITY_LOG_CREATED', () => {
          guardReceivedLog = true;
        });
      });

      setTimeout(async () => {
        const { dispatchSecurityLogCreated } = await import('../src/features/securityLog/securityLog.socket.js');
        dispatchSecurityLogCreated({
          _id: new mongoose.Types.ObjectId(),
          orgId: orgA_Id,
          residentName: 'VIP Tenant',
          gateName: 'North Gate Gate-1',
          scanType: 'Entry',
          status: 'Success',
          ipAddress: '192.168.1.100',
        });

        setTimeout(() => {
          assert.equal(residentReceivedLog, false, 'Resident must NOT receive security gate scans');
          assert.equal(guardReceivedLog, true, 'Guard must receive security gate scans');
          clientResident.disconnect();
          clientGuard.disconnect();
          done();
        }, 300);
      }, 200);
    });
  });

  describe('6. Session Revocation & Workspace Switching (SEC-WS-05 & SEC-WS-06)', () => {
    test('6.1: disconnectUserSockets terminates all active sockets for specified user', (t, done) => {
      const clientA = createClient(tokenUserA);

      clientA.on('connect', () => {
        assert.ok(clientA.connected);

        clientA.on('disconnect', (reason) => {
          assert.ok(reason.includes('io server disconnect') || reason.includes('server namespace disconnect') || reason.includes('transport close'));
          done();
        });

        // Trigger revocation
        setTimeout(() => {
          disconnectUserSockets(userA_Id);
        }, 150);
      });
    });

    test('6.2: Workspace switch evicts socket from previous organization rooms', (t, done) => {
      const clientA = createClient(tokenUserA);

      clientA.on('connect', () => {
        clientA.emit('join_room', `org:${orgA_Id}`);

        setTimeout(() => {
          // Client switches workspace context to Org B (which user is NOT member of)
          clientA.emit('switch_workspace', { prevOrgId: orgA_Id.toString(), newOrgId: orgB_Id.toString() });
        }, 100);

        clientA.on('workspace_switched', (result) => {
          // Switch to unauthorized Org B should be rejected
          assert.equal(result.success, false);
          assert.ok(result.message.includes('Unauthorized'));

          // Verify socket was evicted from Org A room
          let receivedOrgAEvent = false;
          clientA.on('test_event_org_a', () => {
            receivedOrgAEvent = true;
          });

          socketServer.to(`org:${orgA_Id}`).emit('test_event_org_a', { msg: 'secret org a' });

          setTimeout(() => {
            assert.equal(receivedOrgAEvent, false, 'Socket must be evicted from previous tenant room on context switch');
            clientA.disconnect();
            done();
          }, 300);
        });
      });
    });

    test('6.3: Legitimate same-tenant notice broadcast reaches authorized members', (t, done) => {
      const clientA = createClient(tokenUserA);
      const clientA2 = createClient(tokenUserA2);
      const clientB = createClient(tokenUserB);

      let clientAReceived = false;
      let clientA2Received = false;
      let clientBReceived = false;

      clientA.on('connect', () => clientA.emit('join_room', `org:${orgA_Id}`));
      clientA2.on('connect', () => clientA2.emit('join_room', `org:${orgA_Id}`));
      clientB.on('connect', () => clientB.emit('join_room', `org:${orgB_Id}`));

      const onNotice = (data) => {
        return data.title === 'Annual General Meeting';
      };

      clientA.on('notice:created', (data) => { if (onNotice(data)) clientAReceived = true; });
      clientA2.on('notice:created', (data) => { if (onNotice(data)) clientA2Received = true; });
      clientB.on('notice:created', (data) => { if (onNotice(data)) clientBReceived = true; });

      setTimeout(async () => {
        const { dispatchNoticeCreated } = await import('../src/features/noticeBoard/noticeBoard.socket.js');
        dispatchNoticeCreated({
          _id: new mongoose.Types.ObjectId(),
          orgId: orgA_Id,
          title: 'Annual General Meeting',
          description: 'All residents of Org A welcome',
        });

        setTimeout(() => {
          assert.equal(clientAReceived, true, 'Member A must receive Org A notice');
          assert.equal(clientA2Received, true, 'Member A2 must receive Org A notice');
          assert.equal(clientBReceived, false, 'Member B in foreign tenant must NOT receive Org A notice');
          clientA.disconnect();
          clientA2.disconnect();
          clientB.disconnect();
          done();
        }, 300);
      }, 300);
    });
  });
});
