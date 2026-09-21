import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import amenityMaintenanceBlockService from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityFacilityService from '../src/features/amenityManagement/facilities/amenityFacility.service.js';
import amenityResourceService from '../src/features/amenityManagement/resources/amenityResource.service.js';
import amenityReservationService from '../src/features/amenityManagement/reservations/amenityReservation.service.js';
import amenityOutboxEventRepository from '../src/features/amenityManagement/outbox/amenityOutboxEvent.repository.js';
import amenityMaintenanceImpactRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.repository.js';
import HttpError from '../src/utils/httpError.utils.js';

describe('Amenity Maintenance — Multi-Window Batch Scheduling Suite', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockFacilityId = new mongoose.Types.ObjectId();
  const mockResourceId = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * 1. Multi-Window Scheduling (e.g. Today, Tomorrow, 10 Days Later)
   * ========================================================================= */
  describe('1. Batch Window Creation via scheduleMaintenanceBlock', () => {
    it('should schedule 3 non-consecutive maintenance windows simultaneously in a single call', async () => {
      const now = new Date();
      // Window 1: Today 00:00 to 17:00
      const w1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const w1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0);

      // Window 2: Tomorrow 00:00 to 17:00
      const w2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      const w2End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 17, 0, 0);

      // Window 3: 10 Days later 00:00 to 17:00
      const w3Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 0, 0, 0);
      const w3End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 17, 0, 0);

      const windows = [
        { startDateTime: w1Start.toISOString(), endDateTime: w1End.toISOString() },
        { startDateTime: w2Start.toISOString(), endDateTime: w2End.toISOString() },
        { startDateTime: w3Start.toISOString(), endDateTime: w3End.toISOString() },
      ];

      // Stubs
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origGetResource = amenityResourceService.getResourceById;
      const origCreate = amenityMaintenanceBlockRepository.create;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindOverlappingRes = amenityReservationService.findOverlappingActiveReservations;
      const origCreateOutbox = amenityOutboxEventRepository.create;

      const createdBlocks = [];

      try {
        amenityFacilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          name: 'Olympic Swimming Pool',
          status: 'ACTIVE',
        });

        amenityResourceService.getResourceById = async () => ({
          _id: mockResourceId,
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          name: 'Lane 1',
          status: 'ACTIVE',
        });

        amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
        amenityReservationService.findOverlappingActiveReservations = async () => [];

        amenityMaintenanceBlockRepository.create = async (data) => {
          const block = {
            ...data,
            _id: new mongoose.Types.ObjectId(),
            status: 'SCHEDULED',
            createdAt: new Date(),
          };
          createdBlocks.push(block);
          return block;
        };

        amenityOutboxEventRepository.createEvent = async () => ({ _id: new mongoose.Types.ObjectId() });
        amenityOutboxEventRepository.create = async () => ({ _id: new mongoose.Types.ObjectId() });

        const result = await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
          orgId: mockOrgId,
          userId: mockUserId,
          facilityId: mockFacilityId,
          resourceId: mockResourceId,
          title: 'Deep Cleaning & Resurfacing',
          reason: 'Scheduled multi-day upkeep',
          maintenanceType: 'CLEANING',
          windows,
        });

        assert.ok(result, 'Result should exist');
        assert.equal(result.count, 3, 'Should have created 3 blocks');
        assert.equal(result.blocks.length, 3, 'Result should contain 3 blocks');
        assert.equal(createdBlocks.length, 3, 'Repository should have received 3 create calls');

        // Verify each window's times match
        assert.equal(
          new Date(createdBlocks[0].startDateTime).getTime(),
          w1Start.getTime(),
          'Window 1 start time matches'
        );
        assert.equal(
          new Date(createdBlocks[1].startDateTime).getTime(),
          w2Start.getTime(),
          'Window 2 start time matches'
        );
        assert.equal(
          new Date(createdBlocks[2].startDateTime).getTime(),
          w3Start.getTime(),
          'Window 3 start time matches'
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityResourceService.getResourceById = origGetResource;
        amenityMaintenanceBlockRepository.create = origCreate;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindOverlappingRes;
        amenityOutboxEventRepository.create = origCreateOutbox;
      }
    });

    it('should reject when a window has endDateTime before startDateTime', async () => {
      const windows = [
        {
          startDateTime: '2026-10-15T15:00:00Z',
          endDateTime: '2026-10-15T10:00:00Z', // invalid: end before start
        },
      ];

      const origGetFacility = amenityFacilityService.getFacilityById;
      try {
        amenityFacilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          name: 'Tennis Court',
          status: 'ACTIVE',
        });

        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
              orgId: mockOrgId,
              userId: mockUserId,
              facilityId: mockFacilityId,
              title: 'Repairs',
              reason: 'Fixing net',
              windows,
            });
          },
          (err) => {
            assert.ok(err instanceof HttpError);
            assert.equal(err.statusCode, 400);
            return true;
          }
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
      }
    });

    it('should maintain backward compatibility for single-window scheduling', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origCreate = amenityMaintenanceBlockRepository.create;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindOverlappingRes = amenityReservationService.findOverlappingActiveReservations;
      const origCreateOutbox = amenityOutboxEventRepository.create;

      try {
        amenityFacilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          name: 'Tennis Court',
          status: 'ACTIVE',
        });

        amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
        amenityReservationService.findOverlappingActiveReservations = async () => [];

        amenityMaintenanceBlockRepository.create = async (data) => ({
          ...data,
          _id: new mongoose.Types.ObjectId(),
          status: 'SCHEDULED',
        });

        amenityOutboxEventRepository.createEvent = async () => ({ _id: new mongoose.Types.ObjectId() });
        amenityOutboxEventRepository.create = async () => ({ _id: new mongoose.Types.ObjectId() });

        const result = await amenityMaintenanceBlockService.scheduleMaintenanceBlock({
          orgId: mockOrgId,
          userId: mockUserId,
          facilityId: mockFacilityId,
          title: 'Single Window Task',
          reason: 'Quick maintenance',
          startDateTime: '2026-10-20T08:00:00Z',
          endDateTime: '2026-10-20T12:00:00Z',
        });

        assert.ok(result.block?._id, 'Should return a single block document in result.block');
        assert.equal(result.block?.status, 'SCHEDULED');
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.create = origCreate;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindOverlappingRes;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
        amenityOutboxEventRepository.create = origCreateOutbox;
      }
    });
  });

  /* =========================================================================
   * 2. Impact Preview across Multiple Windows
   * ========================================================================= */
  describe('2. Impact Preview with Multiple Windows', () => {
    it('should aggregate conflicts across all provided windows', async () => {
      const windows = [
        { startDateTime: '2026-10-01T00:00:00Z', endDateTime: '2026-10-01T17:00:00Z' },
        { startDateTime: '2026-10-02T00:00:00Z', endDateTime: '2026-10-02T17:00:00Z' },
      ];

      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindOverlapping = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindOverlappingRes = amenityReservationService.findOverlappingActiveReservations;
      const origFindV1 = amenityMaintenanceImpactRepository.findConflictingV1Bookings;

      try {
        amenityFacilityService.getFacilityById = async () => ({
          _id: mockFacilityId,
          orgId: mockOrgId,
          name: 'Clubhouse',
        });

        amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];

        // Window 1 has 1 conflict, Window 2 has 2 conflicts
        let callCount = 0;
        amenityReservationService.findOverlappingActiveReservations = async () => {
          callCount++;
          if (callCount === 1) {
            return [{ _id: new mongoose.Types.ObjectId(), confirmationCode: 'RES-001' }];
          }
          return [
            { _id: new mongoose.Types.ObjectId(), confirmationCode: 'RES-002' },
            { _id: new mongoose.Types.ObjectId(), confirmationCode: 'RES-003' },
          ];
        };

        amenityMaintenanceImpactRepository.findConflictingV1Bookings = async () => [];

        const preview = await amenityMaintenanceBlockService.getImpactPreview({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          windows,
        });

        assert.equal(preview.impactedReservationsCount, 3, 'Total impacted reservations should be 3');
        assert.equal(preview.totalConflicts, 3, 'Total conflicts should be 3');
        assert.equal(preview.windows.length, 2, 'Windows count in preview should be 2');
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindOverlapping;
        amenityReservationService.findOverlappingActiveReservations = origFindOverlappingRes;
        amenityMaintenanceImpactRepository.findConflictingV1Bookings = origFindV1;
      }
    });
  });
});
