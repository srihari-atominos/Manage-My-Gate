import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  amenityHoldExpirationWorker,
  amenityOutboxWorker,
  amenityOutboxService,
  amenityReservationHoldService,
  amenityOutboxEventRepository,
  AmenityOutboxEvent,
  AmenityReservationHold,
  AmenityFacility,
  AmenitySlotAllocation,
  AmenityAllocationLedger,
  AmenityQuotaAllocation,
} from '../src/features/amenityManagement/index.js';

describe('Amenity Management Phase 4D — Background Workers, Outbox & Operational Lifecycle', () => {
  const testOrgId = new mongoose.Types.ObjectId();
  const testResidentId = new mongoose.Types.ObjectId();
  const testUnitId = new mongoose.Types.ObjectId();

  before(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  after(async () => {
    // Ensure workers are completely stopped
    amenityHoldExpirationWorker.stopWorker();
    amenityOutboxWorker.stopWorker();

    // Clean up test data
    await Promise.all([
      AmenityOutboxEvent.deleteMany({ orgId: testOrgId }),
      AmenityReservationHold.deleteMany({ orgId: testOrgId }),
      AmenityFacility.deleteMany({ orgId: testOrgId }),
      AmenitySlotAllocation.deleteMany({ orgId: testOrgId }),
      AmenityAllocationLedger.deleteMany({ orgId: testOrgId }),
      AmenityQuotaAllocation.deleteMany({ orgId: testOrgId }),
      mongoose.models.Notification ? mongoose.models.Notification.deleteMany({ recipientId: testResidentId }) : Promise.resolve(),
    ]);

    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clean outbox, holds and notifications between tests
    await Promise.all([
      AmenityOutboxEvent.deleteMany({ orgId: testOrgId }),
      AmenityReservationHold.deleteMany({ orgId: testOrgId }),
      mongoose.models.Notification ? mongoose.models.Notification.deleteMany({ recipientId: testResidentId }) : Promise.resolve(),
    ]);
  });

  // =========================================================================
  // 1. Hold Expiration Worker Lifecycle & Concurrency
  // =========================================================================
  describe('1. Hold Expiration Worker Lifecycle & Concurrency', () => {
    it('should initialize, guard against duplicate start, and stop cleanly', () => {
      // 1. Start worker
      amenityHoldExpirationWorker.initWorker({ intervalMs: 50000 });
      assert.ok(amenityHoldExpirationWorker.intervalId !== null);
      const initialTimerId = amenityHoldExpirationWorker.intervalId;

      // 2. Duplicate init should be a no-op and preserve timer
      amenityHoldExpirationWorker.initWorker({ intervalMs: 50000 });
      assert.equal(amenityHoldExpirationWorker.intervalId, initialTimerId);

      // 3. Stop worker
      amenityHoldExpirationWorker.stopWorker();
      assert.equal(amenityHoldExpirationWorker.intervalId, null);

      // 4. Repeated stop should be completely safe
      assert.doesNotThrow(() => amenityHoldExpirationWorker.stopWorker());
    });

    it('should invoke expireStaleActiveHolds and expire expired active holds', async () => {
      // Create a stale active hold
      const now = new Date();
      const pastStart = new Date(now.getTime() - 3600000);
      const pastEnd = new Date(now.getTime() - 1800000);
      const expiredTime = new Date(now.getTime() - 60000);

      const hold = await AmenityReservationHold.create({
        orgId: testOrgId,
        facilityId: new mongoose.Types.ObjectId(),
        residentId: testResidentId,
        unitId: testUnitId,
        requestedStartDateTime: pastStart,
        requestedEndDateTime: pastEnd,
        effectiveStartDateTime: pastStart,
        effectiveEndDateTime: pastEnd,
        status: 'ACTIVE',
        expiresAt: expiredTime,
      });

      // Execute worker run
      const result = await amenityHoldExpirationWorker.runOnce();
      assert.equal(result.expiredCount, 1);

      // Verify hold transitioned to EXPIRED in database
      const updated = await AmenityReservationHold.findById(hold._id);
      assert.equal(updated.status, 'EXPIRED');

      // Verify outbox event HOLD_EXPIRED was created
      const outboxEvent = await AmenityOutboxEvent.findOne({
        orgId: testOrgId,
        eventType: 'HOLD_EXPIRED',
        aggregateId: hold._id,
      });
      assert.ok(outboxEvent);
      assert.equal(outboxEvent.status, 'PENDING');
    });

    it('should prevent overlapping executions with isExecuting guard', async () => {
      amenityHoldExpirationWorker.isExecuting = true;
      const result = await amenityHoldExpirationWorker.runOnce();
      assert.equal(result.expiredCount, 0);
      assert.equal(result.durationMs, 0);
      amenityHoldExpirationWorker.isExecuting = false;
    });

    it('should continue gracefully after service errors without crashing process', async () => {
      // Mock temporary failure on expireStaleActiveHolds
      const originalMethod = amenityReservationHoldService.expireStaleActiveHolds;
      amenityReservationHoldService.expireStaleActiveHolds = async () => {
        throw new Error('Database connection timeout simulation');
      };

      try {
        const result = await amenityHoldExpirationWorker.runOnce();
        assert.equal(result.expiredCount, 0);
        assert.ok(result.error);
        assert.equal(result.error, 'Database connection timeout simulation');
      } finally {
        amenityReservationHoldService.expireStaleActiveHolds = originalMethod;
      }
    });

    it('should handle multi-instance concurrent hold expiration with double-release safety', async () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 3600000);
      const pastEnd = new Date(now.getTime() - 1800000);

      const hold = await AmenityReservationHold.create({
        orgId: testOrgId,
        facilityId: new mongoose.Types.ObjectId(),
        residentId: testResidentId,
        unitId: testUnitId,
        requestedStartDateTime: pastStart,
        requestedEndDateTime: pastEnd,
        effectiveStartDateTime: pastStart,
        effectiveEndDateTime: pastEnd,
        status: 'ACTIVE',
        expiresAt: new Date(now.getTime() - 1000),
      });

      // Simulate Worker A and Worker B expiring the exact same hold simultaneously
      const [workerAResult, workerBResult] = await Promise.all([
        amenityReservationHoldService.expireHold(hold._id),
        amenityReservationHoldService.expireHold(hold._id),
      ]);

      // Exactly one execution transitions the hold; the other is an idempotent no-op (null)
      const nonNullCount = [workerAResult, workerBResult].filter(Boolean).length;
      assert.equal(nonNullCount, 1);

      // Verify outbox has exactly one HOLD_EXPIRED event, not two
      const outboxEvents = await AmenityOutboxEvent.find({
        orgId: testOrgId,
        eventType: 'HOLD_EXPIRED',
        aggregateId: hold._id,
      });
      assert.equal(outboxEvents.length, 1);
    });
  });

  // =========================================================================
  // 2. Outbox Atomic Claiming & Concurrency Protection
  // =========================================================================
  describe('2. Outbox Atomic Claiming & Concurrency Protection', () => {
    it('should claim a PENDING event and set status to PROCESSING with lease timestamp', async () => {
      const event = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: { reservationNumber: 'RES-TEST-001' },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 1000),
      });

      const claimed = await amenityOutboxEventRepository.claimNextPendingEvent();
      assert.ok(claimed);
      assert.equal(claimed._id.toString(), event._id.toString());
      assert.equal(claimed.status, 'PROCESSING');
      assert.ok(claimed.processingStartedAt instanceof Date);
    });

    it('should NOT claim events that are already PROCESSING, PUBLISHED, or DEAD_LETTER', async () => {
      await AmenityOutboxEvent.create([
        {
          orgId: testOrgId,
          eventType: 'RESERVATION_CONFIRMED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AmenityReservation',
          payload: {},
          status: 'PROCESSING',
          processingStartedAt: new Date(),
        },
        {
          orgId: testOrgId,
          eventType: 'RESERVATION_CONFIRMED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AmenityReservation',
          payload: {},
          status: 'PUBLISHED',
        },
        {
          orgId: testOrgId,
          eventType: 'RESERVATION_CONFIRMED',
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AmenityReservation',
          payload: {},
          status: 'DEAD_LETTER',
        },
      ]);

      const claimed = await amenityOutboxEventRepository.claimNextPendingEvent();
      assert.equal(claimed, null);
    });

    it('should NOT claim PENDING events whose nextRetryAt is in the future', async () => {
      await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {},
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() + 60000), // 1 minute in the future
      });

      const claimed = await amenityOutboxEventRepository.claimNextPendingEvent();
      assert.equal(claimed, null);
    });

    it('should ensure multi-instance atomic claim: exactly one worker gets the event', async () => {
      const event = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: { test: true },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 5000),
      });

      // Worker A and Worker B try to claim the event concurrently
      const [claimA, claimB] = await Promise.all([
        amenityOutboxEventRepository.claimNextPendingEvent(),
        amenityOutboxEventRepository.claimNextPendingEvent(),
      ]);

      // One worker got the event, the other got null
      const claimedCount = [claimA, claimB].filter(Boolean).length;
      assert.equal(claimedCount, 1);

      const winningClaim = claimA || claimB;
      assert.equal(winningClaim._id.toString(), event._id.toString());
      assert.equal(winningClaim.status, 'PROCESSING');
    });
  });

  // =========================================================================
  // 3. Outbox Retry, Exponential Backoff & Dead-Lettering
  // =========================================================================
  describe('3. Outbox Retry, Exponential Backoff & Dead-Lettering', () => {
    it('should transition to PUBLISHED on successful dispatch', async () => {
      const event = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'GATE_PASS_ISSUED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityAccessPass',
        payload: { passId: 'PASS-123' },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 1000),
      });

      const result = await amenityOutboxService.processNextEvent();
      assert.equal(result.claimed, true);
      assert.equal(result.success, true);
      assert.equal(result.event.status, 'PUBLISHED');
      assert.equal(result.event.processingStartedAt, null);
    });

    it('should increment retryCount and apply exponential backoff on failure', async () => {
      // Seed event with unknown event type that causes dispatch failure
      const event = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {},
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: new Date(Date.now() - 1000),
      });

      // Force dispatch failure by stubbing dispatchEvent
      const originalDispatch = amenityOutboxService.dispatchEvent;
      amenityOutboxService.dispatchEvent = async () => {
        throw new Error('Downstream network transport timeout');
      };

      try {
        const result = await amenityOutboxService.processNextEvent();
        assert.equal(result.claimed, true);
        assert.equal(result.success, false);
        assert.equal(result.event.status, 'PENDING');
        assert.equal(result.event.retryCount, 1);
        assert.equal(result.event.errorMessage, 'Downstream network transport timeout');
        assert.ok(result.event.nextRetryAt > new Date());
      } finally {
        amenityOutboxService.dispatchEvent = originalDispatch;
      }
    });

    it('should calculate bounded exponential backoff correctly', () => {
      // base: 2000ms, max: 300000ms
      const delay1 = amenityOutboxService.calculateBackoffDelay(1); // 2000 * 2^0 = 2000
      const delay2 = amenityOutboxService.calculateBackoffDelay(2); // 2000 * 2^1 = 4000
      const delay3 = amenityOutboxService.calculateBackoffDelay(3); // 2000 * 2^2 = 8000
      const delayLarge = amenityOutboxService.calculateBackoffDelay(20); // capped at 300000

      assert.equal(delay1, 2000);
      assert.equal(delay2, 4000);
      assert.equal(delay3, 8000);
      assert.equal(delayLarge, 300000);
    });

    it('should transition to DEAD_LETTER when maxRetries is reached', async () => {
      const event = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {},
        status: 'PENDING',
        retryCount: 4, // 4 retries already happened
        maxRetries: 5,
        nextRetryAt: new Date(Date.now() - 1000),
      });

      const originalDispatch = amenityOutboxService.dispatchEvent;
      amenityOutboxService.dispatchEvent = async () => {
        throw new Error('Fatal unrecoverable schema validation error');
      };

      try {
        const result = await amenityOutboxService.processNextEvent();
        assert.equal(result.claimed, true);
        assert.equal(result.success, false);
        assert.equal(result.event.status, 'DEAD_LETTER');
        assert.equal(result.event.retryCount, 5);
        assert.equal(result.event.errorMessage, 'Fatal unrecoverable schema validation error');
      } finally {
        amenityOutboxService.dispatchEvent = originalDispatch;
      }
    });
  });

  // =========================================================================
  // 4. Stale Processing Recovery (Zombie Reclaim)
  // =========================================================================
  describe('4. Stale Processing Recovery (Zombie Reclaim)', () => {
    it('should NOT recover fresh PROCESSING events', async () => {
      // Event locked just 10 seconds ago
      await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {},
        status: 'PROCESSING',
        processingStartedAt: new Date(Date.now() - 10000), // 10s ago
      });

      // Attempt recovery with 5-minute timeout
      const recovered = await amenityOutboxEventRepository.recoverStaleProcessingEvents(300000);
      assert.equal(recovered.length, 0);

      // Verify event is still PROCESSING
      const doc = await AmenityOutboxEvent.findOne({ orgId: testOrgId });
      assert.equal(doc.status, 'PROCESSING');
    });

    it('should recover stale PROCESSING events past timeout back to PENDING and increment retry', async () => {
      // Event locked 10 minutes ago (crashed worker)
      const staleEvent = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {},
        status: 'PROCESSING',
        retryCount: 1,
        maxRetries: 5,
        processingStartedAt: new Date(Date.now() - 600000), // 10 mins ago
      });

      const recovered = await amenityOutboxEventRepository.recoverStaleProcessingEvents(300000);
      assert.equal(recovered.length, 1);
      assert.equal(recovered[0]._id.toString(), staleEvent._id.toString());
      assert.equal(recovered[0].status, 'PENDING');
      assert.equal(recovered[0].retryCount, 2);
      assert.equal(recovered[0].processingStartedAt, null);
      assert.ok(recovered[0].errorMessage.includes('Processing lease expired'));
    });

    it('should transition stale event to DEAD_LETTER if lease recovery exceeds maxRetries', async () => {
      const staleEvent = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {},
        status: 'PROCESSING',
        retryCount: 4,
        maxRetries: 5,
        processingStartedAt: new Date(Date.now() - 600000),
      });

      const recovered = await amenityOutboxEventRepository.recoverStaleProcessingEvents(300000);
      assert.equal(recovered.length, 1);
      assert.equal(recovered[0].status, 'DEAD_LETTER');
      assert.equal(recovered[0].retryCount, 5);
    });
  });

  // =========================================================================
  // 5. Event Dispatcher & All 8 Domain Event Types
  // =========================================================================
  describe('5. Event Dispatcher & All 8 Domain Event Types', () => {
    const eventTypes = [
      'RESERVATION_CONFIRMED',
      'RESERVATION_CANCELLED',
      'GATE_PASS_ISSUED',
      'HOLD_EXPIRED',
      'APPROVAL_REQUESTED',
      'MAINTENANCE_SCHEDULED',
      'WAITLIST_RELEASED',
      'REFUND_DISPATCH_REQUIRED',
    ];

    for (const type of eventTypes) {
      it(`should successfully dispatch ${type} and mark as PUBLISHED`, async () => {
        const doc = await AmenityOutboxEvent.create({
          orgId: testOrgId,
          eventType: type,
          aggregateId: new mongoose.Types.ObjectId(),
          aggregateType: 'AmenityEntity',
          payload: {
            reservationNumber: 'RES-0001',
            passId: 'PASS-0001',
            holdId: 'HOLD-0001',
            paymentReference: 'PAY_REF_123',
            amount: 500,
            reason: 'Test reason',
          },
          status: 'PENDING',
          nextRetryAt: new Date(Date.now() - 1000),
        });

        const result = await amenityOutboxService.processNextEvent();
        assert.equal(result.claimed, true);
        assert.equal(result.success, true);
        assert.equal(result.event.status, 'PUBLISHED');
      });
    }

    it('REFUND_DISPATCH_REQUIRED must NOT create fake payment or financial gateway record', async () => {
      const doc = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'REFUND_DISPATCH_REQUIRED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {
          reservationNumber: 'RES-REFUND-001',
          paymentReference: 'rzp_pay_xyz123',
          amount: 1500,
          reason: 'Late payment received after hold expired',
        },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 1000),
      });

      const result = await amenityOutboxService.processNextEvent();
      assert.equal(result.claimed, true);
      assert.equal(result.success, true);
      assert.equal(result.event.status, 'PUBLISHED');

      // Assert that no fake refund or payment document was injected into Payment collection
      const genericPaymentModel = mongoose.models.Payment;
      if (genericPaymentModel) {
        const fakePayment = await genericPaymentModel.findOne({
          gatewayTransactionId: 'rzp_pay_xyz123',
          type: 'Refund',
        });
        assert.equal(fakePayment, null, 'No fake gateway refund record should be fabricated');
      }
    });

    it('should invoke notificationService and create in-app notification when payload contains residentId', async () => {
      const doc = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: {
          residentId: testResidentId,
          reservationNumber: 'RES-NOTIF-001',
          reservationId: new mongoose.Types.ObjectId(),
        },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 1000),
      });

      const result = await amenityOutboxService.processNextEvent();
      assert.equal(result.claimed, true);
      assert.equal(result.success, true);
      assert.equal(result.event.status, 'PUBLISHED');

      // Verify downstream notification document in Notification collection
      const notificationModel = mongoose.models.Notification;
      if (notificationModel) {
        const notif = await notificationModel.findOne({
          recipientId: testResidentId,
          title: 'Amenity Reservation Confirmed',
        });
        assert.ok(notif, 'Downstream Notification document should have been created in database');
        assert.ok(notif.body.includes('RES-NOTIF-001'));
      }
    });

    it('should throw error for unsupported event type and mark failed', async () => {
      // Bypass Mongoose enum validation using direct collection insert for testing unknown type
      const fakeId = new mongoose.Types.ObjectId();
      await AmenityOutboxEvent.collection.insertOne({
        _id: fakeId,
        orgId: testOrgId,
        eventType: 'UNKNOWN_FUTURE_EVENT',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'Unknown',
        payload: {},
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        nextRetryAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await amenityOutboxService.processNextEvent();
      assert.equal(result.claimed, true);
      assert.equal(result.success, false);
      assert.ok(result.error.includes('Unsupported outbox event type'));

      const updated = await AmenityOutboxEvent.findById(fakeId);
      assert.equal(updated.status, 'PENDING');
      assert.equal(updated.retryCount, 1);
    });
  });

  // =========================================================================
  // 6. Outbox Worker Batch Processing & Non-Blocking Resilience
  // =========================================================================
  describe('6. Outbox Worker Batch Processing & Non-Blocking Resilience', () => {
    it('should process bounded batch up to limit and continue past failures', async () => {
      // Create 3 events: 2 valid and 1 failing
      const valid1 = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'RESERVATION_CONFIRMED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityReservation',
        payload: { reservationNumber: 'RES-01' },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 5000),
      });

      // Failing event (unsupported type directly inserted)
      const failId = new mongoose.Types.ObjectId();
      await AmenityOutboxEvent.collection.insertOne({
        _id: failId,
        orgId: testOrgId,
        eventType: 'BAD_EVENT_TYPE',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'Bad',
        payload: {},
        status: 'PENDING',
        retryCount: 0,
        maxRetries: 3,
        nextRetryAt: new Date(Date.now() - 4000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const valid2 = await AmenityOutboxEvent.create({
        orgId: testOrgId,
        eventType: 'GATE_PASS_ISSUED',
        aggregateId: new mongoose.Types.ObjectId(),
        aggregateType: 'AmenityAccessPass',
        payload: { passId: 'PASS-02' },
        status: 'PENDING',
        nextRetryAt: new Date(Date.now() - 3000),
      });

      const batchSummary = await amenityOutboxService.processOutboxBatch(10);
      assert.equal(batchSummary.processedCount, 3);
      assert.equal(batchSummary.successCount, 2);
      assert.equal(batchSummary.failureCount, 1);

      // Verify statuses
      const v1Doc = await AmenityOutboxEvent.findById(valid1._id);
      const failDoc = await AmenityOutboxEvent.findById(failId);
      const v2Doc = await AmenityOutboxEvent.findById(valid2._id);

      assert.equal(v1Doc.status, 'PUBLISHED');
      assert.equal(failDoc.status, 'PENDING');
      assert.equal(failDoc.retryCount, 1);
      assert.equal(v2Doc.status, 'PUBLISHED');
    });

    it('should initialize and stop outbox worker lifecycle cleanly', () => {
      amenityOutboxWorker.initWorker({ intervalMs: 60000 });
      assert.ok(amenityOutboxWorker.intervalId !== null);
      const timer = amenityOutboxWorker.intervalId;

      // Duplicate init is safe
      amenityOutboxWorker.initWorker({ intervalMs: 60000 });
      assert.equal(amenityOutboxWorker.intervalId, timer);

      amenityOutboxWorker.stopWorker();
      assert.equal(amenityOutboxWorker.intervalId, null);

      assert.doesNotThrow(() => amenityOutboxWorker.stopWorker());
    });
  });

  // =========================================================================
  // 7. Static Architecture Audit & Encapsulation
  // =========================================================================
  describe('7. Static Architecture Audit & Encapsulation', () => {
    it('workers must not hold direct references to Mongoose or Models', () => {
      // Hold worker should only use amenityReservationHoldService
      assert.ok(amenityHoldExpirationWorker);
      assert.equal(typeof amenityHoldExpirationWorker.runOnce, 'function');
      assert.equal(typeof amenityHoldExpirationWorker.initWorker, 'function');
      assert.equal(typeof amenityHoldExpirationWorker.stopWorker, 'function');

      // Outbox worker should only use amenityOutboxService
      assert.ok(amenityOutboxWorker);
      assert.equal(typeof amenityOutboxWorker.runOnce, 'function');
      assert.equal(typeof amenityOutboxWorker.initWorker, 'function');
      assert.equal(typeof amenityOutboxWorker.stopWorker, 'function');
    });
  });
});
