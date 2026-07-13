import visitorPassService from './visitorPass.service.js';
import visitorPassTokenService from '../visitorPassToken/visitorPassToken.service.js';

export class VisitorPassController {
  /**
   * Create a new VisitorPass.
   */
  async create(req, res, next) {
    try {
      const data = await visitorPassService.createPass(req.body);
      res.success(data, 'Visitor pass created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a VisitorPass by ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await visitorPassService.getPassById(id);
      res.success(data, 'Visitor pass retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the status of a VisitorPass (e.g. revoke or set to other status).
   */
  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      let data;
      if (status === 'REVOKED') {
        data = await visitorPassService.revokePass(id);
      } else {
        data = await visitorPassService.updatePassStatus(id, status);
      }

      res.success(data, `Visitor pass status updated to ${status} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve paginated passes for an organization.
   */
  async getByOrgPaginated(req, res, next) {
    try {
      const { orgId } = req.params;
      const skip = parseInt(req.query.skip, 10) || 0;
      const limit = parseInt(req.query.limit, 10) || 10;
      
      let statuses = ['PENDING', 'ACTIVE'];
      if (req.query.statuses) {
        statuses = req.query.statuses.split(',').map(s => s.trim().toUpperCase());
      }

      const data = await visitorPassService.getActivePasses(orgId, skip, limit, statuses);
      res.success(data, 'Visitor passes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * Retrieve a VisitorPass by its short code.
   */
  async getByCode(req, res, next) {
    try {
      const { code } = req.params;
      const passId = await visitorPassTokenService.getPassIdByCode(code);
      const data = await visitorPassService.getPassById(passId);
      res.success(data, 'Visitor pass retrieved by code successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new VisitorPassController();
