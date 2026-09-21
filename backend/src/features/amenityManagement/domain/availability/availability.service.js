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

    const GRACE_PERIOD_MS = 2 * 60 * 1000;
    if (start.getTime() + GRACE_PERIOD_MS < Date.now()) {
      return {
        isAvailable: false,
        reason: 'Reservation start time cannot be in the past',
        effectiveStartDateTime: start,
        effectiveEndDateTime: end,
      };
    }

    // 1. Fetch Facility
    const facility = await amenityFacilityRepository.findById(facilityId, orgId, session);
    if (
      !facility ||
      !facility.isActive ||
      facility.isDraft ||
      facility.isDeleted ||
      facility.status === 'DRAFT' ||
      facility.status === 'INACTIVE'
    ) {
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
          { orgId, facilityId, resourceId, startDateTime: effectiveStart, endDateTime: effectiveEnd },
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
        // If someone booked or held this slot, check if active reservations/holds exist
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

  /**
   * Generates and evaluates all daily time slots for a facility on a given date.
   * Excludes past time slots (with 2-min grace period) and slots that are booked,
   * held, or blocked by maintenance.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {string} params.dateStr - 'YYYY-MM-DD'
   * @param {number} [params.requestedQuantity=1]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ slots: Array<{ start: string, end: string, label: string, startUtc: string, endUtc: string }> }>}
   */
  async getDailySlots({ orgId, facilityId, resourceId, dateStr, requestedQuantity = 1 }, session) {
    const facility = await amenityFacilityRepository.findById(facilityId, orgId, session);
    if (
      !facility ||
      !facility.isActive ||
      facility.isDraft ||
      facility.isDeleted ||
      facility.status === 'DRAFT' ||
      facility.status === 'INACTIVE'
    ) {
      return { slots: [] };
    }

    const tz = facility.timezone || 'Asia/Kolkata';
    const targetDate = moment.tz(dateStr, 'YYYY-MM-DD', tz).startOf('day');
    const dayOfWeek = targetDate.day();

    const dayRule = facility.operatingHours?.find((h) => h.dayOfWeek === dayOfWeek);
    if (!dayRule || !dayRule.isOpen) {
      return { slots: [] };
    }

    const opensAtStr = dayRule.openTime || dayRule.opensAt || '06:00';
    const closesAtStr = dayRule.closeTime || dayRule.closesAt || '22:00';
    const duration = facility.slotDurationMinutes || 60;

    const [openH, openM] = typeof opensAtStr === 'string' ? opensAtStr.split(':').map(Number) : [6, 0];
    const [closeH, closeM] = typeof closesAtStr === 'string' ? closesAtStr.split(':').map(Number) : [22, 0];

    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    const pad = (n) => String(n).padStart(2, '0');
    const nowMs = Date.now();
    const GRACE_PERIOD_MS = 2 * 60 * 1000;

    const availableSlots = [];
    let current = startMinutes;

    while (current + duration <= endMinutes) {
      const slotStartH = Math.floor(current / 60);
      const slotStartM = current % 60;
      const slotEndH = Math.floor((current + duration) / 60);
      const slotEndM = (current + duration) % 60;

      const startStr = `${pad(slotStartH)}:${pad(slotStartM)}`;
      const endStr = `${pad(slotEndH)}:${pad(slotEndM)}`;

      const slotStartUtc = moment.tz(`${dateStr}T${startStr}`, 'YYYY-MM-DDTHH:mm', tz).toDate();
      let slotEndUtc = moment.tz(`${dateStr}T${endStr}`, 'YYYY-MM-DDTHH:mm', tz).toDate();
      if (slotEndUtc <= slotStartUtc) {
        slotEndUtc = moment(slotEndUtc).add(1, 'days').toDate();
      }

      // 1. Past time check: if slot start time has already passed, it disappears
      const isPast = slotStartUtc.getTime() + GRACE_PERIOD_MS < nowMs;

      if (!isPast) {
        // 2. Archetype availability check: checks overlapping holds, confirmed reservations, discrete allocations, maintenance
        const avail = await this.checkAvailability(
          {
            orgId,
            facilityId,
            resourceId,
            startDateTime: slotStartUtc,
            endDateTime: slotEndUtc,
            requestedQuantity: Number(requestedQuantity) || 1,
          },
          session
        );

        // "if someone booked that slot it should disappear"
        if (avail.isAvailable) {
          const formatTo12Hour = (tStr) => {
            const [hStr, mStr = '00'] = (tStr || '').split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);
            if (isNaN(h)) return tStr;
            const period = h >= 12 ? 'PM' : 'AM';
            const hour12 = h % 12 === 0 ? 12 : h % 12;
            const minutePad = isNaN(m) ? '00' : String(m).padStart(2, '0');
            return `${hour12}:${minutePad} ${period}`;
          };

          availableSlots.push({
            start: startStr,
            end: endStr,
            label: `${formatTo12Hour(startStr)} - ${formatTo12Hour(endStr)}`,
            startUtc: slotStartUtc.toISOString(),
            endUtc: slotEndUtc.toISOString(),
          });
        }
      }

      current += duration;
    }

    return { slots: availableSlots };
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
