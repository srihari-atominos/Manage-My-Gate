import { useDispatch, useSelector } from 'react-redux';
import { switchWorkspaceContext } from '../../auth/store/authSlice.js';

/**
 * Custom hook acting as the Thin View controller for the Workspace Switcher UI.
 */
export const useWorkspaceSwitcher = () => {
  const dispatch = useDispatch();

  const availableWorkspaces = useSelector((state) => state.workspace.availableWorkspaces);
  const activeWorkspace = useSelector((state) => ({
    orgId: state.workspace.activeOrganizationId,
    role: state.workspace.activeRole,
    isPlatform: state.workspace.isPlatform,
    name: state.workspace.organizationName,
  }));

  const handleSwitchWorkspace = async (targetOrgId) => {
    try {
      await dispatch(switchWorkspaceContext(targetOrgId)).unwrap();
      // Redirect to home/dashboard and reload the page to refresh all active data queries
      window.location.hash = '#/dashboard';
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch workspace context:', err);
    }
  };

  return {
    availableWorkspaces,
    activeWorkspace,
    handleSwitchWorkspace,
  };
};

export default useWorkspaceSwitcher;
