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
      const { date, startTime, endTime, ...filters } = req.query;
      if (!date || !startTime || !endTime) {
        throw new HttpError(400, 'date, startTime, and endTime are required query parameters');
      }
      const available = await amenityService.searchAvailableAmenities(orgId, date, startTime, endTime, filters);
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
      const force = req.query.force === 'true' || req.body.force === true;
      const updated = await amenityService.updateAmenity(id, orgId, req.body, force);
      res.success(updated, 'Amenity updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, force: bodyForce } = req.body;
      const force = req.query.force === 'true' || bodyForce === true;
      const orgId = req.tenant.orgId;
      const updated = await amenityService.updateStatus(id, orgId, status, force);
      res.success(updated, 'Amenity status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const force = req.query.force === 'true' || req.body?.force === true;
      const deleted = await amenityService.deleteAmenity(id, orgId, force);
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

  async getAllSlots(req, res, next) {
    try {
      const { id } = req.params;
      const { date } = req.query; // YYYY-MM-DD
      const orgId = req.tenant.orgId;
      const userId = req.user.id;
      if (!date) throw new HttpError(400, 'Date query parameter is required (YYYY-MM-DD)');
      
      const slots = await amenityService.getAllSlots(id, orgId, date, userId);
      res.success(slots, 'All slots retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAllMaintenance(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const maintenance = await amenityService.getAllMaintenance(orgId);
      res.success(maintenance, 'Maintenance schedules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async scheduleMaintenance(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await amenityService.scheduleMaintenance(id, orgId, req.body);
      res.success(updated, 'Maintenance scheduled successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateMaintenance(req, res, next) {
    try {
      const { id, maintenanceId } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await amenityService.updateMaintenance(id, maintenanceId, orgId, req.body);
      res.success(updated, 'Maintenance updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteMaintenance(req, res, next) {
    try {
      const { id, maintenanceId } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await amenityService.deleteMaintenance(id, maintenanceId, orgId);
      res.success(updated, 'Maintenance deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new AmenityController();
