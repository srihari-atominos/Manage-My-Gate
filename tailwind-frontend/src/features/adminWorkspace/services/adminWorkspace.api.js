import apiClient from '../../../services/apiClient.js';

export const adminWorkspaceApi = {
  getWorkspaces: (params) => apiClient.get('/workspaces', { params }),
  getWorkspaceById: (id) => apiClient.get(`/workspaces/${id}`),
  createWorkspace: (data) => apiClient.post('/workspaces', data),
  updateWorkspace: (id, data) => apiClient.put(`/workspaces/${id}`, data),
  updateWorkspaceStatus: (id, status) => apiClient.patch(`/workspaces/${id}/status`, { status }),
  duplicateWorkspace: (id, newName) => apiClient.post(`/workspaces/${id}/duplicate`, { newName }),
  deleteWorkspace: (id) => apiClient.delete(`/workspaces/${id}`),
  restoreWorkspace: (id) => apiClient.patch(`/workspaces/${id}/restore`),
  getWorkspaceMembers: (id) => apiClient.get(`/workspaces/${id}/members`),
  addWorkspaceMember: (id, userId) => apiClient.post(`/workspaces/${id}/members/${userId}`),
  removeWorkspaceMember: (id, userId) => apiClient.delete(`/workspaces/${id}/members/${userId}`),
};
