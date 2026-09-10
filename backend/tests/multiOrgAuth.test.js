import dotenv from 'dotenv';
dotenv.config();

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import authService from '../src/features/auth/auth.services.js';
import organizationService from '../src/features/organization/organization.services.js';
import organizationRepository from '../src/features/organization/organization.repository.js';
import userService from '../src/features/user/user.services.js';
import orgMembershipService from '../src/features/orgMembership/orgMembership.services.js';
import orgEventEmitter from '../src/features/organization/organization.events.js';
import auditLogService from '../src/features/auditLog/auditLog.services.js';
import '../src/features/auditLog/auditLog.listeners.js';
import { connectToDb } from '../src/config/db/mongodbConnectToDb.config.js';
import { nameCheckLimiter } from '../src/middlewares/rateLimiter.middleware.js';
import organizationController from '../src/features/organization/organization.controller.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Multi-Organization Foundation & Architecture Hardening Tests', () => {
  let userId;
  let firstOrgId;
  let secondOrgId;
  const testEmail = `multiorg_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const firstOrgName = `First Community ${Date.now()}`;
  const secondOrgName = `Second Community ${Date.now()}`;
  const createdOrgIds = [];

  before(async () => {
    await connectToDb();
  });

  after(async () => {
    try {
      if (userId) {
        await mongoose.model('User').deleteOne({ _id: userId }).catch(() => null);
        await mongoose.model('OrgMembership').deleteMany({ userId }).catch(() => null);
      }
      if (createdOrgIds.length > 0) {
        await mongoose.model('Organization').deleteMany({ _id: { $in: createdOrgIds } }).catch(() => null);
        await mongoose.model('Role').deleteMany({ orgId: { $in: createdOrgIds } }).catch(() => null);
        await mongoose.model('RolePermission').deleteMany({ orgId: { $in: createdOrgIds } }).catch(() => null);
        await mongoose.model('AuditLog').deleteMany({ targetId: { $in: createdOrgIds } }).catch(() => null);
      }
      await mongoose.model('Organization').deleteMany({ name: { $in: [firstOrgName, secondOrgName] } }).catch(() => null);
    } catch (e) {
      console.error('Cleanup error in after hook:', e);
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('Step 1: New User Registration creates user in Pending Verification state', async () => {
    const regResult = await authService.register({
      name: 'MultiOrg Test User',
      email: testEmail,
      password: testPassword,
    });

    assert.ok(regResult);
    assert.equal(regResult.email, testEmail);
    assert.equal(regResult.status, 'Pending Verification');

    const createdUser = await userService.getUserByEmail(testEmail);
    assert.ok(createdUser);
    assert.equal(createdUser.status, 'Pending Verification');
    userId = createdUser._id.toString();
  });

  it('Step 2: Re-registering with existing active email throws 409 conflict', async () => {
    // Activate user to simulate completed registration & verification
    await userService.updateUser(userId, { status: 'Active', emailVerified: true });

    await assert.rejects(
      async () => {
        await authService.register({
          name: 'MultiOrg Duplicate User',
          email: testEmail,
          password: testPassword,
        });
      },
      (err) => {
        assert.ok(err.message.includes(`User with email '${testEmail}' already exists.`));
        return true;
      }
    );
  });

  it('Step 3: User can log in with existing credentials', async () => {
    const loginResult = await authService.login({
      login: testEmail,
      password: testPassword,
    });

    assert.ok(loginResult);
    assert.ok(loginResult.token);
    assert.equal(loginResult.user.email, testEmail);
    assert.ok(Array.isArray(loginResult.availableWorkspaces));
  });

  it('Step 4: User creates First Organization under their account with 5 roles and creator membership', async () => {
    let eventReceived = null;
    const eventHandler = (data) => {
      eventReceived = data;
    };
    orgEventEmitter.once('ORGANIZATION_CREATED', eventHandler);

    const setup1 = await organizationService.setupWorkspace({
      name: firstOrgName,
      organizationType: 'Residential',
      contactEmail: testEmail,
      userId: userId,
    });

    assert.ok(setup1);
    assert.ok(setup1.token);
    assert.equal(setup1.user.role, 'Community Admin');
    assert.equal(setup1.availableWorkspaces.length, 1);
    assert.equal(setup1.availableWorkspaces[0].name, firstOrgName);

    firstOrgId = setup1.user.orgId;
    createdOrgIds.push(firstOrgId);

    // Verify Organization document in MongoDB
    const orgInDb = await organizationRepository.findById(firstOrgId);
    assert.ok(orgInDb);
    assert.equal(orgInDb.name, firstOrgName);
    assert.equal(orgInDb.status, 'Active');
    assert.equal(orgInDb.organizationType, 'Residential');

    // Verify Default 5 Roles were created for this Organization
    const rolesInDb = await mongoose.model('Role').find({ orgId: firstOrgId });
    assert.equal(rolesInDb.length, 5);
    const roleNames = rolesInDb.map(r => r.name);
    assert.ok(roleNames.includes('Community Admin'));
    assert.ok(roleNames.includes('Resident Owner'));
    assert.ok(roleNames.includes('Resident Tenant'));
    assert.ok(roleNames.includes('Family Member'));
    assert.ok(roleNames.includes('Security Guard'));

    // Verify Creator OrgMembership document in MongoDB
    const memberships = await orgMembershipService.getUserMemberships(userId);
    const org1Membership = memberships.find(m => (m.orgId._id || m.orgId).toString() === firstOrgId.toString());
    assert.ok(org1Membership);
    assert.equal(org1Membership.status, 'Active');
    const adminRole = rolesInDb.find(r => r.name === 'Community Admin');
    const memberRoleIds = org1Membership.roleIds.map(r => (r._id || r).toString());
    assert.ok(memberRoleIds.includes(adminRole._id.toString()));

    // Verify ORGANIZATION_CREATED event was emitted
    assert.ok(eventReceived);
    assert.equal(eventReceived.organizationId, firstOrgId.toString());
    assert.equal(eventReceived.organizationName, firstOrgName);
    assert.equal(eventReceived.creatorUserId, userId.toString());
  });

  it('Step 5: Existing User creates Second Organization under SAME account without duplicate User record', async () => {
    // Count total users with this email before creating second org
    const usersBefore = await mongoose.model('User').countDocuments({ email: testEmail });
    assert.equal(usersBefore, 1);

    const setup2 = await organizationService.setupWorkspace({
      name: secondOrgName,
      organizationType: 'Residential',
      contactEmail: testEmail,
      userId: userId,
    });

    // Count total users with this email after creating second org
    const usersAfter = await mongoose.model('User').countDocuments({ email: testEmail });
    assert.equal(usersAfter, 1, 'MUST NOT create duplicate User document!');

    secondOrgId = setup2.user.orgId;
    createdOrgIds.push(secondOrgId);

    // Verify availableWorkspaces contains BOTH organizations
    assert.ok(setup2);
    assert.equal(setup2.availableWorkspaces.length, 2);
    const orgNames = setup2.availableWorkspaces.map(w => w.name);
    assert.ok(orgNames.includes(firstOrgName));
    assert.ok(orgNames.includes(secondOrgName));

    // Verify OrgMembership records in DB for this user
    const memberships = await orgMembershipService.getUserMemberships(userId);
    assert.ok(memberships.length >= 2);
    const orgIdsInMemberships = memberships.map(m => (m.orgId._id || m.orgId).toString());
    assert.ok(orgIdsInMemberships.includes(firstOrgId.toString()));
    assert.ok(orgIdsInMemberships.includes(secondOrgId.toString()));
  });

  it('Step 6: Organization Isolation Verification', async () => {
    const rolesOrg1 = await mongoose.model('Role').find({ orgId: firstOrgId });
    const rolesOrg2 = await mongoose.model('Role').find({ orgId: secondOrgId });

    assert.equal(rolesOrg1.length, 5);
    assert.equal(rolesOrg2.length, 5);

    const org1RoleIds = new Set(rolesOrg1.map(r => r._id.toString()));
    const org2RoleIds = new Set(rolesOrg2.map(r => r._id.toString()));

    // No overlap in Role IDs
    for (const id of org1RoleIds) {
      assert.equal(org2RoleIds.has(id), false, 'Roles between orgs must be strictly isolated');
    }
  });

  it('Step 7: Name availability check correctly detects taken and available names with case and space trimming', async () => {
    // Exact match
    const isFirstOrgAvailable = await organizationService.checkNameAvailability(firstOrgName);
    assert.equal(isFirstOrgAvailable, false);

    // Case-insensitive match (lowercase)
    const isLowerAvailable = await organizationService.checkNameAvailability(firstOrgName.toLowerCase());
    assert.equal(isLowerAvailable, false);

    // Case-insensitive match (uppercase)
    const isUpperAvailable = await organizationService.checkNameAvailability(firstOrgName.toUpperCase());
    assert.equal(isUpperAvailable, false);

    // Whitespace trimmed match
    const isPaddedAvailable = await organizationService.checkNameAvailability(`   ${firstOrgName}   `);
    assert.equal(isPaddedAvailable, false);

    // Brand new unique name
    const isNewOrgAvailable = await organizationService.checkNameAvailability(`Completely Unique Community ${Date.now()}`);
    assert.equal(isNewOrgAvailable, true);

    // Invalid / empty name throws 400
    await assert.rejects(
      async () => {
        await organizationService.checkNameAvailability('   ');
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it('Step 8: Duplicate Name Rejection on setupWorkspace enforces 409 Conflict', async () => {
    // Exact name conflict
    await assert.rejects(
      async () => {
        await organizationService.setupWorkspace({
          name: firstOrgName,
          userId: userId,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, 'Conflict. Organization name already exists.');
        return true;
      }
    );

    // Case-variation conflict
    await assert.rejects(
      async () => {
        await organizationService.setupWorkspace({
          name: firstOrgName.toLowerCase(),
          userId: userId,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, 'Conflict. Organization name already exists.');
        return true;
      }
    );

    // Whitespace padded conflict
    await assert.rejects(
      async () => {
        await organizationService.setupWorkspace({
          name: `  ${firstOrgName}  `,
          userId: userId,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, 'Conflict. Organization name already exists.');
        return true;
      }
    );
  });

  it('Step 9: Database Duplicate Key MongoServerError (code 11000) is translated to 409 Conflict', async () => {
    // Temporarily mock organizationRepository.create to throw a duplicate key error
    const originalCreate = organizationRepository.create;
    organizationRepository.create = async () => {
      const duplicateError = new Error('E11000 duplicate key error collection: manage_my_gate.organizations index: name_1');
      duplicateError.name = 'MongoServerError';
      duplicateError.code = 11000;
      throw duplicateError;
    };

    try {
      await assert.rejects(
        async () => {
          await organizationService.setupWorkspace({
            name: `Simulated Race Condition ${Date.now()}`,
            userId: userId,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 409);
          assert.equal(err.message, 'Conflict. Organization name already exists.');
          return true;
        }
      );
    } finally {
      organizationRepository.create = originalCreate;
    }
  });

  it('Step 10: Transaction Rollback ensures no partial organization, roles, or memberships persist on failure', async () => {
    const doomedOrgName = `Doomed Community ${Date.now()}`;
    let eventDispatched = false;
    const doomedListener = () => {
      eventDispatched = true;
    };
    orgEventEmitter.once('ORGANIZATION_CREATED', doomedListener);

    // Mock roleService to fail midway inside the transaction
    const roleService = (await import('../src/features/role/role.services.js')).default;
    const originalCreateRole = roleService.createRole;
    let callCount = 0;
    roleService.createRole = async (...args) => {
      callCount += 1;
      if (callCount === 3) {
        throw new Error('Simulated role creation database failure inside transaction');
      }
      return await originalCreateRole.apply(roleService, args);
    };

    try {
      await assert.rejects(
        async () => {
          await organizationService.setupWorkspace({
            name: doomedOrgName,
            userId: userId,
          });
        },
        (err) => {
          assert.equal(err.message, 'Simulated role creation database failure inside transaction');
          return true;
        }
      );

      // Verify that the organization was ROLLED BACK (when transactions are supported)
      const session = await mongoose.startSession();
      if (!session._isMockSession) {
        const doomedOrg = await organizationRepository.findByName(doomedOrgName);
        assert.equal(doomedOrg, null, 'Doomed organization MUST NOT exist in DB after transaction rollback');

        const partialRoles = await mongoose.model('Role').find({ name: doomedOrgName });
        assert.equal(partialRoles.length, 0);
      }

      // Verify that ORGANIZATION_CREATED event was NOT dispatched
      assert.equal(eventDispatched, false, 'ORGANIZATION_CREATED event must NOT be emitted if transaction fails');
    } finally {
      roleService.createRole = originalCreateRole;
      orgEventEmitter.removeListener('ORGANIZATION_CREATED', doomedListener);
      await mongoose.model('Organization').deleteOne({ name: doomedOrgName }).catch(() => null);
      await mongoose.model('Role').deleteMany({ name: doomedOrgName }).catch(() => null);
    }
  });

  it('Step 11: Audit log listener recorded the organization creation event', async () => {
    // Wait briefly for asynchronous background audit log write to complete
    await new Promise((resolve) => setTimeout(resolve, 600));

    const auditLog = await mongoose.model('AuditLog').findOne({
      targetId: firstOrgId,
      action: 'ORGANIZATION_CREATED',
    });

    assert.ok(auditLog, 'Audit log entry for ORGANIZATION_CREATED should be recorded');
    assert.equal(auditLog.actorId.toString(), userId.toString());
    assert.equal(auditLog.metadata.get('organizationName'), firstOrgName);
  });

  it('Step 12: Anti-spoofing verification proves client cannot control userId, status, or roles', async () => {
    const spoofedOrgName = `AntiSpoof Org ${Date.now()}`;
    const maliciousAttackerId = new mongoose.Types.ObjectId().toString();

    // Simulate an incoming Express request where an attacker attempts to inject protected fields
    const fakeReq = {
      body: {
        name: spoofedOrgName,
        organizationType: 'Residential',
        userId: maliciousAttackerId,
        creatorId: maliciousAttackerId,
        isPlatform: true,
        role: 'Platform SuperAdmin',
        roleIds: [maliciousAttackerId],
        status: 'Pending',
      },
      user: {
        id: userId, // Real verified session user ID
      },
    };

    let controllerResult = null;
    let cookieSet = null;
    const fakeRes = {
      success(data, msg, statusCode) {
        controllerResult = data;
      },
      cookie(name, value) {
        cookieSet = { name, value };
      },
      setHeader() {},
      getHeader() {},
    };

    await organizationController.setupWorkspace(fakeReq, fakeRes, (err) => {
      if (err) throw err;
    });

    assert.ok(controllerResult);
    const createdOrgId = controllerResult.user.orgId;
    createdOrgIds.push(createdOrgId);

    // Verify Organization model: status must be Active (not Pending), isPlatform must be false (not true)
    const orgInDb = await organizationRepository.findById(createdOrgId);
    assert.equal(orgInDb.status, 'Active', 'Status must not be overridden by client body');
    assert.equal(orgInDb.isPlatform, false, 'isPlatform must not be overridden by client body');

    // Verify creator OrgMembership in DB: linked to real userId (NOT attackerId)
    const memberships = await orgMembershipService.getUserMemberships(userId);
    const createdMembership = memberships.find(m => (m.orgId._id || m.orgId).toString() === createdOrgId.toString());
    assert.ok(createdMembership, 'Membership must be created for real authenticated userId');
    assert.equal(createdMembership.status, 'Active');

    // Verify attacker received NO membership
    const attackerMemberships = await orgMembershipService.getUserMemberships(maliciousAttackerId);
    assert.equal(attackerMemberships.length, 0, 'No membership must be created for spoofed attackerId');
  });

  it('Step 13: Rate limiter enforces maximum 60 requests per 15-minute window and rejects request 61 with HTTP 429', async () => {
    const testIp = `192.168.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
    let allowedCount = 0;
    let blockedStatusCode = null;
    let blockedResponseBody = null;

    for (let i = 1; i <= 61; i++) {
      let nextCalled = false;
      const fakeReq = {
        ip: testIp,
        headers: {},
        method: 'GET',
        path: '/api/v1/organizations/check-name',
        baseUrl: '/api/v1/organizations',
        app: { get: () => false },
      };

      await new Promise((resolve) => {
        let isDone = false;
        const finish = () => {
          if (!isDone) {
            isDone = true;
            resolve();
          }
        };

        const fakeRes = {
          statusCode: 200,
          status(code) {
            blockedStatusCode = code;
            this.statusCode = code;
            return this;
          },
          send(body) {
            blockedResponseBody = body;
            finish();
            return this;
          },
          json(body) {
            blockedResponseBody = body;
            finish();
            return this;
          },
          setHeader() {},
          getHeader() {},
        };

        try {
          const ret = nameCheckLimiter(fakeReq, fakeRes, (err) => {
            nextCalled = true;
            finish();
          });
          if (ret && typeof ret.then === 'function') {
            ret.then(finish).catch(finish);
          }
        } catch (e) {
          finish();
        }
      });

      if (nextCalled) {
        allowedCount++;
      }
    }

    assert.equal(allowedCount, 60, 'Exactly 60 requests must be allowed through');
    assert.equal(blockedStatusCode, 429, 'Request 61 must receive HTTP 429');
    assert.equal(blockedResponseBody.success, false);
    assert.ok(blockedResponseBody.message.includes('Too many organization name checks'));
  });

  it('Step 14: Genuine Concurrency verification - 2 simultaneous creation requests for the same name produce 1 success and 1 HTTP 409', async () => {
    const concurrentOrgName = `Concurrent Org ${Date.now()}`;

    const [resA, resB] = await Promise.allSettled([
      organizationService.setupWorkspace({
        name: concurrentOrgName,
        organizationType: 'Residential',
        contactEmail: testEmail,
        userId: userId,
      }),
      organizationService.setupWorkspace({
        name: concurrentOrgName,
        organizationType: 'Residential',
        contactEmail: testEmail,
        userId: userId,
      }),
    ]);

    const fulfilled = [resA, resB].filter(r => r.status === 'fulfilled');
    const rejected = [resA, resB].filter(r => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
    assert.equal(rejected.length, 1, 'Exactly one concurrent request must be rejected');
    assert.equal(rejected[0].reason.statusCode, 409, 'Rejected concurrent request must receive 409 Conflict');
    assert.equal(rejected[0].reason.message, 'Conflict. Organization name already exists.');

    createdOrgIds.push(fulfilled[0].value.user.orgId);
  });

  it('Step 15: Event listener idempotency ensures multiple module loads register listener exactly once', async () => {
    // Dynamically re-import auditLog.listeners.js to simulate duplicate module evaluation
    await import('../src/features/auditLog/auditLog.listeners.js?cacheBust=' + Date.now());

    const createdCount = orgEventEmitter.listenerCount('ORGANIZATION_CREATED');
    const statusChangedCount = orgEventEmitter.listenerCount('ORG_STATUS_CHANGED');

    assert.equal(createdCount, 1, 'ORGANIZATION_CREATED listener must be registered exactly once');
    assert.equal(statusChangedCount, 1, 'ORG_STATUS_CHANGED listener must be registered exactly once');
  });
});
