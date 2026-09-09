import HttpError from '../../../../utils/httpError.utils.js';
import amenityResourceRepository from '../../resources/amenityResource.repository.js';
import amenityFacilityRepository from '../../facilities/amenityFacility.repository.js';

export class ResourceMutexService {
  /**
   * Acquires an optimistic concurrency mutex on the bookable resource or facility.
   * If resourceId is provided, locks the AmenityResource document.
   * If resourceId is null, falls back to locking the AmenityFacility document.
   *
   * @param {Object} params
   * @param {string|import('mongoose').Types.ObjectId} params.orgId
   * @param {string|import('mongoose').Types.ObjectId} params.facilityId
   * @param {string|import('mongoose').Types.ObjectId} [params.resourceId]
   * @param {import('mongoose').ClientSession} [session]
   * @returns {Promise<{ lockTarget: 'RESOURCE'|'FACILITY', lockedEntity: any, version: number }>}
   */
  async acquireMutex({ orgId, facilityId, resourceId }, session) {
    if (resourceId) {
      const lockedResource = await amenityResourceRepository.incrementConcurrencyVersion(
        resourceId,
        orgId,
        session
      );
      if (!lockedResource) {
        throw new HttpError(404, `Target resource ${resourceId} not found or inactive`);
      }
      return {
        lockTarget: 'RESOURCE',
        lockedEntity: lockedResource,
        version: lockedResource.concurrencyVersion,
      };
    }

    // Fallback: lock facility document
    const lockedFacility = await amenityFacilityRepository.incrementConcurrencyVersion(
      facilityId,
      orgId,
      session
    );
    if (!lockedFacility) {
      throw new HttpError(404, `Target facility ${facilityId} not found or inactive`);
    }
    return {
      lockTarget: 'FACILITY',
      lockedEntity: lockedFacility,
      version: lockedFacility.concurrencyVersion,
    };
  }
}

export const resourceMutexService = new ResourceMutexService();
export default resourceMutexService;
