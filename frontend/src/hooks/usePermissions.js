/**
 * usePermissions Custom Hook
 *
 * A global hook acting as our central UI authorization gatekeeper.
 * Currently mocked to always return true.
 *
 * @param {string} permissionName - The permission identifier to check (e.g., 'assign_roles')
 * @returns {boolean} Whether the current user possesses the requested permission
 */
export const usePermissions = (permissionName) => {
  // TODO: Integrate with Redux auth state or user permissions check when auth system is fully wired up
  return true
}

export default usePermissions
