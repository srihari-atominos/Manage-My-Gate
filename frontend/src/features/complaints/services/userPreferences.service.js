const PREFERENCES_KEY_PREFIX = 'gated_community_user_prefs_'

export const userPreferencesService = {
  /**
   * Helper to resolve active tenant organization ID
   */
  _getActiveOrgId: (orgId) => {
    if (orgId && typeof orgId === 'string') return orgId
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const u = JSON.parse(userStr)
        return u?.orgId || u?.activeOrgId || u?.organizationId || 'global'
      }
    } catch (e) {}
    return 'global'
  },

  /**
   * Get recently used issues for a user and category
   * @param {string} userId - The current user's ID
   * @param {string} category - The complaint category
   * @param {string} [orgId] - Optional active organization ID for tenant isolation
   * @returns {Array} Array of recently used issue names
   */
  getRecentlyUsedIssues: (userId, category, orgId) => {
    try {
      if (!userId || !category) return []
      const tenantId = userPreferencesService._getActiveOrgId(orgId)
      const key = `${PREFERENCES_KEY_PREFIX}${tenantId}_${userId}_recent_issues`
      const stored = localStorage.getItem(key)
      if (!stored) return []
      const prefs = JSON.parse(stored)
      return prefs[category] || []
    } catch (e) {
      console.error('Failed to load user preferences', e)
      return []
    }
  },

  /**
   * Add an issue to the recently used list
   * @param {string} userId - The current user's ID
   * @param {string} category - The complaint category
   * @param {string} issueName - The issue name to record
   * @param {string} [orgId] - Optional active organization ID for tenant isolation
   */
  addRecentlyUsedIssue: (userId, category, issueName, orgId) => {
    try {
      if (!userId || !category || !issueName || issueName === 'Other Issue') return

      const tenantId = userPreferencesService._getActiveOrgId(orgId)
      const key = `${PREFERENCES_KEY_PREFIX}${tenantId}_${userId}_recent_issues`
      const stored = localStorage.getItem(key)
      const prefs = stored ? JSON.parse(stored) : {}

      if (!prefs[category]) {
        prefs[category] = []
      }

      // Remove if it exists to bring it to top
      prefs[category] = prefs[category].filter((i) => i !== issueName)

      // Add to front
      prefs[category].unshift(issueName)

      // Keep only last 5
      if (prefs[category].length > 5) {
        prefs[category] = prefs[category].slice(0, 5)
      }

      localStorage.setItem(key, JSON.stringify(prefs))
    } catch (e) {
      console.error('Failed to save user preferences', e)
    }
  },
}
