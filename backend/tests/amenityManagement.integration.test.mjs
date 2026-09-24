import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';

import app from '../index.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';
import Role from '../src/features/role/role.model.js';
import Permission from '../src/features/permission/permission.model.js';
import RolePermission from '../src/features/rolePermission/rolePermission.model.js';
import Notification from '../src/features/notification/notification.model.js';

import {
  AmenityFacility,
  AmenityResource,
  AmenitySlotAllocation,
  AmenityAllocationLedger,
  AmenityReservationHold,
  AmenityReservation,
  AmenityQuotaAllocation,
  AmenityAccessPass,
  AmenityMaintenanceBlock,
  AmenityOutboxEvent,
  AmenityIdempotencyRecord,
  AmenityCounter,
} from '../src/features/amenityManagement/index.js';

import amenityHoldExpirationWorker from '../src/features/amenityManagement/workers/amenityHoldExpiration.worker.js';
import amenityOutboxWorker from '../src/features/amenityManagement/workers/amenityOutbox.worker.js';
import amenityOutboxService from '../src/features/amenityManagement/outbox/amenityOutbox.service.js';
import amenityReservationService from '../src/features/amenityManagement/reservations/amenityReservation.service.js';
import amenityReservationHoldService from '../src/features/amenityManagement/holds/amenityReservationHold.service.js';
import amenityQuotaAllocationService from '../src/features/amenityManagement/quotas/amenityQuotaAllocation.service.js';

// Legacy models to ensure isolation
import LegacyAmenity from '../src/features/amenity/amenity.model.js';
import LegacyAmenityBooking from '../src/features/amenityBooking/amenityBooking.model.js';
import LegacyBooking from '../src/features/booking/booking.model.js';

