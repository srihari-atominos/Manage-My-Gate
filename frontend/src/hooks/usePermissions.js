/**
 * usePermissions Custom Hook
 *
 * A global hook acting as our central UI authorization gatekeeper.
 * Currently mocked to always return true.
 *
 * @param {string} permissionName - The permission identifier to check (e.g., 'assign_roles')
 * @returns {boolean} Whether the current user possesses the requested permission
 */
import { useAuth } from '../features/auth/hooks/useAuth'

export const usePermissions = (permissionName) => {
  const { checkPermission } = useAuth()
  return checkPermission(permissionName)
}

export default usePermissions
