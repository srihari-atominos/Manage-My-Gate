import apiClient from '../../../services/apiClient';

export interface RoleData {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  isTenantRole?: boolean;
  permissions?: string[];
  integrationMappings?: Record<string, string>;
}

export interface FetchRolesParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Fetch all roles with optional pagination
 */
export const fetchRoles = async (params: FetchRolesParams = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const search = params.search ? `&search=${encodeURIComponent(params.search)}` : '';
  const response: any = await apiClient.get(`/roles?page=${page}&limit=${limit}${search}`);
  return response;
};

/**
 * Fetch all system permissions categorized by domain
 */
export const fetchPermissions = async () => {
  const response: any = await apiClient.get('/roles/permissions');
  return response;
};

/**
 * Create a new role
 */
export const createRole = async (roleData: RoleData) => {
  const response: any = await apiClient.post('/roles', roleData);
  return response;
};

/**
 * Update an existing role
 */
export const updateRole = async (roleId: string, roleData: RoleData) => {
  const response: any = await apiClient.put(`/roles/${roleId}`, roleData);
  return response;
};

/**
 * Delete a role
 */
export const deleteRole = async (roleId: string) => {
  await apiClient.delete(`/roles/${roleId}`);
  return roleId;
};

/**
 * Sync permissions mapped to a role
 */
export const syncRolePermissions = async (roleId: string, permissionIds: string[]) => {
  const response: any = await apiClient.put(`/roles/${roleId}/permissions`, { permissionIds });
  return response;
};

export default {
  fetchRoles,
  fetchPermissions,
  createRole,
  updateRole,
  deleteRole,
  syncRolePermissions,
};
