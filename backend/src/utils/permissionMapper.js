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
  // Polls Backward Compatibility & Normalization
  'polls.read': 'polls:read',
  'polls.create': 'polls:create',
  'polls.update': 'polls:update',
  'polls.delete': 'polls:delete',
  'polls.publish': 'polls:publish',
  'polls.vote': 'polls:vote',
  'polls.view_voters': 'polls:view_voters',
  'polls.close': 'polls:close',
  'polls.export': 'polls:export',
  'polls:manage': 'notices:manage_notices',
  'notices:manage_polls': 'notices:manage_notices',
  'notices:view_polls': 'polls:read',
  'notices:vote_polls': 'polls:vote',
};

/**
 * Returns the canonical permission string, resolving any legacy alias.
 * @param {string} permission - Raw permission string from DB or middleware call
 * @returns {string} Canonical permission string
 */
export const mapPermission = (permission) => legacyMap[permission] || permission;

/**
 * Expands a user's permissions set based on role hierarchies and coarse-grained permissions.
 * E.g., 'notices:manage_notices' automatically grants granular notice and poll management rights.
 * 'notices:polls' grants 'polls:read' and 'polls:vote'.
 * 'notices:active_board' grants 'notices:read'.
 *
 * @param {string[]} permissions - Canonical or mapped permission strings
 * @returns {string[]} Expanded list of granted permissions
 */
export const expandUserPermissions = (permissions) => {
  const permSet = new Set(permissions);

  if (permSet.has('notices:manage_notices')) {
    permSet.add('notices:create');
    permSet.add('notices:update');
    permSet.add('notices:delete');
    permSet.add('notices:publish');
    permSet.add('notices:pin');
    permSet.add('notices:read');
    permSet.add('notices:active_board');
    permSet.add('notices:dashboard');
    permSet.add('notices:acknowledge');
    permSet.add('notices:polls');
    permSet.add('polls:create');
    permSet.add('polls:update');
    permSet.add('polls:delete');
    permSet.add('polls:publish');
    permSet.add('polls:close');
    permSet.add('polls:view_voters');
    permSet.add('polls:export');
    permSet.add('polls:read');
    permSet.add('polls:vote');
  }

  if (permSet.has('notices:active_board')) {
    permSet.add('notices:read');
  }

  if (permSet.has('notices:polls')) {
    permSet.add('polls:read');
    permSet.add('polls:vote');
  }

  return Array.from(permSet);
};

export default mapPermission;

