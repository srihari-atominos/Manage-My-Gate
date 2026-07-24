import apiClient from '../../../services/apiClient.js';

/**
 * Service to manage workspace/organization setup operations
 */
export const checkOrganizationName = async (name) => {
  return await apiClient.get(`/organizations/check-name?name=${encodeURIComponent(name.trim())}`);
};

export default {
  checkOrganizationName,
};
