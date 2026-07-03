import organizationService from './organization.services.js';
import { setAuthCookie } from '../../utils/cookie.utils.js';

export class OrganizationController {
  async updateFeatures(req, res, next) {
    try {
      const orgId = req.params.id;
      const requestingOrgId = req.tenant.orgId;
      const { features } = req.body;
      const userId = req.user.id;
      const isPlatformUser = req.tenant.isPlatform;

      const result = await organizationService.updateFeatures(orgId, requestingOrgId, features, userId, isPlatformUser);

      res.success(result, 'Organization features updated successfully');
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
