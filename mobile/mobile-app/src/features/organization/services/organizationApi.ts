import apiClient, { getApiBaseUrl } from '../../../services/apiClient';
import axios from 'axios';

/**
 * Mobile Organization API Service
 * Interacts directly with existing Backend endpoints via the global apiClient singleton
 * (retaining X-Request-ID, Bearer token injection, and centralized error handling).
 */
export const organizationApi = {
  /**
   * Check organization name availability (case-insensitive)
   * GET /api/v1/organizations/check-name?name={name}
   * NOTE: Uses a plain axios call (bypasses auth interceptor) because this is a
   * public endpoint called during onboarding before the user has an auth token.
   */
  checkOrganizationName: async (name: string) => {
    const baseUrl = getApiBaseUrl();
    const response = await axios.get(`${baseUrl}/organizations/check-name`, {
      params: { name: name.trim() },
      timeout: 8000,
    });
    return response.data;
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
