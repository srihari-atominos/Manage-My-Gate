/**
 * Amenity Effective State Service
 * Centralized domain evaluator for facility & resource lifecycle state.
 * Evaluates the two administrative dimensions (Publication & Operational)
 * and the dynamic maintenance layer.
 */

export class AmenityEffectiveStateService {
  /**
   * Calculates the effective operational state of a facility at a specific point in time or range.
   *
   * @param {Object} params
   * @param {Object} params.facility - The facility document or plain object
   * @param {Array} [params.maintenanceBlocks=[]] - Active maintenance blocks for this facility
   * @param {Date} [params.targetDateTime=new Date()] - Evaluation timestamp
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId] - Specific child resource if evaluating resource scope
   * @returns {{
   *   effectiveStatus: 'DRAFT' | 'INACTIVE' | 'UNDER_MAINTENANCE' | 'AVAILABLE',
   *   isBookable: boolean,
   *   reason?: string,
   *   activeMaintenanceBlock?: Object
   * }}
   */
  evaluateFacilityState({
    facility,
    maintenanceBlocks = [],
    targetDateTime = new Date(),
    resourceId = null,
  }) {
    if (!facility) {
      return {
        effectiveStatus: 'INACTIVE',
        isBookable: false,
        reason: 'Facility does not exist',
      };
    }

    // 1. Soft Deletion check
    if (facility.isDeleted) {
      return {
        effectiveStatus: 'INACTIVE',
        isBookable: false,
        reason: 'Facility has been decommissioned',
      };
    }

    // 2. Publication Dimension: Draft check
    if (facility.isDraft === true || facility.status === 'DRAFT') {
      return {
        effectiveStatus: 'DRAFT',
        isBookable: false,
        reason: 'Facility is an unpublished draft',
      };
    }

    // 3. Operational Dimension: Inactive check
    if (facility.isActive === false || facility.status === 'INACTIVE') {
      return {
        effectiveStatus: 'INACTIVE',
        isBookable: false,
        reason: 'Facility is temporarily inactive',
      };
    }

    // 4. Dynamic Maintenance Layer Check
    const targetMs = new Date(targetDateTime).getTime();
    const activeBlock = maintenanceBlocks.find((b) => {
      if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return false;

      const startMs = new Date(b.startDateTime).getTime();
      const endMs = new Date(b.endDateTime).getTime();
      const inWindow = targetMs >= startMs && targetMs <= endMs;
      if (!inWindow) return false;

      // Complete facility closure
      if (b.isCompleteClosure) return true;

      // Resource-specific closure
      if (resourceId && b.resourceId && b.resourceId.toString() === resourceId.toString()) {
        return true;
      }

      return false;
    });

    if (activeBlock) {
      return {
        effectiveStatus: 'UNDER_MAINTENANCE',
        isBookable: false,
        reason: activeBlock.reason || 'Facility is under scheduled maintenance',
        activeMaintenanceBlock: {
          blockId: activeBlock._id ? activeBlock._id.toString() : activeBlock.id,
          startDateTime: activeBlock.startDateTime,
          endDateTime: activeBlock.endDateTime,
          reason: activeBlock.reason,
          isCompleteClosure: activeBlock.isCompleteClosure,
        },
      };
    }

    // 5. Default Operational State
    return {
      effectiveStatus: 'AVAILABLE',
      isBookable: true,
    };
  }
}

export const amenityEffectiveStateService = new AmenityEffectiveStateService();
export default amenityEffectiveStateService;
