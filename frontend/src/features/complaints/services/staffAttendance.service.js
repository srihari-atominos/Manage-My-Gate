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

  /**
   * Downloads the server-built, user-friendly attendance report (CSV or Excel) for the given filters.
   * Returns { blob, fileName, rows }.
   */
  exportReport: async (params, format) => {
    const res = await apiClient.get(`${ATTENDANCE_URL}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    })
    const disposition = res?.headers?.['content-disposition'] || ''
    const match = /filename="?([^";]+)"?/i.exec(disposition)
    return {
      blob: res.data,
      fileName: res?.headers?.['x-export-filename'] || (match && match[1]) || `staff_attendance.${format}`,
      rows: Number(res?.headers?.['x-export-rows'] || 0),
    }
  },

  manualCheckout: async (id, data) => {
    const res = await apiClient.post(`${ATTENDANCE_URL}/${id}/checkout`, data)
    return res?.data?.data || res?.data
  },
}
