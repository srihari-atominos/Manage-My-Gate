import moment from 'moment-timezone';
import HttpError from '../../../../utils/httpError.utils.js';
import amenityFacilityRepository from '../../facilities/amenityFacility.repository.js';
import amenityResourceRepository from '../../resources/amenityResource.repository.js';
import amenityMaintenanceBlockRepository from '../../maintenance/amenityMaintenanceBlock.repository.js';
import amenitySlotAllocationRepository from '../../allocations/amenitySlotAllocation.repository.js';
import amenityReservationHoldRepository from '../../holds/amenityReservationHold.repository.js';
import amenityReservationRepository from '../../reservations/amenityReservation.repository.js';

export class AvailabilityService {
  /**
   * Checks availability for a requested window according to the facility's archetype.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Date} params.startDateTime
   * @param {Date} params.endDateTime
   * @param {number} [params.requestedQuantity=1]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{
   *   isAvailable: boolean,
   *   reason?: string,
   *   availableUnits?: number,
   *   maxCapacity?: number,
   *   effectiveStartDateTime: Date,
   *   effectiveEndDateTime: Date
   * }>}
   */
  async checkAvailability(
    { orgId, facilityId, resourceId, startDateTime, endDateTime, requestedQuantity = 1 },
    session
  ) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new HttpError(400, 'Invalid date range: startDateTime must be earlier than endDateTime');
    }

    // 1. Fetch Facility
    const facility = await amenityFacilityRepository.findById(facilityId, orgId, session);
    if (!facility || !facility.isActive || facility.isDeleted) {
      return {
        isAvailable: false,
        reason: 'Facility is not active or does not exist',
        effectiveStartDateTime: start,
        effectiveEndDateTime: end,
      };
    }

    // 1b. Operating Hours Envelope Check (interpreted in facility's configured IANA timezone)
    // Multi-day room resources (guest houses/transit rooms) represent overnight stays and are not bounded by intraday operating hours.
    if (facility.archetype !== 'ROOM_RESOURCE' && facility.operatingHours && facility.operatingHours.length > 0) {
      const tz = facility.timezone || 'UTC';
      const mStart = moment(start).tz(tz);
      const mEnd = moment(end).tz(tz);
      const dayOfWeek = mStart.day();
      const dayRule = facility.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

      if (!dayRule || !dayRule.isOpen) {
        return {
          isAvailable: false,
          reason: 'Facility is closed on this day',
          effectiveStartDateTime: start,
          effectiveEndDateTime: end,
        };
      }

      const [openHour, openMin] = dayRule.openTime.split(':').map(Number);
      const [closeHour, closeMin] = dayRule.closeTime.split(':').map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;

      const startMinutes = mStart.hour() * 60 + mStart.minute();
      let endMinutes = mEnd.hour() * 60 + mEnd.minute();
      if (mEnd.format('YYYY-MM-DD') !== mStart.format('YYYY-MM-DD')) {
        endMinutes += 24 * 60;
      }

      if (startMinutes < openMinutes || endMinutes > closeMinutes) {
        return {
          isAvailable: false,
          reason: `Requested time is outside facility operating hours (${dayRule.openTime} - ${dayRule.closeTime})`,
          effectiveStartDateTime: start,
          effectiveEndDateTime: end,
        };
      }
    }

    // 2. Fetch Resource if provided
    let resource = null;
    let setupBufferMs = 0;
    let teardownBufferMs = 0;

    if (resourceId) {
      resource = await amenityResourceRepository.findById(resourceId, orgId, session);
      if (!resource || !resource.isActive || resource.isDeleted) {
        return {
          isAvailable: false,
          reason: 'Resource is not active or does not exist',
          effectiveStartDateTime: start,
          effectiveEndDateTime: end,
        };
      }
      setupBufferMs = (resource.setupBufferMinutes || 0) * 60 * 1000;
      teardownBufferMs = (resource.teardownBufferMinutes || 0) * 60 * 1000;
    }

    const effectiveStart = new Date(start.getTime() - setupBufferMs);
    const effectiveEnd = new Date(end.getTime() + teardownBufferMs);

    // 3. Maintenance Block Check
    const maintenanceBlocks = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
      { orgId, facilityId, resourceId, startDateTime: effectiveStart, endDateTime: effectiveEnd },
      session
    );

    const completeClosure = maintenanceBlocks.find((b) => b.isCompleteClosure);
    if (completeClosure) {
      return {
        isAvailable: false,
        reason: `Maintenance blackout active: ${completeClosure.reason}`,
        effectiveStartDateTime: effectiveStart,
        effectiveEndDateTime: effectiveEnd,
      };
    }

    // 4. Archetype-Specific Availability Logic
    switch (facility.archetype) {
      case 'EXCLUSIVE_HOURLY': {
        // Discrete slot check
        const overlappingSlots = await amenitySlotAllocationRepository.findOverlappingExclusiveSlots(
          { orgId, resourceId, startDateTime: effectiveStart, endDateTime: effectiveEnd },
          session
        );
        if (overlappingSlots.length > 0) {
          return {
            isAvailable: false,
            reason: 'Requested slot is already allocated or held',
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        // Active holds check
        const activeHolds = await amenityReservationHoldRepository.findOverlappingActiveHolds(
          { orgId, facilityId, resourceId, effectiveStartDateTime: effectiveStart, effectiveEndDateTime: effectiveEnd },
          session
        );
        if (activeHolds.length > 0) {
          return {
            isAvailable: false,
            reason: 'Requested time is locked by an active hold',
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        // Active confirmed reservations check
        const activeResvs = await amenityReservationRepository.findOverlappingActiveReservations(
          { orgId, facilityId, resourceId, effectiveStartDateTime: effectiveStart, effectiveEndDateTime: effectiveEnd },
          session
        );
        if (activeResvs.length > 0) {
          return {
            isAvailable: false,
            reason: 'Requested time is booked by a confirmed reservation',
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        return {
          isAvailable: true,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        };
      }

      case 'SHARED_CAPACITY': {
        const slotStartUTC = start.toISOString();
        const bucketId = `BUCKET:${orgId}:${facilityId}:${slotStartUTC}`;
        const bucket = await amenitySlotAllocationRepository.findById(bucketId, session);

        const currentAllocated = bucket ? bucket.allocatedHeadcount : 0;
        const maxCap = facility.maxCapacity || 1;
        const availableHeadcount = Math.max(0, maxCap - currentAllocated);

        if (requestedQuantity > availableHeadcount) {
          return {
            isAvailable: false,
            reason: `Requested headcount (${requestedQuantity}) exceeds available capacity (${availableHeadcount})`,
            availableUnits: availableHeadcount,
            maxCapacity: maxCap,
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        return {
          isAvailable: true,
          availableUnits: availableHeadcount,
          maxCapacity: maxCap,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        };
      }

      case 'EVENT_SPACE':
      case 'ROOM_RESOURCE': {
        // Continuous range check with buffers
        const activeHolds = await amenityReservationHoldRepository.findOverlappingActiveHolds(
          { orgId, facilityId, resourceId, effectiveStartDateTime: effectiveStart, effectiveEndDateTime: effectiveEnd },
          session
        );
        if (activeHolds.length > 0) {
          return {
            isAvailable: false,
            reason: 'Requested interval overlaps with an existing hold',
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        const activeResvs = await amenityReservationRepository.findOverlappingActiveReservations(
          { orgId, facilityId, resourceId, effectiveStartDateTime: effectiveStart, effectiveEndDateTime: effectiveEnd },
          session
        );
        if (activeResvs.length > 0) {
          return {
            isAvailable: false,
            reason: 'Requested interval overlaps with an existing reservation',
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        return {
          isAvailable: true,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        };
      }

      case 'INVENTORY_TOOLS': {
        if (resource && resource.isSerializedAsset) {
          // Serialized asset behaves like an exclusive resource
          const activeHolds = await amenityReservationHoldRepository.findOverlappingActiveHolds(
            { orgId, facilityId, resourceId, effectiveStartDateTime: effectiveStart, effectiveEndDateTime: effectiveEnd },
            session
          );
          if (activeHolds.length > 0) {
            return {
              isAvailable: false,
              reason: 'Serialized asset is currently reserved by an active hold',
              effectiveStartDateTime: effectiveStart,
              effectiveEndDateTime: effectiveEnd,
            };
          }

          const activeResvs = await amenityReservationRepository.findOverlappingActiveReservations(
            { orgId, facilityId, resourceId, effectiveStartDateTime: effectiveStart, effectiveEndDateTime: effectiveEnd },
            session
          );
          if (activeResvs.length > 0) {
            return {
              isAvailable: false,
              reason: 'Serialized asset is booked for the requested period',
              effectiveStartDateTime: effectiveStart,
              effectiveEndDateTime: effectiveEnd,
            };
          }

          return {
            isAvailable: true,
            effectiveStartDateTime: effectiveStart,
            effectiveEndDateTime: effectiveEnd,
          };
        }

        // Bulk Inventory
        const totalStock = resource?.totalBulkStock || 0;
        return {
          isAvailable: totalStock >= requestedQuantity,
          availableUnits: totalStock,
          reason: totalStock < requestedQuantity ? 'Insufficient bulk inventory stock' : undefined,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        };
      }

      default:
        return {
          isAvailable: true,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        };
    }
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
