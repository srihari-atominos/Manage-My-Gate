import apiClient from '../../utils/apiClient.js';

export const authApi = {
  login: async (credentials) => {
    // credentials contains { login, password }
    return await apiClient.post('/auth/login', credentials);
  },

  register: async (userData) => {
    // userData contains { email, username, password, roleId }
    return await apiClient.post('/auth/register', userData);
  },
};

export default authApi;
