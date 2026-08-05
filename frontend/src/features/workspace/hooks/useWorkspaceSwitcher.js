import { useDispatch, useSelector } from 'react-redux'
import { switchWorkspaceContext } from '../../auth/store/authSlice.js'

/**
 * Custom hook acting as the Thin View controller for the Workspace Switcher UI.
 */
export const useWorkspaceSwitcher = () => {
  const dispatch = useDispatch()

  const availableWorkspaces = useSelector((state) => state.workspace.availableWorkspaces)
  const orgId = useSelector((state) => state.workspace.activeOrganizationId)
  const role = useSelector((state) => state.workspace.activeRole)
  const isPlatform = useSelector((state) => state.workspace.isPlatform)
  const name = useSelector((state) => state.workspace.organizationName)

  const activeVillaId = useSelector((state) => state.auth.user?.villaId) || null
  const activeWorkspace = { orgId, role, isPlatform, name, villaId: activeVillaId }

  const handleSwitchWorkspace = async (targetOrgId, targetVillaId = null) => {
    try {
      // Note: we pass an object with both targetOrgId and targetVillaId
      await dispatch(switchWorkspaceContext({ targetOrgId, targetVillaId })).unwrap()
      // Redirect to home/dashboard without hard-reloading
      window.location.hash = '#/dashboard'
    } catch (err) {
      console.error('Failed to switch workspace context:', err)
    }
  }

  return {
    availableWorkspaces,
    activeWorkspace,
    handleSwitchWorkspace,
  }
}

export default useWorkspaceSwitcher
