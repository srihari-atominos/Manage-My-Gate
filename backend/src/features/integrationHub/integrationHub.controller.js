import integrationHubService from './integrationHub.service.js';
import { catalogFor } from './integrationHub.catalog.js';

const isPlatformCaller = (req) => req.user?.isPlatform === true || req.tenant?.isPlatform === true;

/**
 * Controller class for managing integration hub requests.
 */
export class IntegrationHubController {
  /**
   * Connect and configure an integration provider.
   */
  async connectIntegration(req, res, next) {
    try {
      const userId = req.user.id || req.user._id;
      const orgId = req.tenant.orgId;
      const { provider, accountLabel, credentials } = req.body;

      const data = await integrationHubService.connect(userId, orgId, provider, accountLabel, credentials, {
        isPlatform: isPlatformCaller(req),
      });
      res.success(data, 'Integration connected successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch connected integrations of the community (paginated).
   */
  async getIntegrations(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const { provider } = req.query;

      const data = await integrationHubService.getList(orgId, provider, page, limit);
      res.success(data, 'Integrations retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect and remove an integration configuration by ID.
   */
  async disconnectIntegration(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { id } = req.params;

      const data = await integrationHubService.deleteConnection(id, orgId, {
        userId: req.user.id || req.user._id,
        isPlatform: isPlatformCaller(req),
      });
      res.success(data, 'Integration disconnected successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update the label and/or rotate the credentials of a connection.
   */
  async updateConnection(req, res, next) {
    try {
      const orgId = req.tenant.orgId;
      const { id } = req.params;
      const { accountLabel, credentials } = req.body;

      const data = await integrationHubService.updateConnection(
        id,
        orgId,
        { accountLabel, credentials },
        { userId: req.user.id || req.user._id, isPlatform: isPlatformCaller(req) }
      );
      res.success(data, 'Integration updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Re-verify the stored credentials with the provider.
   */
  async testConnection(req, res, next) {
    try {
      const data = await integrationHubService.testConnection(req.params.id, req.tenant.orgId, {
        userId: req.user.id || req.user._id,
        isPlatform: isPlatformCaller(req),
      });
      res.success(data, data.ok ? 'Connection works' : 'Connection check failed', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Catalog of integrations the caller may configure (platform-level providers are hidden from communities).
   */
  getCatalog(req, res, next) {
    try {
      res.success(catalogFor({ isPlatform: isPlatformCaller(req) }), 'Integration catalog retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export default new IntegrationHubController();
