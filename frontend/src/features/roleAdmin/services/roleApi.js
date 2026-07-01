import apiClient from '../../../services/apiClient.js';

export const roleApi = {
  fetchRoles: async () => {
    return await apiClient.get('/roles');
  },

  createRole: async (roleData) => {
    // roleData contains { name, description }
    return await apiClient.post('/roles', roleData);
  },

  fetchPermissions: async () => {
    return await apiClient.get('/roles/permissions');
  },

  fetchRolePermissions: async (roleId) => {
    return await apiClient.get(`/roles/${roleId}/permissions`);
  },

  updateRolePermissions: async (roleId, permissionIds) => {
    return await apiClient.put(`/roles/${roleId}/permissions`, { permissionIds });
  },
};

export default roleApi;
