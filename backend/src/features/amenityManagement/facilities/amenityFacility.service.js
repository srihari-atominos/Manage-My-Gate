import HttpError from '../../../utils/httpError.utils.js';
import amenityFacilityRepository from './amenityFacility.repository.js';

export class AmenityFacilityService {
  /**
   * Creates a new amenity facility document.
   * Enforces unique uppercase facility code within tenant organization.
   *
   * @param {Object} facilityData
   * @param {import('mongoose').ClientSession} [session]
   */
  async createFacility(facilityData, session) {
    if (!facilityData.orgId || !facilityData.name || !facilityData.code || !facilityData.archetype) {
      throw new HttpError(400, 'orgId, name, code, and archetype are required to create a facility');
    }

    const normalizedCode = facilityData.code.trim().toUpperCase();
    const existing = await amenityFacilityRepository.findByCode(
      facilityData.orgId,
      normalizedCode,
      session
    );

    if (existing) {
      throw new HttpError(409, `Facility with code '${normalizedCode}' already exists in this organization`);
    }

    return amenityFacilityRepository.create(
      {
        ...facilityData,
        code: normalizedCode,
      },
      session
    );
  }

  /**
   * Retrieves a facility by ID.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} [orgId]
   * @param {import('mongoose').ClientSession} [session]
   */
  async getFacilityById(facilityId, orgId, session) {
    const facility = await amenityFacilityRepository.findById(facilityId, orgId, session);
    if (!facility) {
      throw new HttpError(404, 'Facility not found');
    }
    return facility;
  }

  /**
   * Retrieves a facility by code.
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {string} code
   * @param {import('mongoose').ClientSession} [session]
   */
  async getFacilityByCode(orgId, code, session) {
    const facility = await amenityFacilityRepository.findByCode(orgId, code, session);
    if (!facility) {
      throw new HttpError(404, `Facility with code '${code}' not found`);
    }
    return facility;
  }

  /**
   * Updates an existing facility.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {Object} updateData
   * @param {import('mongoose').ClientSession} [session]
   */
  async updateFacility(facilityId, orgId, updateData, session) {
    if (updateData.code) {
      const normalizedCode = updateData.code.trim().toUpperCase();
      const existing = await amenityFacilityRepository.findByCode(orgId, normalizedCode, session);
      if (existing && existing._id.toString() !== facilityId.toString()) {
        throw new HttpError(409, `Facility with code '${normalizedCode}' already exists`);
      }
      updateData.code = normalizedCode;
    }

    const updated = await amenityFacilityRepository.update(facilityId, orgId, updateData, session);
    if (!updated) {
      throw new HttpError(404, 'Facility not found');
    }
    return updated;
  }

  /**
   * Soft deletes a facility.
   * @param {string|import('mongoose').Types.ObjectId} facilityId
   * @param {string|import('mongoose').Types.ObjectId} orgId
   * @param {import('mongoose').ClientSession} [session]
   */
  async softDeleteFacility(facilityId, orgId, session) {
    const deleted = await amenityFacilityRepository.softDelete(facilityId, orgId, session);
    if (!deleted) {
      throw new HttpError(404, 'Facility not found');
    }
    return deleted;
  }

  /**
   * Lists facilities with pagination and filter criteria using $facet aggregation pipeline.
   * @param {Object} queryParams
   */
  async listFacilities(queryParams) {
    return amenityFacilityRepository.findWithPagination(queryParams);
  }
}

export const amenityFacilityService = new AmenityFacilityService();
export default amenityFacilityService;
