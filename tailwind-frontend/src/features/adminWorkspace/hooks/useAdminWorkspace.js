import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useState } from 'react';
import {
  fetchWorkspaces,
  fetchWorkspaceById,
  createWorkspace,
  updateWorkspace,
  updateWorkspaceStatus,
  deleteWorkspace,
  restoreWorkspace,
  duplicateWorkspace,
  clearCurrentWorkspace,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
} from '../store/adminWorkspaceSlice.js';
import { fetchModules } from '../../workspace/store/workspaceModulesSlice.js';

export const useAdminWorkspace = () => {
  const dispatch = useDispatch();
  const { workspaces, pagination, loading, error, currentWorkspace } = useSelector(
    (state) => state.adminWorkspace
  );
  
  // Also get the global modules from the other slice for the form selection
  const globalModules = useSelector((state) => state.workspaceModules?.modules || []);

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    isDeleted: 'false',
    sortBy: 'createdAt',
    sortDir: 'desc',
  });

  const loadWorkspaces = useCallback(
    (newFilters = {}) => {
      const mergedFilters = { ...filters, ...newFilters };
      setFilters(mergedFilters);
      dispatch(fetchWorkspaces(mergedFilters));
    },
    [dispatch, filters]
  );

  const loadWorkspaceById = useCallback(
    (id) => {
      return dispatch(fetchWorkspaceById(id)).unwrap();
    },
    [dispatch]
  );

  const loadGlobalModules = useCallback(() => {
    // Load active, visible modules for assignment
    dispatch(fetchModules({ status: 'Active', isDeleted: false, limit: 100 }));
  }, [dispatch]);

  const handleCreateWorkspace = async (data) => {
    const result = await dispatch(createWorkspace(data)).unwrap();
    loadWorkspaces();
    return result;
  };

  const handleUpdateWorkspace = async (id, data) => {
    const result = await dispatch(updateWorkspace({ id, data })).unwrap();
    loadWorkspaces();
    return result;
  };

  const handleUpdateStatus = async (id, status) => {
    const result = await dispatch(updateWorkspaceStatus({ id, status })).unwrap();
    loadWorkspaces();
    return result;
  };

  const handleDeleteWorkspace = async (id) => {
    const result = await dispatch(deleteWorkspace(id)).unwrap();
    loadWorkspaces();
    return result;
  };

  const handleRestoreWorkspace = async (id) => {
    const result = await dispatch(restoreWorkspace(id)).unwrap();
    loadWorkspaces();
    return result;
  };

  const handleDuplicateWorkspace = async (id, newName) => {
    const result = await dispatch(duplicateWorkspace({ id, newName })).unwrap();
    loadWorkspaces();
    return result;
  };

  const handleFetchWorkspaceMembers = useCallback(async (id) => {
    return await dispatch(fetchWorkspaceMembers(id)).unwrap();
  }, [dispatch]);

  const handleAddWorkspaceMember = async (id, userId) => {
    return await dispatch(addWorkspaceMember({ id, userId })).unwrap();
  };

  const handleRemoveWorkspaceMember = async (id, userId) => {
    return await dispatch(removeWorkspaceMember({ id, userId })).unwrap();
  };

  return {
    workspaces,
    pagination,
    loading,
    error,
    currentWorkspace,
    filters,
    globalModules,
    loadWorkspaces,
    loadWorkspaceById,
    loadGlobalModules,
    handleCreateWorkspace,
    handleUpdateWorkspace,
    handleUpdateStatus,
    handleDeleteWorkspace,
    handleRestoreWorkspace,
    handleDuplicateWorkspace,
    handleFetchWorkspaceMembers,
    handleAddWorkspaceMember,
    handleRemoveWorkspaceMember,
    clearCurrentWorkspace: () => dispatch(clearCurrentWorkspace()),
  };
};

export default useAdminWorkspace;
