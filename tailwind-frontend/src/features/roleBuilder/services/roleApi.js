import apiClient from '../../../services/apiClient'



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

/**
 * Sync role permissions.
 * @param {string} roleId
 * @param {Array<string>} permissionIds
 * @returns {Promise<Object>}
 */
export const syncRolePermissions = async (roleId, permissionIds) => {
  const response = await apiClient.put(`/roles/${roleId}/permissions`, { permissionIds })
  return response.data
}
