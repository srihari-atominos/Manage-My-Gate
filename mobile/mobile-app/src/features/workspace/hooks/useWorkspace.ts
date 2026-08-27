import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { fetchWorkspaceSettings, saveWorkspaceSettings, clearWorkspaceError, WorkspaceSettings } from '../store/workspaceSlice';

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

  const clearError = useCallback(() => {
    dispatch(clearWorkspaceError());
  }, [dispatch]);

  return {
    ...workspaceState,
    loadWorkspaceDetails,
    saveWorkspaceDetails,
    clearError,
  };
};
