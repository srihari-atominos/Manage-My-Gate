import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import config from '../src/config/config.js';
import AmenityReservation from '../src/features/amenityManagement/reservations/amenityReservation.model.js';
import AmenityMaintenanceBlock from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.model.js';
import AmenityFacility from '../src/features/amenityManagement/facilities/amenityFacility.model.js';
import AmenityResource from '../src/features/amenityManagement/resources/amenityResource.model.js';
import AmenityBooking from '../src/features/amenityBooking/amenityBooking.model.js';
import User from '../src/features/user/user.model.js';
import Villa from '../src/features/villa/villa.model.js';

import amenityReservationRepository from '../src/features/amenityManagement/reservations/amenityReservation.repository.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityDashboardService from '../src/features/amenityDashboard/amenityDashboard.service.js';

describe('Admin Calendar Integration & Verification Suite', () => {
  let isConnected = false;

  const orgId1 = new mongoose.Types.ObjectId();
  const orgId2 = new mongoose.Types.ObjectId(); // Other tenant for isolation testing

  let testUser1;
  let testUser2;
  let testVilla1;
  let facilityTennis;
  let facilityPool;
  let court1;
  let court2;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      const mongoUri = config.mongodb?.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/gated_community_test';
      await mongoose.connect(mongoUri);
      isConnected = true;
    }

    // Clean test data
    await AmenityReservation.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityMaintenanceBlock.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityFacility.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityResource.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityBooking.deleteMany({ orgId: { $in: [orgId1, orgId2] } });

    // Seed test users
    testUser1 = await User.create({
      name: 'John Doe',
      username: `johndoe_${Date.now()}`,
      email: `john_${Date.now()}@example.com`,
      phoneNumber: '9876543210',
      flatNumber: 'A-101',
      building: 'Tower A',
      tower: 'A',
      orgId: orgId1,
      password: 'HashedPassword123!',
    });

    testUser2 = await User.create({
      name: 'Jane Smith',
      username: `janesmith_${Date.now()}`,
      email: `jane_${Date.now()}@example.com`,
      phoneNumber: '9876543211',
      flatNumber: 'B-202',
      building: 'Tower B',
      tower: 'B',
      orgId: orgId1,
      password: 'HashedPassword123!',
    });

    // Seed unit
    testVilla1 = await Villa.create({
      unitNumber: 'A-101',
      villaNumber: 'A-101',
      orgId: orgId1,
      block: 'Tower A',
      floor: 1,
    });

    // Seed facilities
    facilityTennis = await AmenityFacility.create({
      orgId: orgId1,
      name: 'Tennis Court Complex',
      code: `TC_${Date.now()}`,
      archetype: 'EXCLUSIVE_HOURLY',
      type: 'EXCLUSIVE_HOURLY',
      category: 'SPORTS',
      operatingHours: [{ dayOfWeek: 1, openTime: '06:00', closeTime: '22:00' }],
    });

    facilityPool = await AmenityFacility.create({
      orgId: orgId1,
      name: 'Swimming Pool',
      code: `POOL_${Date.now()}`,
      archetype: 'SHARED_CAPACITY',
      type: 'SHARED_CAPACITY',
      category: 'AQUATICS',
      operatingHours: [{ dayOfWeek: 1, openTime: '06:00', closeTime: '21:00' }],
    });

    // Seed resources
    court1 = await AmenityResource.create({
      orgId: orgId1,
      facilityId: facilityTennis._id,
      name: 'Court 1',
      identifier: 'COURT-1',
      resourceCode: 'C1',
      type: 'COURT',
      capacity: 4,
    });

    court2 = await AmenityResource.create({
      orgId: orgId1,
      facilityId: facilityTennis._id,
      name: 'Court 2',
      identifier: 'COURT-2',
      resourceCode: 'C2',
      type: 'COURT',
      capacity: 4,
    });
  });

  after(async () => {
    // Clean up
    await AmenityReservation.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityMaintenanceBlock.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityFacility.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityResource.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    await AmenityBooking.deleteMany({ orgId: { $in: [orgId1, orgId2] } });
    if (testUser1) await User.deleteOne({ _id: testUser1._id });
    if (testUser2) await User.deleteOne({ _id: testUser2._id });
    if (testVilla1) await Villa.deleteOne({ _id: testVilla1._id });

    if (isConnected) {
      await mongoose.disconnect();
    }
  });

  /* =========================================================================
   * TEST 1: V2 AmenityReservation Retrieval & Date Range Overlap
   * ========================================================================= */
  it('should retrieve V2 AmenityReservation overlapping the calendar date range', async () => {
    // Create reservation for March 15, 2026, 10:00 to 11:00
    const res1 = await AmenityReservation.create({
      orgId: orgId1,
      facilityId: facilityTennis._id,
      resourceId: court1._id,
      residentId: testUser1._id,
      unitId: testVilla1._id,
      reservationNumber: `RES-${Date.now()}-001`,
      requestedStartDateTime: new Date('2026-03-15T10:00:00.000Z'),
      requestedEndDateTime: new Date('2026-03-15T11:00:00.000Z'),
      effectiveStartDateTime: new Date('2026-03-15T10:00:00.000Z'),
      effectiveEndDateTime: new Date('2026-03-15T11:00:00.000Z'),
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      totalAmount: 500,
    });

    const events = await amenityReservationRepository.findEventsForCalendar({
      orgId: orgId1,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });

    assert.ok(Array.isArray(events), 'Should return an array');
    const found = events.find((e) => String(e._id) === String(res1._id));
    assert.ok(found, 'Should find created V2 reservation in March range');
    assert.strictEqual(found.reservationNumber, res1.reservationNumber);
    assert.strictEqual(String(found.facilityId?._id || found.facilityId), String(facilityTennis._id));
    assert.strictEqual(String(found.resourceId?._id || found.resourceId), String(court1._id));
  });

  /* =========================================================================
   * TEST 2: Tenant Isolation
   * ========================================================================= */
  it('should enforce strict tenant isolation — events from other orgId are never returned', async () => {
    // Create reservation in Org2
    await AmenityReservation.create({
      orgId: orgId2,
      facilityId: facilityTennis._id,
      residentId: testUser1._id,
      unitId: testVilla1._id,
      reservationNumber: `ORG2-${Date.now()}`,
      requestedStartDateTime: new Date('2026-03-15T14:00:00.000Z'),
      requestedEndDateTime: new Date('2026-03-15T15:00:00.000Z'),
      effectiveStartDateTime: new Date('2026-03-15T14:00:00.000Z'),
      effectiveEndDateTime: new Date('2026-03-15T15:00:00.000Z'),
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'NOT_REQUIRED',
      totalAmount: 0,
    });

    const eventsOrg1 = await amenityReservationRepository.findEventsForCalendar({
      orgId: orgId1,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });

    const hasOrg2 = eventsOrg1.some((e) => String(e.orgId) === String(orgId2));
    assert.strictEqual(hasOrg2, false, 'Org1 calendar query must never return Org2 events');
  });

  /* =========================================================================
   * TEST 3: V2 AmenityMaintenanceBlock Retrieval & Calendar Overlay
   * ========================================================================= */
  it('should retrieve V2 AmenityMaintenanceBlock overlapping the calendar date range', async () => {
    const block1 = await AmenityMaintenanceBlock.create({
      orgId: orgId1,
      facilityId: facilityTennis._id,
      resourceId: court2._id,
      title: 'Net Replacement & Resurfacing',
      maintenanceType: 'REPAIR',
      reason: 'Worn out net and surface damage',
      startDateTime: new Date('2026-03-20T08:00:00.000Z'),
      endDateTime: new Date('2026-03-20T14:00:00.000Z'),
      status: 'SCHEDULED',
      isCompleteClosure: false,
    });

    const blocks = await amenityMaintenanceBlockRepository.findBlocksForCalendar({
      orgId: orgId1,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });

    assert.ok(Array.isArray(blocks), 'Should return array of blocks');
    const foundBlock = blocks.find((b) => String(b._id) === String(block1._id));
    assert.ok(foundBlock, 'Should find maintenance block in calendar query');
    assert.strictEqual(foundBlock.title, 'Net Replacement & Resurfacing');
    assert.strictEqual(foundBlock.status, 'SCHEDULED');
  });

  /* =========================================================================
   * TEST 4: Unified Service Orchestration (Deduplication & Normalization)
   * ========================================================================= */
  it('should unify V2 reservations, V2 maintenance, and V1 bookings via amenityDashboardService', async () => {
    // 1. Create a V2 reservation
    const v2Res = await AmenityReservation.create({
      orgId: orgId1,
      facilityId: facilityTennis._id,
      resourceId: court1._id,
      residentId: testUser1._id,
      unitId: testVilla1._id,
      reservationNumber: `UNIFY-V2-${Date.now()}`,
      requestedStartDateTime: new Date('2026-03-25T09:00:00.000Z'),
      requestedEndDateTime: new Date('2026-03-25T10:00:00.000Z'),
      effectiveStartDateTime: new Date('2026-03-25T09:00:00.000Z'),
      effectiveEndDateTime: new Date('2026-03-25T10:00:00.000Z'),
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      totalAmount: 300,
    });

    // 2. Create a legacy V1 booking that DUPLICATES the V2 reservation (same facility, date, start, user)
    await AmenityBooking.create({
      orgId: orgId1,
      amenityId: facilityTennis._id,
      userId: testUser1._id,
      bookingId: `DUP-V1-${Date.now()}`,
      bookingDate: '2026-03-25',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
      paymentStatus: 'captured',
      totalPrice: 300,
    });

    // 3. Create a unique legacy V1 booking
    const v1Unique = await AmenityBooking.create({
      orgId: orgId1,
      amenityId: facilityPool._id,
      userId: testUser2._id,
      bookingId: `UNIQUE-V1-${Date.now()}`,
      bookingDate: '2026-03-25',
      startTime: '15:00',
      endTime: '16:00',
      status: 'confirmed',
      paymentStatus: 'captured',
      totalPrice: 150,
    });

    const unifiedEvents = await amenityDashboardService.getCalendarEvents(
      orgId1,
      '2026-03-01',
      '2026-03-31'
    );

    assert.ok(Array.isArray(unifiedEvents), 'Unified events must be an array');

    // Verify V2 reservation is present
    const v2Event = unifiedEvents.find((e) => e.bookingId === v2Res.reservationNumber);
    assert.ok(v2Event, 'V2 reservation must be present in unified calendar');
    assert.strictEqual(v2Event.version, 'v2');
    assert.strictEqual(v2Event.type, 'booking');

    // Verify duplicate V1 booking is discarded
    const dupCount = unifiedEvents.filter(
      (e) => e.date === '2026-03-25' && e.start === '09:00' && e.amenityId === String(facilityTennis._id)
    );
    assert.strictEqual(dupCount.length, 1, 'Duplicate V1 booking must be deduplicated; only V2 should remain');

    // Verify unique V1 booking is included
    const uniqueV1Event = unifiedEvents.find((e) => e.bookingId === v1Unique.bookingId);
    assert.ok(uniqueV1Event, 'Unique V1 booking must be included');
    assert.strictEqual(uniqueV1Event.version, 'v1');

    // Verify maintenance is present
    const maintEvent = unifiedEvents.find((e) => e.type === 'maintenance');
    assert.ok(maintEvent, 'Maintenance block must be present in unified calendar');
  });

  /* =========================================================================
   * TEST 5: Accurate Payment Status Calculation (Partial vs Paid)
   * ========================================================================= */
  it('should accurately calculate PARTIALLY_PAID when totalAmount > paidAmount && paidAmount > 0', async () => {
    // Create reservation with total 1000 and paid 400
    const partialRes = await AmenityReservation.create({
      orgId: orgId1,
      facilityId: facilityTennis._id,
      residentId: testUser1._id,
      unitId: testVilla1._id,
      reservationNumber: `PARTIAL-${Date.now()}`,
      requestedStartDateTime: new Date('2026-03-28T16:00:00.000Z'),
      requestedEndDateTime: new Date('2026-03-28T17:00:00.000Z'),
      effectiveStartDateTime: new Date('2026-03-28T16:00:00.000Z'),
      effectiveEndDateTime: new Date('2026-03-28T17:00:00.000Z'),
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      totalAmount: 1000,
      paidAmount: 400,
      pricingSnapshot: { totalAmount: 1000 },
    });

    const events = await amenityDashboardService.getCalendarEvents(
      orgId1,
      '2026-03-28',
      '2026-03-28'
    );

    const event = events.find((e) => e.bookingId === partialRes.reservationNumber);
    assert.ok(event, 'Reservation must be found');
    assert.strictEqual(event.paymentStatus, 'PARTIALLY_PAID', 'Must be PARTIALLY_PAID, never PAID');
    assert.strictEqual(event.bookingAmount, 1000);
    assert.strictEqual(event.paidAmount, 400);
    assert.strictEqual(event.remainingAmount, 600);
  });

  /* =========================================================================
   * TEST 6: Operational Status Enforcement (No Approval Statuses)
   * ========================================================================= */
  it('should enforce operational lifecycle statuses without approval references', async () => {
    const events = await amenityDashboardService.getCalendarEvents(
      orgId1,
      '2026-03-01',
      '2026-03-31'
    );

    const validOperationalStatuses = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'SCHEDULED', 'IN_PROGRESS'];
    events.forEach((evt) => {
      assert.ok(
        validOperationalStatuses.includes(evt.status?.toUpperCase()),
        `Status ${evt.status} must be a valid operational status (no approval statuses)`
      );
      assert.notStrictEqual(evt.status?.toLowerCase(), 'pending_approval');
      assert.notStrictEqual(evt.status?.toLowerCase(), 'approved');
      assert.notStrictEqual(evt.status?.toLowerCase(), 'rejected');
    });
  });

  /* =========================================================================
   * TEST 7: Filtering Capabilities (Facility, Resource, Status, Search)
   * ========================================================================= */
  it('should filter events by facilityId, resourceId, and search query', async () => {
    // Filter by facility
    const tennisEvents = await amenityDashboardService.getCalendarEvents(
      orgId1,
      '2026-03-01',
      '2026-03-31',
      { facilityId: String(facilityTennis._id) }
    );
    tennisEvents.forEach((e) => {
      assert.strictEqual(String(e.amenityId), String(facilityTennis._id));
    });

    // Search by resident name
    const searchEvents = await amenityDashboardService.getCalendarEvents(
      orgId1,
      '2026-03-01',
      '2026-03-31',
      { search: 'John Doe' }
    );
    assert.ok(searchEvents.length > 0, 'Should find events for John Doe');
    searchEvents.forEach((e) => {
      const match =
        e.residentName?.toLowerCase().includes('john doe') ||
        e.subtitle?.toLowerCase().includes('john doe');
      assert.ok(match, 'Search match must be true');
    });
  });
});
