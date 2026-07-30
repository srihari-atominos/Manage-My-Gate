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
export const fetchUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  roles = [],
  status = [],
} = {}) => {
  const params = new URLSearchParams()
  params.append('page', page)
  params.append('limit', limit)
  if (search) params.append('search', search)
  if (roles && roles.length > 0) params.append('roles', roles.join(','))
  if (status && status.length > 0) params.append('status', status.join(','))

  const response = await apiClient.get(`/users?${params.toString()}`)
  return response.data
}

/**
 * Invites a new user.
 * @param {string} email
 * @returns {Promise<Object>} The newly created user object.
 */
export const inviteUser = async (inviteData) => {
  const payload = typeof inviteData === 'string' ? { email: inviteData } : inviteData
  const response = await apiClient.post('/users/invite', payload)
  return response.data
}

/**
 * Deletes a user by ID.
 * @param {number} userId
 * @returns {Promise<number>} Resolves with the deleted user's ID.
 */
export const deleteUser = async (userId, villaId = null) => {
  if (villaId) {
    // Remove user from a specific unit instead of entire org
    await apiClient.delete(`/villas/${villaId}/residents/${userId}`)
    return { userId, villaId }
  }
  await apiClient.delete(`/users/${userId}`)
  return { userId, villaId: null }
}

/**
 * Updates roles for a user.
 * @param {number} userId
 * @param {Array<string>} roles
 * @returns {Promise<Object>} Resolves with the updated userId and new roles array.
 */
export const updateUserRoles = async (userId, roles, villaId = null) => {
  const payload = { roles }
  if (villaId) payload.villaId = villaId
  
  await apiClient.put(`/users/${userId}/roles`, payload)
  return { userId, roles, villaId }
}

/**
 * Bulk invites multiple users.
 * @param {Array<Object>} invitations
 * @returns {Promise<Object>}
 */
export const bulkInviteUsers = async (invitations) => {
  const response = await apiClient.post('/users/bulk-invite', { invitations })
  return response.data
}
