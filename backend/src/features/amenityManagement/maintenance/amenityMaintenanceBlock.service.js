import HttpError from '../../../utils/httpError.utils.js';
import amenityMaintenanceBlockRepository from './amenityMaintenanceBlock.repository.js';
import amenityFacilityRepository from '../facilities/amenityFacility.repository.js';
import amenityResourceRepository from '../resources/amenityResource.repository.js';
import amenityReservationRepository from '../reservations/amenityReservation.repository.js';
import amenityOutboxEventRepository from '../outbox/amenityOutboxEvent.repository.js';
import amenityManagementEvents, { AMENITY_EVENTS } from '../amenityManagement.events.js';

export class AmenityMaintenanceBlockService {
  /**
   * Schedules a maintenance block and verifies conflicting reservations.
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
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ block: any, impactedReservationsCount: number }>}
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

    // 1. Verify Facility exists
    const facility = await amenityFacilityRepository.findById(facilityId, orgId, session);
    if (!facility) {
      throw new HttpError(404, `Facility ${facilityId} not found`);
    }

    // 2. Verify Resource exists if specified
    if (resourceId) {
      const resource = await amenityResourceRepository.findById(resourceId, orgId, session);
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
      session
    );

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
      session
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
        },
      },
      session
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
}

export const amenityMaintenanceBlockService = new AmenityMaintenanceBlockService();
export default amenityMaintenanceBlockService;
