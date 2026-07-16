import apiClient from '../../../services/apiClient.js';

export const assessmentService = {
  /**
   * Fetch all assessment billing templates.
   * @param {Object} [params]
   */
  async getAssessments(params = {}) {
    return await apiClient.get('/assessments', { params });
  },

  /**
   * Create a new assessment billing template.
   * @param {Object} payload
   */
  async createAssessment(payload) {
    return await apiClient.post('/assessments', payload);
  },

  /**
   * Update an assessment billing template.
   * @param {string} id
   * @param {Object} payload
   */
  async updateAssessment(id, payload) {
    return await apiClient.patch(`/assessments/${id}`, payload);
  },
};

export default assessmentService;
