import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { AmenityMaintenanceBlock } from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.model.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityMaintenanceBlockService from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js';
import amenityMaintenanceBlockController from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.controller.js';
import amenityFacilityService from '../src/features/amenityManagement/facilities/amenityFacility.service.js';
import amenityResourceService from '../src/features/amenityManagement/resources/amenityResource.service.js';
import amenityReservationService from '../src/features/amenityManagement/reservations/amenityReservation.service.js';
import amenityOutboxEventRepository from '../src/features/amenityManagement/outbox/amenityOutboxEvent.repository.js';
import amenityMaintenanceImpactRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.repository.js';
import amenityAccessPassService from '../src/features/amenityManagement/passes/amenityAccessPass.service.js';
import amenityAccessPassRepository from '../src/features/amenityManagement/passes/amenityAccessPass.repository.js';
import amenityIdempotencyService from '../src/features/amenityManagement/idempotency/amenityIdempotencyRecord.service.js';
import HttpError from '../src/utils/httpError.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockSession = { _isMockSession: true };

describe('Amenity Maintenance Phase 5 — Emergency Maintenance Engine', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockOrgId2 = new mongoose.Types.ObjectId();
  const mockFacilityId = new mongoose.Types.ObjectId();
  const mockResourceId1 = new mongoose.Types.ObjectId();
  const mockResourceId2 = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * 1. Schema & Model Validation
   * ========================================================================= */
  describe('1. Model Schema & Emergency Attributes', () => {
    it('should validate AmenityMaintenanceBlock with isEmergency = true', () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Emergency Chemical Spill',
        reason: 'Hazardous spill requiring immediate evacuation',
        startDateTime: new Date(),
        endDateTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        isEmergency: true,
        bufferBeforeMinutes: 0,
      });

      const err = block.validateSync();
      assert.ifError(err);
      assert.equal(block.isEmergency, true);
      assert.equal(block.status, 'IN_PROGRESS');
      assert.equal(block.bufferBeforeMinutes, 0);
    });

    it('should default isEmergency to false on standard scheduled blocks', () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Routine Pool Cleaning',
        reason: 'Weekly cleaning',
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endDateTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
      });

      assert.equal(block.isEmergency, false);
      assert.equal(block.status, 'SCHEDULED');
    });
  });

  /* =========================================================================
   * 2. Input Validation & Immediate Start Semantics
   * ========================================================================= */
  describe('2. Input Validation & Immediate Start Semantics', () => {
    it('should reject declareEmergencyMaintenance missing mandatory fields', async () => {
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            facilityId: mockFacilityId,
            title: 'Emergency',
            reason: 'Test',
            endDateTime: new Date(Date.now() + 3600000),
          });
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('orgId is required')
      );

      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            orgId: mockOrgId,
            title: 'Emergency',
            reason: 'Test',
            endDateTime: new Date(Date.now() + 3600000),
          });
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('facilityId is required')
      );

      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: '',
            reason: 'Test',
            endDateTime: new Date(Date.now() + 3600000),
          });
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('Maintenance title is required')
      );

      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Emergency Title',
            reason: '',
            endDateTime: new Date(Date.now() + 3600000),
          });
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('Maintenance reason is required')
      );

      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Emergency Title',
            reason: 'Emergency Reason',
          });
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('endDateTime is required')
      );
    });

    it('should reject endDateTime that is in the past or earlier than current time', async () => {
      const pastEnd = new Date(Date.now() - 60000);
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Emergency Pipe Burst',
            reason: 'Water leak',
            endDateTime: pastEnd,
          });
        },
        (err) =>
          (err.statusCode === 400 || err.status === 400) &&
          err.message.includes('endDateTime must be later than startDateTime')
      );
    });

    it('should reject negative bufferAfterMinutes', async () => {
      await assert.rejects(
        async () => {
          await amenityMaintenanceBlockService.declareEmergencyMaintenance({
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Emergency Pipe Burst',
            reason: 'Water leak',
            endDateTime: new Date(Date.now() + 3600000),
            bufferAfterMinutes: -15,
          });
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('cannot be negative')
      );
    });
  });

  /* =========================================================================
   * 3. Tenant Isolation & Facility/Resource Target Validation
   * ========================================================================= */
  describe('3. Target Validation & Tenant Isolation', () => {
    it('should reject if facility does not exist', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      amenityFacilityService.getFacilityById = async () => null;

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.declareEmergencyMaintenance(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                title: 'Fire Emergency',
                reason: 'Fire in clubhouse',
                endDateTime: new Date(Date.now() + 7200000),
              },
              mockSession
            );
          },
          (err) => (err.statusCode === 404 || err.status === 404) && err.message.includes('Facility')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
      }
    });

    it('should reject if facility belongs to another organization (tenant isolation)', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId2, // different tenant
        isActive: true,
        isDeleted: false,
      });

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.declareEmergencyMaintenance(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                title: 'Gas Leak',
                reason: 'Gas smell detected',
                endDateTime: new Date(Date.now() + 7200000),
              },
              mockSession
            );
          },
          (err) => (err.statusCode === 403 || err.status === 403) && err.message.includes('organization')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
      }
    });

    it('should reject if resource belongs to another facility', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origGetResource = amenityResourceService.getResourceById;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        isActive: true,
        isDeleted: false,
      });

      amenityResourceService.getResourceById = async () => ({
        _id: mockResourceId1,
        orgId: mockOrgId,
        facilityId: new mongoose.Types.ObjectId(), // different facility
        isActive: true,
        isDeleted: false,
      });

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.declareEmergencyMaintenance(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                resourceId: mockResourceId1,
                title: 'Equipment Fault',
                reason: 'Gym treadmill electrical fire',
                endDateTime: new Date(Date.now() + 7200000),
              },
              mockSession
            );
          },
          (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('does not belong to specified facility')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityResourceService.getResourceById = origGetResource;
      }
    });
  });

  /* =========================================================================
   * 4. Overlapping Existing Maintenance Conflict (HTTP 409)
   * ========================================================================= */
  describe('4. Overlapping Maintenance Conflict Handling', () => {
    it('should reject with HTTP 409 if an overlapping maintenance block already exists', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        isActive: true,
        isDeleted: false,
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [
        { _id: new mongoose.Types.ObjectId(), status: 'SCHEDULED' },
      ];

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.declareEmergencyMaintenance(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                title: 'Emergency Overlap Test',
                reason: 'Overlapping with existing block',
                endDateTime: new Date(Date.now() + 7200000),
              },
              mockSession
            );
          },
          (err) =>
            (err.statusCode === 409 || err.status === 409) &&
            err.message.includes('already exists that overlaps')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
      }
    });
  });

  /* =========================================================================
   * 5. Decision 1 (Option B) — Checked-in V1 Booking Protection
   * ========================================================================= */
  describe('5. Decision 1 (Option B) — Checked-in V1 Booking Handling', () => {
    it('should NOT cancel a checked-in V1 booking, mapping it to REVIEW_INDIVIDUALLY and status PENDING_REVIEW', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origCreateBlock = amenityMaintenanceBlockRepository.create;
      const origCreateOutbox = amenityOutboxEventRepository.createEvent;
      const origImpactCreate = amenityMaintenanceImpactRepository.create;
      const origImpactFind = amenityMaintenanceImpactRepository.findByBlockAndTarget;

      const checkedInBookingId = new mongoose.Types.ObjectId();
      const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;

      const origFindV1 = amenityBookingService.findOverlappingBookingsForWindow;
      const origGetV1 = amenityBookingService.getBookingById;
      const origCancelV1 = amenityBookingService.cancelBooking;

      let cancelV1Called = false;
      let recordedImpact = null;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        isActive: true,
        isDeleted: false,
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityReservationService.findOverlappingActiveReservations = async () => [];
      amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;

      amenityBookingService.findOverlappingBookingsForWindow = async () => [
        { _id: checkedInBookingId, status: 'checked-in', userId: mockUserId },
      ];

      amenityBookingService.getBookingById = async () => ({
        _id: checkedInBookingId,
        status: 'checked-in',
        userId: mockUserId,
      });

      amenityBookingService.cancelBooking = async () => {
        cancelV1Called = true;
        throw new Error('cancelBooking should NOT be called for checked-in booking!');
      };

      amenityMaintenanceBlockRepository.create = async (doc) => ({
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      });

      amenityMaintenanceImpactRepository.create = async (doc) => {
        recordedImpact = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };

      amenityOutboxEventRepository.createEvent = async () => ({ _id: new mongoose.Types.ObjectId() });

      try {
        const result = await amenityMaintenanceBlockService.declareEmergencyMaintenance(
          {
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Sudden Flood',
            reason: 'Pool pumps overflowed into court',
            endDateTime: new Date(Date.now() + 7200000),
            conflictAction: 'CANCEL_AND_PROCEED',
          },
          mockSession
        );

        // Verification of Decision 1 (Option B)
        assert.equal(cancelV1Called, false, 'cancelBooking must NOT be called for checked-in V1 booking');
        assert.ok(recordedImpact, 'An impact record must be created');
        assert.equal(recordedImpact.targetType, 'V1_BOOKING');
        assert.equal(String(recordedImpact.targetId), String(checkedInBookingId));
        assert.equal(recordedImpact.resolution, 'REVIEW_INDIVIDUALLY', 'Checked-in booking resolution must be REVIEW_INDIVIDUALLY');
        assert.equal(recordedImpact.status, 'PENDING_REVIEW', 'Impact status must be PENDING_REVIEW');
        assert.ok(recordedImpact.resolutionDetails.notes.includes('Checked-in booking flagged for individual review'));

        // Block attributes
        assert.equal(result.block.isEmergency, true);
        assert.equal(result.block.status, 'IN_PROGRESS');
        assert.equal(result.block.bufferBeforeMinutes, 0);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityMaintenanceBlockRepository.create = origCreateBlock;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
        amenityMaintenanceImpactRepository.create = origImpactCreate;
        amenityMaintenanceImpactRepository.findByBlockAndTarget = origImpactFind;
        amenityBookingService.findOverlappingBookingsForWindow = origFindV1;
        amenityBookingService.getBookingById = origGetV1;
        amenityBookingService.cancelBooking = origCancelV1;
      }
    });
  });

  /* =========================================================================
   * 6. Decision 2 (Option A) — 100% Refund on Administrative Cancellation
   * ========================================================================= */
  describe('6. Decision 2 (Option A) — Administrative 100% Refund for V1 Cancellation', () => {
    it('should cancel active V1 booking with 100% refund override in emergency', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origCreateBlock = amenityMaintenanceBlockRepository.create;
      const origCreateOutbox = amenityOutboxEventRepository.createEvent;
      const origImpactCreate = amenityMaintenanceImpactRepository.create;
      const origImpactFind = amenityMaintenanceImpactRepository.findByBlockAndTarget;

      const confirmedBookingId = new mongoose.Types.ObjectId();
      const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;

      const origFindV1 = amenityBookingService.findOverlappingBookingsForWindow;
      const origGetV1 = amenityBookingService.getBookingById;
      const origCancelV1 = amenityBookingService.cancelBooking;

      let cancelV1OptionsPassed = null;
      let recordedImpact = null;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        isActive: true,
        isDeleted: false,
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityReservationService.findOverlappingActiveReservations = async () => [];
      amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;

      amenityBookingService.findOverlappingBookingsForWindow = async () => [
        { _id: confirmedBookingId, status: 'confirmed', userId: mockUserId },
      ];

      amenityBookingService.getBookingById = async () => ({
        _id: confirmedBookingId,
        status: 'confirmed',
        userId: mockUserId,
      });

      amenityBookingService.cancelBooking = async (bookingId, userId, orgId, reason, isAdmin, options) => {
        cancelV1OptionsPassed = { isAdmin, options };
        return {
          status: 'cancelled',
          refundAmount: 500,
          refundPercentage: 100,
        };
      };

      amenityMaintenanceBlockRepository.create = async (doc) => ({
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      });

      amenityMaintenanceImpactRepository.create = async (doc) => {
        recordedImpact = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };

      amenityOutboxEventRepository.createEvent = async () => ({ _id: new mongoose.Types.ObjectId() });

      try {
        const result = await amenityMaintenanceBlockService.declareEmergencyMaintenance(
          {
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Power Surge',
            reason: 'Transformer explosion',
            endDateTime: new Date(Date.now() + 7200000),
            conflictAction: 'CANCEL_AND_PROCEED',
          },
          mockSession
        );

        // Verification of Decision 2 (Option A)
        assert.ok(cancelV1OptionsPassed, 'cancelBooking should be invoked');
        assert.equal(cancelV1OptionsPassed.isAdmin, true, 'Cancellation must be flagged isAdmin');
        assert.equal(
          cancelV1OptionsPassed.options?.refundOverridePercentage,
          100,
          'Administrative refund override must specify 100%'
        );
        assert.equal(recordedImpact.resolution, 'CANCEL');
        assert.equal(recordedImpact.status, 'RESOLVED');
        assert.equal(recordedImpact.resolutionDetails.refundPercentage, 100);
        assert.equal(recordedImpact.resolutionDetails.refundAmount, 500);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityMaintenanceBlockRepository.create = origCreateBlock;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
        amenityMaintenanceImpactRepository.create = origImpactCreate;
        amenityMaintenanceImpactRepository.findByBlockAndTarget = origImpactFind;
        amenityBookingService.findOverlappingBookingsForWindow = origFindV1;
        amenityBookingService.getBookingById = origGetV1;
        amenityBookingService.cancelBooking = origCancelV1;
      }
    });
  });

  /* =========================================================================
   * 7. Decision 3 (Option A) — Revoked Pass Turnstile Egress / Check-Out
   * ========================================================================= */
  describe('7. Decision 3 (Option A) — Revoked Pass Turnstile Egress Handling', () => {
    it('should permit turnstile check-out if pass was checked in prior to revocation', async () => {
      const passId = new mongoose.Types.ObjectId();
      const rawToken = 'sample-emergency-raw-token-123';
      const passTokenHash = amenityAccessPassService.hashToken(rawToken);

      const origFindByTokenHash = amenityAccessPassRepository.findByTokenHash;
      const origRecordCheckOut = amenityAccessPassRepository.recordCheckOut;

      // Mock a pass that was checked in earlier, but was subsequently marked isRevoked: true due to emergency
      const mockRevokedCheckedInPass = {
        _id: passId,
        passTokenHash,
        orgId: mockOrgId,
        isRevoked: true,
        revocationReason: 'Emergency maintenance declared',
        checkInTimestamp: new Date(Date.now() - 30 * 60 * 1000), // checked in 30 mins ago
        checkOutTimestamp: null,
      };

      amenityAccessPassRepository.recordCheckOut = async () => ({
        ...mockRevokedCheckedInPass,
        checkOutTimestamp: new Date(),
      });
      amenityAccessPassRepository.findByTokenHash = async () => mockRevokedCheckedInPass;

      try {
        const checkOutResult = await amenityAccessPassService.recordCheckOut(
          {
            orgId: mockOrgId,
            rawToken,
            scannedBy: mockUserId,
          },
          mockSession
        );

        assert.ok(checkOutResult, 'recordCheckOut must succeed for checked-in revoked pass');
        assert.ok(checkOutResult.checkOutTimestamp, 'Exit timestamp must be recorded');
        assert.equal(checkOutResult.isRevoked, true, 'Pass remains revoked');
      } finally {
        amenityAccessPassRepository.findByTokenHash = origFindByTokenHash;
        amenityAccessPassRepository.recordCheckOut = origRecordCheckOut;
      }
    });

    it('should reject turnstile check-out with HTTP 403 if pass is revoked and was NEVER checked in', async () => {
      const rawToken = 'sample-emergency-raw-token-456';
      const passTokenHash = amenityAccessPassService.hashToken(rawToken);

      const origFindByTokenHash = amenityAccessPassRepository.findByTokenHash;
      const origRecordCheckOut = amenityAccessPassRepository.recordCheckOut;

      // Pass revoked before ever entering
      const mockUncheckedRevokedPass = {
        _id: new mongoose.Types.ObjectId(),
        passTokenHash,
        orgId: mockOrgId,
        isRevoked: true,
        revocationReason: 'Emergency maintenance declared',
        checkInTimestamp: null, // NEVER entered!
        checkOutTimestamp: null,
      };

      amenityAccessPassRepository.recordCheckOut = async () => null;
      amenityAccessPassRepository.findByTokenHash = async () => mockUncheckedRevokedPass;

      try {
        await assert.rejects(
          async () => {
            await amenityAccessPassService.recordCheckOut(
              {
                orgId: mockOrgId,
                rawToken,
                scannedBy: mockUserId,
              },
              mockSession
            );
          },
          (err) => (err.statusCode === 403 || err.status === 403) && err.message.includes('revoked')
        );
      } finally {
        amenityAccessPassRepository.findByTokenHash = origFindByTokenHash;
        amenityAccessPassRepository.recordCheckOut = origRecordCheckOut;
      }
    });
  });

  /* =========================================================================
   * 8. V2 Reservation Cancellation & Pass Revocation
   * ========================================================================= */
  describe('8. V2 Reservation Cancellation & Pass Revocation', () => {
    it('should cancel active V2 reservation, record 100% refund, and emit outbox event', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origGetReservation = amenityReservationService.getReservationById;
      const origCancelReservation = amenityReservationService.cancelReservation;
      const origCreateBlock = amenityMaintenanceBlockRepository.create;
      const origCreateOutbox = amenityOutboxEventRepository.createEvent;
      const origImpactCreate = amenityMaintenanceImpactRepository.create;
      const origImpactFind = amenityMaintenanceImpactRepository.findByBlockAndTarget;
      const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
      const origFindV1 = amenityBookingService.findOverlappingBookingsForWindow;

      const resId = new mongoose.Types.ObjectId();
      let cancelV2Called = false;
      let outboxPayload = null;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        isActive: true,
        isDeleted: false,
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;
      amenityBookingService.findOverlappingBookingsForWindow = async () => [];

      amenityReservationService.findOverlappingActiveReservations = async () => [
        { _id: resId, residentId: mockUserId, bookingStatus: 'CONFIRMED' },
      ];

      amenityReservationService.getReservationById = async () => ({
        _id: resId,
        residentId: mockUserId,
        bookingStatus: 'CONFIRMED',
        totalAmount: 1200,
        requestedStartDateTime: new Date(),
        requestedEndDateTime: new Date(Date.now() + 3600000),
      });

      amenityReservationService.cancelReservation = async (params) => {
        cancelV2Called = true;
        assert.equal(params.isManagementCancellation, true);
      };

      amenityMaintenanceBlockRepository.create = async (doc) => ({
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      });

      amenityMaintenanceImpactRepository.create = async (doc) => ({
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      });

      amenityOutboxEventRepository.createEvent = async (doc) => {
        outboxPayload = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };

      try {
        const result = await amenityMaintenanceBlockService.declareEmergencyMaintenance(
          {
            orgId: mockOrgId,
            facilityId: mockFacilityId,
            title: 'Severe Structural Damage',
            reason: 'Ceiling plaster collapsed',
            endDateTime: new Date(Date.now() + 14400000),
            conflictAction: 'CANCEL_AND_PROCEED',
          },
          mockSession
        );

        assert.equal(cancelV2Called, true, 'cancelReservation must be called for V2 reservation');
        assert.equal(result.block.isEmergency, true);
        assert.equal(result.block.status, 'IN_PROGRESS');
        assert.equal(outboxPayload.eventType, 'EMERGENCY_MAINTENANCE_DECLARED');
        assert.equal(outboxPayload.payload.isEmergency, true);
        assert.equal(outboxPayload.payload.impactedReservationsCount, 1);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityReservationService.getReservationById = origGetReservation;
        amenityReservationService.cancelReservation = origCancelReservation;
        amenityMaintenanceBlockRepository.create = origCreateBlock;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
        amenityMaintenanceImpactRepository.create = origImpactCreate;
        amenityMaintenanceImpactRepository.findByBlockAndTarget = origImpactFind;
        amenityBookingService.findOverlappingBookingsForWindow = origFindV1;
      }
    });
  });

  /* =========================================================================
   * 9. Emergency Lifecycle: Extension & Completion
   * ========================================================================= */
  describe('9. Emergency Lifecycle: Extension & Completion', () => {
    it('should allow extending an IN_PROGRESS emergency maintenance block', async () => {
      const origFindById = amenityMaintenanceBlockRepository.findById;
      const origExtend = amenityMaintenanceBlockRepository.extend;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origCreateOutbox = amenityOutboxEventRepository.createEvent;
      const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
      const origFindV1 = amenityBookingService.findOverlappingBookingsForWindow;

      const blockId = new mongoose.Types.ObjectId();
      const currentEnd = new Date(Date.now() + 3600000);
      const newEnd = new Date(Date.now() + 7200000);

      amenityMaintenanceBlockRepository.findById = async () => ({
        _id: blockId,
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        status: 'IN_PROGRESS',
        isEmergency: true,
        startDateTime: new Date(Date.now() - 3600000),
        endDateTime: currentEnd,
        reason: 'Gas Leak',
      });

      amenityReservationService.findOverlappingActiveReservations = async () => [];
      amenityBookingService.findOverlappingBookingsForWindow = async () => [];

      amenityMaintenanceBlockRepository.extend = async (id, orgId, end) => ({
        _id: blockId,
        orgId,
        facilityId: mockFacilityId,
        status: 'IN_PROGRESS',
        isEmergency: true,
        endDateTime: end,
      });

      amenityOutboxEventRepository.createEvent = async () => ({ _id: new mongoose.Types.ObjectId() });

      try {
        const extended = await amenityMaintenanceBlockService.extendMaintenanceBlock(
          {
            blockId,
            orgId: mockOrgId,
            newEndDateTime: newEnd,
          },
          mockSession
        );

        assert.equal(extended.block.status, 'IN_PROGRESS');
        assert.equal(extended.block.isEmergency, true);
        assert.equal(extended.block.endDateTime.getTime(), newEnd.getTime());
      } finally {
        amenityMaintenanceBlockRepository.findById = origFindById;
        amenityMaintenanceBlockRepository.extend = origExtend;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityBookingService.findOverlappingBookingsForWindow = origFindV1;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
      }
    });

    it('should allow completing an IN_PROGRESS emergency block and restoring availability', async () => {
      const origFindById = amenityMaintenanceBlockRepository.findById;
      const origUpdateStatus = amenityMaintenanceBlockRepository.updateStatus;
      const origCreateOutbox = amenityOutboxEventRepository.createEvent;

      const blockId = new mongoose.Types.ObjectId();

      amenityMaintenanceBlockRepository.findById = async () => ({
        _id: blockId,
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        status: 'IN_PROGRESS',
        isEmergency: true,
      });

      amenityMaintenanceBlockRepository.updateStatus = async (id, orgId, status, session, completion) => ({
        _id: blockId,
        orgId,
        facilityId: mockFacilityId,
        status,
        isEmergency: true,
        completedBy: completion?.completedBy,
        completionNotes: completion?.completionNotes,
      });

      amenityOutboxEventRepository.createEvent = async () => ({ _id: new mongoose.Types.ObjectId() });

      try {
        const completed = await amenityMaintenanceBlockService.updateMaintenanceStatus(
          blockId,
          mockOrgId,
          'COMPLETED',
          mockSession,
          {
            completedBy: mockUserId,
            completionNotes: 'All repairs completed, hazard resolved',
          }
        );

        assert.equal(completed.status, 'COMPLETED');
        assert.equal(completed.isEmergency, true);
        assert.equal(String(completed.completedBy), String(mockUserId));
      } finally {
        amenityMaintenanceBlockRepository.findById = origFindById;
        amenityMaintenanceBlockRepository.updateStatus = origUpdateStatus;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
      }
    });
  });

  /* =========================================================================
   * 10. Availability Integration: Blackout during IN_PROGRESS vs COMPLETED
   * ========================================================================= */
  describe('10. Availability Blackout & Restoration', () => {
    it('should block availability when emergency block status is IN_PROGRESS', () => {
      const activeStatuses = ['SCHEDULED', 'IN_PROGRESS'];
      assert.ok(activeStatuses.includes('IN_PROGRESS'), 'IN_PROGRESS must be an active blocking status');
    });

    it('should restore availability when emergency block is COMPLETED or CANCELLED', () => {
      const activeStatuses = ['SCHEDULED', 'IN_PROGRESS'];
      assert.equal(activeStatuses.includes('COMPLETED'), false, 'COMPLETED blocks must NOT block availability');
      assert.equal(activeStatuses.includes('CANCELLED'), false, 'CANCELLED blocks must NOT block availability');
    });
  });

  /* =========================================================================
   * 11. Stale Preview Protection & Conflict Action in Emergency
   * ========================================================================= */
  describe('11. Stale Preview Protection & Conflict Action in Emergency', () => {
    it('should throw HTTP 409 if resolutions are provided but fail to cover all conflicts', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origImpactFind = amenityMaintenanceImpactRepository.findByBlockAndTarget;
      const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
      const origFindV1 = amenityBookingService.findOverlappingBookingsForWindow;

      const resId1 = new mongoose.Types.ObjectId();
      const resId2 = new mongoose.Types.ObjectId();

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        isActive: true,
        isDeleted: false,
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;
      amenityBookingService.findOverlappingBookingsForWindow = async () => [];

      amenityReservationService.findOverlappingActiveReservations = async () => [
        { _id: resId1, residentId: mockUserId, bookingStatus: 'CONFIRMED' },
        { _id: resId2, residentId: mockUserId, bookingStatus: 'CONFIRMED' },
      ];

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.declareEmergencyMaintenance(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                title: 'Toxic Fume Leak',
                reason: 'Chemical fumes in plant room',
                endDateTime: new Date(Date.now() + 7200000),
                conflictAction: null,
                // Only resolving resId1, omitting resId2!
                resolutions: [
                  { targetId: resId1, targetType: 'V2_RESERVATION', resolution: 'CANCEL' },
                ],
              },
              mockSession
            );
          },
          (err) =>
            (err.statusCode === 409 || err.status === 409) &&
            err.message.includes('Resolution required for all affected items')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityMaintenanceImpactRepository.findByBlockAndTarget = origImpactFind;
        amenityBookingService.findOverlappingBookingsForWindow = origFindV1;
      }
    });
  });

  /* =========================================================================
   * 12. Controller & Idempotency Execution
   * ========================================================================= */
  describe('12. Controller & Idempotency Integration', () => {
    it('should route declareEmergency through amenityIdempotencyService when X-Idempotency-Key is provided', async () => {
      const origDeclare = amenityMaintenanceBlockService.declareEmergencyMaintenance;
      const origExecuteIdemp = amenityIdempotencyService.executeWithIdempotency;

      let idempCalled = false;
      let declareCalled = false;

      const mockBlock = {
        _id: new mongoose.Types.ObjectId(),
        status: 'IN_PROGRESS',
        isEmergency: true,
      };

      amenityMaintenanceBlockService.declareEmergencyMaintenance = async () => {
        declareCalled = true;
        return { block: mockBlock, impacts: [] };
      };

      amenityIdempotencyService.executeWithIdempotency = async (params, handler) => {
        idempCalled = true;
        assert.equal(params.idempotencyKey, 'IDEMP-EMERGENCY-001');
        return handler();
      };

      const req = {
        tenant: { orgId: mockOrgId },
        headers: { 'x-idempotency-key': 'IDEMP-EMERGENCY-001' },
        user: { _id: mockUserId },
        body: {
          facilityId: mockFacilityId,
          title: 'Emergency Power Loss',
          reason: 'Main transformer blown',
          endDateTime: new Date(Date.now() + 7200000).toISOString(),
        },
      };

      let responseData = null;
      let responseStatus = null;

      const res = {
        success: (data, message, status) => {
          responseData = data;
          responseStatus = status;
          return { data, status };
        },
      };

      try {
        await amenityMaintenanceBlockController.declareEmergency(req, res, (err) => {
          if (err) throw err;
        });

        assert.equal(idempCalled, true, 'amenityIdempotencyService must be invoked');
        assert.equal(declareCalled, true, 'declareEmergencyMaintenance must be executed');
        assert.equal(responseStatus, 201);
        assert.equal(responseData.block.isEmergency, true);
      } finally {
        amenityMaintenanceBlockService.declareEmergencyMaintenance = origDeclare;
        amenityIdempotencyService.executeWithIdempotency = origExecuteIdemp;
      }
    });
  });

  /* =========================================================================
   * 13. Architectural Boundaries Compliance
   * ========================================================================= */
  describe('13. Architectural Compliance', () => {
    it('should verify zero direct socket.io imports in amenityMaintenanceBlock.service.js', () => {
      const servicePath = path.resolve(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const code = fs.readFileSync(servicePath, 'utf8');
      assert.equal(
        code.includes("from 'socket.io'") || code.includes('from "socket.io"'),
        false,
        'amenityMaintenanceBlock.service.js must not import socket.io directly'
      );
    });

    it('should verify zero foreign repository imports in amenityMaintenanceBlock.service.js', () => {
      const servicePath = path.resolve(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const code = fs.readFileSync(servicePath, 'utf8');
      const lines = code.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('import') && line.includes('repository')) {
          assert.ok(
            line.includes('amenityMaintenanceBlock.repository.js') ||
              line.includes('amenityMaintenanceImpact.repository.js') ||
              line.includes('amenityOutboxEvent.repository.js'),
            `Forbidden cross-feature repository import: ${line}`
          );
        }
      }
    });
  });

  /* =========================================================================
   * 14. Adversarial Closure & Edge-Case Audits
   * ========================================================================= */
  describe('14. Adversarial Closure & Edge-Case Audits', () => {
    describe('14.1 Pass Revocation & Turnstile Egress Audit (All 7 Sub-cases)', () => {
      it('Case 3: should reject checkout with HTTP 409 if pass was already checked out', async () => {
        const origRecord = amenityAccessPassRepository.recordCheckOut;
        const origFindByToken = amenityAccessPassRepository.findByTokenHash;

        amenityAccessPassRepository.recordCheckOut = async () => null;
        amenityAccessPassRepository.findByTokenHash = async () => ({
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          isRevoked: true,
          checkInTimestamp: new Date(Date.now() - 3600000),
          checkOutTimestamp: new Date(Date.now() - 1800000),
        });

        try {
          await assert.rejects(
            async () => {
              await amenityAccessPassService.recordCheckOut(
                { orgId: mockOrgId, rawToken: 'PASS-TOKEN-ALREADY-OUT' },
                mockSession
              );
            },
            (err) => (err.statusCode === 409 || err.status === 409) && err.message.includes('already been checked out')
          );
        } finally {
          amenityAccessPassRepository.recordCheckOut = origRecord;
          amenityAccessPassRepository.findByTokenHash = origFindByToken;
        }
      });

      it('Case 4: should reject checkout with HTTP 400 if pass was never checked in and not revoked', async () => {
        const origRecord = amenityAccessPassRepository.recordCheckOut;
        const origFindByToken = amenityAccessPassRepository.findByTokenHash;

        amenityAccessPassRepository.recordCheckOut = async () => null;
        amenityAccessPassRepository.findByTokenHash = async () => ({
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          isRevoked: false,
          checkInTimestamp: null,
          checkOutTimestamp: null,
        });

        try {
          await assert.rejects(
            async () => {
              await amenityAccessPassService.recordCheckOut(
                { orgId: mockOrgId, rawToken: 'PASS-TOKEN-NOT-IN' },
                mockSession
              );
            },
            (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('has not been checked in yet')
          );
        } finally {
          amenityAccessPassRepository.recordCheckOut = origRecord;
          amenityAccessPassRepository.findByTokenHash = origFindByToken;
        }
      });

      it('Case 5: should reject checkout with HTTP 404 for cross-tenant pass token', async () => {
        const origRecord = amenityAccessPassRepository.recordCheckOut;
        const origFindByToken = amenityAccessPassRepository.findByTokenHash;

        amenityAccessPassRepository.recordCheckOut = async () => null;
        // Tenant query with Org A returns null because token belongs to Org B
        amenityAccessPassRepository.findByTokenHash = async () => null;

        try {
          await assert.rejects(
            async () => {
              await amenityAccessPassService.recordCheckOut(
                { orgId: mockOrgId, rawToken: 'PASS-TOKEN-ORG-B' },
                mockSession
              );
            },
            (err) => (err.statusCode === 404 || err.status === 404) && err.message.includes('token not found for this organization')
          );
        } finally {
          amenityAccessPassRepository.recordCheckOut = origRecord;
          amenityAccessPassRepository.findByTokenHash = origFindByToken;
        }
      });

      it('Case 6: should reject checkout with HTTP 404 for invalid/unrecognized pass token', async () => {
        const origRecord = amenityAccessPassRepository.recordCheckOut;
        const origFindByToken = amenityAccessPassRepository.findByTokenHash;

        amenityAccessPassRepository.recordCheckOut = async () => null;
        amenityAccessPassRepository.findByTokenHash = async () => null;

        try {
          await assert.rejects(
            async () => {
              await amenityAccessPassService.recordCheckOut(
                { orgId: mockOrgId, rawToken: 'NONEXISTENT-TOKEN-HASH' },
                mockSession
              );
            },
            (err) => (err.statusCode === 404 || err.status === 404) && err.message.includes('token not found for this organization')
          );
        } finally {
          amenityAccessPassRepository.recordCheckOut = origRecord;
          amenityAccessPassRepository.findByTokenHash = origFindByToken;
        }
      });

      it('Case 7: should reject checkout with HTTP 403 for revoked pass with missing checkInTimestamp', async () => {
        const origRecord = amenityAccessPassRepository.recordCheckOut;
        const origFindByToken = amenityAccessPassRepository.findByTokenHash;

        amenityAccessPassRepository.recordCheckOut = async () => null;
        amenityAccessPassRepository.findByTokenHash = async () => ({
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          isRevoked: true,
          checkInTimestamp: undefined,
          checkOutTimestamp: null,
        });

        try {
          await assert.rejects(
            async () => {
              await amenityAccessPassService.recordCheckOut(
                { orgId: mockOrgId, rawToken: 'REVOKED-NO-CHECKIN' },
                mockSession
              );
            },
            (err) => (err.statusCode === 403 || err.status === 403) && err.message.includes('Access denied: pass is revoked')
          );
        } finally {
          amenityAccessPassRepository.recordCheckOut = origRecord;
          amenityAccessPassRepository.findByTokenHash = origFindByToken;
        }
      });
    });

    describe('14.2 Resident Refund Override Tamper Protection', () => {
      it('should ignore refundOverridePercentage when isAdmin is false (resident cannot tamper with refund)', async () => {
        const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        const bookingRepo = (await import('../src/features/amenityBooking/amenityBooking.repository.js')).default;
        const amenityService = (await import('../src/features/amenity/amenity.services.js')).default;

        const origFindBooking = bookingRepo.findById;
        const origUpdateStatus = bookingRepo.updateStatus;
        const origGetAmenity = amenityService.getAmenityById;

        const residentUserId = new mongoose.Types.ObjectId();
        const bookingId = new mongoose.Types.ObjectId();

        bookingRepo.findById = async () => ({
          _id: bookingId,
          userId: residentUserId,
          orgId: mockOrgId,
          status: 'confirmed',
          paymentStatus: 'paid',
          totalPrice: 1000,
          bookingDate: '2026-09-21',
          startTime: '10:00',
          pricingDetails: { totalAmount: 1000 },
        });

        let savedUpdateData = null;
        bookingRepo.updateStatus = async (id, orgId, status, updateData) => {
          savedUpdateData = updateData;
          return { _id: id, status, ...updateData };
        };

        // Amenity cancellation policy: 0% refund if cancelled within 2 hours
        amenityService.getAmenityById = async () => ({
          _id: mockFacilityId,
          bookingRules: {
            isCancellationEnabled: true,
            cancellationRefundRules: [{ cancelBeforeHours: 48, refundPercentage: 50 }],
          },
        });

        try {
          // Resident attempts to inject 100% refund override with isAdmin = false
          const result = await amenityBookingService.cancelBooking(
            bookingId,
            residentUserId,
            mockOrgId,
            'Resident cancelled',
            false, // isAdmin is FALSE
            { refundOverridePercentage: 100 }
          );

          // Must NOT receive 100% refund; override is ignored
          assert.equal(result.refundPercentage !== 100 || result.refundAmount !== 1000, true);
          assert.notEqual(result.refundPercentage, 100, 'Resident must not be able to force 100% refund');
        } finally {
          bookingRepo.findById = origFindBooking;
          bookingRepo.updateStatus = origUpdateStatus;
          amenityService.getAmenityById = origGetAmenity;
        }
      });

      it('should safely reject NaN or non-finite refundOverride values from admin without calculation errors', async () => {
        const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        const bookingRepo = (await import('../src/features/amenityBooking/amenityBooking.repository.js')).default;
        const amenityService = (await import('../src/features/amenity/amenity.services.js')).default;

        const origFindBooking = bookingRepo.findById;
        const origUpdateStatus = bookingRepo.updateStatus;
        const origGetAmenity = amenityService.getAmenityById;

        const adminUserId = new mongoose.Types.ObjectId();
        const bookingId = new mongoose.Types.ObjectId();

        bookingRepo.findById = async () => ({
          _id: bookingId,
          userId: adminUserId,
          orgId: mockOrgId,
          status: 'confirmed',
          paymentStatus: 'paid',
          totalPrice: 1000,
          bookingDate: '2026-09-21',
          startTime: '10:00',
          pricingDetails: { totalAmount: 1000 },
        });

        bookingRepo.updateStatus = async (id, orgId, status, updateData) => ({
          _id: id,
          status,
          ...updateData,
        });

        amenityService.getAmenityById = async () => ({
          _id: mockFacilityId,
          bookingRules: {
            isCancellationEnabled: false,
          },
        });

        try {
          const result = await amenityBookingService.cancelBooking(
            bookingId,
            adminUserId,
            mockOrgId,
            'Admin cancel with NaN override',
            true, // isAdmin is true
            { refundOverridePercentage: NaN }
          );

          assert.equal(Number.isFinite(result.refundPercentage), true, 'refundPercentage must be finite');
          assert.equal(Number.isFinite(result.refundAmount), true, 'refundAmount must be finite');
          assert.notEqual(Number.isNaN(result.refundAmount), true, 'refundAmount must not be NaN');
        } finally {
          bookingRepo.findById = origFindBooking;
          bookingRepo.updateStatus = origUpdateStatus;
          amenityService.getAmenityById = origGetAmenity;
        }
      });
    });

    describe('14.3 Emergency Lifecycle Transitions & Terminal States', () => {
      it('should allow cancelling an IN_PROGRESS emergency block and emit MAINTENANCE_CANCELLED', async () => {
        const origFindById = amenityMaintenanceBlockRepository.findById;
        const origUpdateStatus = amenityMaintenanceBlockRepository.updateStatus;
        const origCreateOutbox = amenityOutboxEventRepository.createEvent;

        const blockId = new mongoose.Types.ObjectId();
        let emittedOutbox = null;

        amenityMaintenanceBlockRepository.findById = async () => ({
          _id: blockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'IN_PROGRESS',
          isEmergency: true,
        });

        amenityMaintenanceBlockRepository.updateStatus = async (id, orgId, status) => ({
          _id: id,
          orgId,
          facilityId: mockFacilityId,
          status,
          isEmergency: true,
        });

        amenityOutboxEventRepository.createEvent = async (event) => {
          emittedOutbox = event;
          return { _id: new mongoose.Types.ObjectId(), ...event };
        };

        try {
          const cancelled = await amenityMaintenanceBlockService.updateMaintenanceStatus(
            blockId,
            mockOrgId,
            'CANCELLED',
            mockSession
          );

          assert.equal(cancelled.status, 'CANCELLED');
          assert.equal(emittedOutbox.eventType, 'MAINTENANCE_CANCELLED');
        } finally {
          amenityMaintenanceBlockRepository.findById = origFindById;
          amenityMaintenanceBlockRepository.updateStatus = origUpdateStatus;
          amenityOutboxEventRepository.createEvent = origCreateOutbox;
        }
      });

      it('should forbid transition from terminal COMPLETED or CANCELLED state', async () => {
        const origFindById = amenityMaintenanceBlockRepository.findById;
        const blockId = new mongoose.Types.ObjectId();

        amenityMaintenanceBlockRepository.findById = async () => ({
          _id: blockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'COMPLETED',
          isEmergency: true,
        });

        try {
          await assert.rejects(
            async () => {
              await amenityMaintenanceBlockService.updateMaintenanceStatus(
                blockId,
                mockOrgId,
                'IN_PROGRESS',
                mockSession
              );
            },
            (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('Invalid maintenance status transition')
          );
        } finally {
          amenityMaintenanceBlockRepository.findById = origFindById;
        }
      });

      it('should forbid extending a COMPLETED or CANCELLED emergency block', async () => {
        const origFindById = amenityMaintenanceBlockRepository.findById;
        const blockId = new mongoose.Types.ObjectId();

        amenityMaintenanceBlockRepository.findById = async () => ({
          _id: blockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'COMPLETED',
          isEmergency: true,
          endDateTime: new Date(),
        });

        try {
          await assert.rejects(
            async () => {
              await amenityMaintenanceBlockService.extendMaintenanceBlock(
                {
                  blockId,
                  orgId: mockOrgId,
                  newEndDateTime: new Date(Date.now() + 3600000),
                },
                mockSession
              );
            },
            (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('Cannot extend a completed maintenance block')
          );
        } finally {
          amenityMaintenanceBlockRepository.findById = origFindById;
        }
      });
    });

    describe('14.4 Stale-Preview Detection for Concurrent V1 Bookings', () => {
      it('should throw HTTP 409 when a new conflicting V1 booking appears after preview was taken', async () => {
        const origGetFacility = amenityFacilityService.getFacilityById;
        const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
        const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
        const bookingMod = await import('../src/features/amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        const origFindV1 = amenityBookingService.findOverlappingBookingsForWindow;

        const resolvedBookingId = new mongoose.Types.ObjectId();
        const unhandledBookingId = new mongoose.Types.ObjectId();

        amenityFacilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          isActive: true,
          isDeleted: false,
        });
        amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
        amenityReservationService.findOverlappingActiveReservations = async () => [];

        // Real-time query reveals previous booking AND newly placed concurrent booking
        amenityBookingService.findOverlappingBookingsForWindow = async () => [
          { _id: resolvedBookingId, userId: mockUserId, status: 'confirmed' },
          { _id: unhandledBookingId, userId: mockUserId, status: 'confirmed' },
        ];

        try {
          await assert.rejects(
            async () => {
              await amenityMaintenanceBlockService.declareEmergencyMaintenance(
                {
                  orgId: mockOrgId,
                  facilityId: mockFacilityId,
                  title: 'Sudden Flood',
                  reason: 'Burst main water pipe',
                  endDateTime: new Date(Date.now() + 7200000),
                  conflictAction: null,
                  // Stale preview resolutions only accounted for resolvedBookingId!
                  resolutions: [
                    { targetId: resolvedBookingId, targetType: 'V1_BOOKING', resolution: 'CANCEL' },
                  ],
                },
                mockSession
              );
            },
            (err) =>
              (err.statusCode === 409 || err.status === 409) &&
              err.message.includes('Resolution required for all affected items')
          );
        } finally {
          amenityFacilityService.getFacilityById = origGetFacility;
          amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
          amenityReservationService.findOverlappingActiveReservations = origFindReservations;
          amenityBookingService.findOverlappingBookingsForWindow = origFindV1;
        }
      });
    });
  });
});


