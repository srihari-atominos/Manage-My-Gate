import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { fetchWorkspaceSettings, saveWorkspaceSettings, fetchWorkspaceModules, toggleWorkspaceModule, clearWorkspaceError, WorkspaceSettings } from '../store/workspaceSlice';

export const useWorkspace = () => {
  const dispatch = useDispatch<AppDispatch>();
  const workspaceState = useSelector((state: RootState) => state.workspace);

  const loadWorkspaceDetails = useCallback(
    (workspaceId: string) => {
      return dispatch(fetchWorkspaceSettings(workspaceId));
    },
    [dispatch]
  );

  const saveWorkspaceDetails = useCallback(
    (workspaceId: string, data: WorkspaceSettings) => {
      return dispatch(saveWorkspaceSettings({ workspaceId, data }));
    },
    [dispatch]
  );

  const loadWorkspaceModules = useCallback(
    (workspaceId: string) => {
      return dispatch(fetchWorkspaceModules(workspaceId));
    },
    [dispatch]
  );

  const toggleModuleStatus = useCallback(
    (workspaceId: string, moduleId: string, enabled: boolean) => {
      return dispatch(toggleWorkspaceModule({ workspaceId, moduleId, enabled }));
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearWorkspaceError());
  }, [dispatch]);

  return {
    ...workspaceState,
    loadWorkspaceDetails,
    saveWorkspaceDetails,
    loadWorkspaceModules,
    allModules: workspaceState.allModules,
    toggleModuleStatus,
    clearError,
  };
};
