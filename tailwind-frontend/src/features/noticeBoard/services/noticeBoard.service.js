import apiClient from '../../../services/apiClient.js'

/**
 * Notice Board API Service Wrapper
 * Enforces strict API transport calls with zero business logic.
 */
const noticeBoardService = {
  /**
   * Fetches notices with pagination, searches, sorting, and filters.
   */
  getNotices: async (search = '', filters = {}, pagination = {}, sort = {}) => {
    const params = new URLSearchParams()

    if (search) {
      params.append('search', search)
    }

    // Add active filter parameters
    if (filters.category) params.append('category', filters.category)
    if (filters.priority) params.append('priority', filters.priority)
    if (filters.status) params.append('status', filters.status)
    if (filters.isPinned) params.append('isPinned', filters.isPinned)
    if (filters.isBookmarked) params.append('isBookmarked', filters.isBookmarked)
    if (filters.readStatus) params.append('readStatus', filters.readStatus)

    // Add pagination details
    if (pagination.currentPage) params.append('page', pagination.currentPage)
    if (pagination.limit) params.append('limit', pagination.limit)

    // Add sorting details
    if (sort.sortBy) params.append('sortBy', sort.sortBy)
    if (sort.sortOrder) params.append('sortOrder', sort.sortOrder)

    const queryString = params.toString()
    const url = `/notices${queryString ? `?${queryString}` : ''}`

    const response = await apiClient.get(url)
    return response.data
  },

  /**
   * Fetch notice profile by ID.
   */
  getNoticeById: async (id) => {
    const response = await apiClient.get(`/notices/${id}`)
    return response.data
  },

  /**
   * Create notice payload.
   */
  createNotice: async (noticeData) => {
    const response = await apiClient.post('/notices', noticeData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Update notice details.
   */
  updateNotice: async (id, noticeData) => {
    const response = await apiClient.put(`/notices/${id}`, noticeData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Delete notice record.
   */
  deleteNotice: async (id) => {
    const response = await apiClient.delete(`/notices/${id}`)
    return response.data
  },

  /**
   * Pin/Unpin toggle.
   */
  togglePin: async (id, isPinned) => {
    const response = await apiClient.patch(`/notices/${id}/pin`, { isPinned })
    return response.data
  },

  /**
   * Mark a notice as read by the user.
   */
  markAsRead: async (id) => {
    const response = await apiClient.patch(`/notices/${id}/read`)
    return response.data
  },

  /**
   * Bookmark or unbookmark a notice.
   */
  bookmarkNotice: async (id, isBookmarked) => {
    const response = await apiClient.patch(`/notices/${id}/bookmark`, { isBookmarked })
    return response.data
  },

  /**
   * Get notice stats for dashboard.
   */
  getNoticeStats: async () => {
    const response = await apiClient.get('/notices/stats')
    return response.data
  },
}

export default noticeBoardService
