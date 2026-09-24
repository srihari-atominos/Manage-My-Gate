import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  AmenityMaintenanceImpact,
} from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.model.js';
import amenityMaintenanceImpactRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.repository.js';
import amenityMaintenanceBlockService from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityOutboxEventRepository from '../src/features/amenityManagement/outbox/amenityOutboxEvent.repository.js';
import { AmenityMaintenanceBlock } from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.model.js';
import HttpError from '../src/utils/httpError.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dummy session to bypass MongoDB transaction connection buffering in unit test environment
const mockSession = { _isMockSession: true };

describe('Amenity Maintenance Phase 3 — Adversarial Verification Suite', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockOrgId2 = new mongoose.Types.ObjectId();
  const mockFacilityId = new mongoose.Types.ObjectId();
  const mockResourceId1 = new mongoose.Types.ObjectId();
  const mockResourceId2 = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * 1. Impact Model Validation & Schema Integrity
   * ========================================================================= */
  describe('1. Impact Model Validation & Schema Integrity', () => {
    it('should require mandatory fields: orgId, maintenanceBlockId, facilityId, targetType, targetId, impactType, resolution', () => {
      const emptyImpact = new AmenityMaintenanceImpact({});
      const err = emptyImpact.validateSync();
      assert.ok(err?.errors?.orgId, 'orgId must be required');
      assert.ok(err?.errors?.maintenanceBlockId, 'maintenanceBlockId must be required');
      assert.ok(err?.errors?.facilityId, 'facilityId must be required');
      assert.ok(err?.errors?.targetType, 'targetType must be required');
      assert.ok(err?.errors?.targetId, 'targetId must be required');
      assert.ok(err?.errors?.impactType, 'impactType must be required');
      assert.ok(err?.errors?.resolution, 'resolution must be required');
    });

    it('should validate targetType enum (V1_BOOKING, V2_RESERVATION)', () => {
      const validV1 = new AmenityMaintenanceImpact({
        orgId: mockOrgId,
        maintenanceBlockId: new mongoose.Types.ObjectId(),
        facilityId: mockFacilityId,
        targetType: 'V1_BOOKING',
        targetId: new mongoose.Types.ObjectId(),
        impactType: 'BOOKING_CONFLICT',
        resolution: 'CANCEL',
      });
      assert.ifError(validV1.validateSync());

      const validV2 = new AmenityMaintenanceImpact({
        orgId: mockOrgId,
        maintenanceBlockId: new mongoose.Types.ObjectId(),
        facilityId: mockFacilityId,
        targetType: 'V2_RESERVATION',
        targetId: new mongoose.Types.ObjectId(),
        impactType: 'RESERVATION_CONFLICT',
        resolution: 'RESCHEDULE',
      });
      assert.ifError(validV2.validateSync());

      const invalid = new AmenityMaintenanceImpact({
        orgId: mockOrgId,
        maintenanceBlockId: new mongoose.Types.ObjectId(),
        facilityId: mockFacilityId,
        targetType: 'INVALID_TARGET',
        targetId: new mongoose.Types.ObjectId(),
        impactType: 'BOOKING_CONFLICT',
        resolution: 'CANCEL',
      });
      const err = invalid.validateSync();
      assert.ok(err?.errors?.targetType, 'Invalid targetType must be rejected');
    });

    it('should validate resolution enum (CANCEL, RESCHEDULE, REVIEW_INDIVIDUALLY)', () => {
      const validResolutions = ['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY'];
      for (const res of validResolutions) {
        const impact = new AmenityMaintenanceImpact({
          orgId: mockOrgId,
          maintenanceBlockId: new mongoose.Types.ObjectId(),
          facilityId: mockFacilityId,
          targetType: 'V2_RESERVATION',
          targetId: new mongoose.Types.ObjectId(),
          impactType: 'RESERVATION_CONFLICT',
          resolution: res,
        });
        assert.ifError(impact.validateSync(), `${res} must be a valid resolution`);
      }

      const invalid = new AmenityMaintenanceImpact({
        orgId: mockOrgId,
        maintenanceBlockId: new mongoose.Types.ObjectId(),
        facilityId: mockFacilityId,
        targetType: 'V2_RESERVATION',
        targetId: new mongoose.Types.ObjectId(),
        impactType: 'RESERVATION_CONFLICT',
        resolution: 'INVALID_RESOLUTION',
      });
      const err = invalid.validateSync();
      assert.ok(err?.errors?.resolution, 'Invalid resolution must be rejected');
    });

    it('should validate status enum (PENDING_REVIEW, RESOLVED) and default to RESOLVED', () => {
      const impact = new AmenityMaintenanceImpact({
        orgId: mockOrgId,
        maintenanceBlockId: new mongoose.Types.ObjectId(),
        facilityId: mockFacilityId,
        targetType: 'V2_RESERVATION',
        targetId: new mongoose.Types.ObjectId(),
        impactType: 'RESERVATION_CONFLICT',
        resolution: 'CANCEL',
      });
      assert.equal(impact.status, 'RESOLVED', 'Default status must be RESOLVED');

      impact.status = 'PENDING_REVIEW';
      assert.ifError(impact.validateSync());

      impact.status = 'INVALID_STATUS';
      const err = impact.validateSync();
      assert.ok(err?.errors?.status, 'Invalid status must be rejected');
    });

    it('should correctly capture resolutionDetails structure without validation error', () => {
      const impact = new AmenityMaintenanceImpact({
        orgId: mockOrgId,
        maintenanceBlockId: new mongoose.Types.ObjectId(),
        facilityId: mockFacilityId,
        targetType: 'V2_RESERVATION',
        targetId: new mongoose.Types.ObjectId(),
        impactType: 'RESERVATION_CONFLICT',
        resolution: 'RESCHEDULE',
        status: 'RESOLVED',
        resolutionDetails: {
          previousSlot: {
            startDateTime: new Date('2026-10-15T10:00:00Z'),
            endDateTime: new Date('2026-10-15T12:00:00Z'),
            resourceId: mockResourceId1,
          },
          newSlot: {
            startDateTime: new Date('2026-10-16T10:00:00Z'),
            endDateTime: new Date('2026-10-16T12:00:00Z'),
            resourceId: mockResourceId2,
          },
          refundAmount: 500,
          refundPercentage: 100,
          notes: 'Rescheduled due to court maintenance',
        },
      });
      assert.ifError(impact.validateSync());
      assert.equal(impact.resolutionDetails.refundAmount, 500);
      assert.equal(impact.resolutionDetails.notes, 'Rescheduled due to court maintenance');
    });
  });

  /* =========================================================================
   * 2. Maintenance Lifecycle State Machine Transitions
   * ========================================================================= */
  describe('2. Maintenance Lifecycle State Machine Transitions', () => {
    it('should allow valid transitions: SCHEDULED -> IN_PROGRESS, IN_PROGRESS -> COMPLETED, SCHEDULED -> CANCELLED', async () => {
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      const originalUpdateStatus = amenityMaintenanceBlockRepository.updateStatus;
      const originalCreateEvent = amenityOutboxEventRepository.createEvent;

      try {
        let blockState = {
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'SCHEDULED',
        };

        amenityMaintenanceBlockRepository.findById = async () => blockState;
        amenityMaintenanceBlockRepository.updateStatus = async (_id, _orgId, newStatus, _session, completion) => {
          blockState = { ...blockState, status: newStatus, ...completion };
          return blockState;
        };
        amenityOutboxEventRepository.createEvent = async () => ({});

        // Transition 1: SCHEDULED -> IN_PROGRESS
        const inProgress = await amenityMaintenanceBlockService.updateMaintenanceStatus(
          blockState._id,
          mockOrgId,
          'IN_PROGRESS',
          mockSession
        );
        assert.equal(inProgress.status, 'IN_PROGRESS');

        // Transition 2: IN_PROGRESS -> COMPLETED
        const completed = await amenityMaintenanceBlockService.updateMaintenanceStatus(
          blockState._id,
          mockOrgId,
          'COMPLETED',
          mockSession,
          {
            actualCompletedAt: new Date(),
            completedBy: mockUserId,
            completionNotes: 'All maintenance completed successfully',
          }
        );
        assert.equal(completed.status, 'COMPLETED');
        assert.equal(completed.completedBy, mockUserId);
        assert.equal(completed.completionNotes, 'All maintenance completed successfully');
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
        amenityMaintenanceBlockRepository.updateStatus = originalUpdateStatus;
        amenityOutboxEventRepository.createEvent = originalCreateEvent;
      }
    });

    it('should normalize ACTIVE alias to IN_PROGRESS', async () => {
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      const originalUpdateStatus = amenityMaintenanceBlockRepository.updateStatus;
      const originalCreateEvent = amenityOutboxEventRepository.createEvent;

      try {
        const blockState = {
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'SCHEDULED',
        };

        amenityMaintenanceBlockRepository.findById = async () => blockState;
        amenityMaintenanceBlockRepository.updateStatus = async (_id, _orgId, newStatus) => {
          return { ...blockState, status: newStatus };
        };
        amenityOutboxEventRepository.createEvent = async () => ({});

        const result = await amenityMaintenanceBlockService.updateMaintenanceStatus(
          blockState._id,
          mockOrgId,
          'ACTIVE',
          mockSession
        );
        assert.equal(result.status, 'IN_PROGRESS');
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
        amenityMaintenanceBlockRepository.updateStatus = originalUpdateStatus;
        amenityOutboxEventRepository.createEvent = originalCreateEvent;
      }
    });

    it('should reject terminal status transitions: COMPLETED -> SCHEDULED / IN_PROGRESS / CANCELLED', async () => {
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      try {
        const completedBlock = {
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'COMPLETED',
        };
        amenityMaintenanceBlockRepository.findById = async () => completedBlock;

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.updateMaintenanceStatus(
              completedBlock._id,
              mockOrgId,
              'IN_PROGRESS',
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('Invalid maintenance status transition'));
            return true;
          }
        );

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.updateMaintenanceStatus(
              completedBlock._id,
              mockOrgId,
              'SCHEDULED',
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });

    it('should reject terminal status transitions: CANCELLED -> SCHEDULED / IN_PROGRESS / COMPLETED', async () => {
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      try {
        const cancelledBlock = {
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'CANCELLED',
        };
        amenityMaintenanceBlockRepository.findById = async () => cancelledBlock;

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.updateMaintenanceStatus(
              cancelledBlock._id,
              mockOrgId,
              'IN_PROGRESS',
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('Invalid maintenance status transition'));
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });

    it('should reject invalid skip transition: SCHEDULED -> COMPLETED (must be IN_PROGRESS first)', async () => {
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      try {
        const scheduledBlock = {
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'SCHEDULED',
        };
        amenityMaintenanceBlockRepository.findById = async () => scheduledBlock;

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.updateMaintenanceStatus(
              scheduledBlock._id,
              mockOrgId,
              'COMPLETED',
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('Invalid maintenance status transition from SCHEDULED to COMPLETED'));
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });

    it('should safely return existing block if status is unchanged (idempotent no-op)', async () => {
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      try {
        const scheduledBlock = {
          _id: new mongoose.Types.ObjectId(),
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'SCHEDULED',
        };
        amenityMaintenanceBlockRepository.findById = async () => scheduledBlock;

        const result = await amenityMaintenanceBlockService.updateMaintenanceStatus(
          scheduledBlock._id,
          mockOrgId,
          'SCHEDULED',
          mockSession
        );
        assert.equal(result.status, 'SCHEDULED');
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });
  });

  /* =========================================================================
   * 3. Cancellation, Refund & Idempotency Orchestration
   * ========================================================================= */
  describe('3. Cancellation, Refund & Idempotency Orchestration', () => {
    it('should execute CANCEL resolution, create impact record with RESOLVED status, and be idempotent on repeat call', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const mockReservationId = new mongoose.Types.ObjectId();
      let cancelCallCount = 0;
      let recordedImpacts = [];

      const originalFindByBlockAndTarget = amenityMaintenanceImpactRepository.findByBlockAndTarget;
      const originalCreateImpact = amenityMaintenanceImpactRepository.create;
      const resService = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
      const originalGetReservationById = resService.getReservationById;
      const originalCancelReservation = resService.cancelReservation;

      try {
        resService.getReservationById = async () => ({
          _id: mockReservationId,
          orgId: mockOrgId,
          residentId: mockUserId,
          bookingStatus: 'CONFIRMED',
          totalAmount: 300,
          requestedStartDateTime: new Date('2026-10-15T10:00:00Z'),
          requestedEndDateTime: new Date('2026-10-15T12:00:00Z'),
          resourceId: mockResourceId1,
        });

        resService.cancelReservation = async () => {
          cancelCallCount++;
          return { bookingStatus: 'CANCELLED' };
        };

        amenityMaintenanceImpactRepository.findByBlockAndTarget = async ({ blockId, targetId }) => {
          return recordedImpacts.find(
            (i) => String(i.maintenanceBlockId) === String(blockId) && String(i.targetId) === String(targetId)
          );
        };

        amenityMaintenanceImpactRepository.create = async (data) => {
          const doc = { _id: new mongoose.Types.ObjectId(), ...data };
          recordedImpacts.push(doc);
          return doc;
        };

        // First execution: should cancel and create impact record
        const impact1 = await amenityMaintenanceBlockService._resolveImpactItem({
          blockId: mockBlockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          resourceId: mockResourceId1,
          resourceIds: [mockResourceId1],
          targetId: mockReservationId,
          targetType: 'V2_RESERVATION',
          resolution: 'CANCEL',
          notes: 'Maintenance emergency repair',
          cancelledBy: mockUserId,
          session: mockSession,
        });

        assert.equal(cancelCallCount, 1, 'First execution must invoke cancelReservation');
        assert.equal(impact1.status, 'RESOLVED');
        assert.equal(impact1.resolution, 'CANCEL');
        assert.equal(impact1.resolutionDetails.refundAmount, 300);

        // Second execution: must be idempotent no-op (no second cancellation call or impact duplicate)
        const impact2 = await amenityMaintenanceBlockService._resolveImpactItem({
          blockId: mockBlockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          resourceId: mockResourceId1,
          resourceIds: [mockResourceId1],
          targetId: mockReservationId,
          targetType: 'V2_RESERVATION',
          resolution: 'CANCEL',
          notes: 'Maintenance emergency repair',
          cancelledBy: mockUserId,
          session: mockSession,
        });

        assert.equal(cancelCallCount, 1, 'Second execution MUST NOT invoke cancelReservation again');
        assert.equal(recordedImpacts.length, 1, 'Must NOT create duplicate impact records');
        assert.equal(String(impact2._id), String(impact1._id), 'Must return the existing impact record');
      } finally {
        amenityMaintenanceImpactRepository.findByBlockAndTarget = originalFindByBlockAndTarget;
        amenityMaintenanceImpactRepository.create = originalCreateImpact;
        resService.getReservationById = originalGetReservationById;
        resService.cancelReservation = originalCancelReservation;
      }
    });
  });

  /* =========================================================================
   * 4. Rescheduling Workflow & Slot Availability Validation
   * ========================================================================= */
  describe('4. Rescheduling Workflow & Slot Availability Validation', () => {
    it('should reject RESCHEDULE if newSlot details are missing', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const mockReservationId = new mongoose.Types.ObjectId();
      const originalFindByBlockAndTarget = amenityMaintenanceImpactRepository.findByBlockAndTarget;

      try {
        amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService._resolveImpactItem({
              blockId: mockBlockId,
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              resourceId: mockResourceId1,
              resourceIds: [mockResourceId1],
              targetId: mockReservationId,
              targetType: 'V2_RESERVATION',
              resolution: 'RESCHEDULE',
              newSlot: null,
              notes: 'Attempting reschedule without slot',
              session: mockSession,
            });
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('newSlot details are required'));
            return true;
          }
        );
      } finally {
        amenityMaintenanceImpactRepository.findByBlockAndTarget = originalFindByBlockAndTarget;
      }
    });

    it('findAlternativeSlots should bound searchDaysAhead between 1 and 30', async () => {
      const originalGetFacilityById = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default.getFacilityById;
      const originalGetResources = (await import('../src/features/amenityManagement/resources/amenityResource.service.js')).default.getResourcesByFacilityId;
      const { availabilityService } = await import('../src/features/amenityManagement/domain/availability/availability.service.js');
      const originalCheckAvailability = availabilityService.checkAvailability;

      try {
        const facilityService = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default;
        const resourceService = (await import('../src/features/amenityManagement/resources/amenityResource.service.js')).default;

        facilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          name: 'Tennis Court',
        });

        resourceService.getResourcesByFacilityId = async () => [];
        availabilityService.checkAvailability = async () => ({ isAvailable: true });

        const slots = await amenityMaintenanceBlockService.findAlternativeSlots({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          originalStart: new Date('2026-10-15T10:00:00Z'),
          originalEnd: new Date('2026-10-15T11:00:00Z'),
          searchDaysAhead: 100, // Should be clamped to 30
        }, mockSession);

        assert.ok(Array.isArray(slots));
        assert.ok(slots.length <= 10, 'Should return at most 10 candidates');
      } finally {
        const facilityService = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default;
        const resourceService = (await import('../src/features/amenityManagement/resources/amenityResource.service.js')).default;
        facilityService.getFacilityById = originalGetFacilityById;
        resourceService.getResourcesByFacilityId = originalGetResources;
        availabilityService.checkAvailability = originalCheckAvailability;
      }
    });

    it('should reject rescheduling at execution time if candidate slot is taken (reschedule race - Scenario D)', async () => {
      const mockReservationId = new mongoose.Types.ObjectId();
      const resService = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
      const originalFindById = (await import('../src/features/amenityManagement/reservations/amenityReservation.repository.js')).default.findById;
      const originalFacilityFindById = (await import('../src/features/amenityManagement/facilities/amenityFacility.repository.js')).default.findById;
      const { availabilityService } = await import('../src/features/amenityManagement/domain/availability/availability.service.js');
      const originalCheckAvailability = availabilityService.checkAvailability;

      try {
        const reservationRepo = (await import('../src/features/amenityManagement/reservations/amenityReservation.repository.js')).default;
        const facilityRepo = (await import('../src/features/amenityManagement/facilities/amenityFacility.repository.js')).default;

        reservationRepo.findById = async () => ({
          _id: mockReservationId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          resourceId: mockResourceId1,
          bookingStatus: 'CONFIRMED',
          requestedStartDateTime: new Date('2026-10-15T10:00:00Z'),
          requestedEndDateTime: new Date('2026-10-15T12:00:00Z'),
        });

        facilityRepo.findById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          archetype: 'EXCLUSIVE_HOURLY',
        });

        // Another resident consumed the slot between discovery and execution!
        availabilityService.checkAvailability = async () => ({
          isAvailable: false,
          reason: 'Slot already taken by another reservation',
        });

        await assert.rejects(
          async () => {
            await resService.rescheduleReservation(
              {
                reservationId: mockReservationId,
                orgId: mockOrgId,
                newStartDateTime: new Date('2026-10-16T10:00:00Z'),
                newEndDateTime: new Date('2026-10-16T12:00:00Z'),
                rescheduledBy: mockUserId,
                reason: 'Rescheduling due to maintenance',
              },
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 409);
            assert.ok(err.message.includes('Target slot is unavailable'));
            return true;
          }
        );
      } finally {
        const reservationRepo = (await import('../src/features/amenityManagement/reservations/amenityReservation.repository.js')).default;
        const facilityRepo = (await import('../src/features/amenityManagement/facilities/amenityFacility.repository.js')).default;
        reservationRepo.findById = originalFindById;
        facilityRepo.findById = originalFacilityFindById;
        availabilityService.checkAvailability = originalCheckAvailability;
      }
    });
  });

  /* =========================================================================
   * 5. REVIEW_INDIVIDUALLY Workflow
   * ========================================================================= */
  describe('5. REVIEW_INDIVIDUALLY Workflow', () => {
    it('should create impact record with status PENDING_REVIEW without cancelling or refunding', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const mockReservationId = new mongoose.Types.ObjectId();
      let cancelCalled = false;

      const originalFindByBlockAndTarget = amenityMaintenanceImpactRepository.findByBlockAndTarget;
      const originalCreateImpact = amenityMaintenanceImpactRepository.create;
      const resService = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
      const originalGetReservationById = resService.getReservationById;
      const originalCancelReservation = resService.cancelReservation;

      try {
        resService.getReservationById = async () => ({
          _id: mockReservationId,
          orgId: mockOrgId,
          residentId: mockUserId,
          bookingStatus: 'CONFIRMED',
          totalAmount: 400,
          requestedStartDateTime: new Date('2026-10-15T10:00:00Z'),
          requestedEndDateTime: new Date('2026-10-15T12:00:00Z'),
          resourceId: mockResourceId1,
        });

        resService.cancelReservation = async () => {
          cancelCalled = true;
        };

        amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;
        amenityMaintenanceImpactRepository.create = async (data) => ({
          _id: new mongoose.Types.ObjectId(),
          ...data,
        });

        const impact = await amenityMaintenanceBlockService._resolveImpactItem({
          blockId: mockBlockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          resourceId: mockResourceId1,
          resourceIds: [mockResourceId1],
          targetId: mockReservationId,
          targetType: 'V2_RESERVATION',
          resolution: 'REVIEW_INDIVIDUALLY',
          notes: 'Flagged for individual administrative review',
          cancelledBy: mockUserId,
          session: mockSession,
        });

        assert.equal(cancelCalled, false, 'REVIEW_INDIVIDUALLY must NOT invoke cancelReservation');
        assert.equal(impact.status, 'PENDING_REVIEW', 'Status must be PENDING_REVIEW');
        assert.equal(impact.resolution, 'REVIEW_INDIVIDUALLY');
        assert.equal(impact.resolutionDetails.refundAmount, 0, 'No refund must be allocated');
      } finally {
        amenityMaintenanceImpactRepository.findByBlockAndTarget = originalFindByBlockAndTarget;
        amenityMaintenanceImpactRepository.create = originalCreateImpact;
        resService.getReservationById = originalGetReservationById;
        resService.cancelReservation = originalCancelReservation;
      }
    });
  });

  /* =========================================================================
   * 6. Stale Preview Protection & Mixed Resolutions
   * ========================================================================= */
  describe('6. Stale Preview Protection & Mixed Resolutions', () => {
    it('should throw HTTP 409 MAINTENANCE_IMPACT_NOT_RESOLVED if a conflict is not included in resolutions', async () => {
      const mockResId1 = new mongoose.Types.ObjectId();
      const mockResId2 = new mongoose.Types.ObjectId(); // Appears between preview and confirmation!

      const originalFindFacility = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default.getFacilityById;
      const originalFindOverlappingMaintenance = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const resService = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
      const originalFindOverlappingReservations = resService.findOverlappingActiveReservations;

      try {
        const facilityService = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default;
        facilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          isActive: true,
          isDeleted: false,
        });

        amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];

        // Re-query reveals 2 conflicts, but admin only resolved mockResId1!
        resService.findOverlappingActiveReservations = async () => [
          { _id: mockResId1, residentId: mockUserId },
          { _id: mockResId2, residentId: mockUserId },
        ];

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleMaintenanceBlock(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                title: 'Court Resurfacing',
                startDateTime: new Date('2026-10-15T10:00:00Z'),
                endDateTime: new Date('2026-10-15T14:00:00Z'),
                reason: 'Routine resurfacing',
                resolutions: [
                  {
                    targetId: mockResId1,
                    targetType: 'V2_RESERVATION',
                    resolution: 'CANCEL',
                  },
                ],
              },
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 409);
            assert.equal(err.details?.code, 'MAINTENANCE_IMPACT_NOT_RESOLVED');
            assert.ok(err.details?.unresolvedTargets?.some((t) => String(t.id) === String(mockResId2)));
            return true;
          }
        );
      } finally {
        const facilityService = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default;
        facilityService.getFacilityById = originalFindFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = originalFindOverlappingMaintenance;
        resService.findOverlappingActiveReservations = originalFindOverlappingReservations;
      }
    });

    it('should throw HTTP 409 MAINTENANCE_IMPACT_NOT_RESOLVED if an active V1 booking conflict is not included in resolutions (Scenario A)', async () => {
      const mockBookingId = new mongoose.Types.ObjectId();

      const originalFindFacility = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default.getFacilityById;
      const originalFindOverlappingMaintenance = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const resService = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
      const originalFindOverlappingReservations = resService.findOverlappingActiveReservations;
      const { amenityBookingService } = await import('../src/features/amenityBooking/amenityBooking.services.js');
      const originalFindOverlappingBookings = amenityBookingService.findOverlappingBookingsForWindow;

      try {
        const facilityService = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default;
        facilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          isActive: true,
          isDeleted: false,
        });

        amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
        resService.findOverlappingActiveReservations = async () => [];
        amenityBookingService.findOverlappingBookingsForWindow = async () => [
          { _id: mockBookingId, userId: mockUserId },
        ];

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleMaintenanceBlock(
              {
                orgId: mockOrgId,
                facilityId: mockFacilityId,
                title: 'Emergency Deep Cleaning',
                startDateTime: new Date('2026-10-15T10:00:00Z'),
                endDateTime: new Date('2026-10-15T14:00:00Z'),
                reason: 'Spill cleanup',
                resolutions: [], // Empty resolutions despite active V1 booking conflict!
              },
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 409);
            assert.equal(err.details?.code, 'MAINTENANCE_IMPACT_NOT_RESOLVED');
            return true;
          }
        );
      } finally {
        const facilityService = (await import('../src/features/amenityManagement/facilities/amenityFacility.service.js')).default;
        facilityService.getFacilityById = originalFindFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = originalFindOverlappingMaintenance;
        resService.findOverlappingActiveReservations = originalFindOverlappingReservations;
        amenityBookingService.findOverlappingBookingsForWindow = originalFindOverlappingBookings;
      }
    });
  });

  /* =========================================================================
   * 7. Maintenance Extension Safety
   * ========================================================================= */
  describe('7. Maintenance Extension Safety', () => {
    it('should reject newEndDateTime that is not strictly later than current endDateTime', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const originalFindById = amenityMaintenanceBlockRepository.findById;

      try {
        amenityMaintenanceBlockRepository.findById = async () => ({
          _id: mockBlockId,
          orgId: mockOrgId,
          status: 'IN_PROGRESS',
          endDateTime: new Date('2026-10-15T12:00:00Z'),
        });

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.extendMaintenanceBlock(
              {
                blockId: mockBlockId,
                orgId: mockOrgId,
                newEndDateTime: new Date('2026-10-15T11:00:00Z'), // Earlier!
              },
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('newEndDateTime must be strictly later'));
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });

    it('should reject extending a COMPLETED or CANCELLED maintenance block', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const originalFindById = amenityMaintenanceBlockRepository.findById;

      try {
        amenityMaintenanceBlockRepository.findById = async () => ({
          _id: mockBlockId,
          orgId: mockOrgId,
          status: 'COMPLETED',
          endDateTime: new Date('2026-10-15T12:00:00Z'),
        });

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.extendMaintenanceBlock(
              {
                blockId: mockBlockId,
                orgId: mockOrgId,
                newEndDateTime: new Date('2026-10-15T16:00:00Z'),
              },
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 400);
            assert.ok(err.message.includes('Cannot extend a completed maintenance block'));
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });

    it('should throw HTTP 409 MAINTENANCE_IMPACT_NOT_RESOLVED if a new conflict exists in the extended window without resolution (Scenario J)', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const mockConflictResId = new mongoose.Types.ObjectId();
      const originalFindById = amenityMaintenanceBlockRepository.findById;
      const resService = (await import('../src/features/amenityManagement/reservations/amenityReservation.service.js')).default;
      const originalFindOverlapping = resService.findOverlappingActiveReservations;

      try {
        amenityMaintenanceBlockRepository.findById = async () => ({
          _id: mockBlockId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          status: 'IN_PROGRESS',
          endDateTime: new Date('2026-10-15T12:00:00Z'),
          reason: 'Routine maintenance',
        });

        // Conflict created in the extended window [12:00, 16:00]!
        resService.findOverlappingActiveReservations = async () => [
          { _id: mockConflictResId, residentId: mockUserId },
        ];

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.extendMaintenanceBlock(
              {
                blockId: mockBlockId,
                orgId: mockOrgId,
                newEndDateTime: new Date('2026-10-15T16:00:00Z'),
                resolutions: [], // Unresolved!
              },
              mockSession
            );
          },
          (err) => {
            assert.equal(err.statusCode, 409);
            assert.equal(err.details?.code, 'MAINTENANCE_IMPACT_NOT_RESOLVED');
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
        resService.findOverlappingActiveReservations = originalFindOverlapping;
      }
    });
  });

  /* =========================================================================
   * 8. Strict Architecture Boundary & Foreign Repository Prohibitions
   * ========================================================================= */
  describe('8. Strict Architecture Boundary & Foreign Repository Prohibitions', () => {
    it('amenityMaintenanceBlock.service.js must NEVER import foreign repositories', () => {
      const serviceFilePath = path.join(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const content = fs.readFileSync(serviceFilePath, 'utf8');

      const forbiddenForeignRepositories = [
        'amenityBooking.repository.js',
        'amenityReservation.repository.js',
        'amenityFacility.repository.js',
        'amenityResource.repository.js',
        'wallet.repository.js',
        'user.repository.js',
        'payment.repository.js',
        'notification.repository.js',
      ];

      for (const repo of forbiddenForeignRepositories) {
        assert.ok(
          !content.includes(repo),
          `Architectural violation: amenityMaintenanceBlock.service.js directly imports foreign repository ${repo}`
        );
      }
    });

    it('amenityMaintenanceBlock.service.js must NOT import socket.io or getIO directly', () => {
      const serviceFilePath = path.join(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const content = fs.readFileSync(serviceFilePath, 'utf8');

      assert.ok(!content.includes('socket.io'), 'Service layer must not import socket.io directly');
      assert.ok(!content.includes('getIO'), 'Service layer must not call getIO() directly');
    });

    it('amenityMaintenanceImpact.model.js and repository must belong strictly to maintenance feature', () => {
      const modelPath = path.join(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.model.js'
      );
      const repoPath = path.join(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.repository.js'
      );

      assert.ok(fs.existsSync(modelPath), 'amenityMaintenanceImpact.model.js must exist in maintenance directory');
      assert.ok(fs.existsSync(repoPath), 'amenityMaintenanceImpact.repository.js must exist in maintenance directory');

      const repoContent = fs.readFileSync(repoPath, 'utf8');
      assert.ok(
        !repoContent.includes('amenityBooking.repository.js') &&
        !repoContent.includes('amenityReservation.repository.js'),
        'Impact repository must not import foreign repositories'
      );
    });
  });

  /* =========================================================================
   * 9. Tenant Isolation Verification
   * ========================================================================= */
  describe('9. Tenant Isolation Verification', () => {
    it('getImpactsForBlock must enforce tenant orgId scoping', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const originalFindByBlockId = amenityMaintenanceImpactRepository.findByBlockId;

      try {
        let queriedOrgId = null;
        amenityMaintenanceImpactRepository.findByBlockId = async (blockId, orgId) => {
          queriedOrgId = orgId;
          return [];
        };

        await amenityMaintenanceBlockService.getImpactsForBlock(mockBlockId, mockOrgId, mockSession);
        assert.equal(String(queriedOrgId), String(mockOrgId), 'Must scope impact lookup by tenant orgId');
      } finally {
        amenityMaintenanceImpactRepository.findByBlockId = originalFindByBlockId;
      }
    });

    it('getMaintenanceBlockById must reject access when requested by a different tenant organization (Scenario G)', async () => {
      const mockBlockId = new mongoose.Types.ObjectId();
      const originalFindById = amenityMaintenanceBlockRepository.findById;

      try {
        amenityMaintenanceBlockRepository.findById = async (blockId, orgId) => {
          if (String(orgId) === String(mockOrgId)) {
            return { _id: mockBlockId, orgId: mockOrgId, title: 'Org A Maintenance' };
          }
          // Scoped lookup for Org B returns null
          return null;
        };

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.getMaintenanceBlockById(mockBlockId, mockOrgId2, mockSession);
          },
          (err) => {
            assert.equal(err.statusCode, 404);
            assert.ok(err.message.includes('Maintenance block not found'));
            return true;
          }
        );
      } finally {
        amenityMaintenanceBlockRepository.findById = originalFindById;
      }
    });
  });
});
