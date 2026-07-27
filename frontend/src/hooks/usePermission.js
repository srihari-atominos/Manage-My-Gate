import { useSelector } from 'react-redux'

/**
 * Custom React hook to check if the current user possesses permission for a feature action.
 * Automatically grants permission for 'Super Admin' users.
 *
 * @param {string} feature - The resource feature (e.g. 'users', 'roles', 'samples')
 * @param {string} action - The action type (e.g. 'create', 'read', 'update', 'delete')
 * @returns {boolean} True if permitted, false otherwise
 */
export const usePermission = (feature, action) => {
  const { user } = useSelector((state) => state.auth)

  if (!user) return false

  // Bypass checks for Super Admin and Platform Super Admin roles
  if (user.role === 'Super Admin' || user.role === 'Platform Super Admin') return true

  const requiredPermission = `${feature}:${action}`
  return !!(user.permissions && user.permissions.includes(requiredPermission))
}

export default usePermission
