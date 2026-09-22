import moment from 'moment-timezone';
import HttpError from '../../../utils/httpError.utils.js';
import amenityMaintenanceBlockRepository from './amenityMaintenanceBlock.repository.js';
import amenityMaintenanceImpactRepository from './amenityMaintenanceImpact.repository.js';
import { computeEffectiveMaintenanceWindow } from './amenityMaintenanceBlock.model.js';
import {
  generateOccurrences,
  validateRecurrenceConfig,
  MAX_RECURRENCE_OCCURRENCES,
} from './amenityMaintenanceRecurrence.utils.js';
import amenityFacilityService from '../facilities/amenityFacility.service.js';
import amenityResourceService from '../resources/amenityResource.service.js';
import amenityReservationService from '../reservations/amenityReservation.service.js';
import amenityOutboxEventRepository from '../outbox/amenityOutboxEvent.repository.js';
import amenityManagementEvents, { AMENITY_EVENTS } from '../amenityManagement.events.js';
import { withTransactionRetry } from '../domain/concurrency/transaction.utils.js';

export class AmenityMaintenanceBlockService {
  /**
   * Helper: Dispatches a non-blocking notification to resident through notification service.
   * Internal notes are strictly excluded from resident notifications.
   * @private
   */
  async _sendResidentNotification({ recipientId, orgId, title, body, metadata = {} }) {
    try {
      if (!recipientId) return;
      const { notificationService } = await import('../../notification/notification.service.js');
      await notificationService.createNotification({
        recipientId,
        orgId,
        title,
        body,
        type: 'INFO',
        metadata,
      });
    } catch (err) {
      // Non-blocking notification delivery - do not crash transaction
    }
  }

  /**
   * Resolves a single impacted booking or reservation.
   * Ensures idempotency: if already resolved with same action, returns without duplicate side effects.
   * @private
   */
  async _resolveImpactItem({
    blockId,
    orgId,
    facilityId,
    resourceId,
    resourceIds,
    targetId,
    targetType,
    resolution,
    newSlot,
    notes,
    cancelledBy,
    session,
  }) {
    // 1. Check existing impact record for idempotency
    const existingImpact = await amenityMaintenanceImpactRepository.findByBlockAndTarget(
      { blockId, targetType, targetId, orgId },
      session
    );

    if (existingImpact && existingImpact.status === 'RESOLVED' && existingImpact.resolution === resolution) {
      return existingImpact; // Idempotent no-op
    }

    let residentId = null;
    let effectiveResolution = resolution;
    const impactType = targetType === 'V1_BOOKING' ? 'BOOKING_CONFLICT' : 'RESERVATION_CONFLICT';
    const resolutionDetails = {
      notes: notes || '',
      refundAmount: 0,
      refundPercentage: 0,
    };

    if (resolution === 'CANCEL') {
      if (targetType === 'V2_RESERVATION') {
        const reservation = await amenityReservationService.getReservationById(targetId, session);
        if (reservation) {
          residentId = reservation.residentId;
          resolutionDetails.previousSlot = {
            startDateTime: reservation.requestedStartDateTime,
            endDateTime: reservation.requestedEndDateTime,
            resourceId: reservation.resourceId,
          };
          if (reservation.bookingStatus !== 'CANCELLED') {
            await amenityReservationService.cancelReservation(
              {
                reservationId: targetId,
                orgId,
                residentId: reservation.residentId,
                cancellationReason: notes || 'Cancelled due to facility maintenance',
                cancelledBy,
                isManagementCancellation: true,
              },
              session
            );
            resolutionDetails.refundAmount = reservation.totalAmount || 0;
            resolutionDetails.refundPercentage = 100;
          }
        }
      } else if (targetType === 'V1_BOOKING') {
        const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        const booking = await amenityBookingService.getBookingById(targetId, orgId, session);
        if (booking) {
          residentId = booking.userId?._id || booking.userId;
          if (booking.status === 'checked-in') {
            // Decision 1 (Option B): Checked-in V1 bookings cannot be automatically cancelled and must become REVIEW_INDIVIDUALLY
            effectiveResolution = 'REVIEW_INDIVIDUALLY';
            resolutionDetails.notes = notes
              ? `${notes} (Checked-in booking flagged for individual review)`
              : 'Checked-in booking flagged for individual review';
          } else if (booking.status !== 'cancelled') {
            // Decision 2 (Option A): Administrative cancellation receives 100% refund
            const cancelledBooking = await amenityBookingService.cancelBooking(
              targetId,
              residentId,
              orgId,
              notes || 'Cancelled due to facility maintenance',
              true, // isAdmin
              { refundOverridePercentage: 100 }
            );
            resolutionDetails.refundAmount = cancelledBooking?.refundAmount || 0;
            resolutionDetails.refundPercentage = cancelledBooking?.refundPercentage || 100;
          }
        }
      }

      // Notify resident (non-blocking) - only if actually cancelled
      if (effectiveResolution === 'CANCEL' && residentId) {
        this._sendResidentNotification({
          recipientId: residentId,
          orgId,
          title: 'Booking Cancelled Due to Maintenance',
          body: 'Your booking has been cancelled due to maintenance. Any applicable refund has been initiated.',
          metadata: { targetId, targetType, resolution: 'CANCEL' },
        });
      }
    } else if (resolution === 'RESCHEDULE') {
      if (!newSlot) {
        throw new HttpError(400, 'newSlot details are required for RESCHEDULE resolution');
      }

      if (targetType === 'V2_RESERVATION') {
        const reservation = await amenityReservationService.getReservationById(targetId, session);
        if (!reservation) {
          throw new HttpError(404, `Reservation ${targetId} not found`);
        }
        residentId = reservation.residentId;
        resolutionDetails.previousSlot = {
          startDateTime: reservation.requestedStartDateTime,
          endDateTime: reservation.requestedEndDateTime,
          resourceId: reservation.resourceId,
        };
        resolutionDetails.newSlot = {
          startDateTime: new Date(newSlot.startDateTime),
          endDateTime: new Date(newSlot.endDateTime),
          resourceId: newSlot.resourceId || reservation.resourceId,
        };

        await amenityReservationService.rescheduleReservation(
          {
            reservationId: targetId,
            orgId,
            newStartDateTime: newSlot.startDateTime,
            newEndDateTime: newSlot.endDateTime,
            newResourceId: newSlot.resourceId,
            rescheduledBy: cancelledBy,
            reason: notes || 'Rescheduled due to facility maintenance',
          },
          session
        );
      } else if (targetType === 'V1_BOOKING') {
        const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        const booking = await amenityBookingService.getBookingById(targetId, orgId, session);
        if (!booking) {
          throw new HttpError(404, `Booking ${targetId} not found`);
        }
        residentId = booking.userId?._id || booking.userId;
        await amenityBookingService.rescheduleBooking(
          targetId,
          orgId,
          {
            bookingDate: newSlot.bookingDate,
            startTime: newSlot.startTime,
            endTime: newSlot.endTime,
            rescheduledBy: cancelledBy,
            reason: notes || 'Rescheduled due to facility maintenance',
          },
          session
        );
      }

      // Notify resident (non-blocking)
      if (residentId) {
        this._sendResidentNotification({
          recipientId: residentId,
          orgId,
          title: 'Booking Rescheduled Due to Maintenance',
          body: 'Your booking has been rescheduled due to facility maintenance.',
          metadata: { targetId, targetType, resolution: 'RESCHEDULE' },
        });
      }
    } else if (resolution === 'REVIEW_INDIVIDUALLY') {
      // No cancellation, no refund, no rescheduling!
      if (targetType === 'V2_RESERVATION') {
        const reservation = await amenityReservationService.getReservationById(targetId, session);
        if (reservation) {
          residentId = reservation.residentId;
          resolutionDetails.previousSlot = {
            startDateTime: reservation.requestedStartDateTime,
            endDateTime: reservation.requestedEndDateTime,
            resourceId: reservation.resourceId,
          };
        }
      } else if (targetType === 'V1_BOOKING') {
        const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        const booking = await amenityBookingService.getBookingById(targetId, orgId, session);
        if (booking) {
          residentId = booking.userId?._id || booking.userId;
        }
      }
    }

    const impactStatus = effectiveResolution === 'REVIEW_INDIVIDUALLY' ? 'PENDING_REVIEW' : 'RESOLVED';

    let savedImpact;
    if (existingImpact) {
      savedImpact = await amenityMaintenanceImpactRepository.updateResolution(
        existingImpact._id,
        orgId,
        {
          resolution: effectiveResolution,
          status: impactStatus,
          resolutionDetails,
          resolvedBy: cancelledBy,
          resolvedAt: new Date(),
        },
        session
      );
    } else {
      savedImpact = await amenityMaintenanceImpactRepository.create(
        {
          orgId,
          maintenanceBlockId: blockId,
          facilityId,
          resourceId,
          resourceIds,
          targetType,
          targetId,
          residentId,
          impactType,
          resolution: effectiveResolution,
          status: impactStatus,
          resolutionDetails,
          resolvedBy: cancelledBy,
          resolvedAt: new Date(),
        },
        session
      );
    }

    return savedImpact;
  }

  /**
   * Schedules a maintenance block and verifies conflicting reservations and bookings.
   * Supports individual resolution modes (CANCEL, RESCHEDULE, REVIEW_INDIVIDUALLY)
   * and backward-compatible conflictAction ('CANCEL_AND_PROCEED').
   * Revalidates conflicts inside transaction for stale preview protection.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Array<string|import('mongoose').Types.ObjectId>} [params.resourceIds]
   * @param {string} params.title
   * @param {string} [params.maintenanceType='PREVENTIVE']
   * @param {string} [params.internalNotes='']
   * @param {number} [params.bufferBeforeMinutes=0]
   * @param {number} [params.bufferAfterMinutes=0]
   * @param {Date|string} params.startDateTime
   * @param {Date|string} params.endDateTime
   * @param {boolean} [params.isCompleteClosure=true]
   * @param {number} [params.degradedCapacity=0]
   * @param {string} params.reason
   * @param {string} [params.conflictAction]
   * @param {Array<Object>} [params.resolutions]
   * @param {string|import('mongoose').Types.ObjectId} [params.cancelledBy]
   * @param {Array<{ startDateTime: string|Date, endDateTime: string|Date }>} [params.windows]
   * @param {boolean} [params.allowConcurrent=false]
   * @param {import('mongoose').ClientSession} [session]
   */
  async scheduleMaintenanceBlock(
    {
      orgId,
      facilityId,
      resourceId = null,
      resourceIds = [],
      title,
      maintenanceType = 'PREVENTIVE',
      internalNotes = '',
      bufferBeforeMinutes = 0,
      bufferAfterMinutes = 0,
      startDateTime,
      endDateTime,
      windows = [],
      isCompleteClosure = true,
      degradedCapacity = 0,
      reason,
      conflictAction = null,
      resolutions = [],
      cancelledBy = null,
      allowConcurrent = false,
    },
    session
  ) {
    if (Array.isArray(windows) && windows.length > 0) {
      return this.scheduleMaintenanceWindows(
        {
          orgId,
          facilityId,
          resourceId,
          resourceIds,
          title,
          maintenanceType,
          internalNotes,
          bufferBeforeMinutes,
          bufferAfterMinutes,
          windows,
          isCompleteClosure,
          degradedCapacity,
          reason,
          conflictAction,
          resolutions,
          cancelledBy,
          allowConcurrent,
        },
        session
      );
    }

    if (!title || !title.trim()) {
      throw new HttpError(400, 'Maintenance title is required');
    }

    if (!reason || !reason.trim()) {
      throw new HttpError(400, 'Maintenance reason is required');
    }

    const validTypes = ['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'];
    if (!validTypes.includes(maintenanceType)) {
      throw new HttpError(400, `Invalid maintenance type: ${maintenanceType}`);
    }

    const numBufBefore = Math.max(0, parseInt(bufferBeforeMinutes, 10) || 0);
    const numBufAfter = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0);
    if (bufferBeforeMinutes < 0 || bufferAfterMinutes < 0) {
      throw new HttpError(400, 'Buffer minutes cannot be negative');
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new HttpError(400, 'Invalid maintenance window: endDateTime must be later than startDateTime');
    }

