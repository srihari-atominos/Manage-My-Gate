import apiClient from '../../../services/apiClient.js';

/**
 * Super Admin API service to manage organizations
 */
export const fetchOrganizations = async (page = 1, limit = 10) => {
  return await apiClient.get(`/organizations`, {
    params: { page, limit },
  });
};

export const updateOrganizationStatus = async (orgId, status) => {
  return await apiClient.patch(`/organizations/${orgId}/status`, {
    status,
  });
};

export default {
  fetchOrganizations,
  updateOrganizationStatus,
};
