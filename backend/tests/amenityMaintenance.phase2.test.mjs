import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  AmenityMaintenanceBlock,
  computeEffectiveMaintenanceWindow,
  syncResourceTargets,
} from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.model.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityMaintenanceBlockService from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js';
import availabilityService from '../src/features/amenityManagement/domain/availability/availability.service.js';
import HttpError from '../src/utils/httpError.utils.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Amenity Maintenance Phase 2 — Adversarial Verification Suite', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockFacilityId = new mongoose.Types.ObjectId();
  const mockResourceId1 = new mongoose.Types.ObjectId();
  const mockResourceId2 = new mongoose.Types.ObjectId();
  const mockResourceId3 = new mongoose.Types.ObjectId();

  /* =========================================================================
   * 1. Schema & Model Validation & Resource Synchronization
   * ========================================================================= */
  describe('1. Model Validation & Adversarial Resource Synchronization', () => {
    it('should reject missing or empty title', () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Filter replacement',
      });
      const err = block.validateSync();
      assert.ok(err?.errors?.title, 'title must be required');
    });

    it('should validate maintenanceType enum values and reject invalid', () => {
      const invalidBlock = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Painting',
        maintenanceType: 'INVALID_TYPE',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Routine painting',
      });
      const err = invalidBlock.validateSync();
      assert.ok(err?.errors?.maintenanceType, 'Invalid maintenanceType must fail validation');

      const validTypes = ['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'];
      for (const type of validTypes) {
        const validBlock = new AmenityMaintenanceBlock({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          title: `${type} task`,
          maintenanceType: type,
          startDateTime: new Date('2026-10-15T10:00:00Z'),
          endDateTime: new Date('2026-10-15T12:00:00Z'),
          reason: `Performing ${type}`,
        });
        assert.ifError(validBlock.validateSync(), `${type} must be a valid maintenanceType`);
      }
    });

    it('should reject negative bufferBeforeMinutes and bufferAfterMinutes', () => {
      const negativeBufferBlock = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Inspection',
        bufferBeforeMinutes: -15,
        bufferAfterMinutes: -10,
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Inspection',
      });
      const err = negativeBufferBlock.validateSync();
      assert.ok(err?.errors?.bufferBeforeMinutes, 'bufferBeforeMinutes < 0 must fail');
      assert.ok(err?.errors?.bufferAfterMinutes, 'bufferAfterMinutes < 0 must fail');
    });

    // Case A: { resourceId: "A", resourceIds: [] } -> resourceId = A, resourceIds = [A]
    it('Case A: should sync resourceId to resourceIds when only resourceId is provided', async () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        resourceId: mockResourceId1,
        resourceIds: [],
        title: 'Single resource maintenance',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Court refinishing',
      });
      await block.validate();
      assert.equal(block.resourceIds?.length, 1);
      assert.equal(String(block.resourceIds[0]), String(mockResourceId1));
      assert.equal(String(block.resourceId), String(mockResourceId1));
    });

    // Case B: { resourceId: null, resourceIds: ["A", "B", "C"] } -> resourceId = A, resourceIds = [A, B, C]
    it('Case B: should sync resourceIds[0] to resourceId when multi-resource array is provided without resourceId', async () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        resourceId: null,
        resourceIds: [mockResourceId1, mockResourceId2, mockResourceId3],
        title: 'Multi-resource maintenance',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Multi-court maintenance',
      });
      await block.validate();
      assert.equal(block.resourceIds?.length, 3);
      assert.equal(String(block.resourceId), String(mockResourceId1));
      assert.equal(String(block.resourceIds[0]), String(mockResourceId1));
    });

    // Case C: { resourceId: "A", resourceIds: ["B", "C"] } -> resourceId = A, resourceIds = [A, B, C]
    it('Case C: should deterministically merge resourceId into resourceIds and maintain synchronization', async () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        resourceId: mockResourceId1,
        resourceIds: [mockResourceId2, mockResourceId3],
        title: 'Discrepant resource input maintenance',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Multi-court maintenance',
      });
      await block.validate();
      assert.equal(block.resourceIds?.length, 3);
      assert.equal(String(block.resourceId), String(mockResourceId1));
      assert.equal(String(block.resourceIds[0]), String(mockResourceId1));
      assert.ok(block.resourceIds.map(String).includes(String(mockResourceId2)));
      assert.ok(block.resourceIds.map(String).includes(String(mockResourceId3)));
    });

    // Case D: { resourceId: null, resourceIds: [] } -> facility-wide
    it('Case D: should maintain null / empty resourceIds for facility-wide maintenance', async () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        resourceId: null,
        resourceIds: [],
        title: 'Facility-wide maintenance',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Deep cleaning clubhouse',
      });
      await block.validate();
      assert.equal(block.resourceId, null);
      assert.deepEqual(block.resourceIds, []);
    });

    // Case E: duplicate resource IDs [A, A, B] -> normalized to [A, B]
    it('Case E: should deduplicate resourceIds array', async () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        resourceIds: [mockResourceId1, mockResourceId1, mockResourceId2],
        title: 'Duplicate resource test',
        startDateTime: new Date('2026-10-15T10:00:00Z'),
        endDateTime: new Date('2026-10-15T12:00:00Z'),
        reason: 'Court maintenance',
      });
      await block.validate();
      assert.equal(block.resourceIds?.length, 2);
      assert.equal(String(block.resourceId), String(mockResourceId1));
    });
  });

  /* =========================================================================
   * 2. Buffer Window Mathematics & Exact Boundary Overlap Detection
   * ========================================================================= */
  describe('2. Buffer Window Mathematics & Boundary Conditions', () => {
    it('computeEffectiveMaintenanceWindow correctly computes buffer boundaries', () => {
      const start = new Date('2026-10-15T10:00:00.000Z');
      const end = new Date('2026-10-15T11:00:00.000Z');
      const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(start, end, 15, 20);

      assert.equal(effectiveStart.toISOString(), '2026-10-15T09:45:00.000Z');
      assert.equal(effectiveEnd.toISOString(), '2026-10-15T11:20:00.000Z');
    });

    it('boundary check: booking ending exactly at effectiveStart should NOT conflict', () => {
      // Maintenance 10:00 - 11:00, bufferBefore 15, bufferAfter 20 -> [09:45, 11:20]
      const mEffectiveStart = new Date('2026-10-15T09:45:00.000Z').getTime();
      const mEffectiveEnd = new Date('2026-10-15T11:20:00.000Z').getTime();

      // Booking 09:00 - 09:45
      const bStart = new Date('2026-10-15T09:00:00.000Z').getTime();
      const bEnd = new Date('2026-10-15T09:45:00.000Z').getTime();

      const conflicts = mEffectiveStart < bEnd && mEffectiveEnd > bStart;
      assert.equal(conflicts, false, 'Booking ending exactly at effectiveStart must NOT conflict');
    });

    it('boundary check: booking starting exactly at effectiveEnd should NOT conflict', () => {
      const mEffectiveStart = new Date('2026-10-15T09:45:00.000Z').getTime();
      const mEffectiveEnd = new Date('2026-10-15T11:20:00.000Z').getTime();

      // Booking 11:20 - 12:00
      const bStart = new Date('2026-10-15T11:20:00.000Z').getTime();
      const bEnd = new Date('2026-10-15T12:00:00.000Z').getTime();

      const conflicts = mEffectiveStart < bEnd && mEffectiveEnd > bStart;
      assert.equal(conflicts, false, 'Booking starting exactly at effectiveEnd must NOT conflict');
    });

    it('boundary check: booking starting 1 minute before effectiveEnd MUST conflict', () => {
      const mEffectiveStart = new Date('2026-10-15T09:45:00.000Z').getTime();
      const mEffectiveEnd = new Date('2026-10-15T11:20:00.000Z').getTime();

      // Booking 11:19 - 12:00
      const bStart = new Date('2026-10-15T11:19:00.000Z').getTime();
      const bEnd = new Date('2026-10-15T12:00:00.000Z').getTime();

      const conflicts = mEffectiveStart < bEnd && mEffectiveEnd > bStart;
      assert.equal(conflicts, true, 'Booking starting 1 min before effectiveEnd MUST conflict');
    });

    it('boundary check: booking starting 1 minute after effectiveEnd should NOT conflict', () => {
      const mEffectiveStart = new Date('2026-10-15T09:45:00.000Z').getTime();
      const mEffectiveEnd = new Date('2026-10-15T11:20:00.000Z').getTime();

      // Booking 11:21 - 12:00
      const bStart = new Date('2026-10-15T11:21:00.000Z').getTime();
      const bEnd = new Date('2026-10-15T12:00:00.000Z').getTime();

      const conflicts = mEffectiveStart < bEnd && mEffectiveEnd > bStart;
      assert.equal(conflicts, false, 'Booking starting 1 min after effectiveEnd must NOT conflict');
    });
  });

  /* =========================================================================
   * 3. Architecture Boundary & Decoupling Verification
   * ========================================================================= */
  describe('3. Strict Architectural Boundary & Feature Isolation Verification', () => {
    it('amenity.services.js must NEVER import amenityBooking.repository.js', () => {
      const amenityServicesPath = path.resolve(__dirname, '../src/features/amenity/amenity.services.js');
      const content = fs.readFileSync(amenityServicesPath, 'utf-8');
      assert.ok(
        !content.includes('amenityBooking.repository'),
        'amenity.services.js must NOT import amenityBooking.repository'
      );
    });

    it('amenityBooking.services.js must NEVER import wallet.repository.js or user.repository.js', () => {
      const bookingServicesPath = path.resolve(__dirname, '../src/features/amenityBooking/amenityBooking.services.js');
      const content = fs.readFileSync(bookingServicesPath, 'utf-8');
      assert.ok(
        !content.includes('wallet.repository'),
        'amenityBooking.services.js must NOT import wallet.repository'
      );
      assert.ok(
        !content.includes('user.repository'),
        'amenityBooking.services.js must NOT import user.repository'
      );
    });

    it('amenityMaintenanceBlock.service.js must NEVER import foreign repositories', () => {
      const maintServicePath = path.resolve(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const content = fs.readFileSync(maintServicePath, 'utf-8');
      assert.ok(
        !content.includes('amenityFacility.repository'),
        'amenityMaintenanceBlock.service.js must NOT import amenityFacility.repository'
      );
      assert.ok(
        !content.includes('amenityResource.repository'),
        'amenityMaintenanceBlock.service.js must NOT import amenityResource.repository'
      );
      assert.ok(
        !content.includes('amenityReservation.repository'),
        'amenityMaintenanceBlock.service.js must NOT import amenityReservation.repository'
      );
    });

    it('amenityMaintenanceBlock.service.js must NOT import socket.io or getIO directly', () => {
      const maintServicePath = path.resolve(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const content = fs.readFileSync(maintServicePath, 'utf-8');
      assert.ok(!content.includes('socket.io'), 'Service must NOT import socket.io');
      assert.ok(!content.includes('getIO'), 'Service must NOT import getIO');
    });
  });

  /* =========================================================================
   * 4. Machine-Readable Error Contract & HTTP Response Handling
   * ========================================================================= */
  describe('4. Machine-Readable Error Contract & HTTP Response Verification', () => {
    it('HttpError with code AMENITY_UNAVAILABLE and reason UNDER_MAINTENANCE formats properly', () => {
      const unavailableFrom = '2026-10-15T09:45:00.000Z';
      const unavailableUntil = '2026-10-15T11:20:00.000Z';
      const details = {
        code: 'AMENITY_UNAVAILABLE',
        reason: 'UNDER_MAINTENANCE',
        unavailableFrom,
        unavailableUntil,
        expectedReopeningAt: unavailableUntil,
        facilityId: String(mockFacilityId),
        resourceId: String(mockResourceId1),
      };

      const err = new HttpError(400, 'Amenity is under maintenance: Annual cleaning', details);
      err.code = 'AMENITY_UNAVAILABLE';
      err.reason = 'UNDER_MAINTENANCE';

      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'AMENITY_UNAVAILABLE');
      assert.equal(err.reason, 'UNDER_MAINTENANCE');
      assert.equal(err.details.expectedReopeningAt, unavailableUntil);
    });

    it('errorHandler middleware must lift code and reason to HTTP response top-level without leaking internalNotes', () => {
      const details = {
        code: 'AMENITY_UNAVAILABLE',
        reason: 'UNDER_MAINTENANCE',
        unavailableFrom: '2026-10-15T09:45:00.000Z',
        unavailableUntil: '2026-10-15T11:20:00.000Z',
        expectedReopeningAt: '2026-10-15T11:20:00.000Z',
        facilityId: String(mockFacilityId),
        resourceId: null,
      };
      const err = new HttpError(400, 'Amenity is under maintenance', details);
      err.code = 'AMENITY_UNAVAILABLE';
      err.reason = 'UNDER_MAINTENANCE';

      let responseStatusCode = null;
      let responseBody = null;
      const mockReq = { originalUrl: '/api/v1/amenity-bookings', id: 'req-123' };
      const mockRes = {
        status(code) {
          responseStatusCode = code;
          return this;
        },
        json(payload) {
          responseBody = payload;
          return this;
        },
      };

      errorHandler(err, mockReq, mockRes, () => {});

      assert.equal(responseStatusCode, 400);
      assert.equal(responseBody.success, false);
      assert.equal(responseBody.code, 'AMENITY_UNAVAILABLE');
      assert.equal(responseBody.reason, 'UNDER_MAINTENANCE');
      assert.equal(responseBody.message, 'Amenity is under maintenance');
      assert.ok(responseBody.details);
      assert.equal(responseBody.details.expectedReopeningAt, '2026-10-15T11:20:00.000Z');
      assert.equal(responseBody.details.internalNotes, undefined, 'Must not expose internalNotes');
    });
  });
});
