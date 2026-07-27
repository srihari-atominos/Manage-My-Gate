import axios from '../../../services/apiClient'

/**
 * BlacklistAPI
 *
 * Frontend service layer to handle API communications for blocklist settings.
 */
export const BlacklistAPI = {
  /**
   * Block a profile.
   * @param {Object} payload - Banned profile details.
   * @returns {Promise<Object>} The API response.
   */
  addToBlacklist: async (payload) => {
    return await axios.post('/blacklist', payload)
  },

  /**
   * Fetch all banned records for an organization.
   * @param {string} orgId - Organization ID.
   * @param {Object} [params] - Pagination options.
   * @returns {Promise<Object>} The API response.
   */
  getBlacklist: async (orgId, params) => {
    return await axios.get(`/blacklist/org/${orgId}`, { params })
  },

  /**
   * Check if credentials match any active block rules.
   * @param {string} orgId - Organization ID.
   * @param {Object} query - Name, plate or phone.
   * @returns {Promise<Object>} The API response.
   */
  checkMatch: async (orgId, query) => {
    return await axios.get(`/blacklist/org/${orgId}/check-match`, { params: query })
  },

  /**
   * Remove a profile block.
   * @param {string} id - The blacklist entry ID.
   * @returns {Promise<Object>} The API response.
   */
  removeFromBlacklist: async (id) => {
    return await axios.delete(`/blacklist/${id}`)
  },
}

export default BlacklistAPI
