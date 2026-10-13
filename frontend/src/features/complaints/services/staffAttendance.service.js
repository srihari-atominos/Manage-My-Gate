import apiClient from '../../../services/apiClient.js'

const ATTENDANCE_URL = '/staff-attendance'

export const staffAttendanceService = {
  getHistory: async (params) => {
    const res = await apiClient.get(ATTENDANCE_URL, { params })
    return res?.data?.data || res?.data || { records: [], pagination: {} }
  },

  getStats: async (params) => {
    const res = await apiClient.get(`${ATTENDANCE_URL}/stats`, { params })
    return res?.data?.data || res?.data || {}
  },

  getActive: async () => {
    const res = await apiClient.get(`${ATTENDANCE_URL}/active`)
    return res?.data?.data || res?.data || []
  },

  getById: async (id) => {
    const res = await apiClient.get(`${ATTENDANCE_URL}/${id}`)
    return res?.data?.data || res?.data
  },

  manualCheckout: async (id, data) => {
    const res = await apiClient.post(`${ATTENDANCE_URL}/${id}/checkout`, data)
    return res?.data?.data || res?.data
  },
}
