import apiClient from '../../../services/apiClient.js';

/**
 * Service to manage workspace/organization setup operations
 */
export const checkOrganizationName = async (name) => {
  return await apiClient.get(`/organizations/check-name?name=${encodeURIComponent(name.trim())}`);
};

export const getWorkspaces = async () => {
  return await apiClient.get('/workspaces');
};

export const getWorkspaceDetails = async (id) => {
  return await apiClient.get(`/workspaces/${id}`);
};

export const updateWorkspace = async (id, data) => {
  return await apiClient.put(`/workspaces/${id}`, data);
};

export const deleteWorkspace = async (id) => {
  return await apiClient.delete(`/workspaces/${id}`);
};

export const createWorkspace = async (data) => {
  return await apiClient.post('/workspaces', data);
};

export const toggleWorkspaceModule = async (workspaceId, moduleId, enabled) => {
  return await apiClient.patch(`/workspaces/${workspaceId}/modules/${moduleId}/toggle`, { enabled });
};

export const addWorkspaceModule = async (workspaceId, moduleData) => {
  return await apiClient.post(`/workspaces/${workspaceId}/modules`, moduleData);
};

export const updateWorkspaceModule = async (workspaceId, moduleId, moduleData) => {
  return await apiClient.put(`/workspaces/${workspaceId}/modules/${moduleId}`, moduleData);
};

export const deleteWorkspaceModule = async (workspaceId, moduleId) => {
  return await apiClient.delete(`/workspaces/${workspaceId}/modules/${moduleId}`);
};

export const reorderWorkspaceModules = async (workspaceId, orders) => {
  return await apiClient.patch(`/workspaces/${workspaceId}/modules/reorder`, { orders });
};

export const getCurrentWorkspaceModules = async () => {
  return await apiClient.get('/workspaces/current/modules');
};

export default {
  checkOrganizationName,
  getWorkspaces,
  getWorkspaceDetails,
  updateWorkspace,
  deleteWorkspace,
  createWorkspace,
  toggleWorkspaceModule,
  addWorkspaceModule,
  updateWorkspaceModule,
  deleteWorkspaceModule,
  reorderWorkspaceModules,
  getCurrentWorkspaceModules,
};
