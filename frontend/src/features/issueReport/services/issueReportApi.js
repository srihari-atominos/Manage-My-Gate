import apiClient from '../../../services/apiClient.js'

/**
 * Platform Admin API service to query and view submitted issue reports.
 */
export const fetchPlatformReports = async ({
  page = 1,
  limit = 20,
  search = '',
  reportType = '',
  feature = '',
  organisationId = '',
  startDate = '',
  endDate = '',
} = {}) => {
  const params = { page, limit }

  if (search && search.trim()) params.search = search.trim()
  if (reportType) params.reportType = reportType
  if (feature) params.feature = feature
  if (organisationId) params.organisationId = organisationId
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate

  return await apiClient.get('/platform/reports', { params })
}

export const fetchPlatformReportById = async (id) => {
  return await apiClient.get(`/platform/reports/${id}`)
}

export default {
  fetchPlatformReports,
  fetchPlatformReportById,
}
