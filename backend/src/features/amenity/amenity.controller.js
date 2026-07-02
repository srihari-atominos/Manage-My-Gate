import amenityService from './amenity.services.js';

export class AmenityController {
  async getAll(req, res, next) {
    try {
      // For now, extract orgId from headers or user object (assuming req.user.orgId exists)
      const orgId = req.user?.orgId || req.body.orgId || req.query.orgId;
      const data = await amenityService.getAllAmenities(orgId);
      res.success(data, 'Amenities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.user?.orgId || req.query.orgId;
      const data = await amenityService.getAmenityById(id, orgId);
      res.success(data, 'Amenity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = await amenityService.createAmenity(req.body);
      res.success(data, 'Amenity created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.user?.orgId || req.body.orgId;
      const data = await amenityService.updateAmenity(id, orgId, req.body);
      res.success(data, 'Amenity updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.user?.orgId || req.body.orgId;
      const data = await amenityService.deleteAmenity(id, orgId);
      res.success(data, 'Amenity deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AmenityController();
