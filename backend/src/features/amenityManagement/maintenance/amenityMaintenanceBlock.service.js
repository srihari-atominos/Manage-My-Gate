import HttpError from '../../../utils/httpError.utils.js';
import amenityMaintenanceBlockRepository from './amenityMaintenanceBlock.repository.js';
import amenityFacilityRepository from '../facilities/amenityFacility.repository.js';
import amenityResourceRepository from '../resources/amenityResource.repository.js';
import amenityReservationRepository from '../reservations/amenityReservation.repository.js';
import amenityReservationService from '../reservations/amenityReservation.service.js';
import amenityOutboxEventRepository from '../outbox/amenityOutboxEvent.repository.js';
import amenityManagementEvents, { AMENITY_EVENTS } from '../amenityManagement.events.js';
import { withTransactionRetry } from '../domain/concurrency/transaction.utils.js';

export class AmenityMaintenanceBlockService {
  /**
   * Schedules a maintenance block and verifies conflicting reservations.
   * Enforces Policy T3: requires explicit conflictAction ('CANCEL_AND_PROCEED')
   * when overlapping confirmed reservations are detected.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {Date|string} params.startDateTime
   * @param {Date|string} params.endDateTime
   * @param {boolean} [params.isCompleteClosure=true]
   * @param {number} [params.degradedCapacity=0]
   * @param {string} params.reason
   * @param {string} [params.conflictAction]
   * @param {string|import('mongoose').Types.ObjectId} [params.cancelledBy]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ block: any, impactedReservationsCount: number, impactedReservationIds: any[] }>}
   */
  async scheduleMaintenanceBlock(
    {
      orgId,
      facilityId,
      resourceId = null,
      startDateTime,
      endDateTime,
      isCompleteClosure = true,
      degradedCapacity = 0,
      reason,
      conflictAction = null,
      cancelledBy = null,
    },
    session
  ) {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new HttpError(400, 'Invalid maintenance window: endDateTime must be later than startDateTime');
    }

    if (!reason || !reason.trim()) {
      throw new HttpError(400, 'Maintenance reason is required');
    }

    const executeSchedule = async (trxSession) => {
      // 1. Verify Facility exists
      const facility = await amenityFacilityRepository.findById(facilityId, orgId, trxSession);
      if (!facility) {
        throw new HttpError(404, `Facility ${facilityId} not found`);
      }

      // 2. Verify Resource exists if specified
      if (resourceId) {
        const resource = await amenityResourceRepository.findById(resourceId, orgId, trxSession);
        if (!resource) {
          throw new HttpError(404, `Resource ${resourceId} not found`);
        }
        if (resource.facilityId.toString() !== facilityId.toString()) {
          throw new HttpError(400, 'Resource does not belong to specified facility');
        }
      }

      // 3. Inspect impacted active reservations
      const overlappingReservations = await amenityReservationRepository.findOverlappingActiveReservations(
        {
          orgId,
          facilityId,
          resourceId,
          effectiveStartDateTime: start,
          effectiveEndDateTime: end,
        },
        trxSession
      );

      // Policy T3: If conflicts exist, check conflictAction
      if (overlappingReservations && overlappingReservations.length > 0) {
        if (conflictAction === 'CANCEL_AND_PROCEED') {
          for (const booking of overlappingReservations) {
            await amenityReservationService.cancelReservation(
              {
                reservationId: booking._id,
                orgId,
                residentId: booking.residentId,
                cancellationReason: `Facility maintenance closure: ${reason.trim()}`,
                cancelledBy,
                isManagementCancellation: true,
              },
              trxSession
            );
          }
        } else {
          throw new HttpError(
            409,
            `This maintenance window conflicts with ${overlappingReservations.length} booking(s). Confirmation required to cancel and proceed.`,
            {
              requiresConflictAction: true,
              impactedReservationsCount: overlappingReservations.length,
              impactedReservationIds: overlappingReservations.map((r) => r._id),
            }
          );
        }
      }

      // 4. Create maintenance block
      const block = await amenityMaintenanceBlockRepository.create(
        {
          orgId,
          facilityId,
          resourceId,
          startDateTime: start,
          endDateTime: end,
          isCompleteClosure,
          degradedCapacity,
          reason: reason.trim(),
          status: 'SCHEDULED',
        },
        trxSession
      );

      // 5. Write Outbox event
      await amenityOutboxEventRepository.createEvent(
        {
          orgId,
          eventType: 'MAINTENANCE_SCHEDULED',
          aggregateId: block._id,
          aggregateType: 'AmenityMaintenanceBlock',
          payload: {
            blockId: block._id,
            facilityId,
            resourceId,
            startDateTime: start,
            endDateTime: end,
            impactedReservationsCount: overlappingReservations.length,
            conflictsResolved: conflictAction === 'CANCEL_AND_PROCEED',
          },
        },
        trxSession
      );

      // 6. Broadcast domain event
      amenityManagementEvents.emit(AMENITY_EVENTS.MAINTENANCE_SCHEDULED, {
        blockId: block._id,
        orgId,
        facilityId,
        resourceId,
        startDateTime: start,
        endDateTime: end,
        reason: block.reason,
      });

      return {
        block,
        impactedReservationsCount: overlappingReservations.length,
        impactedReservationIds: overlappingReservations.map((r) => r._id),
      };
    };

    if (session) {
      return executeSchedule(session);
    }
    return withTransactionRetry(executeSchedule);
  }

  /**
   * Updates status of maintenance block.
   * @param {string|import('mongoose').Types.ObjectId} blockId
   * @param {string} status
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateMaintenanceStatus(blockId, orgId, status, session) {
    let targetOrgId = orgId;
    let targetStatus = status;
    let targetSession = session;
    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    // Backward compatibility if called as (blockId, status, session)
    if (typeof orgId === 'string' && validStatuses.includes(orgId)) {
      targetStatus = orgId;
      targetOrgId = undefined;
      targetSession = status;
    }

    if (!validStatuses.includes(targetStatus)) {
      throw new HttpError(400, `Invalid maintenance status: ${targetStatus}`);
    }

    const updated = await amenityMaintenanceBlockRepository.updateStatus(
      blockId,
      targetOrgId,
      targetStatus,
      targetSession
    );
    if (!updated) {
      throw new HttpError(404, 'Maintenance block not found');
    }

    return updated;
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
}

export const amenityMaintenanceBlockService = new AmenityMaintenanceBlockService();
export default amenityMaintenanceBlockService;
