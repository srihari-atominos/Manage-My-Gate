/**
 * Permission Name Compatibility Mapper
 *
 * Normalises legacy permission strings so that existing role documents
 * (which may use either format) continue to work without a database migration.
 *
 * The backend uses the format `feature:action` internally (e.g. `amenities:read`).
 * If any role documents were created with the dot-format (amenities.read) this
 * mapper converts them before the permission check runs.
 */

const legacyMap = {
  // Dot-format → colon-format (canonical internal format)
  'amenities.read': 'amenities:read',
  'amenities.book': 'amenities:book',
  'amenities.cancel_booking': 'amenities:cancel_booking',
  'amenities.create': 'amenities:create',
  'amenities.update': 'amenities:update',
  'amenities.delete': 'amenities:delete',
  'amenities.manage_bookings': 'amenities:manage_bookings',
  // Notices Backward Compatibility (Legacy to New RBAC)
  'notices.read': 'notices:active_board',
  'notices:read': 'notices:active_board',
  'notices.create': 'notices:manage_notices',
  'notices:create': 'notices:manage_notices',
  'notices.update': 'notices:manage_notices',
  'notices:update': 'notices:manage_notices',
  'notices.delete': 'notices:manage_notices',
  'notices:delete': 'notices:manage_notices',
  'notices.active_board': 'notices:active_board',
  'notices.dashboard': 'notices:dashboard',
};

/**
 * Returns the canonical permission string, resolving any legacy alias.
 * @param {string} permission - Raw permission string from DB or middleware call
 * @returns {string} Canonical permission string
 */
export const mapPermission = (permission) => legacyMap[permission] || permission;

export default mapPermission;
