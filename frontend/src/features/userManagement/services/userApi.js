import apiClient from '../../../services/apiClient'

/**
 * User API Service
 * 
 * Invokes real backend endpoints for User Management operations.
 */

/**
 * Fetches all users from the backend.
 * @returns {Promise<Array>}
 */
export const fetchUsers = async ({ page = 1, limit = 10 } = {}) => {
  const response = await apiClient.get(`/users?page=${page}&limit=${limit}`)
  return response.data
}

/**
 * Invites a new user.
 * @param {string} email 
 * @returns {Promise<Object>} The newly created user object.
 */
export const inviteUser = async (email) => {
  const response = await apiClient.post('/users/invite', { email })
  return response.data
}

/**
 * Deletes a user by ID.
 * @param {number} userId 
 * @returns {Promise<number>} Resolves with the deleted user's ID.
 */
export const deleteUser = async (userId) => {
  await apiClient.delete(`/users/${userId}`)
  return userId
}

/**
 * Updates roles for a user.
 * @param {number} userId 
 * @param {Array<string>} roles 
 * @returns {Promise<Object>} Resolves with the updated userId and new roles array.
 */
export const updateUserRoles = async (userId, roles) => {
  await apiClient.put(`/users/${userId}/roles`, { roles })
  return { userId, roles }
}
