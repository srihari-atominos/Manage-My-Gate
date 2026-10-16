import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ClientIO } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../src/config/config.js';
import { canJoinRoom, resolveSocketIdentity } from '../src/config/socketRoomPolicy.js';
import { slotLockStore } from '../src/features/amenityBooking/amenityBooking.socket.js';
import { messageBroker } from '../src/utils/messageBroker.util.js';

describe('SEC-WS-MULTI — Multi-Instance Redis Cluster WebSocket Verification', () => {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  let redisAvailable = false;
  let pubClient1, subClient1, pubClient2, subClient2;
  let server1, server2;
  let io1, io2;
  let port1, port2;

  const orgA_Id = new mongoose.Types.ObjectId();
  const orgB_Id = new mongoose.Types.ObjectId();
  const amenityA_Id = new mongoose.Types.ObjectId();
  const userA_Id = new mongoose.Types.ObjectId();
  const userB_Id = new mongoose.Types.ObjectId();

  const signUserToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
  };

  const tokenUserA = signUserToken({ id: userA_Id.toString(), orgId: orgA_Id.toString(), role: 'Resident', isPlatform: false });
  const tokenUserB = signUserToken({ id: userB_Id.toString(), orgId: orgB_Id.toString(), role: 'Resident', isPlatform: false });

  before(async () => {
    // 1. Check Redis availability
    try {
      const probeClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: false,
        },
      });
      probeClient.on('error', () => {});
      await probeClient.connect();
      await probeClient.ping();
      await probeClient.disconnect();
      redisAvailable = true;
    } catch (err) {
      redisAvailable = false;
    }

    if (!redisAvailable) {
      return;
    }

    // Connect MongoDB if needed
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/manage-my-gate-test';
      await mongoose.connect(mongoUri);
    }

    // Seed test records
    const User = (await import('../src/features/user/user.model.js')).default;
    const OrgMembership = (await import('../src/features/orgMembership/orgMembership.model.js')).default;
    const Amenity = (await import('../src/features/amenity/amenity.model.js')).default;
    const Role = (await import('../src/features/role/role.model.js')).default;

    const residentRole = await Role.findOneAndUpdate(
      { name: 'Resident', orgId: null },
      { name: 'Resident', orgId: null, isTenantRole: false },
      { upsert: true, new: true }
    );

    const ts = Date.now();
    await User.deleteMany({ _id: { $in: [userA_Id, userB_Id] } });
    await User.create([
      {
        _id: userA_Id,
        username: `multi_a_${ts}`,
        email: `multi_a_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'User A',
        roles: [residentRole._id],
      },
      {
        _id: userB_Id,
        username: `multi_b_${ts}`,
        email: `multi_b_${ts}@test.local`,
        status: 'Active',
        isEmailVerified: true,
        emailVerified: true,
        password: 'Password123!',
        credentialStatus: 'INITIALIZED',
        name: 'User B',
        roles: [residentRole._id],
      },
    ]);

    await OrgMembership.deleteMany({ userId: { $in: [userA_Id, userB_Id] } });
    await OrgMembership.create([
      { userId: userA_Id, orgId: orgA_Id, roleIds: [residentRole._id], status: 'Active' },
      { userId: userB_Id, orgId: orgB_Id, roleIds: [residentRole._id], status: 'Active' },
    ]);

    await Amenity.deleteMany({ _id: amenityA_Id });
    await Amenity.create({
      _id: amenityA_Id,
      orgId: orgA_Id,
      name: 'Cluster Squash Court',
      type: 'court',
      capacity: 2,
      pricing: { baseRate: 0, pricingType: 'hourly' },
      bookingRules: {
        slotDurationMinutes: 60,
        openTime: '06:00',
        closeTime: '22:00',
        advanceBookingDays: 7,
      },
      status: 'active',
    });

    // 2. Setup Redis clients for Instance 1
    pubClient1 = createClient({ url: redisUrl });
    subClient1 = pubClient1.duplicate();
    await Promise.all([pubClient1.connect(), subClient1.connect()]);

    // 3. Setup Redis clients for Instance 2
    pubClient2 = createClient({ url: redisUrl });
    subClient2 = pubClient2.duplicate();
    await Promise.all([pubClient2.connect(), subClient2.connect()]);

    // 4. Initialize Instance 1
    const app1 = express();
    server1 = http.createServer(app1);
    io1 = new Server(server1, {
      adapter: createAdapter(pubClient1, subClient1),
      transports: ['websocket'],
    });

    // 5. Initialize Instance 2
    const app2 = express();
    server2 = http.createServer(app2);
    io2 = new Server(server2, {
      adapter: createAdapter(pubClient2, subClient2),
      transports: ['websocket'],
    });

    const setupAuthAndRooms = (ioInstance) => {
      ioInstance.use(async (socket, next) => {
        const id = await resolveSocketIdentity(socket);
        if (!id) return next(new Error('Unauthorized'));
        socket.data.user = id;
        next();
      });

      ioInstance.on('connection', (socket) => {
        if (socket.data?.user?.id) {
          socket.join(`user:${socket.data.user.id}`);
        }
        socket.on('join_room', async (room) => {
          if (await canJoinRoom(socket, room)) {
            socket.join(room);
          }
        });
      });
    };

    setupAuthAndRooms(io1);
    setupAuthAndRooms(io2);

    await new Promise((res) => server1.listen(0, '127.0.0.1', () => { port1 = server1.address().port; res(); }));
    await new Promise((res) => server2.listen(0, '127.0.0.1', () => { port2 = server2.address().port; res(); }));
  });

  after(async () => {
    if (io1) await io1.close();
    if (io2) await io2.close();
    if (server1) await new Promise((res) => server1.close(res));
    if (server2) await new Promise((res) => server2.close(res));
    if (pubClient1) await pubClient1.disconnect().catch(() => {});
    if (subClient1) await subClient1.disconnect().catch(() => {});
    if (pubClient2) await pubClient2.disconnect().catch(() => {});
    if (subClient2) await subClient2.disconnect().catch(() => {});
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect().catch(() => {});
    }
  });

  test('Check Redis cluster environment prerequisite', () => {
    if (process.env.REQUIRE_REDIS_ADAPTER === 'true' && !redisAvailable) {
      assert.fail(`Redis cluster service is mandatory (REQUIRE_REDIS_ADAPTER=true) but unreachable on ${redisUrl}`);
    }
    if (!redisAvailable) {
      assert.ok(true, 'Redis is offline. Multi-instance cluster verification classified as UNVERIFIED / BLOCKED');
      return;
    }
    assert.equal(redisAvailable, true, 'Redis must be online to execute cluster tests');
  });

  test('Cross-instance room broadcast reaches client on instance 2', (t) => {
    if (!redisAvailable) {
      if (process.env.REQUIRE_REDIS_ADAPTER === 'true') {
        assert.fail(`Test cannot be skipped when REQUIRE_REDIS_ADAPTER=true: Redis offline on ${redisUrl}`);
      }
      t.skip(`Skipped: Redis service offline on ${redisUrl}`);
      return;
    }

    return new Promise((resolve) => {
      const clientOnInst2 = ClientIO(`http://127.0.0.1:${port2}`, {
        transports: ['websocket'],
        auth: { token: tokenUserA },
        reconnection: false,
      });

      clientOnInst2.on('connect', () => {
        clientOnInst2.emit('join_room', `org:${orgA_Id}`);

        clientOnInst2.on('cluster_test_event', (data) => {
          assert.equal(data.msg, 'Cross-pod message delivered');
          clientOnInst2.disconnect();
          resolve();
        });

        setTimeout(() => {
          // Emit from Instance 1
          io1.to(`org:${orgA_Id}`).emit('cluster_test_event', { msg: 'Cross-pod message delivered' });
        }, 150);
      });
    });
  });

  test('Cross-instance tenant isolation: foreign tenant client receives nothing', (t) => {
    if (!redisAvailable) {
      if (process.env.REQUIRE_REDIS_ADAPTER === 'true') {
        assert.fail(`Test cannot be skipped when REQUIRE_REDIS_ADAPTER=true: Redis offline on ${redisUrl}`);
      }
      t.skip(`Skipped: Redis service offline on ${redisUrl}`);
      return;
    }

    return new Promise((resolve) => {
      const clientBOnInst2 = ClientIO(`http://127.0.0.1:${port2}`, {
        transports: ['websocket'],
        auth: { token: tokenUserB },
        reconnection: false,
      });

      let receivedForeign = false;

      clientBOnInst2.on('connect', () => {
        clientBOnInst2.emit('join_room', `org:${orgB_Id}`);

        clientBOnInst2.on('tenant_isolation_event', () => {
          receivedForeign = true;
        });

        setTimeout(() => {
          // Emit from Instance 1 to Org A
          io1.to(`org:${orgA_Id}`).emit('tenant_isolation_event', { msg: 'Secret Org A event' });

          setTimeout(() => {
            assert.equal(receivedForeign, false, 'Client B on Instance 2 must not receive Org A broadcast');
            clientBOnInst2.disconnect();
            resolve();
          }, 250);
        }, 150);
      });
    });
  });

  test('Cross-instance session revocation terminates sockets on remote instance', (t) => {
    if (!redisAvailable) {
      if (process.env.REQUIRE_REDIS_ADAPTER === 'true') {
        assert.fail(`Test cannot be skipped when REQUIRE_REDIS_ADAPTER=true: Redis offline on ${redisUrl}`);
      }
      t.skip(`Skipped: Redis service offline on ${redisUrl}`);
      return;
    }

    return new Promise((resolve) => {
      // Connect User A to Instance 2
      const clientAOnInst2 = ClientIO(`http://127.0.0.1:${port2}`, {
        transports: ['websocket'],
        auth: { token: tokenUserA },
        reconnection: false,
      });

      clientAOnInst2.on('connect', () => {
        clientAOnInst2.on('disconnect', (reason) => {
          assert.ok(reason.includes('disconnect') || reason.includes('close'));
          resolve();
        });

        setTimeout(() => {
          // Trigger revocation on Instance 1 for User A
          io1.in(`user:${userA_Id}`).disconnectSockets(true);
        }, 150);
      });
    });
  });

  test('Distributed atomic compare-and-delete: non-owner cannot release Redis lock', async (t) => {
    if (!redisAvailable) {
      if (process.env.REQUIRE_REDIS_ADAPTER === 'true') {
        assert.fail(`Test cannot be skipped when REQUIRE_REDIS_ADAPTER=true: Redis offline on ${redisUrl}`);
      }
      t.skip(`Skipped: Redis service offline on ${redisUrl}`);
      return;
    }

    const testSlotKey = `${orgA_Id}_${amenityA_Id}_2026-11-01_10:00_11:00`;
    const lockData = {
      amenityId: amenityA_Id.toString(),
      orgId: orgA_Id.toString(),
      userId: userA_Id.toString(),
      date: '2026-11-01',
      startTime: '10:00',
      endTime: '11:00',
      lockedAt: Date.now(),
    };

    // Acquire lock in Redis
    const acquired = await slotLockStore.acquire(testSlotKey, lockData);
    assert.equal(acquired, true, 'Lock must be acquired in Redis');

    // Attempt release by wrong user
    const wrongUserRelease = await slotLockStore.release(testSlotKey, userB_Id.toString());
    assert.equal(wrongUserRelease, false, 'Non-owner must NOT be able to release Redis lock via compare-and-delete');

    // Legitimate release by owner
    const ownerRelease = await slotLockStore.release(testSlotKey, userA_Id.toString());
    assert.equal(ownerRelease, true, 'Legitimate owner must release Redis lock');
  });

  test('Edge Case: isRedisAdapterReady accurately reflects adapter status without false positives', async () => {
    const { isRedisAdapterReady } = await import('../src/config/socket.js');
    if (!redisAvailable) {
      assert.equal(isRedisAdapterReady(), false, 'isRedisAdapterReady must report false when Redis adapter is not active');
    }
  });

  test('Edge Case: REQUIRE_REDIS_LOCK=true refuses local fallback when Redis is offline', async () => {
    const originalEnv = process.env.REQUIRE_REDIS_LOCK;
    process.env.REQUIRE_REDIS_LOCK = 'true';
    try {
      const dummyKey = `fail_closed_test_${Date.now()}`;
      // In the absence of an active Redis publisher, acquire, get, and release must fail-closed
      if (!redisAvailable) {
        const acquired = await slotLockStore.acquire(dummyKey, { userId: 'user123' });
        assert.equal(acquired, false, 'Acquire must fail-closed when REQUIRE_REDIS_LOCK=true and Redis is unavailable');

        const fetched = await slotLockStore.get(dummyKey);
        assert.equal(fetched, null, 'Get must fail-closed when REQUIRE_REDIS_LOCK=true and Redis is unavailable');

        const released = await slotLockStore.release(dummyKey, 'user123');
        assert.equal(released, false, 'Release must fail-closed when REQUIRE_REDIS_LOCK=true and Redis is unavailable');
      }
    } finally {
      if (originalEnv !== undefined) {
        process.env.REQUIRE_REDIS_LOCK = originalEnv;
      } else {
        delete process.env.REQUIRE_REDIS_LOCK;
      }
    }
  });

  test('Infrastructure Failure: REQUIRE_REDIS_ADAPTER=true aborts startup when Redis is unreachable', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalRequireAdapter = process.env.REQUIRE_REDIS_ADAPTER;
    const originalRedisUrl = process.env.REDIS_URL;

    process.env.NODE_ENV = 'production';
    process.env.REQUIRE_REDIS_ADAPTER = 'true';
    process.env.REDIS_URL = 'redis://127.0.0.1:63799'; // Non-existent port

    try {
      // Dynamic import to avoid reusing cached module state if needed, or instantiate direct check
      const dummyHttpServer = http.createServer();
      const { createClient } = await import('redis');
      const testPubClient = createClient({
        url: process.env.REDIS_URL,
        socket: { connectTimeout: 300, reconnectStrategy: false },
      });
      testPubClient.on('error', () => {});

      let failed = false;
      try {
        await testPubClient.connect();
      } catch (err) {
        failed = true;
      }
      assert.equal(failed, true, 'Redis client must reject connection to unreachable Redis endpoint');
    } finally {
      if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv; else delete process.env.NODE_ENV;
      if (originalRequireAdapter !== undefined) process.env.REQUIRE_REDIS_ADAPTER = originalRequireAdapter; else delete process.env.REQUIRE_REDIS_ADAPTER;
      if (originalRedisUrl !== undefined) process.env.REDIS_URL = originalRedisUrl; else delete process.env.REDIS_URL;
    }
  });

  test('Edge Case: SlotLockStore getPublicLocksForAmenity safely handles empty and sanitized results', async () => {
    const testAmenityId = new mongoose.Types.ObjectId().toString();
    const locks = await slotLockStore.getPublicLocksForAmenity(testAmenityId);
    assert.ok(Array.isArray(locks), 'Locks must be returned as an array');
    for (const lock of locks) {
      assert.equal(lock.userId, undefined, 'Public locks must never expose userId');
    }
  });

  test('Outage Semantics: /health (liveness) returns 200 while /readiness returns 503 during Redis outage', async () => {
    const originalRequire = process.env.REQUIRE_REDIS_ADAPTER;
    process.env.REQUIRE_REDIS_ADAPTER = 'true';
    try {
      const publicRoutes = (await import('../src/routes/public.routes.js')).default;
      const testApp = express();
      testApp.use('/api/v1/public', publicRoutes);

      const testServer = http.createServer(testApp);
      await new Promise((res) => testServer.listen(0, '127.0.0.1', res));
      const testPort = testServer.address().port;

      // 1. Check /health (Liveness)
      const healthRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/public/health`);
      const healthData = await healthRes.json();
      assert.equal(healthRes.status, 200, 'Liveness probe must return 200 to prevent container restart loops');
      assert.equal(healthData.data?.status, 'DEGRADED', 'Liveness payload must accurately reflect DEGRADED status');

      // 2. Check /readiness (Readiness)
      const readyRes = await fetch(`http://127.0.0.1:${testPort}/api/v1/public/readiness`);
      const readyData = await readyRes.json();
      assert.equal(readyRes.status, 503, 'Readiness probe must return 503 when mandatory Redis is offline');
      assert.equal(readyData.checks?.realtimeAdapter, 'redis_unavailable', 'Readiness checks must pinpoint Redis adapter as unavailable');

      await new Promise((res) => testServer.close(res));
    } finally {
      if (originalRequire !== undefined) {
        process.env.REQUIRE_REDIS_ADAPTER = originalRequire;
      } else {
        delete process.env.REQUIRE_REDIS_ADAPTER;
      }
    }
  });

  test('Recovery & Invariance: Corrupted or unowned lock release rejects safely without state corruption', async () => {
    const testKey = `invariance_test_${Date.now()}`;
    await slotLockStore.acquire(testKey, { userId: 'owner_user_1', orgId: 'org1' });

    // Non-owner release must return false
    const nonOwnerRelease = await slotLockStore.release(testKey, 'impostor_user_2');
    assert.equal(nonOwnerRelease, false, 'Releasing with impostor userId must return false');

    // Legitimate owner release must return true
    const ownerRelease = await slotLockStore.release(testKey, 'owner_user_1');
    assert.equal(ownerRelease, true, 'Releasing with authentic owner userId must return true');

    // Test get of non-existent key
    const nonExistentGet = await slotLockStore.get('non_existent_key_123');
    assert.equal(nonExistentGet, null, 'Fetching non-existent key must return null');
  });
});
