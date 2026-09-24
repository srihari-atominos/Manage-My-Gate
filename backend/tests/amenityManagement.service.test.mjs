import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Import services, repositories, and models from barrel export
import {
  amenityFacilityService,
  amenityResourceService,
  amenityReservationHoldService,
  amenityReservationService,
  amenityAccessPassService,
  amenityQuotaAllocationService,
  amenityMaintenanceBlockService,
  amenityCounterService,
  amenityIdempotencyService,
  availabilityService,
  pricingService,
  resourceMutexService,
  withTransaction,
  AMENITY_EVENTS,
  amenityManagementEvents,
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

// Legacy models to assert immutability
import LegacyAmenity from '../src/features/amenity/amenity.model.js';
import LegacyAmenityBooking from '../src/features/amenityBooking/amenityBooking.model.js';
import LegacyBooking from '../src/features/booking/booking.model.js';

describe('Amenity Management Phase 4B — Services, Repositories, Transactions & Concurrency', () => {
  const testOrgId = new mongoose.Types.ObjectId();
  const testResidentId = new mongoose.Types.ObjectId();
  const testUnitId = new mongoose.Types.ObjectId();
  const testAdminId = new mongoose.Types.ObjectId();

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  after(async () => {
    // Clean up test data created during this suite
    await Promise.all([
      AmenityFacility.deleteMany({ orgId: testOrgId }),
      AmenityResource.deleteMany({ orgId: testOrgId }),
      AmenitySlotAllocation.deleteMany({ orgId: testOrgId }),
      AmenityAllocationLedger.deleteMany({ orgId: testOrgId }),
      AmenityReservationHold.deleteMany({ orgId: testOrgId }),
      AmenityReservation.deleteMany({ orgId: testOrgId }),
      AmenityQuotaAllocation.deleteMany({ orgId: testOrgId }),
      AmenityAccessPass.deleteMany({ orgId: testOrgId }),
      AmenityMaintenanceBlock.deleteMany({ orgId: testOrgId }),
      AmenityOutboxEvent.deleteMany({ orgId: testOrgId }),
      AmenityIdempotencyRecord.deleteMany({ orgId: testOrgId }),
      AmenityCounter.deleteMany({ orgId: testOrgId }),
    ]);
    await mongoose.disconnect();
  });

  /* =========================================================================
   * 1. Pricing Service Unit Tests
   * ========================================================================= */
  describe('1. Pricing Domain Service', () => {
    const start = new Date('2026-10-01T10:00:00.000Z');
    const end = new Date('2026-10-01T12:00:00.000Z'); // 2 hours

    it('should calculate 0 amounts for FREE pricing', () => {
      const snapshot = pricingService.calculatePricingSnapshot({
        pricingConfig: { pricingType: 'FREE' },
        startDateTime: start,
        endDateTime: end,
      });
      assert.equal(snapshot.baseAmount, 0);
      assert.equal(snapshot.taxAmount, 0);
      assert.equal(snapshot.totalAmount, 0);
    });

    it('should compute HOURLY pricing with tax and security deposit', () => {
      const snapshot = pricingService.calculatePricingSnapshot({
        pricingConfig: {
          pricingType: 'HOURLY',
          baseRate: 500,
          taxPercentage: 18,
          securityDeposit: 1000,
          currency: 'INR',
        },
        startDateTime: start,
        endDateTime: end,
        quantity: 1,
      });

      // 2 hours * 500 = 1000 base
      assert.equal(snapshot.baseAmount, 1000);
      // 18% of 1000 = 180
      assert.equal(snapshot.taxAmount, 180);
      assert.equal(snapshot.totalAmount, 2180);
      assert.equal(snapshot.depositAmount, 1000);
      assert.equal(snapshot.currency, 'INR');
    });

    it('should compute FIXED_EVENT pricing correctly', () => {
      const snapshot = pricingService.calculatePricingSnapshot({
        pricingConfig: {
          pricingType: 'FIXED_EVENT',
          baseRate: 5000,
          taxPercentage: 10,
        },
        startDateTime: start,
        endDateTime: end,
      });
      assert.equal(snapshot.baseAmount, 5000);
      assert.equal(snapshot.taxAmount, 500);
      assert.equal(snapshot.totalAmount, 5500);
    });
  });

  /* =========================================================================
   * 2. Quota Allocation Service Tests
   * ========================================================================= */
  describe('2. Household Quota Allocation Service', () => {
    const facilityId = new mongoose.Types.ObjectId();
    const now = new Date('2026-09-15T12:00:00Z');

    it('should generate deterministic period tokens', () => {
      const dailyToken = amenityQuotaAllocationService.getPeriodToken('DAILY', now);
      assert.equal(dailyToken, '2026-09-15');

      const monthlyToken = amenityQuotaAllocationService.getPeriodToken('MONTHLY', now);
      assert.equal(monthlyToken, '2026-09');

      const quotaId = amenityQuotaAllocationService.getQuotaId(
        testOrgId,
        testUnitId,
        facilityId,
        monthlyToken
      );
      assert.equal(quotaId, `QUOTA:${testOrgId}:${testUnitId}:${facilityId}:2026-09`);
    });

    it('should reserve quota and reject if quotaLimit is exceeded', async () => {
      // 1. Reserve 120 minutes of 240 limit -> OK
      const quota = await amenityQuotaAllocationService.reserveQuota({
        orgId: testOrgId,
        unitId: testUnitId,
        facilityId,
        quotaLimit: 240,
        requestedUnits: 120,
        date: now,
      });
      assert.ok(quota);
      assert.equal(quota.reservedAmount, 120);
      assert.equal(quota.consumedAmount, 0);

      // 2. Reserve another 120 minutes -> Total 240/240 -> OK
      const quota2 = await amenityQuotaAllocationService.reserveQuota({
        orgId: testOrgId,
        unitId: testUnitId,
        facilityId,
        quotaLimit: 240,
        requestedUnits: 120,
        date: now,
      });
      assert.equal(quota2.reservedAmount, 240);

      // 3. Attempt to reserve 1 more minute -> Exceeds limit -> Should throw 403
      await assert.rejects(
        async () => {
          await amenityQuotaAllocationService.reserveQuota({
            orgId: testOrgId,
            unitId: testUnitId,
            facilityId,
            quotaLimit: 240,
            requestedUnits: 1,
            date: now,
          });
        },
        (err) => err.statusCode === 403 && err.message.includes('Household quota limit exceeded')
      );
    });

    it('should promote, release, and refund quota units atomically', async () => {
      // Promote 120 units from reserved to consumed
      const promoted = await amenityQuotaAllocationService.promoteQuota({
        orgId: testOrgId,
        unitId: testUnitId,
        facilityId,
        requestedUnits: 120,
        date: now,
      });
      assert.equal(promoted.reservedAmount, 120);
      assert.equal(promoted.consumedAmount, 120);

      // Release remaining 120 reserved units
      const released = await amenityQuotaAllocationService.releaseQuota({
        orgId: testOrgId,
        unitId: testUnitId,
        facilityId,
        requestedUnits: 120,
        date: now,
      });
      assert.equal(released.reservedAmount, 0);
      assert.equal(released.consumedAmount, 120);

      // Refund 60 consumed units
      const refunded = await amenityQuotaAllocationService.refundQuota({
        orgId: testOrgId,
        unitId: testUnitId,
        facilityId,
        requestedUnits: 60,
        date: now,
      });
      assert.equal(refunded.consumedAmount, 60);
    });
  });

  /* =========================================================================
   * 3. Idempotency Service Tests
   * ========================================================================= */
  describe('3. Idempotency Service', () => {
    it('should execute business handler and cache completed result for replay', async () => {
      const idempotencyKey = `KEY-${Date.now()}`;
      const payload = { action: 'book', time: '10:00' };
      let executionCount = 0;

      const handler = async () => {
        executionCount++;
        return { statusCode: 201, body: { success: true, count: executionCount } };
      };

      // First call
      const res1 = await amenityIdempotencyService.executeWithIdempotency(
        { orgId: testOrgId, idempotencyKey, requestPayload: payload },
        handler
      );
      assert.equal(res1.isReplay, false);
      assert.equal(res1.body.count, 1);
      assert.equal(executionCount, 1);

      // Second call with same idempotency key and same payload -> Replayed from cache!
      const res2 = await amenityIdempotencyService.executeWithIdempotency(
        { orgId: testOrgId, idempotencyKey, requestPayload: payload },
        handler
      );
      assert.equal(res2.isReplay, true);
      assert.equal(res2.body.count, 1);
      assert.equal(executionCount, 1); // Handler was not executed again
    });

    it('should throw 409 Conflict if same idempotency key is reused with different payload', async () => {
      const idempotencyKey = `KEY-DIFF-${Date.now()}`;
      await amenityIdempotencyService.executeWithIdempotency(
        { orgId: testOrgId, idempotencyKey, requestPayload: { foo: 'bar' } },
        async () => ({ statusCode: 200, body: 'ok' })
      );

      await assert.rejects(
        async () => {
          await amenityIdempotencyService.executeWithIdempotency(
            { orgId: testOrgId, idempotencyKey, requestPayload: { foo: 'different_payload' } },
            async () => ({ statusCode: 200, body: 'ok' })
          );
        },
        (err) => err.statusCode === 409 && err.message.includes('payload mismatch')
      );
    });
  });

  /* =========================================================================
   * 4. Access Pass Service & Anti-Replay Turnstile Security
   * ========================================================================= */
  describe('4. Access Pass Service & Anti-Replay Security', () => {
    const reservationId = new mongoose.Types.ObjectId();
    let issuedRawToken = null;
    let issuedPassId = null;

    it('should issue access pass storing only SHA-256 hash in DB and returning rawToken', async () => {
      const validFrom = new Date(Date.now() - 30 * 60 * 1000); // 30m ago
      const validUntil = new Date(Date.now() + 60 * 60 * 1000); // 1h in future

      const { pass, rawToken } = await amenityAccessPassService.issueAccessPass({
        orgId: testOrgId,
        reservationId,
        passType: 'QR_DYNAMIC',
        validFrom,
        validUntil,
      });

      assert.ok(pass);
      assert.ok(rawToken);
      assert.equal(typeof rawToken, 'string');
      issuedRawToken = rawToken;
      issuedPassId = pass._id;

      // Verify DB document: contains passTokenHash, NEVER rawToken
      const stored = await AmenityAccessPass.findById(pass._id);
      assert.ok(stored.passTokenHash);
      assert.notEqual(stored.passTokenHash, rawToken);
      assert.equal(stored.checkInTimestamp, null);
    });

    it('should validate and record first turnstile check-in', async () => {
      const checkInResult = await amenityAccessPassService.validateAndRecordCheckIn({
        orgId: testOrgId,
        rawToken: issuedRawToken,
        gateId: 'NORTH_TURNSTILE_01',
      });

      assert.ok(checkInResult);
      assert.ok(checkInResult.checkInTimestamp);
      assert.equal(checkInResult.gateId, 'NORTH_TURNSTILE_01');
    });

    it('should REJECT second check-in with 409 Anti-Replay Violation', async () => {
      await assert.rejects(
        async () => {
          await amenityAccessPassService.validateAndRecordCheckIn({
            orgId: testOrgId,
            rawToken: issuedRawToken,
            gateId: 'NORTH_TURNSTILE_01',
          });
        },
        (err) => err.statusCode === 409 && err.message.includes('Anti-replay violation')
      );
    });

    it('should record check-out with inspection details', async () => {
      const checkoutResult = await amenityAccessPassService.recordCheckOut({
        orgId: testOrgId,
        rawToken: issuedRawToken,
        inspectionDetails: {
          checkedOutByStaff: testAdminId,
          damageNotes: 'No damage, equipment returned in pristine condition',
          damageCharges: 0,
        },
      });

      assert.ok(checkoutResult.checkOutTimestamp);
      assert.equal(
        checkoutResult.inspectionDetails.damageNotes,
        'No damage, equipment returned in pristine condition'
      );
    });

    it('should reject invalid pass token with 404', async () => {
      await assert.rejects(
        async () => {
          await amenityAccessPassService.validateAndRecordCheckIn({
            orgId: testOrgId,
            rawToken: 'invalid-non-existent-token',
          });
        },
        (err) => err.statusCode === 404 && err.message.includes('not found')
      );
    });
  });

  /* =========================================================================
   * 5. Facilities & Resources Service Tests
   * ========================================================================= */
  describe('5. Facilities & Resources Service', () => {
    let tennisCourtFacility = null;
    let courtResource = null;

    it('should create an amenity facility with uppercase code and default pricing', async () => {
      tennisCourtFacility = await amenityFacilityService.createFacility({
        orgId: testOrgId,
        name: 'Tennis Court Center',
        code: 'ten-crt-01',
        archetype: 'EXCLUSIVE_HOURLY',
        timezone: 'Asia/Kolkata',
        slotDurationMinutes: 60,
        pricingConfig: {
          pricingType: 'HOURLY',
          baseRate: 200,
          taxPercentage: 18,
          currency: 'INR',
        },
      });

      assert.ok(tennisCourtFacility._id);
      assert.equal(tennisCourtFacility.code, 'TEN-CRT-01'); // Uppercase normalization
      assert.equal(tennisCourtFacility.archetype, 'EXCLUSIVE_HOURLY');
    });

    it('should reject duplicate facility code within same organization with 409', async () => {
      await assert.rejects(
        async () => {
          await amenityFacilityService.createFacility({
            orgId: testOrgId,
            name: 'Another Tennis Court',
            code: 'TEN-CRT-01',
            archetype: 'EXCLUSIVE_HOURLY',
            timezone: 'Asia/Kolkata',
          });
        },
        (err) => err.statusCode === 409
      );
    });

    it('should create a sub-resource with buffers under facility', async () => {
      courtResource = await amenityResourceService.createResource({
        orgId: testOrgId,
        facilityId: tennisCourtFacility._id,
        name: 'Tennis Court A',
        identifier: 'TENNIS-A',
        setupBufferMinutes: 10,
        teardownBufferMinutes: 10,
      });

      assert.ok(courtResource._id);
      assert.equal(courtResource.name, 'Tennis Court A');
      assert.equal(courtResource.setupBufferMinutes, 10);
    });

    it('should acquire concurrency mutex on resource and facility', async () => {
      const mutex = await resourceMutexService.acquireMutex({
        orgId: testOrgId,
        facilityId: tennisCourtFacility._id,
        resourceId: courtResource._id,
      });
      assert.equal(mutex.lockTarget, 'RESOURCE');
      assert.ok(mutex.version >= 1);
    });
  });

  /* =========================================================================
   * 6. Maintenance Block Service Tests
   * ========================================================================= */
  describe('6. Maintenance Block Service', () => {
    it('should reject maintenance when endDateTime <= startDateTime with 400', async () => {
      const facilityId = new mongoose.Types.ObjectId();
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
            orgId: testOrgId,
            facilityId,
            startDateTime: new Date('2026-10-10T14:00:00Z'),
            endDateTime: new Date('2026-10-10T13:00:00Z'), // End before start!
            reason: 'Painting works',
          });
        },
        (err) => err.statusCode === 400
      );
    });
  });

  /* =========================================================================
   * 7. Reservation Hold Lifecycle, Concurrency & Double-Release Guard
   * ========================================================================= */
  describe('7. Reservation Hold Lifecycle, Concurrency & Double-Release Guard', () => {
    let poolFacility = null;
    let standardHold = null;

    before(async () => {
      poolFacility = await amenityFacilityService.createFacility({
        orgId: testOrgId,
        name: 'Olympic Swimming Pool',
        code: 'POOL-OLY-01',
        archetype: 'SHARED_CAPACITY',
        maxCapacity: 5, // Maximum 5 swimmers per slot
        timezone: 'Asia/Kolkata',
        pricing: { pricingType: 'FREE' },
      });
    });

    it('should create standard hold on shared capacity and allocate bucket', async () => {
      const start = new Date(Date.now() + 24 * 3600000); // Tomorrow
      const end = new Date(start.getTime() + 3600000);

      const { hold, pricingSnapshot } = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgId,
        facilityId: poolFacility._id,
        residentId: testResidentId,
        unitId: testUnitId,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
        headcount: 3,
        holdType: 'STANDARD',
        holdDurationMinutes: 10,
      });

      assert.ok(hold._id);
      assert.equal(hold.status, 'ACTIVE');
      assert.equal(hold.headcount, 3);
      assert.ok(hold.expiresAt > new Date());
      standardHold = hold;

      // Verify slot allocation capacity bucket
      const bucketId = `BUCKET:${testOrgId}:${poolFacility._id}:${start.toISOString()}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.ok(bucket);
      assert.equal(bucket.allocatedHeadcount, 3);
      assert.equal(bucket.maxCapacity, 5);

      // Verify allocation ledger entry
      const ledgerEntries = await AmenityAllocationLedger.find({ holdId: hold._id });
      assert.equal(ledgerEntries.length, 1);
      assert.equal(ledgerEntries[0].status, 'HELD');
      assert.equal(ledgerEntries[0].allocatedQuantity, 3);
    });

    it('should reject hold when requested headcount exceeds remaining capacity', async () => {
      // 3 of 5 already held. Attempting to hold 3 more should fail!
      await assert.rejects(
        async () => {
          await amenityReservationHoldService.createStandardHold({
            orgId: testOrgId,
            facilityId: poolFacility._id,
            residentId: testResidentId,
            unitId: testUnitId,
            requestedStartDateTime: standardHold.requestedStartDateTime,
            requestedEndDateTime: standardHold.requestedEndDateTime,
            headcount: 3, // 3 + 3 = 6 > 5
          });
        },
        (err) => err.statusCode === 409
      );
    });

    it('should atomically expire hold, release capacity bucket, and write outbox event', async () => {
      const expiredHold = await amenityReservationHoldService.expireHold(standardHold._id);
      assert.ok(expiredHold);
      assert.equal(expiredHold.status, 'EXPIRED');

      // Verify bucket headcount was decremented back from 3 to 0
      const bucketId = `BUCKET:${testOrgId}:${poolFacility._id}:${standardHold.requestedStartDateTime.toISOString()}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket.allocatedHeadcount, 0);

      // Verify ledger line item transitioned HELD -> RELEASED
      const ledgerEntry = await AmenityAllocationLedger.findOne({ holdId: standardHold._id });
      assert.equal(ledgerEntry.status, 'RELEASED');
      assert.ok(ledgerEntry.releasedAt);

      // Verify Outbox Event created
      const outboxEvent = await AmenityOutboxEvent.findOne({
        aggregateId: standardHold._id,
        eventType: 'HOLD_EXPIRED',
      });
      assert.ok(outboxEvent);
      assert.equal(outboxEvent.status, 'PENDING');
    });

    it('should ensure double-release protection: second expireHold call is idempotent no-op', async () => {
      // Calling expireHold again on already expired hold
      const secondCallResult = await amenityReservationHoldService.expireHold(standardHold._id);
      assert.equal(secondCallResult, null);

      // Bucket headcount MUST remain 0, never negative!
      const bucketId = `BUCKET:${testOrgId}:${poolFacility._id}:${standardHold.requestedStartDateTime.toISOString()}`;
      const bucket = await AmenitySlotAllocation.findById(bucketId);
      assert.equal(bucket.allocatedHeadcount, 0);
    });
  });

  /* =========================================================================
   * 8. Reservation Promotion, Confirmation, Pass Issuance & Cancellation
   * ========================================================================= */
  describe('8. Reservation Lifecycle (Promote, Confirm, Pass, Cancel)', () => {
    let badmintonFacility = null;
    let badmintonCourt = null;
    let activeHold = null;
    let confirmedReservation = null;

    before(async () => {
      badmintonFacility = await amenityFacilityService.createFacility({
        orgId: testOrgId,
        name: 'Badminton Arena',
        code: 'BADM-ARENA-01',
        archetype: 'EXCLUSIVE_HOURLY',
        timezone: 'Asia/Kolkata',
        pricingConfig: {
          pricingType: 'HOURLY',
          baseRate: 150,
          taxPercentage: 18,
          currency: 'INR',
        },
      });

      badmintonCourt = await amenityResourceService.createResource({
        orgId: testOrgId,
        facilityId: badmintonFacility._id,
        name: 'Badminton Court 1',
        identifier: 'BADM-01',
      });
    });

    it('should promote hold into confirmed reservation with RES-YYYYMM-000001 number and issue QR pass', async () => {
      const start = new Date(Date.now() + 48 * 3600000); // 2 days from now
      const end = new Date(start.getTime() + 3600000);

      // 1. Create Hold
      const { hold } = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgId,
        facilityId: badmintonFacility._id,
        resourceId: badmintonCourt._id,
        residentId: testResidentId,
        unitId: testUnitId,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
        headcount: 2,
        holdType: 'STANDARD',
      });
      activeHold = hold;

      // 2. Confirm Reservation from Hold
      const { reservation, pass, rawToken } =
        await amenityReservationService.confirmReservationFromHold({
          holdId: activeHold._id,
          orgId: testOrgId,
          residentId: testResidentId,
          unitId: testUnitId,
          paymentReference: 'PAY-TXN-123456',
        });

      assert.ok(reservation);
      assert.match(reservation.reservationNumber, /^RES-\d{6}-\d{6}$/);
      assert.equal(reservation.bookingStatus, 'CONFIRMED');
      assert.equal(reservation.approvalStatus, 'NOT_REQUIRED');
      assert.equal(reservation.paymentStatus, 'PAID');
      assert.equal(reservation.accessStatus, 'PASS_GENERATED');
      assert.equal(reservation.completionStatus, 'PENDING');
      confirmedReservation = reservation;

      // Pass verification
      assert.ok(pass);
      assert.ok(rawToken);
      assert.equal(pass.reservationId.toString(), reservation._id.toString());

      // Verify outbox events written
      const outboxConfirm = await AmenityOutboxEvent.findOne({
        aggregateId: reservation._id,
        eventType: 'RESERVATION_CONFIRMED',
      });
      assert.ok(outboxConfirm);

      const outboxPass = await AmenityOutboxEvent.findOne({
        aggregateId: pass._id,
        eventType: 'GATE_PASS_ISSUED',
      });
      assert.ok(outboxPass);
    });

    it('should cancel confirmed reservation, release slot, refund quota, and revoke pass', async () => {
      const cancelled = await amenityReservationService.cancelReservation({
        reservationId: confirmedReservation._id,
        orgId: testOrgId,
        residentId: testResidentId,
        cancellationReason: 'Rain predicted',
      });

      assert.equal(cancelled.bookingStatus, 'CANCELLED');
      assert.equal(cancelled.paymentStatus, 'REFUND_PENDING');
      assert.equal(cancelled.accessStatus, 'ACCESS_REVOKED');

      // Verify access pass was revoked
      const passes = await AmenityAccessPass.find({ reservationId: confirmedReservation._id });
      assert.ok(passes.length > 0);
      for (const p of passes) {
        assert.equal(p.isRevoked, true);
        assert.equal(p.revokedReason, 'Rain predicted');
      }

      // Verify REFUND_DISPATCH_REQUIRED written to Outbox
      const outboxRefund = await AmenityOutboxEvent.findOne({
        aggregateId: confirmedReservation._id,
        eventType: 'REFUND_DISPATCH_REQUIRED',
      });
      assert.ok(outboxRefund);
    });
  });

  /* =========================================================================
   * 9. Maker-Checker Event Space Approval Workflow & Payment Webhook
   * ========================================================================= */
  describe('9. Maker-Checker Approval Workflow & Webhook Edge Cases', () => {
    let hallFacility = null;
    let approvalHold = null;
    let pendingReviewReservation = null;

    before(async () => {
      hallFacility = await amenityFacilityService.createFacility({
        orgId: testOrgId,
        name: 'Community Banquet Hall',
        code: 'HALL-BNQ-01',
        archetype: 'EVENT_SPACE',
        timezone: 'Asia/Kolkata',
        requiresApproval: true,
        pricingConfig: {
          pricingType: 'FIXED_EVENT',
          baseRate: 5000,
        },
      });
    });

    it('should create reservation with PENDING_APPROVAL and PENDING_REVIEW when approval required', async () => {
      const start = new Date(Date.now() + 72 * 3600000);
      const end = new Date(start.getTime() + 6 * 3600000);

      const { hold } = await amenityReservationHoldService.createStandardHold({
        orgId: testOrgId,
        facilityId: hallFacility._id,
        residentId: testResidentId,
        unitId: testUnitId,
        requestedStartDateTime: start,
        requestedEndDateTime: end,
        holdType: 'ADMIN_REVIEW',
        quotaLimit: 720,
      });
      approvalHold = hold;

      // Resident requests reservation WITHOUT upfront payment (pending approval & pending payment)
      const { reservation, pass } = await amenityReservationService.confirmReservationFromHold({
        holdId: hold._id,
        orgId: testOrgId,
        residentId: testResidentId,
        unitId: testUnitId,
        notes: 'Birthday celebration',
      });

      assert.equal(reservation.bookingStatus, 'PENDING_APPROVAL');
      assert.equal(reservation.approvalStatus, 'PENDING_REVIEW');
      assert.equal(reservation.paymentStatus, 'PENDING');
      assert.equal(reservation.accessStatus, 'NOT_APPLICABLE');
      assert.equal(pass, null);
      assert.ok(reservation.approvalDeadline > new Date());
      pendingReviewReservation = reservation;
    });

    it('Issue A: admin approval MUST NOT automatically generate access pass when payment is pending', async () => {
      const { reservation, pass, rawToken } =
        await amenityReservationService.reviewEventReservation({
          reservationId: pendingReviewReservation._id,
          orgId: testOrgId,
          adminUserId: testAdminId,
          action: 'APPROVED',
          notes: 'Facility approved for private party; awaiting payment',
        });

      // Crucial Phase 4B.1 verification:
      // When payment is pending, bookingStatus stays PENDING_APPROVAL, approvalStatus is APPROVED,
      // accessStatus remains NOT_APPLICABLE, and NO pass or pass-outbox-event is created!
      assert.equal(reservation.bookingStatus, 'PENDING_APPROVAL');
      assert.equal(reservation.approvalStatus, 'APPROVED');
      assert.equal(reservation.paymentStatus, 'PENDING');
      assert.equal(reservation.accessStatus, 'NOT_APPLICABLE');
      assert.equal(pass, null);
      assert.equal(rawToken, null);

      // Verify approval history was appended
      assert.equal(reservation.approvalHistory.length, 2); // REQUESTED + APPROVED
      assert.equal(reservation.approvalHistory[1].action, 'APPROVED');

      // Assert NO pass was created in database
      const passes = await AmenityAccessPass.find({ reservationId: reservation._id });
      assert.equal(passes.length, 0);

      // Assert NO GATE_PASS_ISSUED or RESERVATION_CONFIRMED outbox event exists
      const passEvent = await AmenityOutboxEvent.findOne({
        aggregateId: reservation._id,
        eventType: 'GATE_PASS_ISSUED',
      });
      assert.equal(passEvent, null);

      const confirmEvent = await AmenityOutboxEvent.findOne({
        aggregateId: reservation._id,
        eventType: 'RESERVATION_CONFIRMED',
      });
      assert.equal(confirmEvent, null);

      pendingReviewReservation = reservation;
    });

    it('Issue A: payment webhook on approved event reservation transitions to CONFIRMED and issues pass', async () => {
      const webhookResult = await amenityReservationService.handlePaymentWebhook({
        orgId: testOrgId,
        reservationId: pendingReviewReservation._id,
        paymentReference: 'PAY-HALL-WEBHOOK-123',
        status: 'PAID',
        paymentAmount: 5000,
      });

      assert.equal(webhookResult.reservation.bookingStatus, 'CONFIRMED');
      assert.equal(webhookResult.reservation.approvalStatus, 'APPROVED');
      assert.equal(webhookResult.reservation.paymentStatus, 'PAID');
      assert.equal(webhookResult.reservation.accessStatus, 'PASS_GENERATED');
      assert.ok(webhookResult.pass);
      assert.ok(webhookResult.rawToken);

      // Verify pass now exists in database
      const passes = await AmenityAccessPass.find({ reservationId: pendingReviewReservation._id });
      assert.equal(passes.length, 1);
      assert.equal(passes[0]._id.toString(), webhookResult.pass._id.toString());

      // Verify GATE_PASS_ISSUED and RESERVATION_CONFIRMED outbox events were written
      const passEvent = await AmenityOutboxEvent.findOne({
        aggregateId: webhookResult.pass._id,
        eventType: 'GATE_PASS_ISSUED',
      });
      assert.ok(passEvent);

      const confirmEvent = await AmenityOutboxEvent.findOne({
        aggregateId: pendingReviewReservation._id,
        eventType: 'RESERVATION_CONFIRMED',
      });
      assert.ok(confirmEvent);
    });

    it('Issue A idempotency: duplicate payment webhook on already confirmed reservation is idempotent', async () => {
      const duplicateResult = await amenityReservationService.handlePaymentWebhook({
        orgId: testOrgId,
        reservationId: pendingReviewReservation._id,
        paymentReference: 'PAY-HALL-WEBHOOK-123',
        status: 'PAID',
        paymentAmount: 5000,
      });

      assert.equal(duplicateResult.isDuplicate, true);
      assert.equal(duplicateResult.reservation.paymentStatus, 'PAID');
      assert.equal(duplicateResult.reservation.bookingStatus, 'CONFIRMED');

      // Verify STILL only 1 pass exists
      const passes = await AmenityAccessPass.find({ reservationId: pendingReviewReservation._id });
      assert.equal(passes.length, 1);

      // Verify no duplicate GATE_PASS_ISSUED event
      const passEvents = await AmenityOutboxEvent.find({
        aggregateId: duplicateResult.pass._id,
        eventType: 'GATE_PASS_ISSUED',
      });
      assert.equal(passEvents.length, 1);
    });

    it('Issue B: late payment webhook on expired hold schedules automatic refund without resurrecting hold', async () => {
      const deadHoldId = new mongoose.Types.ObjectId();
      // Emulate hold that expired in past
      await AmenityReservationHold.create({
        _id: deadHoldId,
        orgId: testOrgId,
        facilityId: hallFacility._id,
        residentId: testResidentId,
        unitId: testUnitId,
        requestedStartDateTime: new Date('2026-09-01T10:00:00Z'),
        requestedEndDateTime: new Date('2026-09-01T12:00:00Z'),
        effectiveStartDateTime: new Date('2026-09-01T10:00:00Z'),
        effectiveEndDateTime: new Date('2026-09-01T12:00:00Z'),
        status: 'EXPIRED',
        expiresAt: new Date('2026-09-01T10:10:00Z'),
      });

      const webhookResult = await amenityReservationService.handlePaymentWebhook({
        orgId: testOrgId,
        holdId: deadHoldId,
        paymentReference: 'PAY-LATE-WEBHOOK-999',
        status: 'PAID',
        paymentAmount: 5000,
      });

      assert.equal(webhookResult.status, 'EXPIRED_HOLD_REFUND_DISPATCHED');
      assert.equal(webhookResult.reservation.bookingStatus, 'CANCELLED');
      assert.equal(webhookResult.reservation.paymentStatus, 'REFUND_PENDING');
      assert.equal(webhookResult.reservation.accessStatus, 'NOT_APPLICABLE');
      assert.equal(webhookResult.reservation.completionStatus, 'ABANDONED');

      // Hold must remain EXPIRED (never resurrected)
      const holdInDb = await AmenityReservationHold.findById(deadHoldId);
      assert.equal(holdInDb.status, 'EXPIRED');

      // No pass generated
      const passes = await AmenityAccessPass.find({ reservationId: webhookResult.reservation._id });
      assert.equal(passes.length, 0);

      // Verify REFUND_DISPATCH_REQUIRED in Outbox
      const outboxRefund = await AmenityOutboxEvent.findOne({
        aggregateId: webhookResult.reservation._id,
        eventType: 'REFUND_DISPATCH_REQUIRED',
      });
      assert.ok(outboxRefund);
      assert.equal(outboxRefund.payload.paymentReference, 'PAY-LATE-WEBHOOK-999');
      assert.equal(outboxRefund.payload.amount, 5000);
    });

    it('Issue B idempotency: duplicate late payment webhook does not create duplicate refund or reservation', async () => {
      const deadHoldId = (
        await AmenityReservationHold.findOne({ expiresAt: new Date('2026-09-01T10:10:00Z') })
      )._id;

      const duplicateWebhookResult = await amenityReservationService.handlePaymentWebhook({
        orgId: testOrgId,
        holdId: deadHoldId,
        paymentReference: 'PAY-LATE-WEBHOOK-999',
        status: 'PAID',
        paymentAmount: 5000,
      });

      assert.equal(duplicateWebhookResult.isDuplicate, true);
      assert.equal(duplicateWebhookResult.status, 'EXPIRED_HOLD_REFUND_DISPATCHED');

      // Assert only 1 refund event exists in outbox
      const refundEvents = await AmenityOutboxEvent.find({
        'payload.paymentReference': 'PAY-LATE-WEBHOOK-999',
        eventType: 'REFUND_DISPATCH_REQUIRED',
      });
      assert.equal(refundEvents.length, 1);

      // Assert only 1 cancelled reservation exists
      const cancelledReservations = await AmenityReservation.find({
        'cancellationReason': { $regex: /PAY-LATE-WEBHOOK-999/ },
      });
      assert.equal(cancelledReservations.length, 1);
    });
  });

  /* =========================================================================
   * 10. Architectural Decoupling & Legacy Isolation Verification
   * ========================================================================= */
  describe('10. Architectural Decoupling & Strict Legacy Isolation', () => {
    it('amenityManagementEvents emits without crashing when no socket client is connected', () => {
      assert.doesNotThrow(() => {
        amenityManagementEvents.emit(AMENITY_EVENTS.HOLD_CREATED, {
          holdId: new mongoose.Types.ObjectId(),
          orgId: testOrgId,
        });
      });
    });

    it('legacy collections remain 100% untouched and retain original schema invariants', async () => {
      assert.equal(LegacyAmenity.collection.name, 'amenities');
      assert.equal(LegacyAmenityBooking.collection.name, 'amenitybookings');
      assert.equal(LegacyBooking.collection.name, 'bookings');

      // Assert zero documents in legacy collections from test run
      const legacyAmenityCount = await LegacyAmenity.countDocuments({ orgId: testOrgId });
      const legacyBookingCount = await LegacyAmenityBooking.countDocuments({ orgId: testOrgId });
      assert.equal(legacyAmenityCount, 0);
      assert.equal(legacyBookingCount, 0);
    });
  });
});
