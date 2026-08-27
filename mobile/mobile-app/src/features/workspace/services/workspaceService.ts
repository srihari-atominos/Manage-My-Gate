import apiClient from '../../../services/apiClient';

/**
 * Service to manage workspace/organization setup operations
 */
export const checkOrganizationName = async (name: string) => {
  return await apiClient.get(`/organizations/check-name?name=${encodeURIComponent(name.trim())}`);
};

export const getWorkspaceDetails = async (id: string) => {
  return await apiClient.get(`/workspace/${id}/settings`);
};

export const updateWorkspaceSettings = async (id: string, data: any) => {
  return await apiClient.put(`/workspace/${id}/settings`, data);
};

export default {
  checkOrganizationName,
  getWorkspaceDetails,
  updateWorkspaceSettings,
};
