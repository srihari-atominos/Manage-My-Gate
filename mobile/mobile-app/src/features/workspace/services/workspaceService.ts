import apiClient from '../../../services/apiClient';

/**
 * Service to manage workspace/organization setup operations
 */
export const checkOrganizationName = async (name: string) => {
  return await apiClient.get(`/organizations/check-name?name=${encodeURIComponent(name.trim())}`);
};

export const getWorkspaceDetails = async (id: string) => {
  return await apiClient.get(`/workspaces/${id}/settings`);
};

export const updateWorkspaceSettings = async (id: string, data: any) => {
  return await apiClient.put(`/workspaces/${id}/settings`, data);
};

export const getWorkspaceModules = async (id: string) => {
  return await apiClient.get(`/workspaces/${id}/modules`);
};

export const toggleWorkspaceModule = async (workspaceId: string, moduleId: string, enabled: boolean) => {
  return await apiClient.patch(`/workspaces/${workspaceId}/modules/${moduleId}/toggle`, { enabled });
};

export default {
  checkOrganizationName,
  getWorkspaceDetails,
  updateWorkspaceSettings,
  getWorkspaceModules,
  toggleWorkspaceModule,
};
