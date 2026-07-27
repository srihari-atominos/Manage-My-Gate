import { useDispatch, useSelector } from 'react-redux'
import { setActiveWorkspace, clearWorkspace } from '../store/workspaceSlice.js'

/**
 * Custom hook acting as the Thin View controller for Workspace/Tenant state.
 */
export const useWorkspace = () => {
  const dispatch = useDispatch()

  const activeOrganizationId = useSelector((state) => state.workspace.activeOrganizationId)
  const activeRole = useSelector((state) => state.workspace.activeRole)
  const allowedFeatures = useSelector((state) => state.workspace.allowedFeatures)
  const organizationName = useSelector((state) => state.workspace.organizationName)
  const isPlatform = useSelector((state) => state.workspace.isPlatform)
  const loading = useSelector((state) => state.workspace.loading)
  const error = useSelector((state) => state.workspace.error)

  const switchWorkspace = (workspaceData) => {
    dispatch(setActiveWorkspace(workspaceData))
  }

  const resetWorkspace = () => {
    dispatch(clearWorkspace())
  }

  return {
    activeOrganizationId,
    activeRole,
    allowedFeatures,
    organizationName,
    isPlatform,
    loading,
    error,
    switchWorkspace,
    resetWorkspace,
  }
}

export default useWorkspace
