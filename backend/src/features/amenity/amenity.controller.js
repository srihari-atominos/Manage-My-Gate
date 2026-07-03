import amenityService from './amenity.services.js';
import HttpError from '../../utils/httpError.utils.js';

export class AmenityController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const amenities = await amenityService.getAllAmenities(orgId, req.query);
      res.success(amenities, 'Amenities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAvailableAmenities(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { date, startTime, endTime } = req.query;
      if (!date || !startTime || !endTime) {
        throw new HttpError(400, 'date, startTime, and endTime are required query parameters');
      }
      const available = await amenityService.searchAvailableAmenities(orgId, date, startTime, endTime);
      res.success(available, 'Available amenities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const amenity = await amenityService.getAmenityById(id, orgId);
      res.success(amenity, 'Amenity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const created = await amenityService.createAmenity(orgId, req.body);
      res.success(created, 'Amenity created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await amenityService.updateAmenity(id, orgId, req.body);
      res.success(updated, 'Amenity updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const orgId = req.tenant.orgId;
      const updated = await amenityService.updateStatus(id, orgId, status);
      res.success(updated, 'Amenity status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const deleted = await amenityService.deleteAmenity(id, orgId);
      res.success(deleted, 'Amenity deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getSlots(req, res, next) {
    try {
      const { id } = req.params;
      const { date } = req.query; // YYYY-MM-DD
      const orgId = req.tenant.orgId;
      if (!date) throw new HttpError(400, 'Date query parameter is required (YYYY-MM-DD)');
      
      const slots = await amenityService.getAvailableSlots(id, orgId, date);
      res.success(slots, 'Slots retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AmenityController();
