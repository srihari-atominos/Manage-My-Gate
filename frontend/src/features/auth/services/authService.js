import apiClient from '../../../services/apiClient.js';

/**
 * Authentication and Workspace API Client Service
 */
export const login = async (credentials) => {
  return await apiClient.post('/auth/login', credentials);
};

export const register = async (userData) => {
  return await apiClient.post('/auth/register', userData);
};

export const acceptInvite = async ({ token, password }) => {
  return await apiClient.post('/auth/accept-invite', { token, password });
};

export const createWorkspace = async ({ name }) => {
  return await apiClient.post('/organizations/setup', { name });
};

export default {
  login,
  register,
  acceptInvite,
  createWorkspace,
};