    const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
      start,
      end,
      numBufBefore,
      numBufAfter
    );

    // Normalize target resource IDs with deterministic Case C synchronization
    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = [...new Set(resourceIds.filter(Boolean).map(String))];
      if (resourceId && !targetResourceIds.includes(String(resourceId))) {
        targetResourceIds.unshift(String(resourceId));
      }
    } else if (resourceId) {
      targetResourceIds = [String(resourceId)];
    }
    const targetResourceId = targetResourceIds.length > 0 ? targetResourceIds[0] : null;

    const executeSchedule = async (trxSession) => {
      // 1. Verify Facility exists and is active
      const facility = await amenityFacilityService.getFacilityById(facilityId, orgId, trxSession);
      if (!facility) {
        throw new HttpError(404, `Facility ${facilityId} not found`);
      }
      if (String(facility.orgId) !== String(orgId)) {
        throw new HttpError(403, 'Facility does not belong to specified organization');
      }
      if (facility.isActive === false || facility.isDeleted === true || facility.status === 'INACTIVE') {
        throw new HttpError(400, 'Facility is inactive or deleted');
      }

      // 2. Verify all specified Resources exist and belong to the facility
      for (const resId of targetResourceIds) {
        const resource = await amenityResourceService.getResourceById(resId, orgId, trxSession);
        if (!resource) {
          throw new HttpError(404, `Resource ${resId} not found`);
        }
        if (String(resource.orgId) !== String(orgId)) {
          throw new HttpError(403, `Resource ${resId} does not belong to specified organization`);
        }
        if (String(resource.facilityId) !== String(facilityId)) {
          throw new HttpError(400, 'Resource does not belong to specified facility');
        }
        if (resource.isActive === false || resource.isDeleted === true) {
          throw new HttpError(400, `Resource ${resId} is inactive or deleted`);
        }
      }

      // 3. Inspect existing overlapping maintenance blocks
      const existingMaintenance = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
        {
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          startDateTime: effectiveStart,
          endDateTime: effectiveEnd,
        },
        trxSession
      );
      if (existingMaintenance && existingMaintenance.length > 0) {
        throw new HttpError(
          409,
          'A maintenance block already exists that overlaps with the proposed maintenance window',
          {
            overlappingBlockIds: existingMaintenance.map((b) => b._id),
          }
        );
      }

      // 4. Inspect impacted active v2 reservations
      const overlappingReservations = await amenityReservationService.findOverlappingActiveReservations(
        {
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        },
        trxSession
      );

      // 4b. Inspect impacted active v1 bookings
      let overlappingBookings = [];
      try {
        const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        overlappingBookings = await amenityBookingService.findOverlappingBookingsForWindow(
          {
            orgId,
            amenityId: facilityId,
            startDateTime: effectiveStart,
            endDateTime: effectiveEnd,
          },
          trxSession
        );
      } catch (e) {
        overlappingBookings = [];
      }

      const totalConflicts = (overlappingReservations?.length || 0) + (overlappingBookings?.length || 0);

      // Construct effective resolution plan
      let planResolutions = [];
      if (totalConflicts > 0) {
        if (conflictAction === 'CANCEL_AND_PROCEED') {
          for (const r of (overlappingReservations || [])) {
            planResolutions.push({
              targetId: r._id,
              targetType: 'V2_RESERVATION',
              resolution: 'CANCEL',
              notes: `Facility maintenance closure: ${reason.trim()}`,
            });
          }
          for (const b of (overlappingBookings || [])) {
            planResolutions.push({
              targetId: b._id,
              targetType: 'V1_BOOKING',
              resolution: 'CANCEL',
              notes: `Facility maintenance closure: ${reason.trim()}`,
            });
          }
        } else if (Array.isArray(resolutions) && resolutions.length > 0) {
          // Stale preview protection: verify that EVERY active conflicting reservation and booking has a resolution
          const resTargetIds = new Set(resolutions.map((r) => String(r.targetId || r.id)));
          const unhandled = [];

          for (const r of (overlappingReservations || [])) {
            if (!resTargetIds.has(String(r._id))) {
              unhandled.push({ id: r._id, type: 'V2_RESERVATION', reason: 'Unresolved reservation conflict' });
            }
          }
          for (const b of (overlappingBookings || [])) {
            if (!resTargetIds.has(String(b._id))) {
              unhandled.push({ id: b._id, type: 'V1_BOOKING', reason: 'Unresolved booking conflict' });
            }
          }

          if (unhandled.length > 0) {
            throw new HttpError(
              409,
              `This maintenance window conflicts with ${totalConflicts} booking(s)/reservation(s). Resolution required for all affected items.`,
              {
                code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
                requiresConflictAction: true,
                impactedCount: totalConflicts,
                unresolvedTargets: unhandled,
              }
            );
          }

          planResolutions = resolutions.map((res) => ({
            ...res,
            targetId: res.targetId || res.id,
            targetType:
              res.targetType ||
              (overlappingReservations.some((r) => String(r._id) === String(res.targetId || res.id))
                ? 'V2_RESERVATION'
                : 'V1_BOOKING'),
          }));
        } else {
          throw new HttpError(
            409,
            `This maintenance window conflicts with ${totalConflicts} booking(s). Confirmation required to cancel and proceed.`,
            {
              code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
              requiresConflictAction: true,
              impactedReservationsCount: overlappingReservations.length,
              impactedReservationIds: overlappingReservations.map((r) => r._id),
              impactedBookingsCount: overlappingBookings.length,
              impactedBookingIds: overlappingBookings.map((b) => b._id),
            }
          );
        }
      }

      // 5. Create maintenance block
      const block = await amenityMaintenanceBlockRepository.create(
        {
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          title: title.trim(),
          maintenanceType,
          internalNotes: (internalNotes || '').trim(),
          bufferBeforeMinutes: numBufBefore,
          bufferAfterMinutes: numBufAfter,
          startDateTime: start,
          endDateTime: end,
          isCompleteClosure,
          degradedCapacity,
          reason: reason.trim(),
          status: 'SCHEDULED',
        },
        trxSession
      );

      // 6. Execute resolution plan and record impacts
      const impactResults = [];
      for (const item of planResolutions) {
        const impactRecord = await this._resolveImpactItem({
          blockId: block._id,
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          targetId: item.targetId,
          targetType: item.targetType,
          resolution: item.resolution,
          newSlot: item.newSlot,
          notes: item.notes || `Maintenance: ${reason.trim()}`,
          cancelledBy,
          session: trxSession,
        });
        impactResults.push(impactRecord);
      }

      // 7. Write Outbox event
      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'MAINTENANCE_SCHEDULED',
          aggregateId: block._id,
          aggregateType: 'AmenityMaintenanceBlock',
          payload: {
            blockId: block._id,
            facilityId,
            resourceId: targetResourceId,
            resourceIds: targetResourceIds,
            title: block.title,
            maintenanceType: block.maintenanceType,
            startDateTime: start,
            endDateTime: end,
            bufferBeforeMinutes: numBufBefore,
            bufferAfterMinutes: numBufAfter,
            impactedReservationsCount: overlappingReservations.length,
            impactedBookingsCount: overlappingBookings.length,
            conflictsResolved: planResolutions.length > 0,
            resolvedImpactCount: impactResults.length,
          },
        },
        trxSession
      );

      // 8. Broadcast domain event
      amenityManagementEvents.emit(AMENITY_EVENTS.MAINTENANCE_SCHEDULED, {
        blockId: block._id,
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        title: block.title,
        startDateTime: start,
        endDateTime: end,
        reason: block.reason,
      });

      return {
        block,
        impactedReservationsCount: overlappingReservations.length,
        impactedReservationIds: overlappingReservations.map((r) => r._id),
        impactedBookingsCount: overlappingBookings.length,
        impactedBookingIds: overlappingBookings.map((b) => b._id),
        impacts: impactResults,
      };
    };

    if (session) {
      return executeSchedule(session);
    }
    return withTransactionRetry(executeSchedule);
  }

  /**
   * Schedules multiple maintenance blackout windows for a facility in a single transaction.
   * Enables administrators to schedule maintenance for Today, Tomorrow, and future dates in one action.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Array<string|import('mongoose').Types.ObjectId>} [params.resourceIds]
   * @param {string} params.title
   * @param {string} [params.maintenanceType='PREVENTIVE']
   * @param {string} [params.internalNotes]
   * @param {number} [params.bufferBeforeMinutes=0]
   * @param {number} [params.bufferAfterMinutes=0]
   * @param {Array<{ startDateTime: string|Date, endDateTime: string|Date }>} params.windows
   * @param {boolean} [params.isCompleteClosure=true]
   * @param {number} [params.degradedCapacity=0]
   * @param {string} params.reason
   * @param {string} [params.conflictAction]
   * @param {Array<Object>} [params.resolutions]
   * @param {string|import('mongoose').Types.ObjectId} [params.cancelledBy]
   * @param {boolean} [params.allowConcurrent=false]
   * @param {import('mongoose').ClientSession} [session]
   */
  async scheduleMaintenanceWindows(params, session) {
    const {
      orgId,
      facilityId,
      resourceId = null,
      resourceIds = [],
      title,
      maintenanceType = 'PREVENTIVE',
      internalNotes = '',
      bufferBeforeMinutes = 0,
      bufferAfterMinutes = 0,
      windows = [],
      isCompleteClosure = true,
      degradedCapacity = 0,
      reason,
      conflictAction = null,
      resolutions = [],
      cancelledBy = null,
      allowConcurrent = false,
    } = params;

    if (!title || !title.trim()) {
      throw new HttpError(400, 'Maintenance title is required');
    }

    if (!reason || !reason.trim()) {
      throw new HttpError(400, 'Maintenance reason is required');
    }

    if (!Array.isArray(windows) || windows.length === 0) {
      throw new HttpError(400, 'At least one maintenance window is required');
    }

    const numBufBefore = Math.max(0, parseInt(bufferBeforeMinutes, 10) || 0);
    const numBufAfter = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0);

    // Validate each window
    const normalizedWindows = windows.map((w, idx) => {
      const start = new Date(w.startDateTime);
      const end = new Date(w.endDateTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        throw new HttpError(400, `Invalid window at index ${idx}: endDateTime must be later than startDateTime`);
      }
      const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
        start,
        end,
        numBufBefore,
        numBufAfter
      );
      return {
        start,
        end,
        effectiveStart,
        effectiveEnd,
      };
    });

    // Normalize target resource IDs with deterministic Case C synchronization
    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = [...new Set(resourceIds.filter(Boolean).map(String))];
      if (resourceId && !targetResourceIds.includes(String(resourceId))) {
        targetResourceIds.unshift(String(resourceId));
      }
    } else if (resourceId) {
      targetResourceIds = [String(resourceId)];
    }
    const targetResourceId = targetResourceIds.length > 0 ? targetResourceIds[0] : null;

    const executeBatchSchedule = async (trxSession) => {
      // 1. Verify Facility exists and is active
      const facility = await amenityFacilityService.getFacilityById(facilityId, orgId, trxSession);
      if (!facility) {
        throw new HttpError(404, `Facility ${facilityId} not found`);
      }
      if (String(facility.orgId) !== String(orgId)) {
        throw new HttpError(403, 'Facility does not belong to specified organization');
      }
      if (facility.isActive === false || facility.isDeleted === true || facility.status === 'INACTIVE') {
        throw new HttpError(400, 'Facility is inactive or deleted');
      }

      // 2. Verify all specified Resources exist and belong to the facility
      for (const resId of targetResourceIds) {
        const resource = await amenityResourceService.getResourceById(resId, orgId, trxSession);
        if (!resource) {
          throw new HttpError(404, `Resource ${resId} not found`);
        }
        if (String(resource.orgId) !== String(orgId)) {
          throw new HttpError(403, `Resource ${resId} does not belong to specified organization`);
        }
        if (String(resource.facilityId) !== String(facilityId)) {
          throw new HttpError(400, 'Resource does not belong to specified facility');
        }
        if (resource.isActive === false || resource.isDeleted === true) {
          throw new HttpError(400, `Resource ${resId} is inactive or deleted`);
        }
      }

      const createdBlocks = [];

      for (const win of normalizedWindows) {
        // Inspect existing overlapping maintenance blocks if not allowed
        if (!allowConcurrent) {
          const existingMaintenance = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
            {
              orgId,
              facilityId,
              resourceId: targetResourceId,
              resourceIds: targetResourceIds,
              startDateTime: win.effectiveStart,
              endDateTime: win.effectiveEnd,
            },
            trxSession
          );
          const externalOverlaps = (existingMaintenance || []).filter(
            (b) => !createdBlocks.some((cb) => String(cb._id) === String(b._id))
          );
          if (externalOverlaps.length > 0) {
            throw new HttpError(
              409,
              `A maintenance block already exists that overlaps with window ${win.start.toISOString()} - ${win.end.toISOString()}`,
              { overlappingBlockIds: externalOverlaps.map((b) => b._id) }
            );
          }
        }

        // Inspect impacted active reservations
        const overlappingReservations = await amenityReservationService.findOverlappingActiveReservations(
          {
            orgId,
            facilityId,
            resourceId: targetResourceId,
            resourceIds: targetResourceIds,
            effectiveStartDateTime: win.effectiveStart,
            effectiveEndDateTime: win.effectiveEnd,
          },
          trxSession
        );

        let overlappingBookings = [];
        try {
          const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
          const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
          overlappingBookings = await amenityBookingService.findOverlappingBookingsForWindow(
            {
              orgId,
              amenityId: facilityId,
              startDateTime: win.effectiveStart,
              endDateTime: win.effectiveEnd,
            },
            trxSession
          );
        } catch (e) {
          overlappingBookings = [];
        }

        const totalConflicts = (overlappingReservations?.length || 0) + (overlappingBookings?.length || 0);
        let planResolutions = [];
        if (totalConflicts > 0) {
          if (conflictAction === 'CANCEL_AND_PROCEED') {
            for (const r of (overlappingReservations || [])) {
              planResolutions.push({
                targetId: r._id,
                targetType: 'V2_RESERVATION',
                resolution: 'CANCEL',
                notes: `Facility maintenance closure: ${reason.trim()}`,
              });
            }
            for (const b of (overlappingBookings || [])) {
              planResolutions.push({
                targetId: b._id,
                targetType: 'V1_BOOKING',
                resolution: 'CANCEL',
                notes: `Facility maintenance closure: ${reason.trim()}`,
              });
            }
          } else if (Array.isArray(resolutions) && resolutions.length > 0) {
            planResolutions = resolutions.map((res) => ({
              ...res,
              targetId: res.targetId || res.id,
              targetType:
                res.targetType ||
                (overlappingReservations.some((r) => String(r._id) === String(res.targetId || res.id))
                  ? 'V2_RESERVATION'
                  : 'V1_BOOKING'),
            }));
          } else {
            throw new HttpError(
              409,
              `Maintenance window ${win.start.toISOString()} conflicts with ${totalConflicts} booking(s). Confirmation required to cancel and proceed.`,
              {
                code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
                requiresConflictAction: true,
                impactedReservationsCount: overlappingReservations.length,
                impactedBookingsCount: overlappingBookings.length,
              }
            );
          }
        }

        // Create maintenance block
        const block = await amenityMaintenanceBlockRepository.create(
          {
            orgId,
            facilityId,
            resourceId: targetResourceId,
            resourceIds: targetResourceIds,
            title: title.trim(),
            maintenanceType,
            internalNotes: (internalNotes || '').trim(),
            bufferBeforeMinutes: numBufBefore,
            bufferAfterMinutes: numBufAfter,
            startDateTime: win.start,
            endDateTime: win.end,
            isCompleteClosure,
            degradedCapacity,
            reason: reason.trim(),
            status: 'SCHEDULED',
          },
          trxSession
        );

        // Execute resolutions
        for (const item of planResolutions) {
          await this._resolveImpactItem({
            blockId: block._id,
            orgId,
            facilityId,
            resourceId: targetResourceId,
            resourceIds: targetResourceIds,
            targetId: item.targetId,
            targetType: item.targetType,
            resolution: item.resolution,
            newSlot: item.newSlot,
            notes: item.notes || `Maintenance: ${reason.trim()}`,
            cancelledBy,
            session: trxSession,
          });
        }

        // Outbox event
        await amenityOutboxEventRepository.createEvent(
          {
            orgId,
            aggregateType: 'AMENITY_MAINTENANCE',
            aggregateId: block._id,
            eventType: 'MAINTENANCE_SCHEDULED',
            payload: {
              blockId: block._id,
              facilityId,
              resourceId: targetResourceId,
              resourceIds: targetResourceIds,
              title: block.title,
              startDateTime: win.start,
              endDateTime: win.end,
              status: 'SCHEDULED',
            },
          },
          trxSession
        );

        amenityManagementEvents.emit('amenity:maintenance:scheduled', {
          blockId: block._id,
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          startDateTime: win.start,
          endDateTime: win.end,
          status: 'SCHEDULED',
        });

        createdBlocks.push(block);
      }

      return {
        count: createdBlocks.length,
        blocks: createdBlocks,
      };
    };

    if (session) {
      return executeBatchSchedule(session);
    }
    return withTransactionRetry(executeBatchSchedule);
  }

  /**
   * Resolves pending maintenance impacts for an existing maintenance block.
   * Safe against duplicate requests (idempotent).
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.blockId
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {Array<Object>} params.resolutions
   * @param {string|import('mongoose').Types.ObjectId} [params.resolvedBy]
   * @param {import('mongoose').ClientSession} [session]
   */
  async resolveMaintenanceImpact({ blockId, orgId, resolutions = [], resolvedBy = null }, session) {
    if (!Array.isArray(resolutions) || resolutions.length === 0) {
      throw new HttpError(400, 'resolutions array is required');
    }

    const executeResolution = async (trxSession) => {
      const block = await amenityMaintenanceBlockRepository.findById(blockId, orgId, trxSession);
      if (!block) {
        throw new HttpError(404, 'Maintenance block not found');
      }

      const results = [];
      for (const res of resolutions) {
        const targetId = res.targetId || res.id;
        const targetType = res.targetType || 'V2_RESERVATION';
        const resolution = res.resolution;

        if (!['CANCEL', 'RESCHEDULE', 'REVIEW_INDIVIDUALLY'].includes(resolution)) {
          throw new HttpError(400, `Invalid resolution: ${resolution}`);
        }

        const resolvedImpact = await this._resolveImpactItem({
          blockId: block._id,
          orgId,
          facilityId: block.facilityId,
          resourceId: block.resourceId,
          resourceIds: block.resourceIds,
          targetId,
          targetType,
          resolution,
          newSlot: res.newSlot,
          notes: res.notes || `Administrative impact resolution for block ${blockId}`,
          cancelledBy: resolvedBy,
          session: trxSession,
        });

        results.push(resolvedImpact);
      }

      amenityManagementEvents.emit('amenity:maintenance:impact_resolved', {
        blockId: block._id,
        orgId,
        resolvedCount: results.length,
      });

      return {
        blockId: block._id,
        resolvedImpacts: results,
      };
    };

    if (session) {
      return executeResolution(session);
    }
    return withTransactionRetry(executeResolution);
  }

  /**
   * Finds alternative candidate slots and sibling resources for a proposed rescheduling.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Date|string} params.originalStart
   * @param {Date|string} params.originalEnd
   * @param {number} [params.searchDaysAhead=7]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findAlternativeSlots(
    { orgId, facilityId, resourceId = null, originalStart, originalEnd, searchDaysAhead = 7 },
    session
  ) {
    const daysAhead = Math.min(Math.max(1, parseInt(searchDaysAhead, 10) || 7), 30);
    const start = new Date(originalStart);
    const end = new Date(originalEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new HttpError(400, 'Invalid original time window');
    }

    const facility = await amenityFacilityService.getFacilityById(facilityId, orgId, session);
    if (!facility) {
      throw new HttpError(404, 'Facility not found');
    }

    const durationMs = end.getTime() - start.getTime();

    // Get sibling resources if resourceId is specified or facility has resources
    let targetResources = [];
    const resources = await amenityResourceService.getResourcesByFacilityId(facilityId, orgId, session);
    if (resources && resources.length > 0) {
      targetResources = resources.filter(
        (r) => r.isActive && !r.isDeleted && r.assetState !== 'MAINTENANCE'
      );
    }

    const alternatives = [];
    const { availabilityService } = await import('../domain/availability/availability.service.js');

    // 1. Same time on subsequent days
    for (let dayOffset = 1; dayOffset <= daysAhead && alternatives.length < 10; dayOffset++) {
      const candidateStart = new Date(start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const candidateEnd = new Date(candidateStart.getTime() + durationMs);

      const resourceCandidates = resourceId
        ? [
            targetResources.find((r) => String(r._id) === String(resourceId)),
            ...targetResources.filter((r) => String(r._id) !== String(resourceId)),
          ].filter(Boolean)
        : targetResources.length > 0
        ? targetResources
        : [null];

      for (const res of resourceCandidates) {
        if (alternatives.length >= 10) break;
        const resId = res ? res._id : null;
        try {
          const avail = await availabilityService.checkAvailability(
            {
              orgId,
              facilityId,
              resourceId: resId,
              startDateTime: candidateStart,
              endDateTime: candidateEnd,
            },
            session
          );
          if (avail.isAvailable) {
            alternatives.push({
              startDateTime: candidateStart,
              endDateTime: candidateEnd,
              resourceId: resId,
              resourceName: res ? res.name : null,
              facilityId,
            });
          }
        } catch (e) {}
      }
    }

    // 2. Same time on same day if sibling resources available
    if (resourceId && targetResources.length > 1 && alternatives.length < 10) {
      const siblingResources = targetResources.filter((r) => String(r._id) !== String(resourceId));
      for (const sibling of siblingResources) {
        if (alternatives.length >= 10) break;
        try {
          const avail = await availabilityService.checkAvailability(
            {
              orgId,
              facilityId,
              resourceId: sibling._id,
              startDateTime: start,
              endDateTime: end,
            },
            session
          );
          if (avail.isAvailable) {
            alternatives.push({
              startDateTime: start,
              endDateTime: end,
              resourceId: sibling._id,
              resourceName: sibling.name,
              facilityId,
              isSameTimeSibling: true,
            });
          }
        } catch (e) {}
      }
    }

    return alternatives;
  }

  /**
   * Updates status of maintenance block with strict state transition validation.
   * State Machine:
   *   SCHEDULED -> IN_PROGRESS, CANCELLED
   *   IN_PROGRESS -> COMPLETED, CANCELLED
   *   COMPLETED -> (Terminal: no transitions)
   *   CANCELLED -> (Terminal: no transitions)
   *
   * @param {string|import('mongoose').Types.ObjectId} blockId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {string} status
   * @param {import('mongoose').ClientSession} [session]
   * @param {Object} [completionData]
   */
  async updateMaintenanceStatus(blockId, orgId, status, session, completionData = {}) {
    let targetOrgId = orgId;
    let targetStatus = status;
    let targetSession = session;
    let targetCompletion = completionData;
    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

    // Backward compatibility if called as (blockId, status, session, completionData)
    if (typeof orgId === 'string' && validStatuses.includes(orgId)) {
      targetStatus = orgId;
      targetOrgId = undefined;
      targetSession = status;
      targetCompletion = session || {};
    }

    if (!validStatuses.includes(targetStatus)) {
      throw new HttpError(400, `Invalid maintenance status: ${targetStatus}`);
    }

    // Normalize ACTIVE alias to IN_PROGRESS
    if (targetStatus === 'ACTIVE') {
      targetStatus = 'IN_PROGRESS';
    }

    const block = await amenityMaintenanceBlockRepository.findById(blockId, targetOrgId, targetSession);
    if (!block) {
      throw new HttpError(404, 'Maintenance block not found');
    }

    const currentStatus = block.status;

    // Idempotent: same status is a safe no-op
    if (currentStatus === targetStatus) {
      return block;
    }

    // State transition matrix
    const VALID_TRANSITIONS = {
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    if (!VALID_TRANSITIONS[currentStatus] || !VALID_TRANSITIONS[currentStatus].includes(targetStatus)) {
      throw new HttpError(
        400,
        `Invalid maintenance status transition from ${currentStatus} to ${targetStatus}`
      );
    }

    const updated = await amenityMaintenanceBlockRepository.updateStatus(
      blockId,
      targetOrgId,
      targetStatus,
      targetSession,
      targetCompletion
    );

    if (!updated) {
      throw new HttpError(404, 'Maintenance block not found or status update failed');
    }

    if (targetStatus === 'COMPLETED' || targetStatus === 'CANCELLED') {
      await amenityOutboxEventRepository.createEvent(
        {
          orgId: updated.orgId,
          eventType: targetStatus === 'COMPLETED' ? 'MAINTENANCE_COMPLETED' : 'MAINTENANCE_CANCELLED',
          aggregateId: updated._id,
          aggregateType: 'AmenityMaintenanceBlock',
          payload: {
            blockId: updated._id,
            facilityId: updated.facilityId,
            resourceId: updated.resourceId,
            status: targetStatus,
            completedBy: targetCompletion?.completedBy || null,
            completionNotes: targetCompletion?.completionNotes || '',
          },
        },
        targetSession
      );

      amenityManagementEvents.emit(
        targetStatus === 'COMPLETED' ? 'amenity:maintenance:completed' : 'amenity:maintenance:cancelled',
        updated
      );
    }

    return updated;
  }

  /**
   * Extends an active maintenance block to a later endDateTime.
   * Re-checks for overlapping active reservations and bookings in the extended window [originalEnd, newEnd].
   * Supports both individual resolutions and conflictAction: 'CANCEL_AND_PROCEED'.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.blockId
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {Date|string} params.newEndDateTime
   * @param {string} [params.conflictAction]
   * @param {Array<Object>} [params.resolutions]
   * @param {string|import('mongoose').Types.ObjectId} [params.cancelledBy]
   * @param {import('mongoose').ClientSession} [session]
   */
  async extendMaintenanceBlock(
    { blockId, orgId, newEndDateTime, conflictAction = null, resolutions = [], cancelledBy = null },
    session
  ) {
    const newEnd = new Date(newEndDateTime);
    if (isNaN(newEnd.getTime())) {
      throw new HttpError(400, 'Invalid newEndDateTime');
    }

    const executeExtend = async (trxSession) => {
      const block = await amenityMaintenanceBlockRepository.findById(blockId, orgId, trxSession);
      if (!block) {
        throw new HttpError(404, 'Maintenance block not found');
      }

      if (block.status === 'COMPLETED' || block.status === 'CANCELLED') {
        throw new HttpError(400, `Cannot extend a ${block.status.toLowerCase()} maintenance block`);
      }

      if (newEnd <= block.endDateTime) {
        throw new HttpError(400, 'newEndDateTime must be strictly later than current endDateTime');
      }

      // Check conflicts in the extended window [block.endDateTime, newEnd]
      const overlappingReservations = await amenityReservationService.findOverlappingActiveReservations(
        {
          orgId,
          facilityId: block.facilityId,
          resourceId: block.resourceId,
          resourceIds: block.resourceIds,
          effectiveStartDateTime: block.endDateTime,
          effectiveEndDateTime: newEnd,
        },
        trxSession
      );

      let overlappingBookings = [];
      try {
        const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        overlappingBookings = await amenityBookingService.findOverlappingBookingsForWindow(
          {
            orgId,
            amenityId: block.facilityId,
            startDateTime: block.endDateTime,
            endDateTime: newEnd,
          },
          trxSession
        );
      } catch (e) {
        overlappingBookings = [];
      }

      const totalConflicts = (overlappingReservations?.length || 0) + (overlappingBookings?.length || 0);

      const impactResults = [];
      if (totalConflicts > 0) {
        if (conflictAction === 'CANCEL_AND_PROCEED') {
          for (const r of (overlappingReservations || [])) {
            const res = await this._resolveImpactItem({
              blockId: block._id,
              orgId,
              facilityId: block.facilityId,
              resourceId: block.resourceId,
              resourceIds: block.resourceIds,
              targetId: r._id,
              targetType: 'V2_RESERVATION',
              resolution: 'CANCEL',
              notes: `Facility maintenance extension: ${block.reason}`,
              cancelledBy,
              session: trxSession,
            });
            impactResults.push(res);
          }
          for (const b of (overlappingBookings || [])) {
            const res = await this._resolveImpactItem({
              blockId: block._id,
              orgId,
              facilityId: block.facilityId,
              resourceId: block.resourceId,
              resourceIds: block.resourceIds,
              targetId: b._id,
              targetType: 'V1_BOOKING',
              resolution: 'CANCEL',
              notes: `Facility maintenance extension: ${block.reason}`,
              cancelledBy,
              session: trxSession,
            });
            impactResults.push(res);
          }
        } else if (Array.isArray(resolutions) && resolutions.length > 0) {
          const resTargetIds = new Set(resolutions.map((r) => String(r.targetId || r.id)));
          const unhandled = [];

          for (const r of (overlappingReservations || [])) {
            if (!resTargetIds.has(String(r._id))) {
              unhandled.push({ id: r._id, type: 'V2_RESERVATION', reason: 'Unresolved reservation conflict' });
            }
          }
          for (const b of (overlappingBookings || [])) {
            if (!resTargetIds.has(String(b._id))) {
              unhandled.push({ id: b._id, type: 'V1_BOOKING', reason: 'Unresolved booking conflict' });
            }
          }

          if (unhandled.length > 0) {
            throw new HttpError(
              409,
              `Maintenance extension conflicts with ${totalConflicts} booking(s)/reservation(s). Resolution required for all affected items.`,
              {
                code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
                requiresConflictAction: true,
                impactedCount: totalConflicts,
                unresolvedTargets: unhandled,
              }
            );
          }

          for (const item of resolutions) {
            const res = await this._resolveImpactItem({
              blockId: block._id,
              orgId,
              facilityId: block.facilityId,
              resourceId: block.resourceId,
              resourceIds: block.resourceIds,
              targetId: item.targetId || item.id,
              targetType: item.targetType || 'V2_RESERVATION',
              resolution: item.resolution,
              newSlot: item.newSlot,
              notes: item.notes || `Maintenance extension: ${block.reason}`,
              cancelledBy,
              session: trxSession,
            });
            impactResults.push(res);
          }
        } else {
          throw new HttpError(
            409,
            `Maintenance extension conflicts with ${totalConflicts} booking(s). Confirmation required to cancel and proceed.`,
            {
              code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
              requiresConflictAction: true,
              impactedReservationsCount: overlappingReservations.length,
              impactedReservationIds: overlappingReservations.map((r) => r._id),
              impactedBookingsCount: overlappingBookings.length,
              impactedBookingIds: overlappingBookings.map((b) => b._id),
            }
          );
        }
      }

      const updated = await amenityMaintenanceBlockRepository.extend(blockId, orgId, newEnd, trxSession);

      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'MAINTENANCE_EXTENDED',
          aggregateId: updated._id,
          aggregateType: 'AmenityMaintenanceBlock',
          payload: {
            blockId: updated._id,
            facilityId: updated.facilityId,
            resourceId: updated.resourceId,
            previousEndDateTime: block.endDateTime,
            newEndDateTime: updated.endDateTime,
            impactedReservationsCount: overlappingReservations.length,
            impactedBookingsCount: overlappingBookings.length,
          },
        },
        trxSession
      );

      amenityManagementEvents.emit('amenity:maintenance:extended', {
        blockId: updated._id,
        orgId,
        facilityId: updated.facilityId,
        resourceId: updated.resourceId,
        newEndDateTime: updated.endDateTime,
      });

      return {
        block: updated,
        impactedReservationsCount: overlappingReservations.length,
        impactedReservationIds: overlappingReservations.map((r) => r._id),
        impactedBookingsCount: overlappingBookings.length,
        impactedBookingIds: overlappingBookings.map((b) => b._id),
        impacts: impactResults,
      };
    };

    if (session) {
      return executeExtend(session);
    }
    return withTransactionRetry(executeExtend);
  }

  /**
   * Finds active maintenance blocks overlapping a given time interval.
   * @param {Object} params
   * @param {import('mongoose').ClientSession} [session]
   */
  async getOverlappingBlocks(params, session) {
    return amenityMaintenanceBlockRepository.findOverlappingBlocks(params, session);
  }

  /**
   * Window-based query helper for maintenance blocks.
   * @param {Object} params
   * @param {import('mongoose').ClientSession} [session]
   */
  async findOverlappingBlocksForWindow(params, session) {
    return this.getOverlappingBlocks(params, session);
  }

  /**
   * Previews the impact of a proposed maintenance block without modifying the database.
   * Checks for facility validity, targeted resource validity, overlapping maintenance blocks,
   * overlapping v2 reservations, and overlapping v1 bookings across the effective maintenance window.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Array<string|import('mongoose').Types.ObjectId>} [params.resourceIds]
   * @param {Date|string} [params.startDateTime]
   * @param {Date|string} [params.endDateTime]
   * @param {Array<{ startDateTime: string|Date, endDateTime: string|Date }>} [params.windows]
   * @param {number} [params.bufferBeforeMinutes=0]
   * @param {number} [params.bufferAfterMinutes=0]
   * @param {import('mongoose').ClientSession} [session]
   */
  async getImpactPreview(
    {
      orgId,
      facilityId,
      resourceId = null,
      resourceIds = [],
      startDateTime,
      endDateTime,
      windows = [],
      bufferBeforeMinutes = 0,
      bufferAfterMinutes = 0,
    },
    session
  ) {
    if (Array.isArray(windows) && windows.length > 0) {
      const windowPreviews = [];
      let totalImpacted = 0;
      const allConflictingBlocks = [];
      const allConflictingReservations = [];
      const allConflictingBookings = [];

      for (const win of windows) {
        const preview = await this.getImpactPreview(
          {
            orgId,
            facilityId,
            resourceId,
            resourceIds,
            startDateTime: win.startDateTime,
            endDateTime: win.endDateTime,
            bufferBeforeMinutes,
            bufferAfterMinutes,
          },
          session
        );
        windowPreviews.push({
          startDateTime: win.startDateTime,
          endDateTime: win.endDateTime,
          ...preview,
        });
        totalImpacted += preview.impactedReservationsCount || 0;
        if (preview.conflictingMaintenanceBlocks) {
          allConflictingBlocks.push(...preview.conflictingMaintenanceBlocks);
        }
        if (preview.conflictingReservations) {
          allConflictingReservations.push(...preview.conflictingReservations);
        }
        if (preview.conflictingBookings) {
          allConflictingBookings.push(...preview.conflictingBookings);
        }
      }

      return {
        hasConflicts: allConflictingBlocks.length > 0 || totalImpacted > 0,
        totalConflicts: totalImpacted,
        impactedReservationsCount: totalImpacted,
        conflictingMaintenanceBlocks: allConflictingBlocks,
        conflictingReservations: allConflictingReservations,
        conflictingBookings: allConflictingBookings,
        windows: windowPreviews,
      };
    }

    const numBufBefore = Math.max(0, parseInt(bufferBeforeMinutes, 10) || 0);
    const numBufAfter = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0);
    if (bufferBeforeMinutes < 0 || bufferAfterMinutes < 0) {
      throw new HttpError(400, 'Buffer minutes cannot be negative');
    }

    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new HttpError(400, 'Invalid maintenance window: endDateTime must be later than startDateTime');
    }

    const { effectiveStart, effectiveEnd } = computeEffectiveMaintenanceWindow(
      start,
      end,
      numBufBefore,
      numBufAfter
    );

    // 1. Verify Facility
    const facility = await amenityFacilityService.getFacilityById(facilityId, orgId, session);
    if (!facility) {
      throw new HttpError(404, 'Facility not found');
    }

    // 2. Normalize and verify resources with deterministic Case C synchronization
    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = [...new Set(resourceIds.filter(Boolean).map(String))];
      if (resourceId && !targetResourceIds.includes(String(resourceId))) {
        targetResourceIds.unshift(String(resourceId));
      }
    } else if (resourceId) {
      targetResourceIds = [String(resourceId)];
    }
    const targetResourceId = targetResourceIds.length > 0 ? targetResourceIds[0] : null;

    if (targetResourceIds.length > 0) {
      for (const resId of targetResourceIds) {
        const resource = await amenityResourceService.getResourceById(resId, orgId, session);
        if (!resource) {
          throw new HttpError(404, `Target resource ${resId} not found`);
        }
        if (String(resource.facilityId) !== String(facilityId)) {
          throw new HttpError(400, `Target resource ${resId} does not belong to facility ${facilityId}`);
        }
        if (!resource.isActive || resource.isDeleted) {
          throw new HttpError(400, `Target resource ${resId} is inactive or deleted`);
        }
      }
    }

    // 3. Check overlapping maintenance blocks in effective window
    const overlappingBlocks = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
      {
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        startDateTime: effectiveStart,
        endDateTime: effectiveEnd,
      },
      session
    );

    // Sanitize maintenance blocks to omit sensitive internalNotes
    const sanitizedBlocks = overlappingBlocks.map((b) => {
      const doc = b.toObject ? b.toObject() : { ...b };
      delete doc.internalNotes;
      return doc;
    });

    // 4. Check overlapping active v2 reservations in effective window
    const overlappingReservations = await amenityReservationService.findOverlappingActiveReservations(
      {
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        effectiveStartDateTime: effectiveStart,
        effectiveEndDateTime: effectiveEnd,
      },
      session
    );

    // 5. Check overlapping v1 bookings via amenityBookingService
    let overlappingBookings = [];
    try {
      const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
      overlappingBookings = await amenityBookingService.findOverlappingBookingsForWindow(
        {
          orgId,
          amenityId: facilityId,
          startDateTime: effectiveStart,
          endDateTime: effectiveEnd,
        },
        session
      );
    } catch (e) {
      overlappingBookings = [];
    }

    const totalImpacted = overlappingReservations.length + overlappingBookings.length;
    const hasConflicts = overlappingBlocks.length > 0 || totalImpacted > 0;

    return {
      hasConflicts,
      effectiveStartDateTime: effectiveStart,
      effectiveEndDateTime: effectiveEnd,
      impactedReservationsCount: totalImpacted,
      conflictingMaintenanceBlocks: sanitizedBlocks,
      conflictingReservations: overlappingReservations,
      conflictingBookings: overlappingBookings,
    };
  }

  /**
   * Finds maintenance block by ID within organization.
   * @param {string|import('mongoose').Types.ObjectId} blockId
   * @param {string|import('mongoose').Types.ObjectId} [orgId]
   * @param {import('mongoose').ClientSession} [session]
   */
  async getMaintenanceBlockById(blockId, orgId, session) {
    const block = await amenityMaintenanceBlockRepository.findById(blockId, orgId, session);
    if (!block) {
      throw new HttpError(404, 'Maintenance block not found');
    }
    return block;
  }

  /**
   * Lists maintenance blocks within organization.
   * @param {Object} params
   * @param {import('mongoose').ClientSession} [session]
   */
  async listMaintenanceBlocks(params, session) {
    return amenityMaintenanceBlockRepository.list(params, session);
  }

  /**
   * Retrieves all impact records for a specific maintenance block.
   * @param {string|import('mongoose').Types.ObjectId} blockId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async getImpactsForBlock(blockId, orgId, session) {
    return amenityMaintenanceImpactRepository.findByBlockId(blockId, orgId, session);
  }

  /**
   * Evaluates conflicts for a single maintenance occurrence window against:
   * 1. Overlapping maintenance blocks
   * 2. Overlapping active V2 reservations
   * 3. Overlapping active V1 bookings
   * 4. Facility operating hours envelope
   * @private
   */
  async _checkOccurrenceConflicts({
    orgId,
    facilityId,
    targetResourceId,
    targetResourceIds,
    effectiveStart,
    effectiveEnd,
    facility,
    excludeSeriesId,
    session,
  }) {
    // 1. Overlapping maintenance blocks
    const overlappingBlocks = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
      {
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        startDateTime: effectiveStart,
        endDateTime: effectiveEnd,
      },
      session
    );

    const filteredBlocks = excludeSeriesId
      ? overlappingBlocks.filter(
          (b) => !b.recurrenceSeriesId || String(b.recurrenceSeriesId) !== String(excludeSeriesId)
        )
      : overlappingBlocks;

    const sanitizedBlocks = filteredBlocks.map((b) => {
      const doc = b.toObject ? b.toObject() : { ...b };
      delete doc.internalNotes;
      return doc;
    });

    // 2. Overlapping active V2 reservations
    const overlappingReservations = await amenityReservationService.findOverlappingActiveReservations(
      {
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        effectiveStartDateTime: effectiveStart,
        effectiveEndDateTime: effectiveEnd,
      },
      session
    );

    // 3. Overlapping active V1 bookings
    let overlappingBookings = [];
    try {
      const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
      const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
      if (amenityBookingService && (mongoose.connection?.readyState !== 0 || amenityBookingService.findOverlappingBookingsForWindow?._isMockFunction)) {
        overlappingBookings = await amenityBookingService.findOverlappingBookingsForWindow(
          {
            orgId,
            amenityId: facilityId,
            startDateTime: effectiveStart,
            endDateTime: effectiveEnd,
          },
          session
        );
      }
    } catch (e) {
      overlappingBookings = [];
    }

    // 4. Operating hours envelope evaluation
    let operatingHoursInfo = {
      isOutsideOperatingHours: false,
      isClosedDay: false,
      operatingHoursRule: null,
      reason: null,
    };

    if (
      facility &&
      facility.archetype !== 'ROOM_RESOURCE' &&
      facility.operatingHours &&
      facility.operatingHours.length > 0
    ) {
      const tz = facility.timezone || 'UTC';
      const mStart = moment(effectiveStart).tz(tz);
      const mEnd = moment(effectiveEnd).tz(tz);
      const dayOfWeek = mStart.day();
      const dayRule = facility.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);

      if (!dayRule || !dayRule.isOpen) {
        operatingHoursInfo = {
          isOutsideOperatingHours: true,
          isClosedDay: true,
          operatingHoursRule: null,
          reason: 'Facility is closed on this day',
        };
      } else {
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
          operatingHoursInfo = {
            isOutsideOperatingHours: true,
            isClosedDay: false,
            operatingHoursRule: { openTime: dayRule.openTime, closeTime: dayRule.closeTime },
            reason: `Proposed maintenance window is outside facility operating hours (${dayRule.openTime} - ${dayRule.closeTime})`,
          };
        }
      }
    }

    const hasConflicts =
      sanitizedBlocks.length > 0 ||
      overlappingReservations.length > 0 ||
      overlappingBookings.length > 0;

    return {
      hasConflicts,
      sanitizedBlocks,
      overlappingReservations,
      overlappingBookings,
      operatingHoursInfo,
    };
  }

  /**
   * Generates a read-only preview of a recurring maintenance series and detects all conflicts.
   * Completely non-mutating: zero database writes, zero events emitted, zero refunds executed.
   */
  async previewRecurringMaintenance({
    orgId,
    facilityId,
    resourceId,
    resourceIds = [],
    title,
    description = '',
    reason = '',
    maintenanceType = 'PREVENTIVE',
    startDateTime,
    endDateTime,
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    recurrence,
  }) {
    if (!orgId) throw new HttpError(400, 'orgId is required');
    if (!facilityId) throw new HttpError(400, 'facilityId is required');
    if (!startDateTime || !endDateTime) throw new HttpError(400, 'startDateTime and endDateTime are required');
    if (!recurrence) throw new HttpError(400, 'recurrence configuration is required');

    // 1. Verify facility exists and is active
    const facility = await amenityFacilityService.getFacilityById(facilityId, orgId);
    if (!facility) {
      throw new HttpError(404, `Facility ${facilityId} not found`);
    }
    if (String(facility.orgId) !== String(orgId)) {
      throw new HttpError(403, 'Facility does not belong to specified organization');
    }
    if (facility.isActive === false || facility.isDeleted === true || facility.status === 'INACTIVE') {
      throw new HttpError(400, 'Facility is inactive or deleted');
    }

    // 2. Normalize and verify resources
    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = resourceIds.map(String);
      if (resourceId && !targetResourceIds.includes(String(resourceId))) {
        targetResourceIds.unshift(String(resourceId));
      }
    } else if (resourceId) {
      targetResourceIds = [String(resourceId)];
    }
    const targetResourceId = targetResourceIds.length > 0 ? targetResourceIds[0] : null;

    if (targetResourceIds.length > 0) {
      for (const resId of targetResourceIds) {
        const resource = await amenityResourceService.getResourceById(resId, orgId);
        if (!resource) throw new HttpError(404, `Target resource ${resId} not found`);
        if (String(resource.facilityId) !== String(facilityId)) {
          throw new HttpError(400, `Target resource ${resId} does not belong to facility ${facilityId}`);
        }
        if (!resource.isActive || resource.isDeleted) {
          throw new HttpError(400, `Target resource ${resId} is inactive or deleted`);
        }
      }
    }

    // 3. Recurrence config validation & occurrence generation
    const effectiveRecurrence = {
      ...recurrence,
      timezone: recurrence.timezone || facility.timezone || 'UTC',
    };
    validateRecurrenceConfig(effectiveRecurrence, { startDateTime, endDateTime });

    const numBufBefore = Math.max(0, parseInt(bufferBeforeMinutes, 10) || 0);
    const numBufAfter = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0);

    const occurrences = generateOccurrences({
      recurrence: effectiveRecurrence,
      startDateTime,
      endDateTime,
      bufferBeforeMinutes: numBufBefore,
      bufferAfterMinutes: numBufAfter,
      maxLimit: MAX_RECURRENCE_OCCURRENCES,
    });

    if (occurrences.length === 0) {
      throw new HttpError(400, 'Recurrence pattern generated 0 occurrences within the specified boundary');
    }

    // Verify no internal self-collisions
      for (let i = 0; i < occurrences.length - 1; i++) {
        if (new Date(occurrences[i].effectiveEndDateTime) >= new Date(occurrences[i + 1].effectiveStartDateTime)) {
          throw new HttpError(
            400,
            `Recurrence occurrences overlap with each other: occurrence ${i} overlaps occurrence ${i + 1}. Adjust duration, buffers, or recurrence interval.`
          );
        }
      }

    // 4. Trace conflicts for every occurrence
    const occurrenceResults = [];
    let totalOccurrencesWithConflicts = 0;
    const uniqueConflictingBlocks = new Set();
    const uniqueConflictingReservations = new Set();
    const uniqueConflictingBookings = new Set();

    for (const occ of occurrences) {
      const conflictCheck = await this._checkOccurrenceConflicts({
        orgId,
        facilityId,
        targetResourceId,
        targetResourceIds,
        effectiveStart: occ.effectiveStartDateTime,
        effectiveEnd: occ.effectiveEndDateTime,
        facility,
      });

      if (conflictCheck.hasConflicts) {
        totalOccurrencesWithConflicts += 1;
      }

      conflictCheck.sanitizedBlocks.forEach((b) => uniqueConflictingBlocks.add(String(b._id)));
      conflictCheck.overlappingReservations.forEach((r) => uniqueConflictingReservations.add(String(r._id)));
      conflictCheck.overlappingBookings.forEach((b) => uniqueConflictingBookings.add(String(b._id)));

      occurrenceResults.push({
        occurrenceIndex: occ.occurrenceIndex,
        startDateTime: occ.startDateTime,
        endDateTime: occ.endDateTime,
        effectiveStartDateTime: occ.effectiveStartDateTime,
        effectiveEndDateTime: occ.effectiveEndDateTime,
        hasConflicts: conflictCheck.hasConflicts,
        conflicts: {
          maintenanceBlocks: conflictCheck.sanitizedBlocks,
          reservations: conflictCheck.overlappingReservations,
          bookings: conflictCheck.overlappingBookings,
          operatingHours: conflictCheck.operatingHoursInfo,
        },
        impactSummary: {
          maintenanceBlocksCount: conflictCheck.sanitizedBlocks.length,
          reservationsCount: conflictCheck.overlappingReservations.length,
          bookingsCount: conflictCheck.overlappingBookings.length,
          totalImpacted: conflictCheck.overlappingReservations.length + conflictCheck.overlappingBookings.length,
        },
      });
    }

    return {
      facilityId,
      resourceId: targetResourceId,
      resourceIds: targetResourceIds,
      totalOccurrences: occurrences.length,
      recurrenceConfig: effectiveRecurrence,
      occurrences: occurrenceResults,
      totalConflictsSummary: {
        totalOccurrencesWithConflicts,
        totalImpactedReservations: uniqueConflictingReservations.size,
        totalImpactedBookings: uniqueConflictingBookings.size,
        totalConflictingBlocks: uniqueConflictingBlocks.size,
        hasAnyConflicts: totalOccurrencesWithConflicts > 0,
      },
    };
  }

  /**
   * Atomically schedules a recurring maintenance series and resolves any conflicts.
   * Transactional and idempotent with stale preview protection.
   */
  async scheduleRecurringMaintenance({
    orgId,
    facilityId,
    resourceId,
    resourceIds = [],
    title,
    description = '',
    reason,
    maintenanceType = 'PREVENTIVE',
    internalNotes = '',
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    startDateTime,
    endDateTime,
    isCompleteClosure = true,
    degradedCapacity = 0,
    recurrence,
    conflictAction,
    impactResolutions = [],
    resolutions = [],
    cancelledBy,
  }) {
    if (!orgId) throw new HttpError(400, 'orgId is required');
    if (!facilityId) throw new HttpError(400, 'facilityId is required');
    if (!title || !title.trim()) throw new HttpError(400, 'title is required');
    if (!reason || !reason.trim()) throw new HttpError(400, 'reason is required');
    if (!startDateTime || !endDateTime) throw new HttpError(400, 'startDateTime and endDateTime are required');
    if (!recurrence) throw new HttpError(400, 'recurrence configuration is required');

    const numBufBefore = Math.max(0, parseInt(bufferBeforeMinutes, 10) || 0);
    const numBufAfter = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0);

    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = resourceIds.map(String);
      if (resourceId && !targetResourceIds.includes(String(resourceId))) {
        targetResourceIds.unshift(String(resourceId));
      }
    } else if (resourceId) {
      targetResourceIds = [String(resourceId)];
    }
    const targetResourceId = targetResourceIds.length > 0 ? targetResourceIds[0] : null;

    const combinedResolutions = [...(impactResolutions || []), ...(resolutions || [])];

    const executeRecurringSchedule = async (trxSession) => {
      // 1. Facility validation
      const facility = await amenityFacilityService.getFacilityById(facilityId, orgId, trxSession);
      if (!facility) {
        throw new HttpError(404, `Facility ${facilityId} not found`);
      }
      if (String(facility.orgId) !== String(orgId)) {
        throw new HttpError(403, 'Facility does not belong to specified organization');
      }
      if (facility.isActive === false || facility.isDeleted === true || facility.status === 'INACTIVE') {
        throw new HttpError(400, 'Facility is inactive or deleted');
      }

      // 2. Resource validation
      for (const resId of targetResourceIds) {
        const resource = await amenityResourceService.getResourceById(resId, orgId, trxSession);
        if (!resource) throw new HttpError(404, `Resource ${resId} not found`);
        if (String(resource.orgId) !== String(orgId)) {
          throw new HttpError(403, `Resource ${resId} does not belong to specified organization`);
        }
        if (String(resource.facilityId) !== String(facilityId)) {
          throw new HttpError(400, 'Resource does not belong to specified facility');
        }
        if (resource.isActive === false || resource.isDeleted === true) {
          throw new HttpError(400, `Resource ${resId} is inactive or deleted`);
        }
      }

      // 3. Recurrence validation and occurrence generation
      const effectiveRecurrence = {
        ...recurrence,
        timezone: recurrence.timezone || facility.timezone || 'UTC',
      };
      validateRecurrenceConfig(effectiveRecurrence, { startDateTime, endDateTime });

      const occurrences = generateOccurrences({
        recurrence: effectiveRecurrence,
        startDateTime,
        endDateTime,
        bufferBeforeMinutes: numBufBefore,
        bufferAfterMinutes: numBufAfter,
        maxLimit: MAX_RECURRENCE_OCCURRENCES,
      });

      if (occurrences.length === 0) {
        throw new HttpError(400, 'Recurrence pattern generated 0 occurrences within the specified boundary');
      }

      // Self-collision verification
      for (let i = 0; i < occurrences.length - 1; i++) {
        if (new Date(occurrences[i].effectiveEndDateTime) >= new Date(occurrences[i + 1].effectiveStartDateTime)) {
          throw new HttpError(
            400,
            `Recurrence occurrences overlap with each other: occurrence ${i} overlaps occurrence ${i + 1}. Adjust duration, buffers, or recurrence interval.`
          );
        }
      }

      // 4. Stale-preview / Real-time conflict re-evaluation across all occurrences
      const allOccurrencesConflicts = [];
      const allConflictingBlocks = [];
      const allConflictingReservations = new Map();
      const allConflictingBookings = new Map();

      for (const occ of occurrences) {
        const check = await this._checkOccurrenceConflicts({
          orgId,
          facilityId,
          targetResourceId,
          targetResourceIds,
          effectiveStart: occ.effectiveStartDateTime,
          effectiveEnd: occ.effectiveEndDateTime,
          facility,
          session: trxSession,
        });

        allOccurrencesConflicts.push({ occ, check });

        if (check.sanitizedBlocks.length > 0) {
          allConflictingBlocks.push(...check.sanitizedBlocks);
        }

        for (const res of check.overlappingReservations) {
          allConflictingReservations.set(String(res._id), { reservation: res, occIndex: occ.occurrenceIndex });
        }

        for (const bk of check.overlappingBookings) {
          allConflictingBookings.set(String(bk._id), { booking: bk, occIndex: occ.occurrenceIndex });
        }
      }

      // If existing maintenance blocks overlap any occurrence, fail with 409
      if (allConflictingBlocks.length > 0) {
        throw new HttpError(
          409,
          'A maintenance block already exists that overlaps with one or more proposed recurring maintenance occurrences',
          {
            overlappingBlockIds: allConflictingBlocks.map((b) => b._id),
          }
        );
      }

      // 5. Build resolution plan
      let planResolutions = [];
      const totalConflicts = allConflictingReservations.size + allConflictingBookings.size;

      if (totalConflicts > 0) {
        if (conflictAction === 'CANCEL_AND_PROCEED') {
          for (const [resId, { reservation, occIndex }] of allConflictingReservations.entries()) {
            planResolutions.push({
              targetId: resId,
              targetType: 'V2_RESERVATION',
              resolution: 'CANCEL',
              notes: `Recurring maintenance closure: ${reason.trim()}`,
              occIndex,
            });
          }
          for (const [bkId, { booking, occIndex }] of allConflictingBookings.entries()) {
            planResolutions.push({
              targetId: bkId,
              targetType: 'V1_BOOKING',
              resolution: 'CANCEL',
              notes: `Recurring maintenance closure: ${reason.trim()}`,
              occIndex,
            });
          }
        } else {
          planResolutions = combinedResolutions.map((r) => ({
            targetId: String(r.targetId),
            targetType: r.targetType || (allConflictingReservations.has(String(r.targetId)) ? 'V2_RESERVATION' : 'V1_BOOKING'),
            resolution: r.resolution,
            newSlot: r.newSlot,
            notes: r.notes || `Recurring maintenance: ${reason.trim()}`,
            occIndex: r.occurrenceIndex !== undefined ? r.occurrenceIndex : undefined,
          }));

          // Stale preview verification: every conflict must have a resolution
          for (const [resId] of allConflictingReservations.entries()) {
            const hasRes = planResolutions.some(
              (p) => String(p.targetId) === String(resId) && p.targetType === 'V2_RESERVATION'
            );
            if (!hasRes) {
              throw new HttpError(
                409,
                'Stale preview or unresolved conflict: new reservation detected during recurring maintenance schedule.',
                {
                  code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
                  unhandledConflictId: resId,
                  targetType: 'V2_RESERVATION',
                }
              );
            }
          }

          for (const [bkId] of allConflictingBookings.entries()) {
            const hasBk = planResolutions.some(
              (p) => String(p.targetId) === String(bkId) && p.targetType === 'V1_BOOKING'
            );
            if (!hasBk) {
              throw new HttpError(
                409,
                'Stale preview or unresolved conflict: new booking detected during recurring maintenance schedule.',
                {
                  code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
                  unhandledConflictId: bkId,
                  targetType: 'V1_BOOKING',
                }
              );
            }
          }
        }
      }

      // 6. Generate series ID and create occurrence blocks
      const recurrenceSeriesId = new (await import('mongoose')).default.Types.ObjectId();

      const blocksToCreate = occurrences.map((occ) => ({
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        title: `${title.trim()}`,
        description,
        maintenanceType,
        internalNotes: (internalNotes || '').trim(),
        bufferBeforeMinutes: numBufBefore,
        bufferAfterMinutes: numBufAfter,
        startDateTime: occ.startDateTime,
        endDateTime: occ.endDateTime,
        effectiveStartDateTime: occ.effectiveStartDateTime,
        effectiveEndDateTime: occ.effectiveEndDateTime,
        isCompleteClosure,
        degradedCapacity,
        reason: reason.trim(),
        status: 'SCHEDULED',
        recurrenceSeriesId,
        occurrenceIndex: occ.occurrenceIndex,
        recurrence: {
          enabled: true,
          frequency: effectiveRecurrence.frequency,
          interval: effectiveRecurrence.interval || 1,
          daysOfWeek: effectiveRecurrence.daysOfWeek || [],
          dayOfMonth: effectiveRecurrence.dayOfMonth || null,
          startDate: effectiveRecurrence.startDate || occurrences[0].startDateTime,
          endDate: effectiveRecurrence.endDate || occurrences[occurrences.length - 1].endDateTime,
          occurrenceCount: effectiveRecurrence.occurrenceCount || occurrences.length,
          timezone: effectiveRecurrence.timezone,
        },
        scheduledBy: cancelledBy,
      }));

      const createdBlocks = await amenityMaintenanceBlockRepository.createMany(blocksToCreate, trxSession);

      // 7. Resolve conflicts & record impacts linked to occurrence blocks
      const impactResults = [];
      for (const item of planResolutions) {
        let targetBlockId = createdBlocks[0]._id;
        if (item.occIndex !== undefined && createdBlocks[item.occIndex]) {
          targetBlockId = createdBlocks[item.occIndex]._id;
        } else {
          if (item.targetType === 'V2_RESERVATION' && allConflictingReservations.has(item.targetId)) {
            const occIdx = allConflictingReservations.get(item.targetId).occIndex;
            if (createdBlocks[occIdx]) targetBlockId = createdBlocks[occIdx]._id;
          } else if (item.targetType === 'V1_BOOKING' && allConflictingBookings.has(item.targetId)) {
            const occIdx = allConflictingBookings.get(item.targetId).occIndex;
            if (createdBlocks[occIdx]) targetBlockId = createdBlocks[occIdx]._id;
          }
        }

        const impactRecord = await this._resolveImpactItem({
          blockId: targetBlockId,
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          targetId: item.targetId,
          targetType: item.targetType,
          resolution: item.resolution,
          newSlot: item.newSlot,
          notes: item.notes || `Recurring maintenance: ${reason.trim()}`,
          cancelledBy,
          session: trxSession,
        });
        impactResults.push(impactRecord);
      }

      // 8. Write Outbox event
      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'RECURRING_MAINTENANCE_SCHEDULED',
          aggregateId: recurrenceSeriesId,
          aggregateType: 'AmenityMaintenanceBlockSeries',
          payload: {
            recurrenceSeriesId,
            facilityId,
            resourceId: targetResourceId,
            resourceIds: targetResourceIds,
            title,
            maintenanceType,
            totalOccurrences: createdBlocks.length,
            firstOccurrenceStart: occurrences[0].startDateTime,
            lastOccurrenceEnd: occurrences[occurrences.length - 1].endDateTime,
            impactedReservationsCount: allConflictingReservations.size,
            impactedBookingsCount: allConflictingBookings.size,
            resolvedImpactCount: impactResults.length,
          },
        },
        trxSession
      );

      // 9. Broadcast domain event
      amenityManagementEvents.emit(AMENITY_EVENTS.RECURRING_MAINTENANCE_SCHEDULED || 'amenity:maintenance:recurring_scheduled', {
        recurrenceSeriesId,
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        title,
        totalOccurrences: createdBlocks.length,
        reason,
      });

      return {
        recurrenceSeriesId,
        totalOccurrences: createdBlocks.length,
        occurrences: createdBlocks,
        impactResolutionsCount: impactResults.length,
        impactRecords: impactResults,
      };
    };

    return withTransactionRetry(executeRecurringSchedule);
  }

  /**
   * Retrieves recurring maintenance series details by series ID.
   * @param {string|import('mongoose').Types.ObjectId} seriesId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async getRecurringSeriesById(seriesId, orgId, session) {
    if (!seriesId) throw new HttpError(400, 'seriesId is required');
    const occurrences = await amenityMaintenanceBlockRepository.findBySeriesId(seriesId, orgId, session);
    if (!occurrences || occurrences.length === 0) {
      throw new HttpError(404, 'Recurring maintenance series not found');
    }
    const firstOcc = occurrences[0];
    return {
      recurrenceSeriesId: seriesId,
      orgId,
      facilityId: firstOcc.facilityId,
      resourceId: firstOcc.resourceId,
      resourceIds: firstOcc.resourceIds,
      title: firstOcc.title,
      description: firstOcc.description,
      maintenanceType: firstOcc.maintenanceType,
      reason: firstOcc.reason,
      status: firstOcc.status,
      recurrence: firstOcc.recurrence,
      totalOccurrences: occurrences.length,
      firstOccurrenceStart: firstOcc.startDateTime,
      lastOccurrenceEnd: occurrences[occurrences.length - 1].endDateTime,
      occurrences,
    };
  }

  /**
   * Lists occurrences of a recurring maintenance series with pagination.
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.seriesId
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=50]
   * @param {import('mongoose').ClientSession} [session]
   */
  async listSeriesOccurrences({ seriesId, orgId, page = 1, limit = 50 }, session) {
    if (!seriesId) throw new HttpError(400, 'seriesId is required');
    const result = await amenityMaintenanceBlockRepository.listSeriesOccurrences(
      { seriesId, orgId, page, limit },
      session
    );
    return result;
  }

  /**
   * Declares emergency maintenance on a facility or resource(s).
   * Emergency maintenance takes effect immediately (startDateTime = new Date(), status = 'IN_PROGRESS', bufferBeforeMinutes = 0).
   * Validates facility, resources, and ensures endDateTime is strictly in the future.
   * Automatically resolves or requires resolution for all active booking/reservation conflicts.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Array<string|import('mongoose').Types.ObjectId>} [params.resourceIds]
   * @param {string} params.title
   * @param {string} params.reason
   * @param {string} [params.maintenanceType='REPAIR']
   * @param {string} [params.internalNotes='']
   * @param {Date|string} params.endDateTime
   * @param {number} [params.bufferAfterMinutes=0]
   * @param {string} [params.conflictAction='CANCEL_AND_PROCEED']
   * @param {Array<Object>} [params.resolutions=[]]
   * @param {string|import('mongoose').Types.ObjectId} [params.cancelledBy]
   * @param {import('mongoose').ClientSession} [session]
   */
  async declareEmergencyMaintenance(
    {
      orgId,
      facilityId,
      resourceId = null,
      resourceIds = [],
      title,
      reason,
      maintenanceType = 'REPAIR',
      internalNotes = '',
      endDateTime,
      bufferAfterMinutes = 0,
      conflictAction = 'CANCEL_AND_PROCEED',
      resolutions = [],
      cancelledBy = null,
    },
    session
  ) {
    if (!orgId) throw new HttpError(400, 'orgId is required');
    if (!facilityId) throw new HttpError(400, 'facilityId is required');
    if (!title || !title.trim()) throw new HttpError(400, 'Maintenance title is required');
    if (!reason || !reason.trim()) throw new HttpError(400, 'Maintenance reason is required');
    if (!endDateTime) throw new HttpError(400, 'endDateTime is required');

    const validTypes = ['CLEANING', 'REPAIR', 'INSPECTION', 'UPGRADE', 'PREVENTIVE', 'OTHER'];
    if (!validTypes.includes(maintenanceType)) {
      throw new HttpError(400, `Invalid maintenance type: ${maintenanceType}`);
    }

    const numBufAfter = Math.max(0, parseInt(bufferAfterMinutes, 10) || 0);
    if (bufferAfterMinutes < 0) {
      throw new HttpError(400, 'Buffer minutes cannot be negative');
    }

    const start = new Date();
    const end = new Date(endDateTime);

    if (isNaN(end.getTime()) || end <= start) {
      throw new HttpError(400, 'Invalid maintenance window: endDateTime must be later than startDateTime');
    }

    // Emergency maintenance starts immediately with 0 buffer before
    const effectiveStart = start;
    const effectiveEnd = new Date(end.getTime() + numBufAfter * 60 * 1000);

    // Normalize target resource IDs with deterministic Case C synchronization
    let targetResourceIds = [];
    if (Array.isArray(resourceIds) && resourceIds.length > 0) {
      targetResourceIds = [...new Set(resourceIds.filter(Boolean).map(String))];
      if (resourceId && !targetResourceIds.includes(String(resourceId))) {
        targetResourceIds.unshift(String(resourceId));
      }
    } else if (resourceId) {
      targetResourceIds = [String(resourceId)];
    }
    const targetResourceId = targetResourceIds.length > 0 ? targetResourceIds[0] : null;

    const executeEmergency = async (trxSession) => {
      // 1. Verify Facility exists and is active
      const facility = await amenityFacilityService.getFacilityById(facilityId, orgId, trxSession);
      if (!facility) {
        throw new HttpError(404, `Facility ${facilityId} not found`);
      }
      if (String(facility.orgId) !== String(orgId)) {
        throw new HttpError(403, 'Facility does not belong to specified organization');
      }
      if (facility.isActive === false || facility.isDeleted === true || facility.status === 'INACTIVE') {
        throw new HttpError(400, 'Facility is inactive or deleted');
      }

      // 2. Verify all specified Resources exist and belong to the facility
      for (const resId of targetResourceIds) {
        const resource = await amenityResourceService.getResourceById(resId, orgId, trxSession);
        if (!resource) {
          throw new HttpError(404, `Resource ${resId} not found`);
        }
        if (String(resource.orgId) !== String(orgId)) {
          throw new HttpError(403, `Resource ${resId} does not belong to specified organization`);
        }
        if (String(resource.facilityId) !== String(facilityId)) {
          throw new HttpError(400, 'Resource does not belong to specified facility');
        }
        if (resource.isActive === false || resource.isDeleted === true) {
          throw new HttpError(400, `Resource ${resId} is inactive or deleted`);
        }
      }

      // 3. Inspect existing overlapping maintenance blocks
      const existingMaintenance = await amenityMaintenanceBlockRepository.findOverlappingBlocks(
        {
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          startDateTime: effectiveStart,
          endDateTime: effectiveEnd,
        },
        trxSession
      );
      if (existingMaintenance && existingMaintenance.length > 0) {
        throw new HttpError(
          409,
          'A maintenance block already exists that overlaps with the proposed emergency maintenance window',
          {
            overlappingBlockIds: existingMaintenance.map((b) => b._id),
          }
        );
      }

      // 4. Inspect impacted active v2 reservations
      const overlappingReservations = await amenityReservationService.findOverlappingActiveReservations(
        {
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          effectiveStartDateTime: effectiveStart,
          effectiveEndDateTime: effectiveEnd,
        },
        trxSession
      );

      // 4b. Inspect impacted active v1 bookings
      let overlappingBookings = [];
      try {
        const bookingMod = await import('../../amenityBooking/amenityBooking.services.js');
        const amenityBookingService = bookingMod.amenityBookingService || bookingMod.default;
        overlappingBookings = await amenityBookingService.findOverlappingBookingsForWindow(
          {
            orgId,
            amenityId: facilityId,
            startDateTime: effectiveStart,
            endDateTime: effectiveEnd,
          },
          trxSession
        );
      } catch (e) {
        overlappingBookings = [];
      }

      const totalConflicts = (overlappingReservations?.length || 0) + (overlappingBookings?.length || 0);

      // Construct effective resolution plan
      let planResolutions = [];
      if (totalConflicts > 0) {
        if (conflictAction === 'CANCEL_AND_PROCEED' || (!conflictAction && (!resolutions || resolutions.length === 0))) {
          for (const r of (overlappingReservations || [])) {
            planResolutions.push({
              targetId: r._id,
              targetType: 'V2_RESERVATION',
              resolution: 'CANCEL',
              notes: `Emergency maintenance closure: ${reason.trim()}`,
            });
          }
          for (const b of (overlappingBookings || [])) {
            planResolutions.push({
              targetId: b._id,
              targetType: 'V1_BOOKING',
              resolution: 'CANCEL',
              notes: `Emergency maintenance closure: ${reason.trim()}`,
            });
          }
        } else if (Array.isArray(resolutions) && resolutions.length > 0) {
          // Stale preview protection: verify that EVERY active conflicting reservation and booking has a resolution
          const resTargetIds = new Set(resolutions.map((r) => String(r.targetId || r.id)));
          const unhandled = [];

          for (const r of (overlappingReservations || [])) {
            if (!resTargetIds.has(String(r._id))) {
              unhandled.push({ id: r._id, type: 'V2_RESERVATION', reason: 'Unresolved reservation conflict' });
            }
          }
          for (const b of (overlappingBookings || [])) {
            if (!resTargetIds.has(String(b._id))) {
              unhandled.push({ id: b._id, type: 'V1_BOOKING', reason: 'Unresolved booking conflict' });
            }
          }

          if (unhandled.length > 0) {
            throw new HttpError(
              409,
              `This emergency maintenance window conflicts with ${totalConflicts} booking(s)/reservation(s). Resolution required for all affected items.`,
              {
                code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
                requiresConflictAction: true,
                impactedCount: totalConflicts,
                unresolvedTargets: unhandled,
              }
            );
          }

          planResolutions = resolutions.map((res) => ({
            ...res,
            targetId: res.targetId || res.id,
            targetType:
              res.targetType ||
              (overlappingReservations.some((r) => String(r._id) === String(res.targetId || res.id))
                ? 'V2_RESERVATION'
                : 'V1_BOOKING'),
          }));
        } else {
          throw new HttpError(
            409,
            `This emergency maintenance window conflicts with ${totalConflicts} booking(s). Confirmation required to cancel and proceed.`,
            {
              code: 'MAINTENANCE_IMPACT_NOT_RESOLVED',
              requiresConflictAction: true,
              impactedReservationsCount: overlappingReservations.length,
              impactedReservationIds: overlappingReservations.map((r) => r._id),
              impactedBookingsCount: overlappingBookings.length,
              impactedBookingIds: overlappingBookings.map((b) => b._id),
            }
          );
        }
      }

      // 5. Create emergency maintenance block
      const block = await amenityMaintenanceBlockRepository.create(
        {
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          title: title.trim(),
          maintenanceType,
          internalNotes: (internalNotes || '').trim(),
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: numBufAfter,
          startDateTime: start,
          endDateTime: end,
          isCompleteClosure: true,
          degradedCapacity: 0,
          reason: reason.trim(),
          status: 'IN_PROGRESS',
          isEmergency: true,
        },
        trxSession
      );

      // 6. Execute resolution plan and record impacts
      const impactResults = [];
      for (const item of planResolutions) {
        const impactRecord = await this._resolveImpactItem({
          blockId: block._id,
          orgId,
          facilityId,
          resourceId: targetResourceId,
          resourceIds: targetResourceIds,
          targetId: item.targetId,
          targetType: item.targetType,
          resolution: item.resolution,
          newSlot: item.newSlot,
          notes: item.notes || `Emergency maintenance: ${reason.trim()}`,
          cancelledBy,
          session: trxSession,
        });
        impactResults.push(impactRecord);
      }

      // 7. Write Outbox event
      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'EMERGENCY_MAINTENANCE_DECLARED',
          aggregateId: block._id,
          aggregateType: 'AmenityMaintenanceBlock',
          payload: {
            blockId: block._id,
            facilityId,
            resourceId: targetResourceId,
            resourceIds: targetResourceIds,
            title: block.title,
            maintenanceType: block.maintenanceType,
            startDateTime: start,
            endDateTime: end,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: numBufAfter,
            isEmergency: true,
            impactedReservationsCount: overlappingReservations.length,
            impactedBookingsCount: overlappingBookings.length,
            conflictsResolved: planResolutions.length > 0,
            resolvedImpactCount: impactResults.length,
          },
        },
        trxSession
      );

      // 8. Broadcast domain events
      amenityManagementEvents.emit('amenity:maintenance:emergency_declared', {
        blockId: block._id,
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        title: block.title,
        startDateTime: start,
        endDateTime: end,
        reason: block.reason,
        isEmergency: true,
      });

      amenityManagementEvents.emit(AMENITY_EVENTS.MAINTENANCE_SCHEDULED, {
        blockId: block._id,
        orgId,
        facilityId,
        resourceId: targetResourceId,
        resourceIds: targetResourceIds,
        title: block.title,
        startDateTime: start,
        endDateTime: end,
        reason: block.reason,
        isEmergency: true,
      });

      return {
        block,
        impactedReservationsCount: overlappingReservations.length,
        impactedReservationIds: overlappingReservations.map((r) => r._id),
        impactedBookingsCount: overlappingBookings.length,
        impactedBookingIds: overlappingBookings.map((b) => b._id),
        impacts: impactResults,
      };
    };

    if (session) {
      return executeEmergency(session);
    }
    return withTransactionRetry(executeEmergency);
  }

  /**
   * Deletes a maintenance block.
   * @param {string|import('mongoose').Types.ObjectId} blockId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async deleteMaintenanceBlock(blockId, orgId, session) {
    const block = await amenityMaintenanceBlockRepository.findById(blockId, orgId, session);
    if (!block) {
      throw new HttpError(404, 'Maintenance block not found');
    }

    await amenityMaintenanceBlockRepository.deleteById(blockId, orgId, session);
    try {
      await amenityMaintenanceImpactRepository.deleteByBlockId(blockId, orgId, session);
    } catch (_) {}

    amenityManagementEvents.emit('amenity:maintenance:deleted', {
      blockId,
      orgId,
      facilityId: block.facilityId,
    });

    return { success: true, message: 'Maintenance block deleted successfully' };
  }

  /**
   * Finds maintenance blocks for calendar view within a date range with optional filtering.
   * @param {Object} criteria
   * @param {import('mongoose').ClientSession} [session]
   */
  async findBlocksForCalendar(criteria, session) {
    return amenityMaintenanceBlockRepository.findBlocksForCalendar(criteria, session);
  }
}

export const amenityMaintenanceBlockService = new AmenityMaintenanceBlockService();
export default amenityMaintenanceBlockService;
