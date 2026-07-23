import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useState } from 'react';
import {
  fetchModules,
  createModule,
  updateModule,
  updateModuleStatus,
  deleteModule,
  restoreModule,
  setSelectedModule,
  clearSelectedModule,
} from '../store/workspaceModulesSlice.js';

export const useWorkspaceModules = () => {
  const dispatch = useDispatch();
  const { modules, pagination, loading, error, selectedModule } = useSelector(
    (state) => state.workspaceModules
  );
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    isSidebarVisible: '',
    isDeleted: 'false',
    sortBy: 'displayOrder',
    sortDir: 'asc',
  });

  const loadModules = useCallback(
    (newFilters = {}) => {
      const mergedFilters = { ...filters, ...newFilters };
      setFilters(mergedFilters);
      dispatch(fetchModules(mergedFilters));
    },
    [dispatch, filters]
  );

  const handleCreateModule = async (data) => {
    const result = await dispatch(createModule(data)).unwrap();
    loadModules();
    return result;
  };

  const handleUpdateModule = async (id, data) => {
    const result = await dispatch(updateModule({ id, data })).unwrap();
    loadModules();
    return result;
  };

  const handleUpdateStatus = async (id, status) => {
    const result = await dispatch(updateModuleStatus({ id, status })).unwrap();
    loadModules();
    return result;
  };

  const handleDeleteModule = async (id) => {
    const result = await dispatch(deleteModule(id)).unwrap();
    loadModules();
    return result;
  };

  const handleRestoreModule = async (id) => {
    const result = await dispatch(restoreModule(id)).unwrap();
    loadModules();
    return result;
  };

  return {
    modules,
    pagination,
    loading,
    error,
    selectedModule,
    filters,
    loadModules,
    handleCreateModule,
    handleUpdateModule,
    handleUpdateStatus,
    handleDeleteModule,
    handleRestoreModule,
    selectModule: (module) => dispatch(setSelectedModule(module)),
    clearSelection: () => dispatch(clearSelectedModule()),
  };
};

export default useWorkspaceModules;