describe('Amenity Management Phase 5 — Integration & E2E Validation Suite', () => {
  let server;
  let baseUrl;

  // Tenant Fixtures
  let testOrgA;
  let testOrgB;
  let adminUserA;
  let residentUserA1;
  let residentUserA2;
  let adminUserB;
  let residentUserB1;

  let unitA1Id;
  let unitA2Id;
  let unitB1Id;

  // JWT Tokens
  let adminAToken;
  let residentA1Token;
  let residentA2Token;
  let adminBToken;
  let residentBToken;

  function signWebhookPayload(payload) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'default_webhook_secret_key';
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    // Spin up ephemeral HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v2/amenity-management`;

    const timestamp = Date.now();

    // 1. Seed Organizations
    testOrgA = await Organization.create({
      name: `Org A Phase 5 ${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'UTC',
    });

    testOrgB = await Organization.create({
      name: `Org B Phase 5 ${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'Asia/Dubai',
    });

    // 2. Seed Roles & Permissions
    const residentRoleA = await Role.create({
      name: 'Resident A',
      description: 'Resident Role for Org A',
      orgId: testOrgA._id,
    });

    const residentRoleB = await Role.create({
      name: 'Resident B',
      description: 'Resident Role for Org B',
      orgId: testOrgB._id,
    });

    const residentPermissions = [
      { feature: 'amenities', action: 'discover', name: 'amenities:discover' },
      { feature: 'amenities', action: 'my_booking', name: 'amenities:my_booking' },
    ];

    for (const p of residentPermissions) {
      let perm = await Permission.findOne({ name: p.name });
      if (!perm) {
        perm = await Permission.create(p);
      }
      await RolePermission.create([
        { roleId: residentRoleA._id, permissionId: perm._id },
        { roleId: residentRoleB._id, permissionId: perm._id },
      ]);
    }

    // 3. Seed Users and Unit ObjectIds
    unitA1Id = new mongoose.Types.ObjectId();
    unitA2Id = new mongoose.Types.ObjectId();
    unitB1Id = new mongoose.Types.ObjectId();

    adminUserA = await User.create({
      email: `adminA_${timestamp}@test.com`,
      username: `adminA_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Community Admin',
    });

    residentUserA1 = await User.create({
      email: `residentA1_${timestamp}@test.com`,
      username: `residentA1_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Resident',
    });

    residentUserA2 = await User.create({
      email: `residentA2_${timestamp}@test.com`,
      username: `residentA2_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Resident',
    });

    adminUserB = await User.create({
      email: `adminB_${timestamp}@test.com`,
      username: `adminB_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Community Admin',
    });

    residentUserB1 = await User.create({
      email: `residentB1_${timestamp}@test.com`,
      username: `residentB1_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Resident',
    });

    // 4. Generate Signed JWTs
    adminAToken = jwt.sign(
      { id: adminUserA._id.toString(), email: adminUserA.email, role: 'Community Admin', orgId: testOrgA._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    residentA1Token = jwt.sign(
      {
        id: residentUserA1._id.toString(),
        email: residentUserA1.email,
        role: 'Resident',
        roleId: residentRoleA._id.toString(),
        orgId: testOrgA._id.toString(),
        unitId: unitA1Id.toString(),
        villaId: unitA1Id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    residentA2Token = jwt.sign(
      {
        id: residentUserA2._id.toString(),
        email: residentUserA2.email,
        role: 'Resident',
        roleId: residentRoleA._id.toString(),
        orgId: testOrgA._id.toString(),
        unitId: unitA2Id.toString(),
        villaId: unitA2Id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    adminBToken = jwt.sign(
      { id: adminUserB._id.toString(), email: adminUserB.email, role: 'Community Admin', orgId: testOrgB._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    residentBToken = jwt.sign(
      {
        id: residentUserB1._id.toString(),
        email: residentUserB1.email,
        role: 'Resident',
        roleId: residentRoleB._id.toString(),
        orgId: testOrgB._id.toString(),
        unitId: unitB1Id.toString(),
        villaId: unitB1Id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );
  });

  after(async () => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }

    const orgIds = [testOrgA._id, testOrgB._id];
    await Promise.all([
      AmenityFacility.deleteMany({ orgId: { $in: orgIds } }),
      AmenityResource.deleteMany({ orgId: { $in: orgIds } }),
      AmenitySlotAllocation.deleteMany({ orgId: { $in: orgIds } }),
      AmenityAllocationLedger.deleteMany({ orgId: { $in: orgIds } }),
      AmenityReservationHold.deleteMany({ orgId: { $in: orgIds } }),
      AmenityReservation.deleteMany({ orgId: { $in: orgIds } }),
      AmenityQuotaAllocation.deleteMany({ orgId: { $in: orgIds } }),
      AmenityAccessPass.deleteMany({ orgId: { $in: orgIds } }),
      AmenityMaintenanceBlock.deleteMany({ orgId: { $in: orgIds } }),
      AmenityOutboxEvent.deleteMany({ orgId: { $in: orgIds } }),
      AmenityIdempotencyRecord.deleteMany({ orgId: { $in: orgIds } }),
      AmenityCounter.deleteMany({ orgId: { $in: orgIds } }),
      Notification.deleteMany({ recipientId: { $in: [residentUserA1._id, residentUserA2._id, residentUserB1._id] } }),
      Organization.deleteMany({ _id: { $in: orgIds } }),
      User.deleteMany({ _id: { $in: [adminUserA._id, residentUserA1._id, residentUserA2._id, adminUserB._id, residentUserB1._id] } }),
    ]);

    await mongoose.disconnect();
  });

  // =========================================================================
  // 1. Facility & Resource Lifecycle
  // =========================================================================
  describe('1. Facility & Resource Lifecycle End-to-End', () => {
    let createdFacilityId;
    let createdResourceId;

    it('should create and configure a facility via POST /facilities', async () => {
      const payload = {
        name: 'Harmony Clubhouse',
        code: `CLUB-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 50,
        timezone: 'UTC',
        pricingConfig: {
          pricingType: 'HOURLY',
          baseRate: 100,
          taxPercentage: 18,
          securityDeposit: 200,
        },
      };

      const res = await fetch(`${baseUrl}/facilities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Harmony Clubhouse');
      assert.equal(body.data.orgId, testOrgA._id.toString());
      createdFacilityId = body.data._id;
    });

    it('should reject facility creation without admin privileges with 403', async () => {
      const res = await fetch(`${baseUrl}/facilities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Unauthorized Pool',
          code: 'UNAUTH-POOL',
          archetype: 'SHARED_CAPACITY',
        }),
      });

      assert.equal(res.status, 403);
    });

    it('should reject invalid facility creation with missing required fields with 400', async () => {
      const res = await fetch(`${baseUrl}/facilities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: 'Missing required code, name, archetype' }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('should create sub-resource under facility via POST /resources', async () => {
      const payload = {
        facilityId: createdFacilityId,
        name: 'Clubhouse Main Deck',
        identifier: 'DECK-A1',
        setupBufferMinutes: 15,
        teardownBufferMinutes: 15,
      };

      const res = await fetch(`${baseUrl}/resources`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.facilityId, createdFacilityId);
      createdResourceId = body.data._id;
    });

    it('should retrieve resources by facility via GET /resources/facility/:facilityId', async () => {
      const res = await fetch(`${baseUrl}/resources/facility/${createdFacilityId}`, {
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0]._id, createdResourceId);
    });

    it('should reject resource creation under non-existent facility with 404', async () => {
      const nonExistentFacilityId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/resources`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: nonExistentFacilityId,
          name: 'Orphan Deck',
          identifier: 'DECK-ORPHAN',
        }),
      });

      assert.equal(res.status, 404);
    });
  });

  // =========================================================================
  // 2. Archetype 1: Shared Capacity Flow (Gym / Pool)
  // =========================================================================
  describe('2. Archetype 1: Shared Capacity Flow (Gym / Pool)', () => {
    let poolFacility;
    let hold1;
    let reservation1;
    let accessPass1;

    before(async () => {
      poolFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Olympic Swimming Pool',
        code: `POOL-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 15,
        pricingConfig: {
          pricingType: 'HOURLY',
          baseRate: 50,
          taxPercentage: 18,
          securityDeposit: 0,
        },
      });
    });

    it('should evaluate availability for 5 headcounts on shared capacity pool', async () => {
      const start = new Date(Date.now() + 86400000);
      const end = new Date(start.getTime() + 3600000);

      const params = new URLSearchParams({
        facilityId: poolFacility._id.toString(),
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        requestedQuantity: '5',
      });

      const res = await fetch(`${baseUrl}/availability?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.isAvailable, true);
      assert.equal(body.data.availableUnits, 15);
      assert.equal(body.data.maxCapacity, 15);
    });

    it('should create hold for 5 headcounts and allocate capacity bucket', async () => {
      const start = new Date(Date.now() + 86400000);
      const end = new Date(start.getTime() + 3600000);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: poolFacility._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
          headcount: 5,
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.hold.status, 'ACTIVE');
      assert.equal(body.data.hold.headcount, 5);
      hold1 = body.data.hold;

      // Verify slot allocation capacity bucket decremented available count
      const slotStartUTC = new Date(start).toISOString();
      const bucketId = `BUCKET:${testOrgA._id}:${poolFacility._id}:${slotStartUTC}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.ok(bucket);
      assert.equal(bucket.allocatedHeadcount, 5);
      assert.equal(bucket.maxCapacity - bucket.allocatedHeadcount, 10);
    });

    it('should confirm reservation via payment webhook and generate access pass', async () => {
      const payload = {
        orgId: testOrgA._id.toString(),
        holdId: hold1._id.toString(),
        paymentReference: `pay_pool_${Date.now()}`,
        status: 'PAID',
        paymentAmount: 59, // 50 base + 18% tax = 59
      };

      const res = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload(payload),
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.reservation.bookingStatus, 'CONFIRMED');
      assert.equal(body.data.reservation.paymentStatus, 'PAID');
      assert.equal(body.data.reservation.accessStatus, 'PASS_GENERATED');
      assert.ok(body.data.pass);
      assert.ok(body.data.rawToken);
      reservation1 = body.data.reservation;
      accessPass1 = body.data.pass;
    });

    it('should verify subsequent booking sees reduced available capacity (10 remaining)', async () => {
      const start = new Date(reservation1.requestedStartDateTime);
      const end = new Date(reservation1.requestedEndDateTime);

      const params = new URLSearchParams({
        facilityId: poolFacility._id.toString(),
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        requestedQuantity: '11', // Requesting more than 10 remaining
      });

      const res = await fetch(`${baseUrl}/availability?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.isAvailable, false);
      assert.equal(body.data.availableUnits, 10);
    });

    it('should cancel reservation, release capacity back to 15, and revoke pass', async () => {
      const res = await fetch(`${baseUrl}/reservations/${reservation1._id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Schedule conflict' }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.bookingStatus, 'CANCELLED');
      assert.equal(body.data.paymentStatus, 'REFUND_PENDING');
      assert.equal(body.data.accessStatus, 'ACCESS_REVOKED');

      // Verify bucket capacity restored
      const slotStartUTC = new Date(reservation1.requestedStartDateTime).toISOString();
      const bucketId = `BUCKET:${testOrgA._id}:${poolFacility._id}:${slotStartUTC}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket.allocatedHeadcount, 0);
      assert.equal(bucket.maxCapacity - bucket.allocatedHeadcount, 15);

      // Verify pass revoked
      const pass = await AmenityAccessPass.findById(accessPass1._id);
      assert.equal(pass.isRevoked, true);
    });
  });

  // =========================================================================
  // 3. Archetype 2: Exclusive Hourly Flow (Badminton / Tennis)
  // =========================================================================
  describe('3. Archetype 2: Exclusive Hourly Flow (Badminton / Tennis)', () => {
    let courtFacility;
    let courtResource1;
    let courtResource2;
    let slotStart;
    let slotEnd;

    before(async () => {
      courtFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Tennis Complex',
        code: `TENNIS-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'EXCLUSIVE_HOURLY',
        pricingConfig: { pricingType: 'HOURLY', baseRate: 80, taxPercentage: 18 },
      });

      courtResource1 = await AmenityResource.create({
        orgId: testOrgA._id,
        facilityId: courtFacility._id,
        name: 'Court 1 (Clay)',
        identifier: `CRT-1-${Date.now().toString().slice(-4)}`,
      });

      courtResource2 = await AmenityResource.create({
        orgId: testOrgA._id,
        facilityId: courtFacility._id,
        name: 'Court 2 (Synthetic)',
        identifier: `CRT-2-${Date.now().toString().slice(-4)}`,
      });

      slotStart = new Date(Date.now() + 86400000);
      slotEnd = new Date(slotStart.getTime() + 3600000);
    });

    it('should hold and confirm exclusive slot on Court 1', async () => {
      const holdRes = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: courtFacility._id.toString(),
          resourceId: courtResource1._id.toString(),
          requestedStartDateTime: slotStart.toISOString(),
          requestedEndDateTime: slotEnd.toISOString(),
        }),
      });

      assert.equal(holdRes.status, 201);
      const holdBody = await holdRes.json();

      const payPayload = {
        orgId: testOrgA._id.toString(),
        holdId: holdBody.data.hold._id,
        paymentReference: `pay_tennis_${Date.now()}`,
        status: 'PAID',
      };

      const payRes = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload(payPayload),
        },
        body: JSON.stringify(payPayload),
      });

      assert.equal(payRes.status, 200);
      const payBody = await payRes.json();
      assert.equal(payBody.data.reservation.bookingStatus, 'CONFIRMED');
    });

    it('should REJECT second overlapping booking attempt on Court 1 with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: courtFacility._id.toString(),
          resourceId: courtResource1._id.toString(),
          requestedStartDateTime: slotStart.toISOString(),
          requestedEndDateTime: slotEnd.toISOString(),
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('should SUCCEED for valid adjacent non-overlapping slot [11:00, 12:00) on Court 1', async () => {
      const adjacentStart = slotEnd;
      const adjacentEnd = new Date(adjacentStart.getTime() + 3600000);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: courtFacility._id.toString(),
          resourceId: courtResource1._id.toString(),
          requestedStartDateTime: adjacentStart.toISOString(),
          requestedEndDateTime: adjacentEnd.toISOString(),
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.hold.status, 'ACTIVE');
    });

    it('should SUCCEED for simultaneous slot on Court 2 (independent resource)', async () => {
      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: courtFacility._id.toString(),
          resourceId: courtResource2._id.toString(),
          requestedStartDateTime: slotStart.toISOString(),
          requestedEndDateTime: slotEnd.toISOString(),
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.hold.status, 'ACTIVE');
    });
  });

  // =========================================================================
  // 4. Archetype 3: Event Space Flow (Maker-Checker Approval Workflow)
  // =========================================================================
  describe('4. Archetype 3: Event Space Flow (Maker-Checker Approval)', () => {
    let hallFacility;
    let eventResv;

    before(async () => {
      hallFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Grand Banquet Hall',
        code: `HALL-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'EVENT_SPACE',
        requiresApproval: true,
        approvalWorkflow: {
          requireAdminApproval: true,
          approvalTimeoutHours: 48,
        },
        pricingConfig: {
          pricingType: 'FIXED_EVENT',
          baseRate: 5000,
          taxPercentage: 18,
        },
      });
    });

    it('should request event reservation and enter PENDING_APPROVAL and PENDING_REVIEW', async () => {
      const start = new Date(Date.now() + 172800000); // 2 days later
      const end = new Date(start.getTime() + 14400000); // 4 hours

      // 1. Create standard hold
      const holdRes = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: hallFacility._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
          headcount: 50,
        }),
      });

      assert.equal(holdRes.status, 201);
      const holdBody = await holdRes.json();

      // 2. Submit for review (confirm endpoint)
      const confirmRes = await fetch(`${baseUrl}/reservations/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdId: holdBody.data.hold._id,
          notes: 'Wedding anniversary reception',
        }),
      });

      assert.equal(confirmRes.status, 201);
      const confirmBody = await confirmRes.json();
      eventResv = confirmBody.data.reservation;

      assert.equal(eventResv.bookingStatus, 'PENDING_APPROVAL');
      assert.equal(eventResv.approvalStatus, 'PENDING_REVIEW');
      assert.equal(eventResv.paymentStatus, 'PENDING');
      assert.equal(eventResv.accessStatus, 'NOT_APPLICABLE');
      assert.equal(confirmBody.data.pass, null);
    });

    it('CRITICAL: Admin approval MUST NOT confirm booking or issue pass while payment is pending', async () => {
      const res = await fetch(`${baseUrl}/reservations/${eventResv._id}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'APPROVE',
          notes: 'Approved by Resident Association Committee',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      const updated = body.data;

      // Invariants:
      // APPROVAL != PAYMENT
      // APPROVAL != CONFIRMATION
      // APPROVAL != ACCESS PASS
      assert.equal(updated.approvalStatus, 'APPROVED');
      assert.equal(updated.bookingStatus, 'PENDING_APPROVAL');
      assert.equal(updated.paymentStatus, 'PENDING');
      assert.equal(updated.accessStatus, 'NOT_APPLICABLE');

      // Verify no pass exists in database
      const passes = await AmenityAccessPass.find({ reservationId: eventResv._id });
      assert.equal(passes.length, 0);
    });

    it('should transition to CONFIRMED and issue pass when payment succeeds for approved event', async () => {
      const payPayload = {
        orgId: testOrgA._id.toString(),
        reservationId: eventResv._id.toString(),
        paymentReference: `pay_event_${Date.now()}`,
        status: 'PAID',
        paymentAmount: 5900, // 5000 + 18% tax = 5900
      };

      const res = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload(payPayload),
        },
        body: JSON.stringify(payPayload),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.reservation.bookingStatus, 'CONFIRMED');
      assert.equal(body.data.reservation.paymentStatus, 'PAID');
      assert.equal(body.data.reservation.approvalStatus, 'APPROVED');
      assert.equal(body.data.reservation.accessStatus, 'PASS_GENERATED');
      assert.ok(body.data.pass);
    });
  });

  // =========================================================================
  // 5. Archetype 4: Room Resource Flow (Guest House / Transit Room)
  // =========================================================================
  describe('5. Archetype 4: Room Resource Flow (Guest House)', () => {
    let guestHouseFacility;
    let roomResource;
    let startDay1;
    let endDay3;

    before(async () => {
      guestHouseFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Transit Guest House',
        code: `GH-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'ROOM_RESOURCE',
        pricingConfig: { pricingType: 'DAILY', baseRate: 1500, taxPercentage: 12 },
      });

      roomResource = await AmenityResource.create({
        orgId: testOrgA._id,
        facilityId: guestHouseFacility._id,
        name: 'Executive Suite 101',
        identifier: `RM-101-${Date.now().toString().slice(-4)}`,
      });

      startDay1 = new Date(Date.now() + 86400000 * 3);
      endDay3 = new Date(startDay1.getTime() + 86400000 * 3); // 3 nights
    });

    it('should hold and confirm room reservation for date range [Day 1, Day 4)', async () => {
      const holdRes = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: guestHouseFacility._id.toString(),
          resourceId: roomResource._id.toString(),
          requestedStartDateTime: startDay1.toISOString(),
          requestedEndDateTime: endDay3.toISOString(),
        }),
      });

      assert.equal(holdRes.status, 201);
      const holdBody = await holdRes.json();

      const payRes = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload({
            orgId: testOrgA._id.toString(),
            holdId: holdBody.data.hold._id,
            paymentReference: `pay_room_${Date.now()}`,
            status: 'PAID',
          }),
        },
        body: JSON.stringify({
          orgId: testOrgA._id.toString(),
          holdId: holdBody.data.hold._id,
          paymentReference: `pay_room_${Date.now()}`,
          status: 'PAID',
        }),
      });

      assert.equal(payRes.status, 200);
      const payBody = await payRes.json();
      assert.equal(payBody.data.reservation.bookingStatus, 'CONFIRMED');
    });

    it('should REJECT overlapping room reservation [Day 2, Day 5) with 409 Conflict', async () => {
      const overlapStart = new Date(startDay1.getTime() + 86400000);
      const overlapEnd = new Date(overlapStart.getTime() + 86400000 * 3);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: guestHouseFacility._id.toString(),
          resourceId: roomResource._id.toString(),
          requestedStartDateTime: overlapStart.toISOString(),
          requestedEndDateTime: overlapEnd.toISOString(),
        }),
      });

      assert.equal(res.status, 409);
    });

    it('should SUCCEED for valid adjacent room reservation [Day 4, Day 7) under half-open convention', async () => {
      const adjacentStart = endDay3;
      const adjacentEnd = new Date(adjacentStart.getTime() + 86400000 * 3);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: guestHouseFacility._id.toString(),
          resourceId: roomResource._id.toString(),
          requestedStartDateTime: adjacentStart.toISOString(),
          requestedEndDateTime: adjacentEnd.toISOString(),
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.hold.status, 'ACTIVE');
    });
  });

  // =========================================================================
  // 6. Archetype 5: Inventory & Tools Flow (Bulk Stock Allocation)
  // =========================================================================
  describe('6. Archetype 5: Inventory & Tools Flow (Bulk Allocation)', () => {
    let inventoryFacility;
    let bulkResource;
    let targetDate;
    let hold12;

    before(async () => {
      inventoryFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Community Equipment Depot',
        code: `DEPOT-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'INVENTORY_TOOLS',
        pricingConfig: { pricingType: 'DAILY', baseRate: 10 },
      });

      bulkResource = await AmenityResource.create({
        orgId: testOrgA._id,
        facilityId: inventoryFacility._id,
        name: 'Folding Banquet Chairs',
        identifier: `CHAIRS-${Date.now().toString().slice(-4)}`,
        isSerializedAsset: false,
        totalBulkStock: 20,
      });

      targetDate = new Date(Date.now() + 86400000 * 4);
    });

    it('should allocate 12 chairs from total stock 20 (leaving 8 remaining)', async () => {
      const start = new Date(targetDate);
      const end = new Date(start.getTime() + 7200000);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: inventoryFacility._id.toString(),
          resourceId: bulkResource._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
          quantity: 12,
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.hold.quantity, 12);
      hold12 = body.data.hold;

      // Verify slot allocation bulk day bucket
      const dateToken = start.toISOString().split('T')[0];
      const bucketId = `BULK:${testOrgA._id}:${inventoryFacility._id}:${bulkResource._id}:${dateToken}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.ok(bucket);
      assert.equal(bucket.allocatedQuantity, 12);
      assert.equal(bucket.totalStock - bucket.allocatedQuantity, 8);
    });

    it('should REJECT request for 10 chairs because only 8 remain', async () => {
      const start = new Date(targetDate);
      const end = new Date(start.getTime() + 7200000);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: inventoryFacility._id.toString(),
          resourceId: bulkResource._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
          quantity: 10,
        }),
      });

      assert.equal(res.status, 409);
    });

    it('should SUCCEED for request for exactly 8 remaining chairs', async () => {
      const start = new Date(targetDate);
      const end = new Date(start.getTime() + 7200000);

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: inventoryFacility._id.toString(),
          resourceId: bulkResource._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
          quantity: 8,
        }),
      });

      assert.equal(res.status, 201);
    });

    it('should restore 12 chairs back to stock upon hold expiration / release', async () => {
      await amenityReservationHoldService.expireHold(hold12._id);

      const dateToken = new Date(targetDate).toISOString().split('T')[0];
      const bucketId = `BULK:${testOrgA._id}:${inventoryFacility._id}:${bulkResource._id}:${dateToken}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket.allocatedQuantity, 8);
      assert.equal(bucket.totalStock - bucket.allocatedQuantity, 12);
    });
  });

  // =========================================================================
  // 7. Timezone & Operating Hours Validation
  // =========================================================================
  describe('7. Timezone & Operating Hours Validation', () => {
    let dubaiFacility;

    before(async () => {
      // Create facility in Asia/Dubai (UTC+4)
      // Open Monday-Saturday 08:00 - 20:00, Closed Sunday
      dubaiFacility = await AmenityFacility.create({
        orgId: testOrgB._id,
        name: 'Dubai Wellness Spa',
        code: `SPA-DXB-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 20,
        timezone: 'Asia/Dubai',
        operatingHours: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isOpen: true }, // Mon
          { dayOfWeek: 2, openTime: '08:00', closeTime: '20:00', isOpen: true }, // Tue
          { dayOfWeek: 3, openTime: '08:00', closeTime: '20:00', isOpen: true }, // Wed
          { dayOfWeek: 4, openTime: '08:00', closeTime: '20:00', isOpen: true }, // Thu
          { dayOfWeek: 5, openTime: '08:00', closeTime: '20:00', isOpen: true }, // Fri
          { dayOfWeek: 6, openTime: '08:00', closeTime: '20:00', isOpen: true }, // Sat
          { dayOfWeek: 0, openTime: '08:00', closeTime: '20:00', isOpen: false }, // Sun closed
        ],
      });
    });

    it('should be AVAILABLE during Dubai local operating hours (10:00 local = 06:00 UTC)', async () => {
      // Pick next Tuesday at 10:00 Dubai time
      const dubaiMoment = moment().tz('Asia/Dubai').add(1, 'week').day(2).hour(10).minute(0).second(0).millisecond(0);
      const startUTC = dubaiMoment.clone().utc().toDate();
      const endUTC = dubaiMoment.clone().add(2, 'hours').utc().toDate();

      const params = new URLSearchParams({
        facilityId: dubaiFacility._id.toString(),
        startDateTime: startUTC.toISOString(),
        endDateTime: endUTC.toISOString(),
      });

      const res = await fetch(`${baseUrl}/availability?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentBToken}`,
          'x-organization-id': testOrgB._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.isAvailable, true);
    });

    it('should be UNAVAILABLE outside Dubai local operating hours (02:00 local = 22:00 UTC)', async () => {
      // Pick next Tuesday at 02:00 Dubai time
      const dubaiMoment = moment().tz('Asia/Dubai').add(1, 'week').day(2).hour(2).minute(0).second(0).millisecond(0);
      const startUTC = dubaiMoment.clone().utc().toDate();
      const endUTC = dubaiMoment.clone().add(1, 'hour').utc().toDate();

      const params = new URLSearchParams({
        facilityId: dubaiFacility._id.toString(),
        startDateTime: startUTC.toISOString(),
        endDateTime: endUTC.toISOString(),
      });

      const res = await fetch(`${baseUrl}/availability?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentBToken}`,
          'x-organization-id': testOrgB._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.isAvailable, false);
      assert.ok(body.data.reason.includes('outside facility operating hours'));
    });

    it('should be UNAVAILABLE on Sunday when facility is configured as closed', async () => {
      // Pick next Sunday at 12:00 Dubai time
      const dubaiMoment = moment().tz('Asia/Dubai').add(1, 'week').day(0).hour(12).minute(0).second(0).millisecond(0);
      const startUTC = dubaiMoment.clone().utc().toDate();
      const endUTC = dubaiMoment.clone().add(1, 'hour').utc().toDate();

      const params = new URLSearchParams({
        facilityId: dubaiFacility._id.toString(),
        startDateTime: startUTC.toISOString(),
        endDateTime: endUTC.toISOString(),
      });

      const res = await fetch(`${baseUrl}/availability?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentBToken}`,
          'x-organization-id': testOrgB._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.isAvailable, false);
      assert.ok(body.data.reason.includes('closed'));
    });
  });

  // =========================================================================
  // 8. Pricing Snapshot Immutability
  // =========================================================================
  describe('8. Pricing Snapshot Immutability', () => {
    it('reservation must retain original pricing snapshot when future facility pricing changes', async () => {
      // 1. Create Facility with Base Rate 100
      const pricingFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Squash Court',
        code: `SQUASH-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'EXCLUSIVE_HOURLY',
        pricingConfig: {
          pricingType: 'HOURLY',
          baseRate: 100,
          taxPercentage: 18,
          currency: 'INR',
        },
      });

      const start = new Date(Date.now() + 86400000 * 5);
      const end = new Date(start.getTime() + 3600000);

      // 2. Create Hold & Confirm Reservation
      const hold = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: pricingFacility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
      });

      const confirmResult = await amenityReservationService.confirmReservationFromHold({
        holdId: hold.hold._id,
        orgId: testOrgA._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        paymentReference: `pay_price_${Date.now()}`,
      });

      const originalResv = confirmResult.reservation;
      assert.equal(originalResv.pricingSnapshot.baseAmount, 100);
      assert.equal(originalResv.pricingSnapshot.taxAmount, 18);
      assert.equal(originalResv.pricingSnapshot.totalAmount, 118);

      // 3. Update Facility Pricing to Base Rate 300
      await AmenityFacility.findByIdAndUpdate(pricingFacility._id, {
        'pricingConfig.baseRate': 300,
      });

      // 4. Retrieve Reservation via API and verify snapshot is unchanged
      const res = await fetch(`${baseUrl}/reservations/${originalResv._id}`, {
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.pricingSnapshot.baseAmount, 100);
      assert.equal(body.data.pricingSnapshot.totalAmount, 118);
    });
  });

  // =========================================================================
  // 9. Quota Enforcement & Concurrent Quota Protection
  // =========================================================================
  describe('9. Quota Enforcement & Concurrency Protection', () => {
    let quotaFacility;
    let testQuotaUnitId;
    let concurrentQuotaUnitId;

    before(async () => {
      quotaFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Sauna & Steam',
        code: `SAUNA-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
      });
      testQuotaUnitId = new mongoose.Types.ObjectId();
      concurrentQuotaUnitId = new mongoose.Types.ObjectId();
    });

    it('should enforce quota limit (120 minutes) and reject excess with 403', async () => {
      const date = new Date(Date.now() + 86400000 * 6);

      // Reserve 60 minutes out of 120
      await amenityQuotaAllocationService.reserveQuota({
        orgId: testOrgA._id,
        unitId: testQuotaUnitId,
        facilityId: quotaFacility._id,
        quotaLimit: 120,
        requestedUnits: 60,
        date,
      });

      // Attempt to reserve 70 minutes (total 130 > 120) -> Rejection
      await assert.rejects(
        async () => {
          await amenityQuotaAllocationService.reserveQuota({
            orgId: testOrgA._id,
            unitId: testQuotaUnitId,
            facilityId: quotaFacility._id,
            quotaLimit: 120,
            requestedUnits: 70,
            date,
          });
        },
        (err) => err.statusCode === 403
      );
    });

    it('should handle concurrent quota requests: exactly 1 succeeds, 1 fails, no negative quota', async () => {
      const date = new Date(Date.now() + 86400000 * 7);

      // 60 minutes remaining out of 120
      await amenityQuotaAllocationService.reserveQuota({
        orgId: testOrgA._id,
        unitId: concurrentQuotaUnitId,
        facilityId: quotaFacility._id,
        quotaLimit: 120,
        requestedUnits: 60,
        date,
      });

      // 2 concurrent requests competing for the last 60 minutes
      const results = await Promise.allSettled([
        amenityQuotaAllocationService.reserveQuota({
          orgId: testOrgA._id,
          unitId: concurrentQuotaUnitId,
          facilityId: quotaFacility._id,
          quotaLimit: 120,
          requestedUnits: 60,
          date,
        }),
        amenityQuotaAllocationService.reserveQuota({
          orgId: testOrgA._id,
          unitId: concurrentQuotaUnitId,
          facilityId: quotaFacility._id,
          quotaLimit: 120,
          requestedUnits: 60,
          date,
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.equal(fulfilled.length, 1, 'Exactly one concurrent quota reservation should succeed');
      assert.equal(rejected.length, 1, 'Exactly one concurrent quota reservation should be rejected');
      assert.equal(rejected[0].reason.statusCode, 403);
    });
  });

  // =========================================================================
  // 10. Hold Lifecycle & Hold Expiration Worker E2E
  // =========================================================================
  describe('10. Hold Expiry Worker E2E', () => {
    it('should sweep real expired hold in MongoDB, release capacity, release quota, and write outbox', async () => {
      const facility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Expiring Hold Facility',
        code: `EXP-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
      });

      const start = new Date(Date.now() + 86400000 * 8);
      const end = new Date(start.getTime() + 3600000);

      // 1. Create real hold
      const holdResult = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: facility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
        headcount: 4,
      });

      const holdId = holdResult.hold._id;

      // Manually backdate expiresAt in MongoDB to simulate expiration
      await AmenityReservationHold.findByIdAndUpdate(holdId, {
        expiresAt: new Date(Date.now() - 60000), // expired 1 minute ago
      });

      // 2. Invoke real hold expiration worker runOnce()
      const workerResult = await amenityHoldExpirationWorker.runOnce();
      assert.ok(workerResult.expiredCount >= 1);

      // 3. Verify hold status in MongoDB
      const updatedHold = await AmenityReservationHold.findById(holdId);
      assert.equal(updatedHold.status, 'EXPIRED');

      // 4. Verify capacity bucket released
      const slotStartUTC = start.toISOString();
      const bucketId = `BUCKET:${testOrgA._id}:${facility._id}:${slotStartUTC}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket.allocatedHeadcount, 0);

      // 5. Verify outbox event written
      const outboxEvent = await AmenityOutboxEvent.findOne({
        aggregateId: holdId,
        eventType: 'HOLD_EXPIRED',
      });
      assert.ok(outboxEvent);
      assert.equal(outboxEvent.status, 'PENDING');

      // 6. Double-run worker must be idempotent no-op
      const secondRun = await amenityHoldExpirationWorker.runOnce();
      assert.equal(secondRun.expiredCount, 0);
    });
  });

  // =========================================================================
  // 11. Duplicate Webhook & Late Payment Scenarios
  // =========================================================================
  describe('11. Payment Edge Cases: Duplicate Webhooks & Late Payment', () => {
    it('duplicate payment webhook on confirmed reservation must be idempotent', async () => {
      const facility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Idempotent Webhook Gym',
        code: `IDMP-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
        pricingConfig: { pricingType: 'FIXED_EVENT', baseRate: 100 },
      });

      const start = new Date(Date.now() + 86400000 * 9);
      const end = new Date(start.getTime() + 3600000);

      const holdResult = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: facility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
      });

      const payPayload = {
        orgId: testOrgA._id.toString(),
        holdId: holdResult.hold._id.toString(),
        paymentReference: `pay_idemp_${Date.now()}`,
        status: 'PAID',
      };

      // First webhook
      const res1 = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload(payPayload),
        },
        body: JSON.stringify(payPayload),
      });

      assert.equal(res1.status, 200);
      const body1 = await res1.json();
      assert.equal(body1.data.reservation.bookingStatus, 'CONFIRMED');
      const resvId = body1.data.reservation._id;

      // Second webhook (exact same payload)
      const res2 = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload({
            ...payPayload,
            reservationId: resvId,
          }),
        },
        body: JSON.stringify({
          ...payPayload,
          reservationId: resvId,
        }),
      });

      assert.equal(res2.status, 200);
      const body2 = await res2.json();
      assert.equal(body2.data.isDuplicate, true);

      // Verify no duplicate passes issued
      const passes = await AmenityAccessPass.find({ reservationId: resvId });
      assert.equal(passes.length, 1);
    });

    it('CRITICAL: Late payment after hold expired MUST schedule refund without resurrecting booking', async () => {
      const facility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Late Pay Studio',
        code: `LATE-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
        pricingConfig: { pricingType: 'FIXED_EVENT', baseRate: 150 },
      });

      const start = new Date(Date.now() + 86400000 * 10);
      const end = new Date(start.getTime() + 3600000);

      // 1. Create hold
      const holdResult = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: facility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
      });

      const holdId = holdResult.hold._id;

      // 2. Expire hold
      await amenityReservationHoldService.expireHold(holdId);

      const deadHold = await AmenityReservationHold.findById(holdId);
      assert.equal(deadHold.status, 'EXPIRED');

      // 3. Late payment webhook arrives
      const latePayPayload = {
        orgId: testOrgA._id.toString(),
        holdId: holdId.toString(),
        paymentReference: `pay_late_${Date.now()}`,
        status: 'PAID',
        paymentAmount: 150,
      };

      const res = await fetch(`${baseUrl}/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signWebhookPayload(latePayPayload),
        },
        body: JSON.stringify(latePayPayload),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      const fallbackResv = body.data.reservation;

      // INVARIANTS CHECK:
      // Hold remains EXPIRED
      const holdAfter = await AmenityReservationHold.findById(holdId);
      assert.equal(holdAfter.status, 'EXPIRED');

      // Reservation is CANCELLED with REFUND_PENDING
      assert.equal(fallbackResv.bookingStatus, 'CANCELLED');
      assert.equal(fallbackResv.paymentStatus, 'REFUND_PENDING');
      assert.equal(fallbackResv.accessStatus, 'NOT_APPLICABLE');

      // NO capacity allocation in bucket
      const slotStartUTC = start.toISOString();
      const bucketId = `BUCKET:${testOrgA._id}:${facility._id}:${slotStartUTC}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket?.allocatedHeadcount || 0, 0);

      // NO access pass generated
      const passes = await AmenityAccessPass.find({ reservationId: fallbackResv._id });
      assert.equal(passes.length, 0);

      // REFUND_DISPATCH_REQUIRED outbox event exists
      const refundOutbox = await AmenityOutboxEvent.findOne({
        aggregateId: fallbackResv._id,
        eventType: 'REFUND_DISPATCH_REQUIRED',
      });
      assert.ok(refundOutbox);
    });
  });

  // =========================================================================
  // 12. Turnstile Access Pass Lifecycle & Anti-Replay Security
  // =========================================================================
  describe('12. Turnstile Access Pass Lifecycle & Anti-Replay Security', () => {
    let passFacility;
    let rawPassToken;
    let passId;

    before(async () => {
      passFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Secure Turnstile Gym',
        code: `SEC-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
      });

      const validFrom = new Date(Date.now() + 100);
      const validUntil = new Date(Date.now() + 3600000); // 1 hour later

      const holdResult = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: passFacility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: validFrom,
        requestedEndDateTime: validUntil,
      });

      const confirmResult = await amenityReservationService.confirmReservationFromHold({
        holdId: holdResult.hold._id,
        orgId: testOrgA._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
      });

      rawPassToken = confirmResult.rawToken;
      passId = confirmResult.pass._id;

      // Allow clock to enter validFrom window
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    it('should validate and record first check-in at turnstile', async () => {
      const res = await fetch(`${baseUrl}/passes/check-in`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawToken: rawPassToken,
          gateId: 'GATE-NORTH-TURNSTILE-1',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.checkInTimestamp);
    });

    it('CRITICAL: Second check-in attempt MUST be REJECTED with 409 Anti-Replay Violation', async () => {
      const res = await fetch(`${baseUrl}/passes/check-in`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawToken: rawPassToken,
          gateId: 'GATE-NORTH-TURNSTILE-1',
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.ok(body.message.includes('Anti-replay violation'));
    });

    it('should record check-out with equipment inspection details', async () => {
      const res = await fetch(`${baseUrl}/passes/check-out`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawToken: rawPassToken,
          inspectionDetails: { returnedLockerKey: true, damageNoted: false },
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.data.checkOutTimestamp);
    });

    it('second check-out attempt must be rejected with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/passes/check-out`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawToken: rawPassToken,
        }),
      });

      assert.equal(res.status, 409);
    });

    it('tenant isolation: Org B scanner attempting to check-in Org A pass must be rejected with 404', async () => {
      const res = await fetch(`${baseUrl}/passes/check-in`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminBToken}`,
          'x-organization-id': testOrgB._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawToken: rawPassToken,
          gateId: 'GATE-ORGB-1',
        }),
      });

      assert.equal(res.status, 404);
    });
  });

  // =========================================================================
  // 13. Maintenance Conflict Interaction
  // =========================================================================
  describe('13. Maintenance Conflict Interaction', () => {
    let maintenanceFacility;
    let maintStart;
    let maintEnd;

    before(async () => {
      maintenanceFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Community Theatre',
        code: `THEATRE-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'EXCLUSIVE_HOURLY',
      });

      maintStart = new Date(Date.now() + 86400000 * 11);
      maintEnd = new Date(maintStart.getTime() + 7200000); // 2 hours

      // Create confirmed reservation inside this window
      const hold = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: maintenanceFacility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: maintStart,
        requestedEndDateTime: maintEnd,
      });

      await amenityReservationService.confirmReservationFromHold({
        holdId: hold.hold._id,
        orgId: testOrgA._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
      });
    });

    it('should schedule maintenance block and detect impacted active reservation', async () => {
      const res = await fetch(`${baseUrl}/maintenance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: maintenanceFacility._id.toString(),
          startDateTime: maintStart.toISOString(),
          endDateTime: maintEnd.toISOString(),
          isCompleteClosure: true,
          reason: 'Emergency HVAC repair',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.impactedReservationsCount, 1);
    });

    it('subsequent availability query during maintenance block must return unavailable', async () => {
      const params = new URLSearchParams({
        facilityId: maintenanceFacility._id.toString(),
        startDateTime: maintStart.toISOString(),
        endDateTime: maintEnd.toISOString(),
      });

      const res = await fetch(`${baseUrl}/availability?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.isAvailable, false);
      assert.ok(body.data.reason.includes('Maintenance blackout active'));
    });
  });

  // =========================================================================
  // 14. Cross-Tenant Security & Resident Ownership
  // =========================================================================
  describe('14. Cross-Tenant Security & Resident Ownership', () => {
    let orgAFacility;
    let orgAReservation;

    before(async () => {
      orgAFacility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Org A Private Lounge',
        code: `LOUNGE-A-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
      });

      const start = new Date(Date.now() + 86400000 * 12);
      const end = new Date(start.getTime() + 3600000);

      const hold = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgA._id,
        facilityId: orgAFacility._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
      });

      const confirmed = await amenityReservationService.confirmReservationFromHold({
        holdId: hold.hold._id,
        orgId: testOrgA._id,
        residentId: residentUserA1._id,
        unitId: unitA1Id,
      });

      orgAReservation = confirmed.reservation;
    });

    it('Org B resident attempting GET Org A facility must receive 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/facilities/${orgAFacility._id}`, {
        headers: {
          Authorization: `Bearer ${residentBToken}`,
          'x-organization-id': testOrgA._id.toString(), // Forged orgId header
        },
      });

      assert.equal(res.status, 403);
    });

    it('Org B admin attempting to delete Org A facility must receive 404/403', async () => {
      const res = await fetch(`${baseUrl}/facilities/${orgAFacility._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminBToken}`,
          'x-organization-id': testOrgB._id.toString(), // Genuine Org B context attempting Org A ID
        },
      });

      assert.equal(res.status, 404);
    });

    it('Resident A2 attempting to view Resident A1 reservation must be rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reservations/${orgAReservation._id}`, {
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.ok(body.message.includes('permission to view'));
    });

    it('Admin A can view Resident A1 reservation', async () => {
      const res = await fetch(`${baseUrl}/reservations/${orgAReservation._id}`, {
        headers: {
          Authorization: `Bearer ${adminAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data._id, orgAReservation._id.toString());
    });
  });

  // =========================================================================
  // 15. Concurrency Stress: Race Conditions on Exclusive Resource & Capacity
  // =========================================================================
  describe('15. Concurrency Stress: Race Conditions & Overbooking Guards', () => {
    it('concurrent exclusive bookings: 2 simultaneous requests -> 1 succeeds, 1 rejected with 409', async () => {
      const facility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Badminton Arena',
        code: `BADM-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'EXCLUSIVE_HOURLY',
      });

      const resource = await AmenityResource.create({
        orgId: testOrgA._id,
        facilityId: facility._id,
        name: 'Court Alpha',
        identifier: `CRT-ALPHA-${Date.now().toString().slice(-4)}`,
      });

      const start = new Date(Date.now() + 86400000 * 13);
      const end = new Date(start.getTime() + 3600000);

      const request1 = fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA1Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: facility._id.toString(),
          resourceId: resource._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
        }),
      });

      const request2 = fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentA2Token}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: facility._id.toString(),
          resourceId: resource._id.toString(),
          requestedStartDateTime: start.toISOString(),
          requestedEndDateTime: end.toISOString(),
        }),
      });

      const [res1, res2] = await Promise.all([request1, request2]);
      const statuses = [res1.status, res2.status].sort();

      assert.deepEqual(statuses, [201, 409], 'Exactly one concurrent booking must succeed and one must be rejected');
    });

    it('concurrent shared capacity: 3 requests of 5 headcounts for maxCapacity 10 -> total allocated <= 10', async () => {
      const facility = await AmenityFacility.create({
        orgId: testOrgA._id,
        name: 'Rooftop Jacuzzi',
        code: `JACUZZI-P5-${Date.now().toString().slice(-4)}`,
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 10,
      });

      const start = new Date(Date.now() + 86400000 * 14);
      const end = new Date(start.getTime() + 3600000);

      const makeRequest = (token) =>
        fetch(`${baseUrl}/holds`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-organization-id': testOrgA._id.toString(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            facilityId: facility._id.toString(),
            requestedStartDateTime: start.toISOString(),
            requestedEndDateTime: end.toISOString(),
            headcount: 5,
          }),
        });

      const [res1, res2, res3] = await Promise.all([
        makeRequest(residentA1Token),
        makeRequest(residentA2Token),
        makeRequest(residentA1Token),
      ]);

      const successCount = [res1, res2, res3].filter((r) => r.status === 201).length;
      const rejectCount = [res1, res2, res3].filter((r) => r.status === 409).length;

      assert.equal(successCount, 2, 'Exactly two 5-person holds can fit in capacity 10');
      assert.equal(rejectCount, 1, 'The 3rd concurrent request must be rejected');

      // Verify DB bucket allocatedHeadcount <= 10
      const slotStartUTC = start.toISOString();
      const bucketId = `BUCKET:${testOrgA._id}:${facility._id}:${slotStartUTC}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket.allocatedHeadcount, 10);
    });
  });

  // =========================================================================
  // 16. Outbox Worker, Notification Integration & Zombie Recovery
  // =========================================================================
  describe('16. Outbox Worker, Downstream Notification & Zombie Recovery', () => {
    it('outbox worker should process PENDING event to PUBLISHED and create real in-app notification', async () => {
      // 1. Create confirmed reservation outbox event
      const testResvId = new mongoose.Types.ObjectId();
      const outboxDoc = await AmenityOutboxEvent.create({
        orgId: testOrgA._id,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: testResvId,
        aggregateType: 'AmenityReservation',
        payload: {
          reservationId: testResvId,
          reservationNumber: 'RES-NOTIF-TEST-001',
          residentId: residentUserA1._id,
        },
        status: 'PENDING',
      });

      // 2. Run Outbox worker runOnce()
      const workerRes = await amenityOutboxWorker.runOnce();
      assert.ok(workerRes.processedCount >= 1);
      assert.ok(workerRes.successCount >= 1);

      // 3. Verify event is PUBLISHED in MongoDB
      const updatedEvent = await AmenityOutboxEvent.findById(outboxDoc._id);
      assert.equal(updatedEvent.status, 'PUBLISHED');
      assert.equal(updatedEvent.processingStartedAt, null);

      // 4. Verify downstream in-app Notification was truly created
      const notif = await Notification.findOne({
        recipientId: residentUserA1._id,
        title: 'Amenity Reservation Confirmed',
        body: { $regex: 'RES-NOTIF-TEST-001' },
      });
      assert.ok(notif, 'Real downstream Notification record must exist in MongoDB');
      assert.ok(notif.body.includes('RES-NOTIF-TEST-001'));
    });

    it('outbox retry should increment retryCount with backoff and transition to DEAD_LETTER on maxRetries', async () => {
      const failingEvent = await AmenityOutboxEvent.create({
        orgId: testOrgA._id,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: { residentId: residentUserA1._id },
        status: 'PENDING',
        retryCount: 4,
        maxRetries: 5,
        nextRetryAt: new Date(Date.now() - 1000),
      });

      // Stub dispatchEvent to simulate downstream delivery failure
      const originalDispatch = amenityOutboxService.dispatchEvent;
      amenityOutboxService.dispatchEvent = async () => {
        throw new Error('Simulated external delivery failure');
      };

      try {
        await amenityOutboxWorker.runOnce();
      } finally {
        amenityOutboxService.dispatchEvent = originalDispatch;
      }

      const deadLetterEvent = await AmenityOutboxEvent.findById(failingEvent._id);
      assert.equal(deadLetterEvent.status, 'DEAD_LETTER');
      assert.equal(deadLetterEvent.retryCount, 5);
      assert.ok(deadLetterEvent.errorMessage.includes('Simulated external delivery failure'));
    });

    it('zombie recovery: should recover stale PROCESSING leases back to PENDING', async () => {
      const zombieEvent = await AmenityOutboxEvent.create({
        orgId: testOrgA._id,
        eventType: 'HOLD_EXPIRED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservationHold',
        payload: { residentId: residentUserA1._id },
        status: 'PROCESSING',
        processingStartedAt: new Date(Date.now() - 400000), // 400s ago (> 300s timeout)
        retryCount: 1,
        maxRetries: 5,
      });

      const recovered = await amenityOutboxService.recoverStaleProcessing(300000);
      assert.ok(recovered.length >= 1);

      const recoveredDoc = await AmenityOutboxEvent.findById(zombieEvent._id);
      assert.equal(recoveredDoc.status, 'PENDING');
      assert.equal(recoveredDoc.retryCount, 2);
    });
  });

  // =========================================================================
  // 17. Transaction Rollback & State Isolation
  // =========================================================================
  describe('17. Transaction Rollback & State Isolation', () => {
    it('aborted transaction must leave zero partial records in MongoDB', async () => {
      const session = await mongoose.startSession();
      session.startTransaction();

      const ghostHoldId = new mongoose.Types.ObjectId();
      try {
        await AmenityReservationHold.create(
          [
            {
              _id: ghostHoldId,
              orgId: testOrgA._id,
              facilityId: new mongoose.Types.ObjectId(),
              residentId: residentUserA1._id,
              unitId: unitA1Id,
              requestedStartDateTime: new Date(),
              requestedEndDateTime: new Date(Date.now() + 3600000),
              status: 'ACTIVE',
            },
          ],
          { session }
        );

        // Intentionally abort
        await session.abortTransaction();
      } catch (err) {
        await session.abortTransaction();
      } finally {
        await session.endSession();
      }

      // Verify ghost record does NOT exist in MongoDB
      const found = await AmenityReservationHold.findById(ghostHoldId);
      assert.equal(found, null, 'Aborted transaction must leave zero persisted records');
    });

    it('strict legacy isolation: legacy collections must have 0 new documents', async () => {
      const legacyAmenityCount = await LegacyAmenity.countDocuments({ name: /Phase 5/i });
      const legacyBookingCount = await LegacyAmenityBooking.countDocuments({ bookingNumber: /RES-/i });
      const legacyGeneralBookingCount = await LegacyBooking.countDocuments({ bookingType: /Amenity/i });

      assert.equal(legacyAmenityCount, 0);
      assert.equal(legacyBookingCount, 0);
      assert.equal(legacyGeneralBookingCount, 0);
    });
  });
});
