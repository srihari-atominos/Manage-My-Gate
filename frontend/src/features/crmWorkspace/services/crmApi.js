import apiClient from '../../../services/apiClient.js';

export const crmApi = {
  // --- CRM Inquiries ---
  /**
   * Fetch paginated list of CRM inquiries.
   * @param {Object} [params] - { page, limit, status, search, assignedAgentId }
   */
  async getInquiries(params = {}) {
    return await apiClient.get('/crm/inquiries', { params });
  },

  /**
   * Fetch a single CRM inquiry by ID.
   * @param {string} id
   */
  async getInquiryById(id) {
    return await apiClient.get(`/crm/inquiries/${id}`);
  },

  /**
   * Create a new CRM inquiry.
   * @param {Object} data
   */
  async createInquiry(data) {
    return await apiClient.post('/crm/inquiries', data);
  },

  /**
   * Update an existing CRM inquiry.
   * @param {string} id
   * @param {Object} data
   */
  async updateInquiry(id, data) {
    return await apiClient.put(`/crm/inquiries/${id}`, data);
  },

  /**
   * Delete a CRM inquiry by ID.
   * @param {string} id
   */
  async deleteInquiry(id) {
    return await apiClient.delete(`/crm/inquiries/${id}`);
  },

  // --- CRM Tasks ---
  /**
   * Fetch paginated list of CRM tasks.
   * @param {Object} [params] - { page, limit, status, assignedTo, relatedInquiryId, search }
   */
  async getTasks(params = {}) {
    return await apiClient.get('/crm/tasks', { params });
  },

  /**
   * Fetch a single CRM task by ID.
   * @param {string} id
   */
  async getTaskById(id) {
    return await apiClient.get(`/crm/tasks/${id}`);
  },

  /**
   * Create a new CRM task.
   * @param {Object} data
   */
  async createTask(data) {
    return await apiClient.post('/crm/tasks', data);
  },

  /**
   * Update an existing CRM task.
   * @param {string} id
   * @param {Object} data
   */
  async updateTask(id, data) {
    return await apiClient.put(`/crm/tasks/${id}`, data);
  },

  /**
   * Delete a CRM task by ID.
   * @param {string} id
   */
  async deleteTask(id) {
    return await apiClient.delete(`/crm/tasks/${id}`);
  },

  // --- CRM Meetings ---
  /**
   * Fetch paginated list of CRM meetings.
   * @param {Object} [params] - { page, limit, status, inquiryId, search }
   */
  async getMeetings(params = {}) {
    return await apiClient.get('/crm/meetings', { params });
  },

  /**
   * Fetch a single CRM meeting by ID.
   * @param {string} id
   */
  async getMeetingById(id) {
    return await apiClient.get(`/crm/meetings/${id}`);
  },

  /**
   * Schedule a new CRM meeting.
   * @param {Object} data
   */
  async scheduleMeeting(data) {
    return await apiClient.post('/crm/meetings', data);
  },

  /**
   * Update an existing CRM meeting.
   * @param {string} id
   * @param {Object} data
   */
  async updateMeeting(id, data) {
    return await apiClient.put(`/crm/meetings/${id}`, data);
  },

  /**
   * Delete a CRM meeting by ID.
   * @param {string} id
   */
  async deleteMeeting(id) {
    return await apiClient.delete(`/crm/meetings/${id}`);
  },

  // --- CRM Threads ---
  /**
   * Fetch thread for a specific inquiry.
   * @param {string} inquiryId
   */
  async getThreadByInquiryId(inquiryId) {
    return await apiClient.get(`/crm/threads/inquiry/${inquiryId}`);
  },

  /**
   * Send a message to an inquiry's thread.
   * @param {string} inquiryId
   * @param {Object} messageData
   */
  async sendThreadMessage(inquiryId, messageData) {
    return await apiClient.post(`/crm/threads/inquiry/${inquiryId}/messages`, messageData);
  },
};

export default crmApi;
