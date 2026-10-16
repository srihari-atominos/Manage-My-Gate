import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../src/config/config.js';
import { initSocket, getIO } from '../src/config/socket.js';
import { canJoinRoom, resolveSocketIdentity } from '../src/config/socketRoomPolicy.js';
import { io as ClientIO } from 'socket.io-client';

describe('SEC-03.1 — Real-Time WebSocket Tenant Isolation Suite', async () => {
  let server;
  let serverPort;
  let socketServer;

  // Test Entities
  const orgA_Id = new mongoose.Types.ObjectId();
  const orgB_Id = new mongoose.Types.ObjectId();
  const userA_Id = new mongoose.Types.ObjectId();
  const userB_Id = new mongoose.Types.ObjectId();
  const platformAdmin_Id = new mongoose.Types.ObjectId();
  const villaA_Id = new mongoose.Types.ObjectId();
  const villaB_Id = new mongoose.Types.ObjectId();
  const amenityA_Id = new mongoose.Types.ObjectId();

  // Create JWTs
  const tokenUserA = jwt.sign(
    { id: userA_Id.toString(), orgId: orgA_Id.toString(), role: 'Resident', isPlatform: false },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const tokenUserB = jwt.sign(
    { id: userB_Id.toString(), orgId: orgB_Id.toString(), role: 'Resident', isPlatform: false },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const tokenPlatformAdmin = jwt.sign(
    { id: platformAdmin_Id.toString(), isPlatform: true, role: 'Super Admin' },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  before(async () => {
    // Connect Mongo if not connected
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage-my-gate-test';
      await mongoose.connect(mongoUri);
    }

    // Seed test collections
    const User = (await import('../src/features/user/user.model.js')).default;
    const OrgMembership = (await import('../src/features/orgMembership/orgMembership.model.js')).default;
    const Villa = (await import('../src/features/villa/villa.model.js')).default;
    const Role = (await import('../src/features/role/role.model.js')).default;

    // Clean test records
    await User.deleteMany({ _id: { $in: [userA_Id, userB_Id, platformAdmin_Id] } });
    await OrgMembership.deleteMany({ userId: { $in: [userA_Id, userB_Id, platformAdmin_Id] } });
    await Villa.deleteMany({ _id: { $in: [villaA_Id, villaB_Id] } });

    const ts = Date.now();
    const emailA = `usera_${ts}@test.local`;
    const emailB = `userb_${ts}@test.local`;
    const emailPlat = `platform_${ts}@test.local`;

    // Seed users (Active and email verified)
    await User.create([
      {
        _id: userA_Id,
        username: `userA_ws_${ts}`,
        email: emailA,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Resident A',
      },
      {
        _id: userB_Id,
        username: `userB_ws_${ts}`,
        email: emailB,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Resident B',
      },
      {
        _id: platformAdmin_Id,
        username: `platform_ws_${ts}`,
        email: emailPlat,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'Platform Super Admin',
      },
    ]);

    // Seed Roles
    const residentRole = await Role.findOneAndUpdate(
      { name: 'Resident', orgId: null },
      { name: 'Resident', orgId: null },
      { upsert: true, new: true }
    );

    const guardRole = await Role.findOneAndUpdate(
      { name: 'Security Guard', orgId: null },
      { name: 'Security Guard', orgId: null },
      { upsert: true, new: true }
    );

    // Seed Villas
    await Villa.create([
      {
        _id: villaA_Id,
        orgId: orgA_Id,
        unitNumber: 'A-101',
        primaryResidentId: userA_Id,
      },
      {
        _id: villaB_Id,
        orgId: orgB_Id,
        unitNumber: 'B-202',
        primaryResidentId: userB_Id,
      },
    ]);

    // Seed Memberships
    await OrgMembership.create([
      {
        userId: userA_Id,
        orgId: orgA_Id,
        roleIds: [residentRole._id],
        status: 'Active',
        villaId: villaA_Id,
      },
      {
        userId: userB_Id,
        orgId: orgB_Id,
        roleIds: [residentRole._id],
        status: 'Active',
        villaId: villaB_Id,
      },
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
  });

  // Helper client creator
  const createClient = (token, extraOpts = {}) => {
    return ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: false,
      ...extraOpts,
    });
  };

  describe('1. Handshake Authentication & Identity Resolution', () => {
    test('1.1: Handshake rejects unauthenticated connection without token', (t, done) => {
      const client = createClient(null);
      client.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication required') || err.message.includes('Unauthorized'));
        client.disconnect();
        done();
      });
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Unauthenticated client should not connect'));
      });
    });

    test('1.2: Handshake rejects connection with forged/invalid JWT', (t, done) => {
      const client = createClient('invalid.jwt.token');
      client.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication required') || err.message.includes('Unauthorized'));
        client.disconnect();
        done();
      });
      client.on('connect', () => {
        client.disconnect();
        done(new Error('Invalid token client should not connect'));
      });
    });

    test('1.3: Handshake accepts valid JWT for active user', (t, done) => {
      const client = createClient(tokenUserA);
      client.on('connect', () => {
        assert.ok(client.connected);
        client.disconnect();
        done();
      });
      client.on('connect_error', (err) => {
        done(err);
      });
    });
  });

  describe('2. Room Authorization & Cross-Tenant Boundary Enforcement', () => {
    test('2.1: User A can join own user room user:userA', async () => {
      const mockSocket = {
        id: 'sock_userA_1',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `user:${userA_Id}`);
      assert.equal(allowed, true);
    });

    test('2.2: User A is REJECTED from joining foreign user room user:userB', async () => {
      const mockSocket = {
        id: 'sock_userA_2',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `user:${userB_Id}`);
      assert.equal(allowed, false);
    });

    test('2.3: User A can join own organization room org:orgA', async () => {
      const mockSocket = {
        id: 'sock_userA_3',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `org:${orgA_Id}`);
      assert.equal(allowed, true);
    });

    test('2.4: User A is REJECTED from joining foreign organization room org:orgB', async () => {
      const mockSocket = {
        id: 'sock_userA_4',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `org:${orgB_Id}`);
      assert.equal(allowed, false);
    });

    test('2.5: User A (Resident) is REJECTED from joining guard room org:orgA:guards', async () => {
      const mockSocket = {
        id: 'sock_userA_5',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `org:${orgA_Id}:guards`);
      assert.equal(allowed, false);
    });

    test('2.6: User A (Resident) is REJECTED from joining admin role room org:orgA:role:admin', async () => {
      const mockSocket = {
        id: 'sock_userA_6',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `org:${orgA_Id}:role:admin`);
      assert.equal(allowed, false);
    });

    test('2.7: User A can join own resident role room org:orgA:role:resident', async () => {
      const mockSocket = {
        id: 'sock_userA_7',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `org:${orgA_Id}:role:resident`);
      assert.equal(allowed, true);
    });
  });

  describe('3. Unit, Villa, and Amenity Room Scoping', () => {
    test('3.1: User A can join own villa room villa:villaA', async () => {
      const mockSocket = {
        id: 'sock_userA_8',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `villa:${villaA_Id}`);
      assert.equal(allowed, true);
    });

    test('3.2: User A is REJECTED from joining foreign villa room villa:villaB', async () => {
      const mockSocket = {
        id: 'sock_userA_9',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `villa:${villaB_Id}`);
      assert.equal(allowed, false);
    });

    test('3.3: User A can join amenity room in own org amenity:orgA:amenityA', async () => {
      const mockSocket = {
        id: 'sock_userA_10',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `amenity:${orgA_Id}:${amenityA_Id}`);
      assert.equal(allowed, true);
    });

    test('3.4: User A is REJECTED from joining amenity room in foreign org amenity:orgB:amenityA', async () => {
      const mockSocket = {
        id: 'sock_userA_11',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, `amenity:${orgB_Id}:${amenityA_Id}`);
      assert.equal(allowed, false);
    });
  });

  describe('4. Platform Authorization & Default-Deny Policy', () => {
    test('4.1: Platform Super Admin can join any org room', async () => {
      const mockSocket = {
        id: 'sock_platform_1',
        handshake: { auth: { token: tokenPlatformAdmin } },
        data: {},
      };
      const allowedA = await canJoinRoom(mockSocket, `org:${orgA_Id}`);
      const allowedB = await canJoinRoom(mockSocket, `org:${orgB_Id}`);
      assert.equal(allowedA, true);
      assert.equal(allowedB, true);
    });

    test('4.2: Arbitrary/random room names are rejected under default-deny', async () => {
      const mockSocket = {
        id: 'sock_userA_12',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const randomRooms = ['public_chat', 'broadcast', 'admin_room', 'internal_debug', 'system:all'];
      for (const r of randomRooms) {
        const allowed = await canJoinRoom(mockSocket, r);
        assert.equal(allowed, false, `Room ${r} should be denied by default policy`);
      }
    });

    test('4.3: Regular user cannot join global role:Super Admin room', async () => {
      const mockSocket = {
        id: 'sock_userA_13',
        handshake: { auth: { token: tokenUserA } },
        data: {},
      };
      const allowed = await canJoinRoom(mockSocket, 'role:Super Admin');
      assert.equal(allowed, false);
    });
  });

  describe('5. Real-Time Socket Event Isolation & No Leakage', () => {
    test('5.1: Broadcast to Org A room is NOT received by User in Org B', (t, done) => {
      const clientA = createClient(tokenUserA);
      const clientB = createClient(tokenUserB);

      let clientBReceivedEvent = false;

      clientB.on('connect', () => {
        clientB.emit('join_room', `org:${orgB_Id}`);
        clientB.on('test_tenant_event', (data) => {
          clientBReceivedEvent = true;
        });
      });

      clientA.on('connect', () => {
        clientA.emit('join_room', `org:${orgA_Id}`);

        clientA.on('test_tenant_event', (data) => {
          assert.equal(data.orgId, orgA_Id.toString());

          // Verify clientB never received Org A's broadcast
          setTimeout(() => {
            assert.equal(clientBReceivedEvent, false, 'User B must not receive Org A broadcast');
            clientA.disconnect();
            clientB.disconnect();
            done();
          }, 300);
        });

        // Trigger emission from server to org:orgA room
        setTimeout(() => {
          socketServer.to(`org:${orgA_Id}`).emit('test_tenant_event', {
            orgId: orgA_Id.toString(),
            message: 'Top Secret Tenant A Notification',
          });
        }, 150);
      });
    });
  });
});
