import HttpError from '../../../utils/httpError.utils.js';
import amenityResourceRepository from './amenityResource.repository.js';
import amenityFacilityRepository from '../facilities/amenityFacility.repository.js';

export class AmenityResourceService {
  /**
   * Creates a bookable sub-resource under an amenity facility.
   *
   * @param {Object} resourceData
   * @param {import('mongoose').ClientSession} [session]
   */
  async createResource(resourceData, session) {
    if (!resourceData.orgId || !resourceData.facilityId || !resourceData.name) {
      throw new HttpError(400, 'orgId, facilityId, and name are required to create a resource');
    }

    const facility = await amenityFacilityRepository.findById(
      resourceData.facilityId,
      resourceData.orgId,
      session
    );
    if (!facility) {
      throw new HttpError(404, `Parent facility ${resourceData.facilityId} not found`);
    }

    return amenityResourceRepository.create(resourceData, session);
  }

  /**
   * Retrieves a resource by ID.
   * @param {string|import('mongoose').Types.ObjectId} resourceId
   * @param {string|import('mongoose').Types.ObjectId} [orgId]
   * @param {import('mongoose').ClientSession} [session]
   */
  async getResourceById(resourceId, orgId, session) {
    const resource = await amenityResourceRepository.findById(resourceId, orgId, session);
    if (!resource) {
      throw new HttpError(404, 'Resource not found');
    }
    return resource;
  }

  /**
   * Retrieves all active sub-resources under a facility.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async getResourcesByFacilityId(facilityId, orgId, session) {
    return amenityResourceRepository.findActiveByFacilityId(facilityId, orgId, session);
  }

  /**
   * Retrieves all non-deleted sub-resources under a facility.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async getAllResourcesByFacilityId(facilityId, orgId, session) {
    return amenityResourceRepository.findByFacilityId(facilityId, orgId, session);
  }

  /**
   * Updates an existing resource.
   * @param {string|import('mongoose').Types.ObjectId} resourceId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {Object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateResource(resourceId, orgId, updateData, session) {
    const updated = await amenityResourceRepository.update(resourceId, orgId, updateData, session);
    if (!updated) {
      throw new HttpError(404, 'Resource not found');
    }
    return updated;
  }

  /**
   * Soft deletes a resource.
   * @param {string|import('mongoose').Types.ObjectId} resourceId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDeleteResource(resourceId, orgId, session) {
    const deleted = await amenityResourceRepository.softDelete(resourceId, orgId, session);
    if (!deleted) {
      throw new HttpError(404, 'Resource not found');
    }
    return deleted;
  }

  /**
   * Lists resources with pagination via $facet aggregation pipeline.
   * @param {Object} queryParams
   */
  async listResources(queryParams) {
    return amenityResourceRepository.findWithPagination(queryParams);
  }
}

export const amenityResourceService = new AmenityResourceService();
export default amenityResourceService;
