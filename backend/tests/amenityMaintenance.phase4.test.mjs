import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { AmenityMaintenanceBlock } from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.model.js';
import amenityMaintenanceBlockRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.repository.js';
import amenityMaintenanceBlockService from '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js';
import amenityFacilityService from '../src/features/amenityManagement/facilities/amenityFacility.service.js';
import amenityResourceService from '../src/features/amenityManagement/resources/amenityResource.service.js';
import amenityReservationService from '../src/features/amenityManagement/reservations/amenityReservation.service.js';
import amenityOutboxEventRepository from '../src/features/amenityManagement/outbox/amenityOutboxEvent.repository.js';
import amenityMaintenanceImpactRepository from '../src/features/amenityManagement/maintenance/amenityMaintenanceImpact.repository.js';
import {
  generateOccurrences,
  validateRecurrenceConfig,
  MAX_RECURRENCE_OCCURRENCES,
} from '../src/features/amenityManagement/maintenance/amenityMaintenanceRecurrence.utils.js';
import HttpError from '../src/utils/httpError.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockSession = { _isMockSession: true };

describe('Amenity Maintenance Phase 4 — Recurring Maintenance & Scheduling Engine', () => {
  const mockOrgId = new mongoose.Types.ObjectId();
  const mockOrgId2 = new mongoose.Types.ObjectId();
  const mockFacilityId = new mongoose.Types.ObjectId();
  const mockResourceId1 = new mongoose.Types.ObjectId();
  const mockResourceId2 = new mongoose.Types.ObjectId();
  const mockUserId = new mongoose.Types.ObjectId();

  /* =========================================================================
   * 1. Recurrence Configuration & Schema Validation
   * ========================================================================= */
  describe('1. Recurrence Configuration & Schema Validation', () => {
    it('should validate recurrence subdocument schema on AmenityMaintenanceBlock', () => {
      const seriesId = new mongoose.Types.ObjectId();
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Weekly Deep Clean',
        reason: 'Sanitization',
        startDateTime: new Date('2026-04-01T08:00:00Z'),
        endDateTime: new Date('2026-04-01T10:00:00Z'),
        recurrenceSeriesId: seriesId,
        occurrenceIndex: 0,
        recurrence: {
          enabled: true,
          frequency: 'WEEKLY',
          interval: 1,
          daysOfWeek: [3],
          startDate: new Date('2026-04-01T08:00:00Z'),
          occurrenceCount: 4,
          timezone: 'UTC',
        },
      });

      const err = block.validateSync();
      assert.ifError(err);
      assert.equal(String(block.recurrenceSeriesId), String(seriesId));
      assert.equal(block.occurrenceIndex, 0);
      assert.equal(block.recurrence.frequency, 'WEEKLY');
    });

    it('should reject invalid recurrence frequency in schema', () => {
      const block = new AmenityMaintenanceBlock({
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        title: 'Invalid Frequency',
        reason: 'Testing',
        startDateTime: new Date('2026-04-01T08:00:00Z'),
        endDateTime: new Date('2026-04-01T10:00:00Z'),
        recurrence: {
          enabled: true,
          frequency: 'HOURLY', // invalid
        },
      });

      const err = block.validateSync();
      assert.ok(err?.errors?.['recurrence.frequency'], 'HOURLY frequency must be rejected');
    });

    it('should reject non-positive recurrence interval in validateRecurrenceConfig', () => {
      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'DAILY', interval: 0, occurrenceCount: 5 },
            { startDateTime: '2026-04-01T08:00:00Z', endDateTime: '2026-04-01T10:00:00Z' }
          );
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('interval must be an integer >= 1')
      );
    });

    it('should reject recurrence missing finite termination (neither endDate nor occurrenceCount)', () => {
      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'DAILY', interval: 1 },
            { startDateTime: '2026-04-01T08:00:00Z', endDateTime: '2026-04-01T10:00:00Z' }
          );
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('termination condition')
      );
    });

    it('should reject invalid daysOfWeek for WEEKLY frequency', () => {
      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'WEEKLY', daysOfWeek: [7], occurrenceCount: 4 },
            { startDateTime: '2026-04-01T08:00:00Z', endDateTime: '2026-04-01T10:00:00Z' }
          );
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('between 0 (Sunday) and 6 (Saturday)')
      );
    });

    it('should reject invalid dayOfMonth for MONTHLY frequency', () => {
      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'MONTHLY', dayOfMonth: 32, occurrenceCount: 3 },
            { startDateTime: '2026-04-01T08:00:00Z', endDateTime: '2026-04-01T10:00:00Z' }
          );
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('dayOfMonth must be between 1 and 31')
      );
    });

    it('should reject invalid IANA timezone', () => {
      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'DAILY', occurrenceCount: 3, timezone: 'Mars/Curiosity' },
            { startDateTime: '2026-04-01T08:00:00Z', endDateTime: '2026-04-01T10:00:00Z' }
          );
        },
        (err) => err instanceof HttpError && err.status === 400 && err.message.includes('Invalid IANA timezone')
      );
    });

    it('should reject endDateTime <= startDateTime for base window', () => {
      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'DAILY', occurrenceCount: 3 },
            { startDateTime: '2026-04-01T10:00:00Z', endDateTime: '2026-04-01T08:00:00Z' }
          );
        },
        (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('endDateTime must be later than startDateTime')
      );
    });
  });

  /* =========================================================================
   * 2. Daily Recurrence Generation
   * ========================================================================= */
  describe('2. Daily Recurrence Generation', () => {
    it('should generate consecutive daily occurrences bounded by occurrenceCount', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'DAILY',
          interval: 1,
          occurrenceCount: 3,
          timezone: 'UTC',
        },
        startDateTime: '2026-05-01T06:00:00.000Z',
        endDateTime: '2026-05-01T08:00:00.000Z',
      });

      assert.equal(occurrences.length, 3);
      assert.equal(occurrences[0].occurrenceIndex, 0);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-05-01T06:00:00.000Z');
      assert.equal(occurrences[0].endDateTime.toISOString(), '2026-05-01T08:00:00.000Z');

      assert.equal(occurrences[1].occurrenceIndex, 1);
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-05-02T06:00:00.000Z');
      assert.equal(occurrences[1].endDateTime.toISOString(), '2026-05-02T08:00:00.000Z');

      assert.equal(occurrences[2].occurrenceIndex, 2);
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-05-03T06:00:00.000Z');
      assert.equal(occurrences[2].endDateTime.toISOString(), '2026-05-03T08:00:00.000Z');
    });

    it('should generate alternate day occurrences with interval = 2', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'DAILY',
          interval: 2,
          occurrenceCount: 3,
          timezone: 'UTC',
        },
        startDateTime: '2026-05-01T06:00:00.000Z',
        endDateTime: '2026-05-01T08:00:00.000Z',
      });

      assert.equal(occurrences.length, 3);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-05-01T06:00:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-05-03T06:00:00.000Z');
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-05-05T06:00:00.000Z');
    });

    it('should terminate daily occurrences by endDate', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'DAILY',
          interval: 1,
          endDate: '2026-05-03T23:59:59.999Z',
          timezone: 'UTC',
        },
        startDateTime: '2026-05-01T10:00:00.000Z',
        endDateTime: '2026-05-01T12:00:00.000Z',
      });

      assert.equal(occurrences.length, 3);
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-05-03T10:00:00.000Z');
    });
  });

  /* =========================================================================
   * 3. Weekly & Custom Recurrence Generation
   * ========================================================================= */
  describe('3. Weekly & Custom Recurrence Generation', () => {
    it('should generate weekly occurrences on specified daysOfWeek', () => {
      // Starting on Wednesday 2026-05-06, recur Wednesdays (day 3)
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'WEEKLY',
          interval: 1,
          daysOfWeek: [3],
          occurrenceCount: 3,
          timezone: 'UTC',
        },
        startDateTime: '2026-05-06T09:00:00.000Z',
        endDateTime: '2026-05-06T11:00:00.000Z',
      });

      assert.equal(occurrences.length, 3);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-05-06T09:00:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-05-13T09:00:00.000Z');
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-05-20T09:00:00.000Z');
    });

    it('should generate multi-day weekly occurrences (e.g. Tuesday and Thursday)', () => {
      // Starting Tuesday 2026-05-05, days 2 and 4
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'WEEKLY',
          interval: 1,
          daysOfWeek: [2, 4],
          occurrenceCount: 4,
          timezone: 'UTC',
        },
        startDateTime: '2026-05-05T08:00:00.000Z',
        endDateTime: '2026-05-05T10:00:00.000Z',
      });

      assert.equal(occurrences.length, 4);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-05-05T08:00:00.000Z'); // Tue
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-05-07T08:00:00.000Z'); // Thu
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-05-12T08:00:00.000Z'); // Tue
      assert.equal(occurrences[3].startDateTime.toISOString(), '2026-05-14T08:00:00.000Z'); // Thu
    });

    it('should support CUSTOM frequency with specific days of week', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'CUSTOM',
          daysOfWeek: [1, 5], // Mon, Fri
          occurrenceCount: 2,
          timezone: 'UTC',
        },
        startDateTime: '2026-05-04T07:00:00.000Z', // Mon
        endDateTime: '2026-05-04T09:00:00.000Z',
      });

      assert.equal(occurrences.length, 2);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-05-04T07:00:00.000Z'); // Mon
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-05-08T07:00:00.000Z'); // Fri
    });
  });

  /* =========================================================================
   * 4. Monthly Recurrence & Month-End Clamping
   * ========================================================================= */
  describe('4. Monthly Recurrence & Month-End Clamping', () => {
    it('should generate monthly occurrences on regular dayOfMonth', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'MONTHLY',
          interval: 1,
          dayOfMonth: 15,
          occurrenceCount: 3,
          timezone: 'UTC',
        },
        startDateTime: '2026-01-15T14:00:00.000Z',
        endDateTime: '2026-01-15T16:00:00.000Z',
      });

      assert.equal(occurrences.length, 3);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-01-15T14:00:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-02-15T14:00:00.000Z');
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-03-15T14:00:00.000Z');
    });

    it('should clamp dayOfMonth at month-end (31st clamped to 28th/29th in Feb, 30th in Apr)', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'MONTHLY',
          interval: 1,
          dayOfMonth: 31,
          occurrenceCount: 4,
          timezone: 'UTC',
        },
        startDateTime: '2026-01-31T10:00:00.000Z',
        endDateTime: '2026-01-31T12:00:00.000Z',
      });

      assert.equal(occurrences.length, 4);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-01-31T10:00:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-02-28T10:00:00.000Z'); // 2026 is non-leap year
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-03-31T10:00:00.000Z');
      assert.equal(occurrences[3].startDateTime.toISOString(), '2026-04-30T10:00:00.000Z');
    });

    it('should correctly clamp February 29th in leap year 2028 when dayOfMonth is 31', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'MONTHLY',
          interval: 1,
          dayOfMonth: 31,
          occurrenceCount: 4,
          timezone: 'UTC',
        },
        startDateTime: '2028-01-31T10:00:00.000Z',
        endDateTime: '2028-01-31T12:00:00.000Z',
      });

      assert.equal(occurrences.length, 4);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2028-01-31T10:00:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2028-02-29T10:00:00.000Z'); // 2028 IS a leap year!
      assert.equal(occurrences[2].startDateTime.toISOString(), '2028-03-31T10:00:00.000Z');
      assert.equal(occurrences[3].startDateTime.toISOString(), '2028-04-30T10:00:00.000Z');
    });
  });

  /* =========================================================================
   * 5. Timezone Preservation & Buffer Windows
   * ========================================================================= */
  describe('5. Timezone Preservation & Buffer Windows', () => {
    it('should preserve wall-clock time in specified IANA timezone', () => {
      // 9:00 AM to 11:00 AM in Asia/Kolkata (IST = UTC+5:30)
      // 09:00 IST = 03:30 UTC
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'DAILY',
          interval: 1,
          occurrenceCount: 2,
          timezone: 'Asia/Kolkata',
        },
        startDateTime: '2026-06-01T03:30:00.000Z',
        endDateTime: '2026-06-01T05:30:00.000Z',
      });

      assert.equal(occurrences.length, 2);
      // Both occurrences must reflect 03:30Z (which is 09:00 IST)
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-06-01T03:30:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-06-02T03:30:00.000Z');
    });

    it('should compute correct effectiveStartDateTime and effectiveEndDateTime with buffers', () => {
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'DAILY',
          occurrenceCount: 1,
          timezone: 'UTC',
        },
        startDateTime: '2026-06-01T10:00:00.000Z',
        endDateTime: '2026-06-01T12:00:00.000Z',
        bufferBeforeMinutes: 30,
        bufferAfterMinutes: 45,
      });

      assert.equal(occurrences.length, 1);
      assert.equal(occurrences[0].effectiveStartDateTime.toISOString(), '2026-06-01T09:30:00.000Z');
      assert.equal(occurrences[0].effectiveEndDateTime.toISOString(), '2026-06-01T12:45:00.000Z');
    });

    it('should enforce MAX_RECURRENCE_OCCURRENCES = 60 ceiling', () => {
      assert.equal(MAX_RECURRENCE_OCCURRENCES, 60);

      assert.throws(
        () => {
          validateRecurrenceConfig(
            { frequency: 'DAILY', occurrenceCount: 61 },
            { startDateTime: '2026-01-01T08:00:00Z', endDateTime: '2026-01-01T10:00:00Z' }
          );
        },
        (err) => err instanceof HttpError && err.status === 400 && err.message.includes('cannot exceed 60')
      );
    });

    it('should preserve local wall-clock time across DST change in America/New_York (Spring Forward)', () => {
      // In America/New_York, DST starts on March 8, 2026:
      // March 7, 2026 is EST (UTC-5): 09:00 EST = 14:00:00.000Z UTC
      // March 8, 2026 is EDT (UTC-4): 09:00 EDT = 13:00:00.000Z UTC
      // March 9, 2026 is EDT (UTC-4): 09:00 EDT = 13:00:00.000Z UTC
      const occurrences = generateOccurrences({
        recurrence: {
          frequency: 'DAILY',
          interval: 1,
          occurrenceCount: 3,
          timezone: 'America/New_York',
        },
        startDateTime: '2026-03-07T14:00:00.000Z', // 09:00 EST
        endDateTime: '2026-03-07T16:00:00.000Z',
      });

      assert.equal(occurrences.length, 3);
      assert.equal(occurrences[0].startDateTime.toISOString(), '2026-03-07T14:00:00.000Z');
      assert.equal(occurrences[1].startDateTime.toISOString(), '2026-03-08T13:00:00.000Z');
      assert.equal(occurrences[2].startDateTime.toISOString(), '2026-03-09T13:00:00.000Z');
    });
  });

  /* =========================================================================
   * 6. Self-Collision & Conflict Detection
   * ========================================================================= */
  describe('6. Self-Collision & Conflict Detection', () => {
    it('should reject recurrence series where occurrences self-collide due to large buffers', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Tennis Court',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.previewRecurringMaintenance({
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Self Colliding Clean',
              startDateTime: '2026-07-01T08:00:00.000Z',
              endDateTime: '2026-07-01T20:00:00.000Z', // 12hr duration
              bufferBeforeMinutes: 360, // 6hr before
              bufferAfterMinutes: 360, // 6hr after => total effective window 24hrs!
              recurrence: {
                frequency: 'DAILY',
                interval: 1,
                occurrenceCount: 2,
                timezone: 'UTC',
              },
            });
          },
          (err) => (err.statusCode === 400 || err.status === 400) && err.message.includes('Recurrence occurrences overlap with each other')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
      }
    });

    it('should detect conflicts with existing maintenance blocks during preview', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Swimming Pool',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      const conflictingBlockId = new mongoose.Types.ObjectId();
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async ({ startDateTime }) => {
        // Return a conflict on the second occurrence (2026-07-02)
        if (new Date(startDateTime).toISOString().includes('2026-07-02')) {
          return [
            {
              _id: conflictingBlockId,
              title: 'Emergency Pump Repair',
              status: 'SCHEDULED',
              internalNotes: 'SECRET_DO_NOT_LEAK',
            },
          ];
        }
        return [];
      };

      amenityReservationService.findOverlappingActiveReservations = async () => [];

      try {
        const preview = await amenityMaintenanceBlockService.previewRecurringMaintenance({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          title: 'Daily Chlorine Check',
          startDateTime: '2026-07-01T06:00:00.000Z',
          endDateTime: '2026-07-01T07:00:00.000Z',
          recurrence: {
            frequency: 'DAILY',
            interval: 1,
            occurrenceCount: 2,
            timezone: 'UTC',
          },
        });

        assert.equal(preview.totalOccurrences, 2);
        assert.equal(preview.totalConflictsSummary.hasAnyConflicts, true);
        assert.equal(preview.totalConflictsSummary.totalOccurrencesWithConflicts, 1);
        assert.equal(preview.totalConflictsSummary.totalConflictingBlocks, 1);

        // First occurrence has no conflict
        assert.equal(preview.occurrences[0].hasConflicts, false);

        // Second occurrence has the conflicting block, sanitized (no internalNotes)
        assert.equal(preview.occurrences[1].hasConflicts, true);
        assert.equal(preview.occurrences[1].conflicts.maintenanceBlocks.length, 1);
        assert.equal(preview.occurrences[1].conflicts.maintenanceBlocks[0].internalNotes, undefined);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });

    it('should detect conflicts with active V2 reservations during preview', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Gym',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];

      const mockResId = new mongoose.Types.ObjectId();
      amenityReservationService.findOverlappingActiveReservations = async () => [
        {
          _id: mockResId,
          reservationNumber: 'RES-1001',
          bookingStatus: 'CONFIRMED',
          residentId: mockUserId,
        },
      ];

      try {
        const preview = await amenityMaintenanceBlockService.previewRecurringMaintenance({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          title: 'Deep Sanitization',
          startDateTime: '2026-07-05T10:00:00.000Z',
          endDateTime: '2026-07-05T12:00:00.000Z',
          recurrence: {
            frequency: 'WEEKLY',
            daysOfWeek: [0], // Sunday
            occurrenceCount: 1,
            timezone: 'UTC',
          },
        });

        assert.equal(preview.totalConflictsSummary.hasAnyConflicts, true);
        assert.equal(preview.totalConflictsSummary.totalImpactedReservations, 1);
        assert.equal(preview.occurrences[0].hasConflicts, true);
        assert.equal(preview.occurrences[0].conflicts.reservations.length, 1);
        assert.equal(String(preview.occurrences[0].conflicts.reservations[0]._id), String(mockResId));
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });

    it('should evaluate facility operating hours in preview', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Badminton Court',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
        operatingHours: [
          // Open 08:00 - 20:00 on Sunday (day 0)
          { dayOfWeek: 0, isOpen: true, openTime: '08:00', closeTime: '20:00' },
          // Closed on Monday (day 1)
          { dayOfWeek: 1, isOpen: false, openTime: '08:00', closeTime: '20:00' },
        ],
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityReservationService.findOverlappingActiveReservations = async () => [];

      try {
        // Occurrence 0: Sunday 06:00 - 08:00 UTC (outside open hours: opens at 08:00)
        // Occurrence 1: Monday 09:00 - 11:00 UTC (closed day)
        const preview = await amenityMaintenanceBlockService.previewRecurringMaintenance({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          title: 'Court Polishing',
          startDateTime: '2026-07-05T06:00:00.000Z', // Sunday
          endDateTime: '2026-07-05T08:00:00.000Z',
          recurrence: {
            frequency: 'DAILY',
            interval: 1,
            occurrenceCount: 2,
            timezone: 'UTC',
          },
        });

        assert.equal(preview.occurrences[0].conflicts.operatingHours.isOutsideOperatingHours, true);
        assert.equal(preview.occurrences[0].conflicts.operatingHours.isClosedDay, false);

        assert.equal(preview.occurrences[1].conflicts.operatingHours.isOutsideOperatingHours, true);
        assert.equal(preview.occurrences[1].conflicts.operatingHours.isClosedDay, true);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });
  });

  /* =========================================================================
   * 7. Stale Preview Protection on Commit
   * ========================================================================= */
  describe('7. Stale Preview Protection on Commit', () => {
    it('should throw 409 MAINTENANCE_IMPACT_NOT_RESOLVED if a conflict is unresolved on commit', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Clubhouse Lounge',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];

      const unhandledResId = new mongoose.Types.ObjectId();
      amenityReservationService.findOverlappingActiveReservations = async () => [
        {
          _id: unhandledResId,
          bookingStatus: 'CONFIRMED',
          residentId: mockUserId,
        },
      ];

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleRecurringMaintenance({
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Monthly Inspection',
              reason: 'Compliance',
              startDateTime: '2026-08-01T09:00:00.000Z',
              endDateTime: '2026-08-01T11:00:00.000Z',
              recurrence: {
                frequency: 'MONTHLY',
                dayOfMonth: 1,
                occurrenceCount: 2,
                timezone: 'UTC',
              },
              impactResolutions: [], // Unhandled!
            });
          },
          (err) =>
            err instanceof HttpError &&
            err.status === 409 &&
            (err.message.includes('Stale preview or unresolved conflict') || err.message.includes('MAINTENANCE_IMPACT_NOT_RESOLVED'))
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });

    it('should throw 409 if a conflicting maintenance block exists at commit time', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Clubhouse Lounge',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Existing Maintenance',
        },
      ];
      amenityReservationService.findOverlappingActiveReservations = async () => [];

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleRecurringMaintenance({
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Weekly Routine',
              reason: 'Routine',
              startDateTime: '2026-08-01T09:00:00.000Z',
              endDateTime: '2026-08-01T11:00:00.000Z',
              recurrence: {
                frequency: 'WEEKLY',
                daysOfWeek: [6],
                occurrenceCount: 2,
                timezone: 'UTC',
              },
            });
          },
          (err) => (err.statusCode === 409 || err.status === 409) && err.message.includes('A maintenance block already exists')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });
  });

  /* =========================================================================
   * 8. Atomic Series Commit & Impact Resolution Execution
   * ========================================================================= */
  describe('8. Atomic Series Commit & Impact Resolution Execution', () => {
    it('should atomically schedule recurring series and auto-cancel conflicting reservations when CANCEL_AND_PROCEED is used', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origCreateMany = amenityMaintenanceBlockRepository.createMany;
      const origCancelRes = amenityReservationService.cancelReservation;
      const origGetRes = amenityReservationService.getReservationById;
      const origCreateOutbox = amenityOutboxEventRepository.createEvent;
      const origFindByBlockAndTarget = amenityMaintenanceImpactRepository.findByBlockAndTarget;
      const origCreateImpact = amenityMaintenanceImpactRepository.create;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Squash Court',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityMaintenanceImpactRepository.findByBlockAndTarget = async () => null;
      amenityMaintenanceImpactRepository.create = async (d) => ({
        _id: new mongoose.Types.ObjectId(),
        ...d,
      });

      const conflictingResId = new mongoose.Types.ObjectId();
      amenityReservationService.findOverlappingActiveReservations = async () => [
        {
          _id: conflictingResId,
          reservationNumber: 'RES-SQ-01',
          bookingStatus: 'CONFIRMED',
          residentId: mockUserId,
          totalAmount: 150,
        },
      ];

      amenityReservationService.getReservationById = async (id) => ({
        _id: id,
        reservationNumber: 'RES-SQ-01',
        bookingStatus: 'CONFIRMED',
        residentId: mockUserId,
        totalAmount: 150,
        requestedStartDateTime: new Date('2026-09-01T08:00:00Z'),
        requestedEndDateTime: new Date('2026-09-01T10:00:00Z'),
      });

      let cancellationCalled = false;
      amenityReservationService.cancelReservation = async () => {
        cancellationCalled = true;
      };

      let createdBlocksCapture = null;
      amenityMaintenanceBlockRepository.createMany = async (blocks) => {
        createdBlocksCapture = blocks.map((b, idx) => ({
          ...b,
          _id: new mongoose.Types.ObjectId(),
          occurrenceIndex: idx,
        }));
        return createdBlocksCapture;
      };

      let outboxEventCapture = null;
      amenityOutboxEventRepository.createEvent = async (event) => {
        outboxEventCapture = event;
      };

      try {
        const result = await amenityMaintenanceBlockService.scheduleRecurringMaintenance({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          title: 'Court Refinishing',
          reason: 'Annual Maintenance',
          startDateTime: '2026-09-01T08:00:00.000Z',
          endDateTime: '2026-09-01T11:00:00.000Z',
          recurrence: {
            frequency: 'DAILY',
            interval: 1,
            occurrenceCount: 3,
            timezone: 'UTC',
          },
          conflictAction: 'CANCEL_AND_PROCEED',
          cancelledBy: mockUserId,
        });

        assert.ok(result.recurrenceSeriesId, 'recurrenceSeriesId must be returned');
        assert.equal(result.totalOccurrences, 3);
        assert.equal(createdBlocksCapture.length, 3);
        assert.equal(createdBlocksCapture[0].occurrenceIndex, 0);
        assert.equal(createdBlocksCapture[1].occurrenceIndex, 1);
        assert.equal(createdBlocksCapture[2].occurrenceIndex, 2);

        assert.equal(cancellationCalled, true, 'Conflicting reservation must have been cancelled');
        assert.equal(result.impactResolutionsCount, 1);

        assert.ok(outboxEventCapture);
        assert.equal(outboxEventCapture.eventType, 'RECURRING_MAINTENANCE_SCHEDULED');
        assert.equal(outboxEventCapture.payload.totalOccurrences, 3);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityMaintenanceBlockRepository.createMany = origCreateMany;
        amenityReservationService.cancelReservation = origCancelRes;
        amenityReservationService.getReservationById = origGetRes;
        amenityOutboxEventRepository.createEvent = origCreateOutbox;
        amenityMaintenanceImpactRepository.findByBlockAndTarget = origFindByBlockAndTarget;
        amenityMaintenanceImpactRepository.create = origCreateImpact;
      }
    });

    it('should abort and reject when database failure occurs during bulk block creation', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;
      const origCreateMany = amenityMaintenanceBlockRepository.createMany;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Tennis Court',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityReservationService.findOverlappingActiveReservations = async () => [];

      amenityMaintenanceBlockRepository.createMany = async () => {
        throw new Error('Simulated DB write failure on createMany');
      };

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleRecurringMaintenance({
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Failed Schedule',
              reason: 'Simulated failure',
              startDateTime: '2026-09-01T08:00:00.000Z',
              endDateTime: '2026-09-01T10:00:00.000Z',
              recurrence: {
                frequency: 'DAILY',
                occurrenceCount: 2,
                timezone: 'UTC',
              },
            });
          },
          (err) => err.message === 'Simulated DB write failure on createMany'
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
        amenityMaintenanceBlockRepository.createMany = origCreateMany;
      }
    });
  });

  /* =========================================================================
   * 9. Series Queries & Pagination
   * ========================================================================= */
  describe('9. Series Queries & Pagination', () => {
    it('should retrieve recurring series metadata by seriesId', async () => {
      const seriesId = new mongoose.Types.ObjectId();
      const origFindBySeries = amenityMaintenanceBlockRepository.findBySeriesId;

      amenityMaintenanceBlockRepository.findBySeriesId = async (id, orgId) => {
        if (String(id) === String(seriesId) && String(orgId) === String(mockOrgId)) {
          return [
            {
              _id: new mongoose.Types.ObjectId(),
              recurrenceSeriesId: seriesId,
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Filter Cleaning',
              occurrenceIndex: 0,
              startDateTime: new Date('2026-10-01T08:00:00Z'),
              endDateTime: new Date('2026-10-01T09:00:00Z'),
              status: 'SCHEDULED',
            },
            {
              _id: new mongoose.Types.ObjectId(),
              recurrenceSeriesId: seriesId,
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Filter Cleaning',
              occurrenceIndex: 1,
              startDateTime: new Date('2026-10-08T08:00:00Z'),
              endDateTime: new Date('2026-10-08T09:00:00Z'),
              status: 'SCHEDULED',
            },
          ];
        }
        return [];
      };

      try {
        const series = await amenityMaintenanceBlockService.getRecurringSeriesById(seriesId, mockOrgId);
        assert.equal(String(series.recurrenceSeriesId), String(seriesId));
        assert.equal(series.totalOccurrences, 2);
        assert.equal(series.occurrences.length, 2);
      } finally {
        amenityMaintenanceBlockRepository.findBySeriesId = origFindBySeries;
      }
    });

    it('should throw 404 if seriesId is not found', async () => {
      const origFindBySeries = amenityMaintenanceBlockRepository.findBySeriesId;
      amenityMaintenanceBlockRepository.findBySeriesId = async () => [];

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.getRecurringSeriesById(new mongoose.Types.ObjectId(), mockOrgId);
          },
          (err) => err instanceof HttpError && err.status === 404
        );
      } finally {
        amenityMaintenanceBlockRepository.findBySeriesId = origFindBySeries;
      }
    });

    it('should paginate series occurrences', async () => {
      const seriesId = new mongoose.Types.ObjectId();
      const origList = amenityMaintenanceBlockRepository.listSeriesOccurrences;

      amenityMaintenanceBlockRepository.listSeriesOccurrences = async ({ seriesId, page, limit }) => ({
        records: [
          { occurrenceIndex: 0, title: 'Occ 0' },
          { occurrenceIndex: 1, title: 'Occ 1' },
        ],
        total: 10,
        page,
        limit,
        pages: 5,
      });

      try {
        const result = await amenityMaintenanceBlockService.listSeriesOccurrences({
          seriesId,
          orgId: mockOrgId,
          page: 1,
          limit: 2,
        });

        assert.equal(result.records.length, 2);
        assert.equal(result.total, 10);
        assert.equal(result.pages, 5);
      } finally {
        amenityMaintenanceBlockRepository.listSeriesOccurrences = origList;
      }
    });
  });

  /* =========================================================================
   * 10. Multi-Resource & Facility-Wide Targeting
   * ========================================================================= */
  describe('10. Multi-Resource & Facility-Wide Targeting', () => {
    it('should accept facility-wide recurrence with empty resourceIds', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Entire Facility',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });
      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityReservationService.findOverlappingActiveReservations = async () => [];

      try {
        const preview = await amenityMaintenanceBlockService.previewRecurringMaintenance({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          resourceIds: [],
          title: 'Entire Facility Routine',
          startDateTime: '2026-11-01T08:00:00.000Z',
          endDateTime: '2026-11-01T10:00:00.000Z',
          recurrence: {
            frequency: 'DAILY',
            occurrenceCount: 1,
            timezone: 'UTC',
          },
        });

        assert.equal(preview.resourceId, null);
        assert.deepEqual(preview.resourceIds, []);
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });

    it('should accept multi-resource targeting with multiple resourceIds', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origGetResource = amenityResourceService.getResourceById;
      const origFindBlocks = amenityMaintenanceBlockRepository.findOverlappingBlocks;
      const origFindReservations = amenityReservationService.findOverlappingActiveReservations;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Sports Complex',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      amenityResourceService.getResourceById = async (id) => ({
        _id: id,
        orgId: mockOrgId,
        facilityId: mockFacilityId,
        isActive: true,
        isDeleted: false,
      });

      amenityMaintenanceBlockRepository.findOverlappingBlocks = async () => [];
      amenityReservationService.findOverlappingActiveReservations = async () => [];

      try {
        const preview = await amenityMaintenanceBlockService.previewRecurringMaintenance({
          orgId: mockOrgId,
          facilityId: mockFacilityId,
          resourceIds: [String(mockResourceId1), String(mockResourceId2)],
          title: 'Courts 1 & 2 Maintenance',
          startDateTime: '2026-11-01T08:00:00.000Z',
          endDateTime: '2026-11-01T10:00:00.000Z',
          recurrence: {
            frequency: 'DAILY',
            occurrenceCount: 1,
            timezone: 'UTC',
          },
        });

        assert.equal(preview.resourceIds.length, 2);
        assert.ok(preview.resourceIds.includes(String(mockResourceId1)));
        assert.ok(preview.resourceIds.includes(String(mockResourceId2)));
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityResourceService.getResourceById = origGetResource;
        amenityMaintenanceBlockRepository.findOverlappingBlocks = origFindBlocks;
        amenityReservationService.findOverlappingActiveReservations = origFindReservations;
      }
    });
  });

  /* =========================================================================
   * 11. Tenant Isolation & RBAC
   * ========================================================================= */
  describe('11. Tenant Isolation & RBAC', () => {
    it('should reject facility belonging to a different orgId during preview', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId2, // Different org!
        name: 'Foreign Facility',
        isActive: true,
        isDeleted: false,
      });

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.previewRecurringMaintenance({
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              title: 'Hacked Preview',
              startDateTime: '2026-12-01T08:00:00.000Z',
              endDateTime: '2026-12-01T10:00:00.000Z',
              recurrence: { frequency: 'DAILY', occurrenceCount: 1 },
            });
          },
          (err) => err instanceof HttpError && err.status === 403
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
      }
    });

    it('should reject resource belonging to a different facility during schedule', async () => {
      const origGetFacility = amenityFacilityService.getFacilityById;
      const origGetResource = amenityResourceService.getResourceById;

      amenityFacilityService.getFacilityById = async () => ({
        _id: mockFacilityId,
        orgId: mockOrgId,
        name: 'Local Facility',
        isActive: true,
        isDeleted: false,
        status: 'ACTIVE',
        timezone: 'UTC',
      });

      amenityResourceService.getResourceById = async () => ({
        _id: mockResourceId1,
        orgId: mockOrgId,
        facilityId: new mongoose.Types.ObjectId(), // Different facility!
        isActive: true,
        isDeleted: false,
      });

      try {
        await assert.rejects(
          async () => {
            await amenityMaintenanceBlockService.scheduleRecurringMaintenance({
              orgId: mockOrgId,
              facilityId: mockFacilityId,
              resourceIds: [String(mockResourceId1)],
              title: 'Mismatch Resource',
              reason: 'Testing',
              startDateTime: '2026-12-01T08:00:00.000Z',
              endDateTime: '2026-12-01T10:00:00.000Z',
              recurrence: { frequency: 'DAILY', occurrenceCount: 1, timezone: 'UTC' },
            });
          },
          (err) => err instanceof HttpError && err.status === 400 && err.message.includes('does not belong to specified facility')
        );
      } finally {
        amenityFacilityService.getFacilityById = origGetFacility;
        amenityResourceService.getResourceById = origGetResource;
      }
    });
  });

  /* =========================================================================
   * 12. Architectural Compliance
   * ========================================================================= */
  describe('12. Architectural Compliance', () => {
    it('should verify zero direct socket.io imports in amenityMaintenanceBlock.service.js', () => {
      const servicePath = path.join(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      assert.equal(
        serviceContent.includes('socket.io'),
        false,
        'amenityMaintenanceBlock.service.js must NEVER import socket.io directly'
      );
    });

    it('should verify zero foreign repository imports in amenityMaintenanceBlock.service.js', () => {
      const servicePath = path.join(
        __dirname,
        '../src/features/amenityManagement/maintenance/amenityMaintenanceBlock.service.js'
      );
      const serviceContent = fs.readFileSync(servicePath, 'utf8');

      // Allowed repositories: amenityMaintenanceBlockRepository, amenityMaintenanceImpactRepository, amenityOutboxEventRepository
      assert.equal(
        serviceContent.includes('amenityFacility.repository'),
        false,
        'Must not import amenityFacility.repository'
      );
      assert.equal(
        serviceContent.includes('amenityResource.repository'),
        false,
        'Must not import amenityResource.repository'
      );
      assert.equal(
        serviceContent.includes('amenityReservation.repository'),
        false,
        'Must not import amenityReservation.repository'
      );
    });
  });
});
