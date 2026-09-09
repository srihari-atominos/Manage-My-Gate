import amenityResourceService from './amenityResource.service.js';

export class AmenityResourceController {
  /**
   * Creates a new resource under a facility.
   */
  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const identifier = req.body.identifier || req.body.code || `RES-${Date.now().toString().slice(-6)}`;
      const resourceData = { ...req.body, identifier, orgId };
      const resource = await amenityResourceService.createResource(resourceData);
      return res.success(resource, 'Resource created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Lists resources with pagination and filters.
   */
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(100, Number(req.query.limit) || 10);
      const { facilityId, resourceType, isActive } = req.query;

      const result = await amenityResourceService.listResources({
        orgId,
        page,
        limit,
        facilityId,
        resourceType,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
      });

      return res.success(result, 'Resources retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves single resource by ID.
   */
  async getById(req, res, next) {
    try {
      const { resourceId } = req.params;
      const orgId = req.tenant.orgId;
      const resource = await amenityResourceService.getResourceById(resourceId, orgId);
      return res.success(resource, 'Resource retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Retrieves all active resources under a specific facility.
   */
  async getByFacilityId(req, res, next) {
    try {
      const { facilityId } = req.params;
      const orgId = req.tenant.orgId;
      const resources = await amenityResourceService.getResourcesByFacilityId(facilityId, orgId);
      return res.success(resources, 'Facility resources retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Updates an existing resource.
   */
  async update(req, res, next) {
    try {
      const { resourceId } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await amenityResourceService.updateResource(resourceId, orgId, req.body);
      return res.success(updated, 'Resource updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Soft deletes a resource.
   */
  async delete(req, res, next) {
    try {
      const { resourceId } = req.params;
      const orgId = req.tenant.orgId;
      const deleted = await amenityResourceService.softDeleteResource(resourceId, orgId);
      return res.success(deleted, 'Resource deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
}

export const amenityResourceController = new AmenityResourceController();
export default amenityResourceController;
