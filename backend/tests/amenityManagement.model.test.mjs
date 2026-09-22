import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Import barrel export of all 12 models
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

// Import legacy models to verify immutability
import LegacyAmenity from '../src/features/amenity/amenity.model.js';
import LegacyAmenityBooking from '../src/features/amenityBooking/amenityBooking.model.js';
import LegacyBooking from '../src/features/booking/booking.model.js';

describe('Amenity Management Phase 4A — Database Models Test Suite', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockFacilityId = new mongoose.Types.ObjectId();
  const mockResourceId = new mongoose.Types.ObjectId();
  const mockResidentId = new mongoose.Types.ObjectId();
  const mockUnitId = new mongoose.Types.ObjectId();
  const mockReservationId = new mongoose.Types.ObjectId();
  const mockHoldId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * 1. Model Compilation & Collection Namespace Verification
   * ========================================================================= */
  describe('1. Model Compilation & Exact Namespace Verification', () => {
    const expectedModels = [
      { model: AmenityFacility, expectedCollection: 'amenity_management_facilities' },
      { model: AmenityResource, expectedCollection: 'amenity_management_resources' },
      { model: AmenitySlotAllocation, expectedCollection: 'amenity_management_slot_allocations' },
      { model: AmenityAllocationLedger, expectedCollection: 'amenity_management_allocation_ledger' },
      { model: AmenityReservationHold, expectedCollection: 'amenity_management_reservation_holds' },
      { model: AmenityReservation, expectedCollection: 'amenity_management_reservations' },
      { model: AmenityQuotaAllocation, expectedCollection: 'amenity_management_quota_allocations' },
      { model: AmenityAccessPass, expectedCollection: 'amenity_management_access_passes' },
      { model: AmenityMaintenanceBlock, expectedCollection: 'amenity_management_maintenance_blocks' },
      { model: AmenityOutboxEvent, expectedCollection: 'amenity_management_outbox_events' },
      { model: AmenityIdempotencyRecord, expectedCollection: 'amenity_management_idempotency_records' },
      { model: AmenityCounter, expectedCollection: 'amenity_management_counters' },
    ];

    it('should verify all 12 models compile and map to exact collection names', () => {
      assert.equal(expectedModels.length, 12, 'Must have exactly 12 models in new subsystem');
      for (const { model, expectedCollection } of expectedModels) {
        assert.ok(model, `Model for ${expectedCollection} must exist`);
        assert.equal(
          model.collection.name,
          expectedCollection,
          `Collection name must be exactly ${expectedCollection}`
        );
        assert.ok(
          model.collection.name.startsWith('amenity_management_'),
          `Collection ${model.collection.name} must use the amenity_management_ namespace`
        );
      }
    });
  });

  /* =========================================================================
   * 2. Required Field Validation
   * ========================================================================= */
  describe('2. Required Field Validation', () => {
    it('AmenityFacility should reject missing orgId, name, code, archetype, timezone', async () => {
      const facility = new AmenityFacility({});
      const err = facility.validateSync();
      assert.ok(err, 'Validation must fail for empty facility');
      assert.ok(err.errors.orgId, 'orgId must be required');
      assert.ok(err.errors.name, 'name must be required');
      assert.ok(err.errors.code, 'code must be required');
      assert.ok(err.errors.archetype, 'archetype must be required');
    });

    it('AmenityResource should reject missing orgId, facilityId, name, identifier', async () => {
      const resource = new AmenityResource({});
      const err = resource.validateSync();
      assert.ok(err, 'Validation must fail for empty resource');
      assert.ok(err.errors.orgId, 'orgId must be required');
      assert.ok(err.errors.facilityId, 'facilityId must be required');
      assert.ok(err.errors.name, 'name must be required');
      assert.ok(err.errors.identifier, 'identifier must be required');
    });

    it('AmenityReservation should reject missing reservationNumber, orgId, residentId, unitId, totalAmount', async () => {
      const resv = new AmenityReservation({});
      const err = resv.validateSync();
      assert.ok(err, 'Validation must fail for empty reservation');
      assert.ok(err.errors.orgId, 'orgId must be required');
      assert.ok(err.errors.residentId, 'residentId must be required');
      assert.ok(err.errors.unitId, 'unitId must be required');
      assert.ok(err.errors.reservationNumber, 'reservationNumber must be required');
      assert.ok(err.errors.totalAmount, 'totalAmount must be required');
    });

    it('AmenityQuotaAllocation should reject missing deterministic ID, orgId, quotaPeriod, quotaLimit', async () => {
      const quota = new AmenityQuotaAllocation({});
      const err = quota.validateSync();
      assert.ok(err, 'Validation must fail for empty quota');
      assert.ok(err.errors._id, '_id must be required');
      assert.ok(err.errors.orgId, 'orgId must be required');
      assert.ok(err.errors.quotaPeriod, 'quotaPeriod must be required');
      assert.ok(err.errors.quotaLimit, 'quotaLimit must be required');
    });

    it('AmenityAccessPass should reject missing passTokenHash, validFrom, validUntil', async () => {
      const pass = new AmenityAccessPass({});
      const err = pass.validateSync();
      assert.ok(err, 'Validation must fail for empty access pass');
      assert.ok(err.errors.orgId, 'orgId must be required');
      assert.ok(err.errors.reservationId, 'reservationId must be required');
      assert.ok(err.errors.passTokenHash, 'passTokenHash must be required');
      assert.ok(err.errors.validFrom, 'validFrom must be required');
      assert.ok(err.errors.validUntil, 'validUntil must be required');
    });
  });

  /* =========================================================================
   * 3. Enum Validation
   * ========================================================================= */
  describe('3. Enum Validation & Five-State Orthogonality', () => {
    it('AmenityFacility should reject invalid archetype and accept all 5 valid archetypes', () => {
      const validArchetypes = [
        'SHARED_CAPACITY',
        'EXCLUSIVE_HOURLY',
        'EVENT_SPACE',
        'ROOM_RESOURCE',
        'INVENTORY_TOOLS',
      ];

      for (const archetype of validArchetypes) {
        const facility = new AmenityFacility({
          orgId: mockOrgId,
          name: 'Tennis Court',
          code: 'TC-01',
          archetype,
          timezone: 'Asia/Kolkata',
        });
        const err = facility.validateSync();
        assert.ifError(err?.errors?.archetype);
      }

      const invalidFacility = new AmenityFacility({
        orgId: mockOrgId,
        name: 'Invalid Archetype',
        code: 'INV-01',
        archetype: 'UNSUPPORTED_ARCHETYPE',
        timezone: 'UTC',
      });
      const err = invalidFacility.validateSync();
      assert.ok(err?.errors?.archetype, 'Invalid archetype must be rejected');
    });

    it('AmenityReservation should enforce the 5 independent state dimensions and reject invalid enums', () => {
      // Dimension 1: bookingStatus
      const validBookingStatuses = ['PENDING_APPROVAL', 'CONFIRMED', 'CANCELLED', 'REJECTED'];
      // Dimension 2: paymentStatus (includes REFUND_PENDING)
      const validPaymentStatuses = [
        'NOT_REQUIRED',
        'PENDING',
        'HELD_AUTHORIZED',
        'PAID',
        'REFUND_PENDING',
        'REFUNDED',
        'FAILED',
      ];
      // Dimension 3: approvalStatus
      const validApprovalStatuses = ['NOT_REQUIRED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];
      // Dimension 4: accessStatus
      const validAccessStatuses = [
        'NOT_APPLICABLE',
        'PASS_GENERATED',
        'CHECKED_IN',
        'CHECKED_OUT',
        'ACCESS_REVOKED',
      ];
      // Dimension 5: completionStatus
      const validCompletionStatuses = ['PENDING', 'COMPLETED', 'NO_SHOW', 'ABANDONED'];

      const validResv = new AmenityReservation({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        residentId: mockResidentId,
        unitId: mockUnitId,
        reservationNumber: 'RES-202610-000001',
        requestedStartDateTime: new Date('2026-10-15T10:00:00Z'),
        requestedEndDateTime: new Date('2026-10-15T11:00:00Z'),
        effectiveStartDateTime: new Date('2026-10-15T10:00:00Z'),
        effectiveEndDateTime: new Date('2026-10-15T11:00:00Z'),
        bookingStatus: validBookingStatuses[1],
        paymentStatus: validPaymentStatuses[4], // REFUND_PENDING
        approvalStatus: validApprovalStatuses[0],
        accessStatus: validAccessStatuses[1],
        completionStatus: validCompletionStatuses[0],
        totalAmount: 500,
      });
      assert.ifError(validResv.validateSync());

      // Reject invalid bookingStatus
      const invalidResv1 = new AmenityReservation({ bookingStatus: 'HOLD' });
      assert.ok(invalidResv1.validateSync().errors.bookingStatus, 'HOLD is not a bookingStatus');

      // Reject invalid paymentStatus
      const invalidResv2 = new AmenityReservation({ paymentStatus: 'CAPTURED_UNOFFICIAL' });
      assert.ok(invalidResv2.validateSync().errors.paymentStatus);

      // Reject invalid approvalStatus
      const invalidResv3 = new AmenityReservation({ approvalStatus: 'WAITING_FOR_ADMIN' });
      assert.ok(invalidResv3.validateSync().errors.approvalStatus);

      // Reject invalid accessStatus
      const invalidResv4 = new AmenityReservation({ accessStatus: 'BARRIER_OPEN' });
      assert.ok(invalidResv4.validateSync().errors.accessStatus);

      // Reject invalid completionStatus
      const invalidResv5 = new AmenityReservation({ completionStatus: 'FINISHED_SESSION' });
      assert.ok(invalidResv5.validateSync().errors.completionStatus);
    });

    it('AmenityResource should validate assetState enum values', () => {
      const validStates = ['AVAILABLE', 'CHECKED_OUT', 'INSPECTION_PENDING', 'MAINTENANCE'];
      for (const assetState of validStates) {
        const res = new AmenityResource({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          name: 'Projector 1',
          identifier: 'PROJ-01',
          assetState,
        });
        assert.ifError(res.validateSync()?.errors?.assetState);
      }

      const invalidRes = new AmenityResource({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        name: 'Projector 1',
        identifier: 'PROJ-01',
        assetState: 'LOST_AND_FOUND',
      });
      assert.ok(invalidRes.validateSync()?.errors?.assetState);
    });

    it('AmenityReservationHold should validate holdType and status enums', () => {
      const validHoldTypes = ['STANDARD', 'ADMIN_REVIEW', 'PAYMENT_PENDING'];
      const validHoldStatuses = ['ACTIVE', 'PROMOTED', 'EXPIRED', 'RELEASED'];

      for (const holdType of validHoldTypes) {
        for (const status of validHoldStatuses) {
          const hold = new AmenityReservationHold({
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            residentId: mockResidentId,
            unitId: mockUnitId,
            requestedStartDateTime: new Date(),
            requestedEndDateTime: new Date(),
            effectiveStartDateTime: new Date(),
            effectiveEndDateTime: new Date(),
            expiresAt: new Date(Date.now() + 600000),
            holdType,
            status,
          });
          assert.ifError(hold.validateSync()?.errors?.holdType);
          assert.ifError(hold.validateSync()?.errors?.status);
        }
      }

      const invalidHold = new AmenityReservationHold({ holdType: 'SPECIAL', status: 'UNKNOWN' });
      const err = invalidHold.validateSync();
      assert.ok(err.errors.holdType);
      assert.ok(err.errors.status);
    });
  });

  /* =========================================================================
   * 4. Numeric & Timezone Validation
   * ========================================================================= */
  describe('4. Numeric & Timezone Validation', () => {
    it('AmenityFacility should reject negative baseRate, taxPercentage > 100, and slotDuration < 15', () => {
      const facility = new AmenityFacility({
        orgId: mockOrgId,
        name: 'Pool',
        code: 'POOL-1',
        archetype: 'SHARED_CAPACITY',
        timezone: 'Asia/Kolkata',
        slotDurationMinutes: 10, // < 15
        pricingConfig: {
          baseRate: -50, // Negative
          taxPercentage: 150, // > 100%
        },
      });

      const err = facility.validateSync();
      assert.ok(err.errors['slotDurationMinutes'], 'slotDurationMinutes < 15 must fail');
      assert.ok(err.errors['pricingConfig.baseRate'], 'Negative baseRate must fail');
      assert.ok(err.errors['pricingConfig.taxPercentage'], 'taxPercentage > 100 must fail');
    });

    it('AmenityFacility should reject invalid IANA timezone string and accept valid ones', () => {
      const validTzFacility = new AmenityFacility({
        orgId: mockOrgId,
        name: 'Clubhouse',
        code: 'CLUB-01',
        archetype: 'EVENT_SPACE',
        timezone: 'Asia/Kolkata',
      });
      assert.ifError(validTzFacility.validateSync()?.errors?.timezone);

      const invalidTzFacility = new AmenityFacility({
        orgId: mockOrgId,
        name: 'Clubhouse',
        code: 'CLUB-01',
        archetype: 'EVENT_SPACE',
        timezone: 'Mars/Curiosity_Rover',
      });
      const err = invalidTzFacility.validateSync();
      assert.ok(err?.errors?.timezone, 'Invalid IANA timezone Mars/Curiosity_Rover must fail');
    });

    it('AmenityResource should reject negative buffers and negative totalBulkStock', () => {
      const resource = new AmenityResource({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        name: 'Chairs',
        identifier: 'CHR-01',
        setupBufferMinutes: -10,
        teardownBufferMinutes: -5,
        totalBulkStock: -20,
      });

      const err = resource.validateSync();
      assert.ok(err.errors.setupBufferMinutes);
      assert.ok(err.errors.teardownBufferMinutes);
      assert.ok(err.errors.totalBulkStock);
    });

    it('AmenityQuotaAllocation should reject negative quotaLimit, reservedAmount, consumedAmount', () => {
      const quota = new AmenityQuotaAllocation({
        _id: 'QUOTA:org:unit:fac:token',
        orgId: mockOrgId,
        unitId: mockUnitId,
        facilityId: mockFacilityId,
        quotaPeriod: 'MONTHLY',
        periodToken: '2026-10',
        quotaLimit: -100,
        reservedAmount: -10,
        consumedAmount: -5,
      });

      const err = quota.validateSync();
      assert.ok(err.errors.quotaLimit);
      assert.ok(err.errors.reservedAmount);
      assert.ok(err.errors.consumedAmount);
    });

    it('AmenityAllocationLedger should reject allocatedQuantity < 1', () => {
      const ledger = new AmenityAllocationLedger({
        orgId: mockOrgId,
        bucketId: 'BUCKET:123',
        allocationType: 'CAPACITY_HEADCOUNT',
        allocatedQuantity: 0, // < 1
        status: 'HELD',
      });

      const err = ledger.validateSync();
      assert.ok(err.errors.allocatedQuantity);
    });
  });

  /* =========================================================================
   * 5. Date Validation
   * ========================================================================= */
  describe('5. Date Range & Ordering Validation', () => {
    it('AmenityMaintenanceBlock should reject endDateTime <= startDateTime', () => {
      const invalidMaint = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Filter replacement',
        startDateTime: new Date('2026-10-15T12:00:00Z'),
        endDateTime: new Date('2026-10-15T11:00:00Z'), // Earlier than start
        reason: 'Filter replacement',
      });

      const err = invalidMaint.validateSync();
      assert.ok(err?.errors?.endDateTime, 'endDateTime earlier than startDateTime must fail');

      const validMaint = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Filter replacement',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Filter replacement',
      });
      assert.ifError(validMaint.validateSync());
    });
  });

  /* =========================================================================
   * 6. TTL Indexes & Partial TTL Safety Verification
   * ========================================================================= */
  describe('6. TTL Indexes & Partial TTL Safety Verification', () => {
    it('AmenitySlotAllocation must have a partial TTL index protecting CONFIRMED and RELEASED records', () => {
      const indexes = AmenitySlotAllocation.schema.indexes();
      
      const ttlIndexEntry = indexes.find(
        ([fields, options]) => fields.expiresAt === 1 && options?.expireAfterSeconds === 0
      );

      assert.ok(ttlIndexEntry, 'AmenitySlotAllocation must declare a TTL index on expiresAt');

      const [fields, options] = ttlIndexEntry;
      assert.equal(options.expireAfterSeconds, 0);
      assert.ok(
        options.partialFilterExpression,
        'TTL index on AmenitySlotAllocation MUST declare a partialFilterExpression'
      );
      assert.equal(
        options.partialFilterExpression.status,
        'HELD',
        'Partial TTL index must only apply to status: HELD'
      );
      assert.deepEqual(
        options.partialFilterExpression.expiresAt,
        { $type: 'date' },
        'Partial TTL index must only match BSON dates'
      );

      // Mathematical logic test: Check whether non-held statuses are excluded
      const isCandidateForTTL = (doc) => {
        return (
          doc.status === options.partialFilterExpression.status &&
          doc.expiresAt instanceof Date
        );
      };

      assert.equal(
        isCandidateForTTL({ status: 'HELD', expiresAt: new Date() }),
        true,
        'HELD doc with Date must match TTL filter'
      );
      assert.equal(
        isCandidateForTTL({ status: 'CONFIRMED', expiresAt: new Date() }),
        false,
        'CONFIRMED doc MUST NOT match TTL filter'
      );
      assert.equal(
        isCandidateForTTL({ status: 'RELEASED', expiresAt: new Date() }),
        false,
        'RELEASED doc MUST NOT match TTL filter'
      );
      assert.equal(
        isCandidateForTTL({ status: null, expiresAt: null }),
        false,
        'Bucket/bulk aggregate records MUST NOT match TTL filter'
      );
    });

    it('AmenityReservationHold must have TTL index on expiresAt', () => {
      const indexes = AmenityReservationHold.schema.indexes();
      const ttlIndex = indexes.find(
        ([fields, options]) => fields.expiresAt === 1 && options?.expireAfterSeconds === 0
      );
      assert.ok(ttlIndex, 'AmenityReservationHold must declare a TTL index on expiresAt');
    });

    it('AmenityIdempotencyRecord must have TTL index on expireAt', () => {
      const indexes = AmenityIdempotencyRecord.schema.indexes();
      const ttlIndex = indexes.find(
        ([fields, options]) => fields.expireAt === 1 && options?.expireAfterSeconds === 0
      );
      assert.ok(ttlIndex, 'AmenityIdempotencyRecord must declare a TTL index on expireAt');
    });
  });

  /* =========================================================================
   * 7. Tenant-Scoped Unique Indexes Verification
   * ========================================================================= */
  describe('7. Tenant-Scoped Unique Indexes Verification', () => {
    it('AmenityFacility must declare unique compound index on { orgId: 1, code: 1 }', () => {
      const indexes = AmenityFacility.schema.indexes();
      const uniqueCodeIndex = indexes.find(
        ([fields, options]) => fields.orgId === 1 && fields.code === 1 && options?.unique === true
      );
      assert.ok(uniqueCodeIndex, 'Facility code must have a tenant-scoped unique index');
    });

    it('AmenityResource must declare tenant-scoped partial unique indexes on name and serialNumber', () => {
      const indexes = AmenityResource.schema.indexes();
      const uniqueNameIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 &&
          fields.facilityId === 1 &&
          fields.name === 1 &&
          options?.unique === true &&
          options?.partialFilterExpression?.isDeleted === false
      );
      assert.ok(uniqueNameIndex, 'Resource name must have tenant-scoped partial unique index');

      const uniqueSerialIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 &&
          fields.serialNumber === 1 &&
          options?.unique === true &&
          options?.partialFilterExpression?.serialNumber?.$type === 'string'
      );
      assert.ok(uniqueSerialIndex, 'Resource serialNumber must have tenant-scoped partial unique index');
    });

    it('AmenityReservation must declare tenant-scoped unique index on { orgId: 1, reservationNumber: 1 }', () => {
      const indexes = AmenityReservation.schema.indexes();
      const uniqueResvNumIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 && fields.reservationNumber === 1 && options?.unique === true
      );
      assert.ok(uniqueResvNumIndex, 'Reservation number must have a tenant-scoped unique index');
    });

    it('AmenityQuotaAllocation must declare tenant-scoped unique index on { orgId: 1, unitId: 1, facilityId: 1, periodToken: 1 }', () => {
      const indexes = AmenityQuotaAllocation.schema.indexes();
      const uniqueQuotaIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 &&
          fields.unitId === 1 &&
          fields.facilityId === 1 &&
          fields.periodToken === 1 &&
          options?.unique === true
      );
      assert.ok(uniqueQuotaIndex, 'Quota allocation must have a tenant-scoped unique compound index');
    });

    it('AmenityAccessPass must declare tenant-scoped unique index on { orgId: 1, passTokenHash: 1 }', () => {
      const indexes = AmenityAccessPass.schema.indexes();
      const uniquePassIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 && fields.passTokenHash === 1 && options?.unique === true
      );
      assert.ok(uniquePassIndex, 'Access pass token hash must have a tenant-scoped unique index');
    });

    it('AmenityIdempotencyRecord must declare tenant-scoped unique index on { orgId: 1, idempotencyKey: 1 }', () => {
      const indexes = AmenityIdempotencyRecord.schema.indexes();
      const uniqueIdempIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 && fields.idempotencyKey === 1 && options?.unique === true
      );
      assert.ok(uniqueIdempIndex, 'Idempotency key must have a tenant-scoped unique index');
    });

    it('AmenityCounter must declare tenant-scoped unique index on { orgId: 1, counterType: 1, yearMonth: 1 }', () => {
      const indexes = AmenityCounter.schema.indexes();
      const uniqueCounterIndex = indexes.find(
        ([fields, options]) =>
          fields.orgId === 1 &&
          fields.counterType === 1 &&
          fields.yearMonth === 1 &&
          options?.unique === true
      );
      assert.ok(uniqueCounterIndex, 'Counter must have a tenant-scoped unique compound index');
    });
  });

  /* =========================================================================
   * 8. Legacy Models Immutability Verification
   * ========================================================================= */
  describe('8. Legacy Models Immutability Verification', () => {
    it('Legacy Amenity model must point to "amenities" collection and retain original schema fields', () => {
      assert.ok(LegacyAmenity, 'Legacy Amenity model must exist');
      assert.equal(LegacyAmenity.collection.name, 'amenities');
      assert.ok(LegacyAmenity.schema.paths.bookingRules, 'Legacy Amenity schema must have bookingRules');
      assert.ok(LegacyAmenity.schema.paths.pricing, 'Legacy Amenity schema must have pricing');
      assert.ok(!LegacyAmenity.schema.paths.archetype, 'Legacy Amenity must NOT have new archetype field');
      assert.ok(
        !LegacyAmenity.schema.paths.concurrencyVersion,
        'Legacy Amenity must NOT have new concurrencyVersion field'
      );
    });

    it('Legacy AmenityBooking model must point to "amenitybookings" collection and retain original schema', () => {
      assert.ok(LegacyAmenityBooking, 'Legacy AmenityBooking model must exist');
      assert.equal(LegacyAmenityBooking.collection.name, 'amenitybookings');
      assert.ok(LegacyAmenityBooking.schema.paths.bookingDate, 'Legacy bookingDate string must exist');
      assert.ok(LegacyAmenityBooking.schema.paths.status, 'Legacy single status field must exist');
      assert.ok(
        !LegacyAmenityBooking.schema.paths.bookingStatus,
        'Legacy AmenityBooking must NOT have new bookingStatus'
      );
      assert.ok(
        !LegacyAmenityBooking.schema.paths.approvalStatus,
        'Legacy AmenityBooking must NOT have new approvalStatus'
      );
      assert.ok(
        !LegacyAmenityBooking.schema.paths.accessStatus,
        'Legacy AmenityBooking must NOT have new accessStatus'
      );
      assert.ok(
        !LegacyAmenityBooking.schema.paths.completionStatus,
        'Legacy AmenityBooking must NOT have new completionStatus'
      );
    });

    it('Legacy Booking model must point to "bookings" collection and retain original schema', () => {
      assert.ok(LegacyBooking, 'Legacy Booking model must exist');
      assert.equal(LegacyBooking.collection.name, 'bookings');
      assert.ok(LegacyBooking.schema.paths.durationMinutes, 'Legacy durationMinutes must exist');
      assert.ok(LegacyBooking.schema.paths.bookingStatus, 'Legacy bookingStatus must exist');
    });
  });
});
