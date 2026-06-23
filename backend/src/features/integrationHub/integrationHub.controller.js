import integrationHubService from './integrationHub.service.js';

/**
 * Controller class for managing integration hub requests.
 */
export class IntegrationHubController {
  /**
   * Connect and configure an integration provider.
   */
  async connectIntegration(req, res, next) {
    try {
      const userId = req.user.id;
      const { provider, accountLabel, credentials } = req.body;

      const data = await integrationHubService.connect(userId, provider, accountLabel, credentials);
      res.success(data, 'Integration connected successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch all connected integrations for the authenticated user (paginated).
   */
  async getIntegrations(req, res, next) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const { provider } = req.query;

      const data = await integrationHubService.getList(userId, provider, page, limit);
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
      const userId = req.user.id;
      const { id } = req.params;

      const data = await integrationHubService.deleteConnection(id, userId);
      res.success(data, 'Integration disconnected successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update integration connection label by ID.
   */
  async updateConnection(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { accountLabel } = req.body;

      const data = await integrationHubService.updateConnectionLabel(id, userId, accountLabel);
      res.success(data, 'Integration connection label updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Returns a dynamic schema catalog of supported integrations.
   */
  getCatalog(req, res, next) {
    try {
      const catalog = [
        {
          id: 'twilio',
          name: 'Twilio',
          fields: [
            { name: 'accountSid', label: 'Account SID', type: 'text' },
            { name: 'authToken', label: 'Auth Token', type: 'password' },
          ],
        },
        {
          id: 'openai',
          name: 'OpenAI',
          fields: [
            { name: 'apiKey', label: 'API Key', type: 'password' },
          ],
        },
        {
          id: 'resend',
          name: 'Resend',
          fields: [
            { name: 'apiKey', label: 'API Key', type: 'password' },
          ],
        },
      ];
      res.success(catalog, 'Integration catalog retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export default new IntegrationHubController();
