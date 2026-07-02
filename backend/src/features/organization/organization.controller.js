import organizationService from './organization.services.js';
import { setAuthCookie } from '../../utils/cookie.utils.js';

export class OrganizationController {
  async updateFeatures(req, res, next) {
    try {
      const orgId = req.params.id;
      const requestingOrgId = req.tenant.orgId;
      const { features } = req.body;
      const userId = req.user.id;

      const result = await organizationService.updateFeatures(orgId, requestingOrgId, features, userId);

      res.success(result, 'Organization features updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;

      const data = await organizationService.getAllOrganizations(page, limit);
      res.success(data, 'Organizations retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const orgId = req.params.id;
      const { status } = req.body;
      const requestingUserId = req.user.id;

      const updatedOrg = await organizationService.changeOrganizationStatus(orgId, status, requestingUserId);
      res.success(updatedOrg, 'Organization status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async checkName(req, res, next) {
    try {
      const { name } = req.query;
      const isAvailable = await organizationService.checkNameAvailability(name);
      res.success({ available: isAvailable }, 'Organization name availability checked successfully');
    } catch (error) {
      next(error);
    }
  }

  async setupWorkspace(req, res, next) {
    try {
      const { name } = req.body;
      const userId = req.user.id;
      const result = await organizationService.setupWorkspace({ name, userId });
      
      // Set the newly scoped token cookie if needed, just like switchContext / login
      setAuthCookie(res, result.token);

      res.success(result, 'Workspace created and initialized successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export default new OrganizationController();
