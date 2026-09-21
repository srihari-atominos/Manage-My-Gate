import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

import app from '../index.js';
import config from '../src/config/config.js';
import User from '../src/features/user/user.model.js';
import Organization from '../src/features/organization/organization.model.js';

import {
  AmenityFacility,
  AmenityResource,
  AmenityReservationHold,
  AmenityReservation,
  AmenityAccessPass,
  AmenitySlotAllocation,
  AmenityAllocationLedger,
  AmenityCounter,
} from '../src/features/amenityManagement/index.js';

describe('Amenity Management V2 — Phase 3A RBAC & Authorization Verification Suite', () => {
  let server;
  let baseUrl;

  // Organizations
  let testOrgA;
  let testOrgB;

  // Roles
  let residentRole;
  let facilityManagerRole;
  let guardRole;

  // Users
  let communityAdminUser;
  let facilityManagerUser;
  let residentAUser;
  let residentBUser;
  let guardUser;
  let platformSuperAdminUser;
  let orgBAdminUser;

  // Tokens
  let communityAdminToken;
  let facilityManagerToken;
  let residentAToken;
  let residentBToken;
  let guardToken;
  let platformSuperAdminToken;
  let orgBAdminToken;

  // Shared test resources
  let facilityA;
  let resourceA;
  let facilityB;
  let resourceB;

  // Shared active entities for tests
  let residentAHoldId;
  let residentBHoldId;
  let residentAReservationId;
  let residentAReservationNumber;
  let residentBReservationId;
  let residentBReservationNumber;
  let orgBReservationId;
  let orgBHoldId;

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v2/amenity-management`;

    const timestamp = Date.now();

    // 1. Seed Organizations
    testOrgA = await Organization.create({
      name: `Org A RBAC ${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'UTC',
    });

    testOrgB = await Organization.create({
      name: `Org B RBAC ${timestamp}`,
      organizationType: 'Residential',
      status: 'Active',
      timezone: 'UTC',
    });

    // 2. Seed Permissions
    const Role = (await import('../src/features/role/role.model.js')).default;
    const Permission = (await import('../src/features/permission/permission.model.js')).default;
    const RolePermission = (await import('../src/features/rolePermission/rolePermission.model.js')).default;

    const ensurePerm = async (feature, action, name) => {
      let perm = await Permission.findOne({ name });
      if (!perm) {
        perm = await Permission.create({ feature, action, name });
      }
      return perm;
    };

    const permDiscover = await ensurePerm('amenities', 'discover', 'amenities:discover');
    const permBooking = await ensurePerm('amenities', 'my_booking', 'amenities:my_booking');
    const permAmenities = await ensurePerm('amenities', 'amenities', 'amenities:amenities');
    const permAdminCal = await ensurePerm('amenities', 'admin_calander', 'amenities:admin_calander');
    const permFacType = await ensurePerm('amenities', 'facility_type', 'amenities:facility_type');
    const permSettings = await ensurePerm('amenities', 'settings', 'amenities:settings');
    const permScanner = await ensurePerm('amenities', 'scanner', 'amenities:scanner');
    const permReports = await ensurePerm('amenities', 'reports', 'amenities:reports');

    // 3. Seed Roles
    residentRole = await Role.create({
      name: `Resident_${timestamp}`,
      description: 'Resident role with discovery and booking permissions',
      orgId: testOrgA._id,
    });
    await RolePermission.create([
      { roleId: residentRole._id, permissionId: permDiscover._id },
      { roleId: residentRole._id, permissionId: permBooking._id },
    ]);

    facilityManagerRole = await Role.create({
      name: `Facility_Manager_${timestamp}`,
      description: 'Facility Manager role with administrative amenity permissions',
      orgId: testOrgA._id,
    });
    await RolePermission.create([
      { roleId: facilityManagerRole._id, permissionId: permAmenities._id },
      { roleId: facilityManagerRole._id, permissionId: permAdminCal._id },
      { roleId: facilityManagerRole._id, permissionId: permFacType._id },
      { roleId: facilityManagerRole._id, permissionId: permSettings._id },
      { roleId: facilityManagerRole._id, permissionId: permScanner._id },
      { roleId: facilityManagerRole._id, permissionId: permReports._id },
    ]);

    guardRole = await Role.create({
      name: `Security_Guard_${timestamp}`,
      description: 'Security Guard role with turnstile and scanner access',
      orgId: testOrgA._id,
    });
    await RolePermission.create([
      { roleId: guardRole._id, permissionId: permScanner._id },
    ]);

    // 4. Seed Users
    communityAdminUser = await User.create({
      email: `admin_rbac_${timestamp}@test.com`,
      username: `admin_rbac_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Community Admin',
    });

    facilityManagerUser = await User.create({
      email: `fm_rbac_${timestamp}@test.com`,
      username: `fm_rbac_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Facility Manager',
    });

    residentAUser = await User.create({
      email: `res_a_${timestamp}@test.com`,
      username: `res_a_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Resident',
    });

    residentBUser = await User.create({
      email: `res_b_${timestamp}@test.com`,
      username: `res_b_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Resident',
    });

    guardUser = await User.create({
      email: `guard_${timestamp}@test.com`,
      username: `guard_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Security Guard',
    });

    platformSuperAdminUser = await User.create({
      email: `psa_${timestamp}@test.com`,
      username: `psa_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Platform Super Admin',
    });

    orgBAdminUser = await User.create({
      email: `orgb_admin_${timestamp}@test.com`,
      username: `orgb_admin_${timestamp}`,
      password: 'hashedpassword123',
      status: 'Active',
      role: 'Community Admin',
    });

    // 5. Sign Tokens
    communityAdminToken = jwt.sign(
      { id: communityAdminUser._id.toString(), email: communityAdminUser.email, role: 'Community Admin', orgId: testOrgA._id.toString() },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    facilityManagerToken = jwt.sign(
      {
        id: facilityManagerUser._id.toString(),
        email: facilityManagerUser.email,
        role: 'Facility Manager',
        roleId: facilityManagerRole._id.toString(),
        orgId: testOrgA._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    residentAToken = jwt.sign(
      {
        id: residentAUser._id.toString(),
        email: residentAUser.email,
        role: 'Resident',
        roleId: residentRole._id.toString(),
        orgId: testOrgA._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    residentBToken = jwt.sign(
      {
        id: residentBUser._id.toString(),
        email: residentBUser.email,
        role: 'Resident',
        roleId: residentRole._id.toString(),
        orgId: testOrgA._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    guardToken = jwt.sign(
      {
        id: guardUser._id.toString(),
        email: guardUser.email,
        role: 'Security Guard',
        roleId: guardRole._id.toString(),
        orgId: testOrgA._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    platformSuperAdminToken = jwt.sign(
      {
        id: platformSuperAdminUser._id.toString(),
        email: platformSuperAdminUser.email,
        role: 'Platform Super Admin',
        isPlatformSuperAdmin: true,
        orgId: testOrgA._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    orgBAdminToken = jwt.sign(
      {
        id: orgBAdminUser._id.toString(),
        email: orgBAdminUser.email,
        role: 'Community Admin',
        orgId: testOrgB._id.toString(),
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );

    // 6. Create Facilities & Resources for Org A
    facilityA = await AmenityFacility.create({
      orgId: testOrgA._id,
      name: 'Org A Clubhouse Pool',
      code: `POOL-A-${timestamp}`,
      archetype: 'SHARED_CAPACITY',
      maxCapacity: 50,
      pricingType: 'FLAT_RATE',
      pricingRate: 100,
      pricingCurrency: 'INR',
      operatingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        openTime: '00:00',
        closeTime: '23:59',
        isOpen: true,
      })),
      status: 'ACTIVE',
      depositRequired: false,
    });

    resourceA = await AmenityResource.create({
      orgId: testOrgA._id,
      facilityId: facilityA._id,
      name: 'Lane 1',
      code: `LANE-1-${timestamp}`,
      identifier: 'LANE-1',
      resourceType: 'LANE',
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
      slotDurationMinutes: 60,
      status: 'ACTIVE',
    });

    // 7. Create Facilities & Resources for Org B
    facilityB = await AmenityFacility.create({
      orgId: testOrgB._id,
      name: 'Org B Tennis Court',
      code: `TENNIS-B-${timestamp}`,
      archetype: 'EXCLUSIVE_HOURLY',
      maxCapacity: 4,
      pricingType: 'FREE',
      pricingRate: 0,
      pricingCurrency: 'INR',
      operatingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        dayOfWeek: d,
        openTime: '00:00',
        closeTime: '23:59',
        isOpen: true,
      })),
      status: 'ACTIVE',
      depositRequired: false,
    });

    resourceB = await AmenityResource.create({
      orgId: testOrgB._id,
      facilityId: facilityB._id,
      name: 'Court 1',
      code: `COURT-1-${timestamp}`,
      identifier: 'COURT-1',
      resourceType: 'COURT',
      setupBufferMinutes: 0,
      teardownBufferMinutes: 0,
      slotDurationMinutes: 60,
      status: 'ACTIVE',
    });

    // 8. Seed Holds and Confirmed Reservations for Resident A & B in Org A
    const holdAStartTime = new Date(Date.now() + 3600000 * 24); // +1 day
    const holdAEndTime = new Date(holdAStartTime.getTime() + 3600000);

    const holdBStartTime = new Date(Date.now() + 3600000 * 48); // +2 days
    const holdBEndTime = new Date(holdBStartTime.getTime() + 3600000);

    const holdARes = await fetch(`${baseUrl}/holds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${residentAToken}`,
        'x-organization-id': testOrgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facilityId: facilityA._id.toString(),
        resourceId: resourceA._id.toString(),
        requestedStartDateTime: holdAStartTime.toISOString(),
        requestedEndDateTime: holdAEndTime.toISOString(),
        headcount: 2,
      }),
    });
    const holdABody = await holdARes.json();
    assert.equal(holdARes.status, 201, `Failed to create Resident A hold: ${JSON.stringify(holdABody)}`);
    residentAHoldId = holdABody.data.hold._id;

    // Confirm Resident A hold into reservation
    const confirmARes = await fetch(`${baseUrl}/reservations/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${residentAToken}`,
        'x-organization-id': testOrgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holdId: residentAHoldId,
        paymentReference: 'PAY-RES-A-100',
        notes: 'Resident A swimming session',
      }),
    });
    const confirmABody = await confirmARes.json();
    assert.equal(confirmARes.status, 201, `Failed to confirm Resident A reservation: ${JSON.stringify(confirmABody)}`);
    residentAReservationId = confirmABody.data.reservation._id;
    residentAReservationNumber = confirmABody.data.reservation.reservationNumber;

    // Create and Confirm Resident B hold into reservation
    const holdBRes = await fetch(`${baseUrl}/holds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${residentBToken}`,
        'x-organization-id': testOrgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facilityId: facilityA._id.toString(),
        resourceId: resourceA._id.toString(),
        requestedStartDateTime: holdBStartTime.toISOString(),
        requestedEndDateTime: holdBEndTime.toISOString(),
        headcount: 1,
      }),
    });
    const holdBBody = await holdBRes.json();
    assert.equal(holdBRes.status, 201, `Failed to create Resident B hold: ${JSON.stringify(holdBBody)}`);
    residentBHoldId = holdBBody.data.hold._id;

    const confirmBRes = await fetch(`${baseUrl}/reservations/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${residentBToken}`,
        'x-organization-id': testOrgA._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holdId: residentBHoldId,
        paymentReference: 'PAY-RES-B-200',
        notes: 'Resident B swimming session',
      }),
    });
    const confirmBBody = await confirmBRes.json();
    assert.equal(confirmBRes.status, 201, `Failed to confirm Resident B reservation: ${JSON.stringify(confirmBBody)}`);
    residentBReservationId = confirmBBody.data.reservation._id;
    residentBReservationNumber = confirmBBody.data.reservation.reservationNumber;

    // 9. Seed Org B Hold & Reservation
    const orgBStartTime = new Date(Date.now() + 3600000 * 72);
    const orgBEndTime = new Date(orgBStartTime.getTime() + 3600000);

    const holdOrgBRes = await fetch(`${baseUrl}/holds`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${orgBAdminToken}`,
        'x-organization-id': testOrgB._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facilityId: facilityB._id.toString(),
        resourceId: resourceB._id.toString(),
        requestedStartDateTime: orgBStartTime.toISOString(),
        requestedEndDateTime: orgBEndTime.toISOString(),
        headcount: 2,
      }),
    });
    const holdOrgBBody = await holdOrgBRes.json();
    assert.equal(holdOrgBRes.status, 201, `Failed to create Org B hold: ${JSON.stringify(holdOrgBBody)}`);
    orgBHoldId = holdOrgBBody.data.hold._id;

    const confirmOrgBRes = await fetch(`${baseUrl}/reservations/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${orgBAdminToken}`,
        'x-organization-id': testOrgB._id.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        holdId: orgBHoldId,
        paymentReference: 'PAY-ORGB-101',
      }),
    });
    const confirmOrgBBody = await confirmOrgBRes.json();
    assert.equal(confirmOrgBRes.status, 201, `Failed to confirm Org B reservation: ${JSON.stringify(confirmOrgBBody)}`);
    orgBReservationId = confirmOrgBBody.data.reservation._id;
  });

  after(async () => {
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }

    const orgIds = [testOrgA._id, testOrgB._id];
    const userIds = [
      communityAdminUser._id,
      facilityManagerUser._id,
      residentAUser._id,
      residentBUser._id,
      guardUser._id,
      platformSuperAdminUser._id,
      orgBAdminUser._id,
    ];

    await Promise.all([
      AmenityFacility.deleteMany({ orgId: { $in: orgIds } }),
      AmenityResource.deleteMany({ orgId: { $in: orgIds } }),
      AmenitySlotAllocation.deleteMany({ orgId: { $in: orgIds } }),
      AmenityAllocationLedger.deleteMany({ orgId: { $in: orgIds } }),
      AmenityReservationHold.deleteMany({ orgId: { $in: orgIds } }),
      AmenityReservation.deleteMany({ orgId: { $in: orgIds } }),
      AmenityAccessPass.deleteMany({ orgId: { $in: orgIds } }),
      AmenityCounter.deleteMany({ orgId: { $in: orgIds } }),
      Organization.deleteMany({ _id: { $in: orgIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);

    await mongoose.disconnect();
  });

  // =========================================================================
  // Test 1: Facility Manager Reservation Visibility
  // =========================================================================
  describe('Test 1: Facility Manager Reservation Visibility', () => {
    it('Facility Manager should list all reservations across tenant without resident scoping', async () => {
      const res = await fetch(`${baseUrl}/reservations`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.data));

      // Must see both Resident A and Resident B reservations (at least 2)
      assert.ok(body.data.total >= 2, `Expected at least 2 reservations, got ${body.data.total}`);
      const foundA = body.data.data.some((r) => r._id === residentAReservationId);
      const foundB = body.data.data.some((r) => r._id === residentBReservationId);
      assert.ok(foundA, 'Facility Manager must see Resident A reservation');
      assert.ok(foundB, 'Facility Manager must see Resident B reservation');
    });

    it('Facility Manager should view Resident A reservation by ID', async () => {
      const res = await fetch(`${baseUrl}/reservations/${residentAReservationId}`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data._id, residentAReservationId);
      const resResidentId = (body.data.residentId?._id || body.data.residentId)?.toString();
      assert.equal(resResidentId, residentAUser._id.toString());
    });

    it('Facility Manager should view Resident B reservation by sequential number', async () => {
      const res = await fetch(`${baseUrl}/reservations/number/${residentBReservationNumber}`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data._id, residentBReservationId);
    });

    it('Facility Manager should cancel a resident reservation under administrative scope', async () => {
      // Create a temporary reservation for cancellation
      const startTime = new Date(Date.now() + 3600000 * 96);
      const endTime = new Date(startTime.getTime() + 3600000);

      const holdRes = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: facilityA._id.toString(),
          resourceId: resourceA._id.toString(),
          requestedStartDateTime: startTime.toISOString(),
          requestedEndDateTime: endTime.toISOString(),
          headcount: 1,
        }),
      });
      const holdBody = await holdRes.json();
      assert.equal(holdRes.status, 201);

      const confirmRes = await fetch(`${baseUrl}/reservations/confirm`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holdId: holdBody.data.hold._id,
          paymentReference: 'PAY-TEMP-CANCEL-FM',
        }),
      });
      const confirmBody = await confirmRes.json();
      assert.equal(confirmRes.status, 201);
      const tempResvId = confirmBody.data.reservation._id;

      // Facility Manager cancels Resident A's reservation
      const cancelRes = await fetch(`${baseUrl}/reservations/${tempResvId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Administrative cancellation by Facility Manager for maintenance',
        }),
      });

      assert.equal(cancelRes.status, 200);
      const cancelBody = await cancelRes.json();
      assert.equal(cancelBody.success, true);
      assert.equal(cancelBody.data.bookingStatus, 'CANCELLED');
    });
  });

  // =========================================================================
  // Test 2: Resident Reservation Visibility
  // =========================================================================
  describe('Test 2: Resident Reservation Visibility Restrictions', () => {
    it('Resident A should only see their own reservations in list query', async () => {
      const res = await fetch(`${baseUrl}/reservations`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.data.length > 0);

      // All returned records must belong to residentA
      for (const item of body.data.data) {
        const itemResidentId = (item.residentId?._id || item.residentId)?.toString();
        assert.equal(itemResidentId, residentAUser._id.toString());
      }
    });

    it('Resident A should have effectiveResidentId enforced even if requesting Resident B query param', async () => {
      const res = await fetch(`${baseUrl}/reservations?residentId=${residentBUser._id.toString()}`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);

      // Must be forced to Resident A, so Resident B records are NEVER returned
      for (const item of body.data.data) {
        const itemResidentId = (item.residentId?._id || item.residentId)?.toString();
        assert.equal(itemResidentId, residentAUser._id.toString());
      }
    });

    it('Resident A can successfully view their own reservation by ID', async () => {
      const res = await fetch(`${baseUrl}/reservations/${residentAReservationId}`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data._id, residentAReservationId);
    });
  });

  // =========================================================================
  // Test 3: Community Admin Reservation Visibility
  // =========================================================================
  describe('Test 3: Community Admin Reservation Visibility', () => {
    it('Community Admin retains full administrative scope over all tenant reservations', async () => {
      const res = await fetch(`${baseUrl}/reservations`, {
        headers: {
          Authorization: `Bearer ${communityAdminToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.total >= 2);

      const foundA = body.data.data.some((r) => r._id === residentAReservationId);
      const foundB = body.data.data.some((r) => r._id === residentBReservationId);
      assert.ok(foundA, 'Community Admin must see Resident A reservation');
      assert.ok(foundB, 'Community Admin must see Resident B reservation');
    });

    it('Community Admin can view any reservation by ID', async () => {
      const res = await fetch(`${baseUrl}/reservations/${residentAReservationId}`, {
        headers: {
          Authorization: `Bearer ${communityAdminToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data._id, residentAReservationId);
    });
  });

  // =========================================================================
  // Test 4: Unauthorized Resident Access Attempts (403 Forbidden)
  // =========================================================================
  describe('Test 4: Unauthorized Resident Access Attempts', () => {
    it('Resident A should receive 403 Forbidden when attempting to view Resident B reservation by ID', async () => {
      const res = await fetch(`${baseUrl}/reservations/${residentBReservationId}`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to view this reservation/i);
    });

    it('Resident A should receive 403 Forbidden when attempting to view Resident B reservation by number', async () => {
      const res = await fetch(`${baseUrl}/reservations/number/${residentBReservationNumber}`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to view this reservation/i);
    });

    it('Resident A should receive 403 Forbidden when attempting to cancel Resident B reservation', async () => {
      const res = await fetch(`${baseUrl}/reservations/${residentBReservationId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Malicious cancel attempt' }),
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to cancel this reservation/i);
    });

    it('Resident A should receive 403 Forbidden when attempting to view passes for Resident B reservation', async () => {
      const res = await fetch(`${baseUrl}/passes/reservation/${residentBReservationId}`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to view passes/i);
    });
  });

  // =========================================================================
  // Test 5: Facility Manager Hold Access
  // =========================================================================
  describe('Test 5: Facility Manager Hold Access', () => {
    let createdFmHoldId;

    let customUnitId;

    it('Facility Manager should be able to create hold specifying custom unitId on behalf of unit', async () => {
      const startTime = new Date(Date.now() + 3600000 * 120);
      const endTime = new Date(startTime.getTime() + 3600000);
      customUnitId = new mongoose.Types.ObjectId().toString();

      const res = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: facilityA._id.toString(),
          resourceId: resourceA._id.toString(),
          requestedStartDateTime: startTime.toISOString(),
          requestedEndDateTime: endTime.toISOString(),
          headcount: 2,
          unitId: customUnitId,
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.hold.unitId, customUnitId);
      createdFmHoldId = body.data.hold._id;
    });

    it('Facility Manager should retrieve hold details created by another user', async () => {
      const res = await fetch(`${baseUrl}/holds/${createdFmHoldId}`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data._id, createdFmHoldId);
    });

    it('Facility Manager should expire an active hold early under administrative authority', async () => {
      const res = await fetch(`${baseUrl}/holds/${createdFmHoldId}/expire`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'EXPIRED');
    });

    it('Resident A should receive 403 Forbidden when attempting to view Resident B hold', async () => {
      // Create fresh active hold for Resident B
      const startTime = new Date(Date.now() + 3600000 * 140);
      const endTime = new Date(startTime.getTime() + 3600000);

      const holdRes = await fetch(`${baseUrl}/holds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentBToken}`,
          'x-organization-id': testOrgA._id.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facilityId: facilityA._id.toString(),
          resourceId: resourceA._id.toString(),
          requestedStartDateTime: startTime.toISOString(),
          requestedEndDateTime: endTime.toISOString(),
          headcount: 1,
        }),
      });
      const holdBody = await holdRes.json();
      assert.equal(holdRes.status, 201);
      const freshHoldBId = holdBody.data.hold._id;

      // Resident A tries to view Resident B hold
      const getRes = await fetch(`${baseUrl}/holds/${freshHoldBId}`, {
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });
      assert.equal(getRes.status, 403);
      const getBody = await getRes.json();
      assert.match(getBody.message, /Forbidden.*permission to view this hold/i);

      // Resident A tries to expire Resident B hold
      const expRes = await fetch(`${baseUrl}/holds/${freshHoldBId}/expire`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${residentAToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });
      assert.equal(expRes.status, 403);
      const expBody = await expRes.json();
      assert.match(expBody.message, /Forbidden.*permission to release this hold/i);
    });
  });

  // =========================================================================
  // Test 6: Facility Manager Pass Retrieval
  // =========================================================================
  describe('Test 6: Facility Manager & Guard Pass Retrieval', () => {
    it('Facility Manager should retrieve passes for any resident reservation within tenant', async () => {
      const res = await fetch(`${baseUrl}/passes/reservation/${residentAReservationId}`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length > 0);
      assert.equal(body.data[0].reservationId, residentAReservationId);
    });

    it('Security Guard (scanner permission) should retrieve passes for any resident reservation', async () => {
      const res = await fetch(`${baseUrl}/passes/reservation/${residentAReservationId}`, {
        headers: {
          Authorization: `Bearer ${guardToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length > 0);
    });
  });

  // =========================================================================
  // Test 7: Tenant Isolation
  // =========================================================================
  describe('Test 7: Tenant Isolation Security Enforcement', () => {
    it('Org A Facility Manager cannot access Org B reservation (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/reservations/${orgBReservationId}`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      // Tenant isolation: reservation belongs to Org B, caller is Org A
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Reservation not found/i);
    });

    it('Org A Facility Manager cannot view Org B hold (returns 403/404)', async () => {
      const res = await fetch(`${baseUrl}/holds/${orgBHoldId}`, {
        headers: {
          Authorization: `Bearer ${facilityManagerToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.ok(res.status === 403 || res.status === 404);
      const body = await res.json();
      assert.equal(body.success, false);
    });

    it('Org A Community Admin cannot access Org B reservation', async () => {
      const res = await fetch(`${baseUrl}/reservations/${orgBReservationId}`, {
        headers: {
          Authorization: `Bearer ${communityAdminToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 404);
    });
  });

  // =========================================================================
  // Test 8: Platform Super Admin Bypass
  // =========================================================================
  describe('Test 8: Platform Super Admin Bypass', () => {
    it('Platform Super Admin has full administrative scope over reservations', async () => {
      const res = await fetch(`${baseUrl}/reservations`, {
        headers: {
          Authorization: `Bearer ${platformSuperAdminToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.total >= 2);
    });

    it('Platform Super Admin can view any reservation by ID without resident restrictions', async () => {
      const res = await fetch(`${baseUrl}/reservations/${residentAReservationId}`, {
        headers: {
          Authorization: `Bearer ${platformSuperAdminToken}`,
          'x-organization-id': testOrgA._id.toString(),
        },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data._id, residentAReservationId);
    });
  });
});
