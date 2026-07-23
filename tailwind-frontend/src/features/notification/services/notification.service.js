import apiClient from '../../../services/apiClient.js';

/**
 * Service to interface with the Notifications API endpoints.
 */
export const notificationService = {
  /**
   * Fetches paginated list of notifications.
   * @param {number} page - Page number to fetch
   * @param {number} limit - Number of items per page
   * @returns {Promise<{notifications: Array, pagination: Object}>}
   */
  async getNotifications(page = 1, limit = 10) {
    const response = await apiClient.get('/notifications', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Marks a specific notification as read by its ID.
   * @param {string} id - The notification ID
   * @returns {Promise<Object>} The updated notification document
   */
  async markAsRead(id) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Marks all notifications as read.
   * @returns {Promise<{matchedCount: number, modifiedCount: number}>}
   */
  async markAllAsRead() {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  },

  /**
   * Deletes a specific notification by its ID.
   * @param {string} id - The notification ID
   * @returns {Promise<Object>}
   */
  async deleteNotification(id) {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  }
};

export default notificationService;
