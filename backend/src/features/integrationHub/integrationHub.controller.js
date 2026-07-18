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
      const orgId = req.tenant.orgId;
      const { provider, accountLabel, credentials } = req.body;

      const data = await integrationHubService.connect(userId, orgId, provider, accountLabel, credentials);
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

      const data = await integrationHubService.deleteConnection(id, orgId);
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
      const orgId = req.tenant.orgId;
      const { id } = req.params;
      const { accountLabel } = req.body;

      const data = await integrationHubService.updateConnectionLabel(id, orgId, accountLabel);
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
        {
          id: 'smtp',
          name: 'SMTP Email Server',
          fields: [
            { name: 'host', label: 'SMTP Host', type: 'text' },
            { name: 'port', label: 'Port (e.g., 587, 465)', type: 'text' },
            { name: 'authUsername', label: 'Username / Email', type: 'text' },
            { name: 'authPassword', label: 'Password', type: 'password' },
          ],
        },
        {
          id: 'firebase',
          name: 'Firebase Authentication',
          fields: [
            { name: 'projectId', label: 'Project ID', type: 'text' },
            { name: 'apiKey', label: 'API Key', type: 'password' },
            { name: 'authDomain', label: 'Auth Domain', type: 'text' },
            { name: 'appId', label: 'App ID', type: 'text' },
            { name: 'messagingSenderId', label: 'Messaging Sender ID', type: 'text' },
            { name: 'storageBucket', label: 'Storage Bucket (Optional)', type: 'text', required: false },
          ],
        },
        {
          id: 'messageCentral',
          name: 'Message Central',
          fields: [
            { name: 'customerId', label: 'Customer ID', type: 'text' },
            { name: 'authToken', label: 'Auth Token', type: 'password' },
            { name: 'countryCode', label: 'Country Code', type: 'text' },
            { name: 'senderId', label: 'Sender ID', type: 'text', required: false },
            { name: 'flowId', label: 'Flow ID', type: 'text', required: false },
            { name: 'environment', label: 'Environment', type: 'text', required: false },
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
