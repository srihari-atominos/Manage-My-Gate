import apiClient from '../../../services/apiClient';

/**
 * Notice Board API Service Layer
 * Maps all backend endpoints exactly and returns API responses.
 */

// Get Notices list with search, pagination, and filter parameters
export const getNotices = async (params) => {
  return await apiClient.get('/notices', { params });
};

// Get single Notice details by ID
export const getNoticeById = async (id) => {
  return await apiClient.get(`/notices/${id}`);
};

// Create a new Notice (accepts FormData for multipart image uploads)
export const createNotice = async (formData) => {
  return await apiClient.post('/notices', formData);
};

// Update an existing Notice by ID (accepts FormData for multipart image uploads)
export const updateNotice = async (id, formData) => {
  return await apiClient.put(`/notices/${id}`, formData);
};

// Delete a Notice by ID
export const deleteNotice = async (id) => {
  return await apiClient.delete(`/notices/${id}`);
};

// Toggle pinned status of a Notice by ID
export const togglePin = async (id, isPinned) => {
  return await apiClient.patch(`/notices/${id}/pin`, { isPinned });
};

// Mark a Notice as read by ID
export const markAsRead = async (id) => {
  return await apiClient.patch(`/notices/${id}/read`);
};

// Toggle bookmarked status of a Notice by ID
export const bookmarkNotice = async (id, isBookmarked) => {
  return await apiClient.patch(`/notices/${id}/bookmark`, { isBookmarked });
};

// Get Notice KPI statistics and trends
export const getNoticeStats = async () => {
  return await apiClient.get('/notices/stats');
};
