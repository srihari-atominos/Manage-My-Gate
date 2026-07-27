import apiClient from '../../../services/apiClient.js'

const BASE_URL = '/technicians'

export const technicianService = {
  /**
   * Fetch staff and vendor workload analytics.
   * Supports query params for filtering, search, department, type, status, availability, etc.
   */
  getAnalytics: async (params) => {
    return await apiClient.get(`${BASE_URL}/analytics/workload`, { params })
  },

  getAll: async (params) => {
    return await apiClient.get(BASE_URL, { params })
  },

  create: async (data) => {
    return await apiClient.post(BASE_URL, data)
  },

  update: async (id, data) => {
    return await apiClient.put(`${BASE_URL}/${id}`, data)
  },

  delete: async (id) => {
    return await apiClient.delete(`${BASE_URL}/${id}`)
  },
}
