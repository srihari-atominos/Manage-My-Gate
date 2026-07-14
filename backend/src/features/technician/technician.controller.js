import technicianService from './technician.service.js';
import HttpError from '../../utils/httpError.utils.js';

class TechnicianController {
  async getAll(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const filter = req.query.department ? { department: req.query.department } : {};
      const search = req.query.search;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }
      
      const technicians = await technicianService.getTechnicians(orgId, filter);
      res.success(technicians, 'Technicians retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const filter = {};
      
      if (req.query.department && req.query.department !== 'All Departments') {
        filter.department = req.query.department;
      }
      if (req.query.type) filter.type = req.query.type;
      
      const search = req.query.search;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      const data = await technicianService.getWorkloadAnalytics(orgId, filter);
      res.success(data, 'Technician analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const technician = await technicianService.getTechnicianById(id, orgId);
      res.success(technician, 'Technician retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const created = await technicianService.createTechnician(orgId, req.body);
      res.success(created, 'Technician created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const updated = await technicianService.updateTechnician(id, orgId, req.body);
      res.success(updated, 'Technician updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const orgId = req.tenant.orgId;
      const deleted = await technicianService.deleteTechnician(id, orgId);
      res.success(deleted, 'Technician deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new TechnicianController();
