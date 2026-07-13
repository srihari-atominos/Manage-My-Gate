import axios from '../../../services/apiClient';

/**
 * VisitorAPI
 * 
 * Frontend service layer to handle API communications for the Visitor Management module.
 * Delegates calls to the globally configured Axios instance (axios).
 */
export const VisitorAPI = {
  /**
   * Create a new pre-approved visitor pass.
   * @param {Object} payload - The pass details.
   * @returns {Promise<Object>} The API response.
   */
  createPass: async (payload) => {
    return await axios.post('/visitor-pass', payload);
  },

  /**
   * Fetch details of a specific pass.
   * @param {string} id - The pass ID.
   * @returns {Promise<Object>} The API response.
   */
  getPassDetails: async (id) => {
    return await axios.get(`/visitor-pass/${id}`);
  },

  /**
   * Fetch details of a pass by its 6-digit key code.
   * @param {string} code - The prefixed code.
   * @returns {Promise<Object>} The API response.
   */
  getPassByCode: async (code) => {
    return await axios.get(`/visitor-pass/code/${code}`);
  },

  /**
   * Update the status of a pass (e.g., revoking it).
   * @param {string} id - The pass ID.
   * @param {string} status - The new status (PENDING, ACTIVE, REVOKED, EXPIRED).
   * @returns {Promise<Object>} The API response.
   */
  updatePassStatus: async (id, status) => {
    return await axios.patch(`/visitor-pass/${id}/status`, { status });
  },

  /**
   * Get a list of passes in an organization (paginated with filters).
   * @param {string} orgId - The organization ID.
   * @param {Object} [params] - Query parameters for page, limit, statuses, etc.
   * @returns {Promise<Object>} The API response.
   */
  getPasses: async (orgId, params) => {
    return await axios.get(`/visitor-pass/org/${orgId}`, { params });
  },

  /**
   * Log entry check-in for a pre-approved visitor pass.
   * @param {Object} payload - Object containing passId and guardId.
   * @returns {Promise<Object>} The API response.
   */
  processPreApproved: async (payload) => {
    return await axios.post('/visitor-log/pre-approved', payload);
  },

  /**
   * Initiate a walk-in check-in request.
   * @param {Object} payload - The walk-in visitor details.
   * @returns {Promise<Object>} The API response.
   */
  initiateWalkIn: async (payload) => {
    return await axios.post('/visitor-log/walk-in', payload);
  },

  /**
   * Resolve a pending walk-in check-in request.
   * @param {string} id - The visitor log ID.
   * @param {'APPROVE'|'REJECT'} status - The resolution action.
   * @returns {Promise<Object>} The API response.
   */
  resolveWalkIn: async (id, status) => {
    const action = typeof status === 'string' ? status.toUpperCase() : status;
    return await axios.patch(`/visitor-log/walk-in/${id}/resolve`, { action });
  },

  /**
   * Check out a visitor currently inside the premises.
   * @param {string} id - The visitor log ID.
   * @returns {Promise<Object>} The API response.
   */
  checkoutVisitor: async (id) => {
    return await axios.patch(`/visitor-log/${id}/checkout`);
  },

  /**
   * Fetch all visitor logs for visitors currently inside the premises.
   * @param {string} orgId - The organization ID.
   * @returns {Promise<Object>} The API response.
   */
  getActiveVisitors: async (orgId) => {
    return await axios.get(`/visitor-log/org/${orgId}/inside`);
  },

  /**
   * Fetch paginated visitor logs history.
   * @param {string} orgId - The organization ID.
   * @param {Object} [params] - Query pagination options.
   * @returns {Promise<Object>} The API response.
   */
  getHistoryLogs: async (orgId, params) => {
    return await axios.get(`/visitor-log/org/${orgId}`, { params });
  },

  /**
   * Fetch all pending walk-in log approvals.
   * @param {string} orgId - The organization ID.
   * @returns {Promise<Object>} The API response.
   */
  getPendingApprovals: async (orgId) => {
    return await axios.get(`/visitor-log/org/${orgId}/pending`);
  }
};

export default VisitorAPI;
