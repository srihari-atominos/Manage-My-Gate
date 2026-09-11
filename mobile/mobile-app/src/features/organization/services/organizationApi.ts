import apiClient from '../../../services/apiClient';

/**
 * Mobile Organization API Service
 * Interacts directly with existing Backend endpoints via the global apiClient singleton
 * (retaining X-Request-ID, Bearer token injection, and centralized error handling).
 */
export const organizationApi = {
  /**
   * Check organization name availability (case-insensitive)
   * GET /api/v1/organizations/check-name?name={name}
   */
  checkOrganizationName: async (name: string) => {
    return await apiClient.get('/organizations/check-name', {
      params: { name: name.trim() },
    });
  },

  /**
   * Create and setup a new organization workspace
   * POST /api/v1/organizations/setup
   */
  setupWorkspace: async (workspaceData: {
    name: string;
    organizationType?: string;
    timezone?: string;
    features?: string[];
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
    contactEmail?: string;
    contactPhone?: string;
  }) => {
    return await apiClient.post('/organizations/setup', workspaceData);
  },
};

export default organizationApi;
