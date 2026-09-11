import amenityFacilityService from './amenityFacility.service.js';
import amenityIdempotencyService from '../idempotency/amenityIdempotencyRecord.service.js';

export class AmenityFacilityController {
  /**
   * Creates a new amenity facility.
   */
  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['idempotency-key'];
      const { _id, orgId: bodyOrgId, concurrencyVersion, isDeleted, deletedAt, ...cleanBody } = req.body;
      const facilityData = { ...cleanBody, orgId };

      if (idempotencyKey) {
        const idempResult = await amenityIdempotencyService.executeWithIdempotency(
          {
            orgId,
            idempotencyKey,
            requestPayload: req.body,
          },
          async () => {
            const facility = await amenityFacilityService.createFacility(facilityData);
            return { statusCode: 201, body: facility };
          }
        );
        return res.success(idempResult.body, 'Amenity facility created successfully', idempResult.statusCode);
      }

      const facility = await amenityFacilityService.createFacility(facilityData);
      return res.success(facility, 'Amenity facility created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Lists facilities with pagination and filters.
   */
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(100, Number(req.query.limit) || 10);
      const { search, archetype, isActive } = req.query;

      const result = await amenityFacilityService.listFacilities({
        orgId,
        page,
        limit,
        search,
        archetype,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });

      console.log(`[amenityFacility.getAll] tenant.orgId: "${orgId}", header.orgId: "${req.headers['x-organization-id']}", found: ${result?.data?.length}, total: ${result?.total}`);
      return res.success(result, 'Facilities retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single facility by ID.
   */
  async getById(req, res, next) {
    try {
      const { facilityId } = req.params;
      const orgId = req.tenant.orgId;
      const facility = await amenityFacilityService.getFacilityById(facilityId, orgId);
      return res.success(facility, 'Facility retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single facility by code.
   */
  async getByCode(req, res, next) {
    try {
      const { code } = req.params;
      const orgId = req.tenant.orgId;
      const facility = await amenityFacilityService.getFacilityByCode(orgId, code);
      return res.success(facility, 'Facility retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Updates an existing facility.
   */
  async update(req, res, next) {
    try {
      const { facilityId } = req.params;
      const orgId = req.tenant.orgId;
      const { _id, orgId: bodyOrgId, concurrencyVersion, isDeleted, deletedAt, ...cleanBody } = req.body;
      const updated = await amenityFacilityService.updateFacility(facilityId, orgId, cleanBody);
      return res.success(updated, 'Facility updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Soft deletes a facility.
   */
  async delete(req, res, next) {
    try {
      const { facilityId } = req.params;
      const orgId = req.tenant.orgId;
      const deleted = await amenityFacilityService.softDeleteFacility(facilityId, orgId);
      return res.success(deleted, 'Facility deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityFacilityController = new AmenityFacilityController();
export default amenityFacilityController;
