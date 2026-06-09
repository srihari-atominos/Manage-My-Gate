import apiClient from '../../../services/apiClient'

/**
 * Authentication API Service
 * 
 * Invokes real backend endpoint to perform user authentication.
 */
export const login = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials)
  return response.data
}

export default {
  login,
}
