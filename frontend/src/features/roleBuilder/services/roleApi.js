import apiClient from '../../../services/apiClient'

export const AVAILABLE_PERMISSIONS = {
  Roles: ['roles:create', 'roles:read', 'roles:update', 'roles:delete'],
  Users: ['users:create', 'users:read', 'users:update', 'users:delete'],
  Samples: ['samples:create', 'samples:read', 'samples:update', 'samples:delete'],
}

/**
 * Fetch all roles from backend.
 * @returns {Promise<Array>}
 */
export const fetchRoles = async ({ page = 1, limit = 10 } = {}) => {
  const response = await apiClient.get(`/roles?page=${page}&limit=${limit}`)
  return response.data
}

/**
 * Create a new role.
 * @param {Object} roleData - Role properties (name, description, permissions)
 * @returns {Promise<Object>}
 */
export const createRole = async (roleData) => {
  const response = await apiClient.post('/roles', roleData)
  return response.data
}

/**
 * Update an existing role.
 * @param {number} roleId
 * @param {Object} roleData
 * @returns {Promise<Object>}
 */
export const updateRole = async (roleId, roleData) => {
  const response = await apiClient.put(`/roles/${roleId}`, roleData)
  return response.data
}

/**
 * Delete a role.
 * @param {number} roleId
 * @returns {Promise<number>}
 */
export const deleteRole = async (roleId) => {
  await apiClient.delete(`/roles/${roleId}`)
  return roleId
}
