import apiClient from '../../../services/apiClient.js';

/**
 * Service to manage organization-related API operations
 */
export const updateOrganizationFeatures = async (orgId, featuresArray) => {
  return await apiClient.patch(`/organizations/${orgId}/features`, {
    features: featuresArray,
  });
};

export default {
  updateOrganizationFeatures,
};
