import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchVillasAsync,
  fetchVillaStatsAsync,
  fetchVillaBlocksAsync,
  createVillaAsync,
  updateVillaAsync,
  deleteVillaAsync,
  assignPrimaryResidentAsync,
  setSearchQuery,
  setBlockFilter,
  setStatusFilter,
  setCurrentPage,
  clearSelectedVilla,
  bulkUploadVillasAsync,
  batchGenerateVillasAsync,
  assignExistingUserThunk,
  updateResidencyTypeThunk,
  removeResidentThunk,
  fetchVillaByIdAsync
} from '../store/villaSlice';
import { fetchUsersAsync } from '../../userManagement/store/userSlice';

export const useVilla = () => {
  const dispatch = useDispatch();

  const {
    villas,
    blocks,
    blocksLoading,
    stats,
    searchQuery,
    blockFilter,
    statusFilter,
    currentPage,
    rowsPerPage,
    totalRecords,
    totalPages,
    loading,
    error,
    selectedVilla,
    selectedVillaLoading
  } = useSelector((state) => state.villa);

  const activeWorkspace = useSelector((state) => state.workspace);
  const orgId = activeWorkspace?.activeOrganizationId || activeWorkspace?.activeOrgId || activeWorkspace?.orgId || null;

  // Modal Visibility State
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedVillaId, setSelectedVillaId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingVilla, setEditingVilla] = useState(null);
  const [batchVisible, setBatchVisible] = useState(false);
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);

  // Fetch villas on changes
  useEffect(() => {
    if (orgId) {
      dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }));
    }
  }, [dispatch, orgId, currentPage, rowsPerPage, searchQuery, blockFilter, statusFilter]);

  // Fetch stats on mount
  useEffect(() => {
    if (orgId) {
      dispatch(fetchVillaStatsAsync());
      dispatch(fetchVillaBlocksAsync());
    }
  }, [dispatch, orgId]);

  const openDetails = useCallback((villa) => {
    setSelectedVillaId(villa._id);
    setDetailsVisible(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsVisible(false);
    setSelectedVillaId(null);
    dispatch(clearSelectedVilla());
  }, [dispatch]);

  const openForm = useCallback((villa = null) => {
    setEditingVilla(villa);
    setFormVisible(true);
  }, []);

  const closeForm = useCallback(() => {
    setEditingVilla(null);
    setFormVisible(false);
  }, []);

  const openBatch = useCallback(() => {
    setBatchVisible(true);
  }, []);

  const closeBatch = useCallback(() => {
    setBatchVisible(false);
  }, []);

  const openBulkUpload = useCallback(() => {
    setBulkUploadVisible(true);
  }, []);

  const closeBulkUpload = useCallback(() => {
    setBulkUploadVisible(false);
  }, []);

  const handleSearch = useCallback((query) => {
    dispatch(setSearchQuery(query));
    dispatch(setCurrentPage(1));
  }, [dispatch]);

  const handleBlockChange = useCallback((block) => {
    dispatch(setBlockFilter(block));
    dispatch(setCurrentPage(1));
  }, [dispatch]);

  const handleStatusChange = useCallback((status) => {
    dispatch(setStatusFilter(status));
    dispatch(setCurrentPage(1));
  }, [dispatch]);

  const handlePageChange = useCallback((page) => {
    dispatch(setCurrentPage(page));
  }, [dispatch]);

  const createVilla = useCallback(async (data) => {
    const result = await dispatch(createVillaAsync(data));
    if (createVillaAsync.fulfilled.match(result)) {
      dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch, currentPage, rowsPerPage]);

  const updateVilla = useCallback(async (id, data) => {
    const result = await dispatch(updateVillaAsync({ id, villaData: data }));
    if (updateVillaAsync.fulfilled.match(result)) {
      dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch, currentPage, rowsPerPage]);

  const removeVilla = useCallback(async (id) => {
    const result = await dispatch(deleteVillaAsync(id));
    if (deleteVillaAsync.fulfilled.match(result)) {
      dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }));
      return id;
    }
    throw result.payload;
  }, [dispatch, currentPage, rowsPerPage]);

  const assignResident = useCallback(async (id, residentId) => {
    const result = await dispatch(assignPrimaryResidentAsync({ id, residentId }));
    if (assignPrimaryResidentAsync.fulfilled.match(result)) {
      dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch, currentPage, rowsPerPage]);

  const bulkUploadVillas = useCallback(async (villas) => {
    const result = await dispatch(bulkUploadVillasAsync(villas));
    if (bulkUploadVillasAsync.fulfilled.match(result)) {
      dispatch(fetchVillasAsync({ page: 1, limit: rowsPerPage }));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch, rowsPerPage]);

  const batchGenerateVillas = useCallback(async (batchData) => {
    const result = await dispatch(batchGenerateVillasAsync(batchData));
    if (batchGenerateVillasAsync.fulfilled.match(result)) {
      dispatch(fetchVillasAsync({ page: 1, limit: rowsPerPage }));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch, rowsPerPage]);

  const { users: workspaceUsers } = useSelector((state) => state.userManagement || { users: [] });

  const fetchWorkspaceUsers = useCallback(() => {
    dispatch(fetchUsersAsync({ page: 1, limit: 100 }));
  }, [dispatch]);

  const assignExistingUser = useCallback(async (villaId, userId, residencyType) => {
    const result = await dispatch(assignExistingUserThunk({ villaId, userId, residencyType }));
    if (assignExistingUserThunk.fulfilled.match(result)) {
      dispatch(fetchVillaByIdAsync(villaId));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch]);

  const updateResidencyType = useCallback(async (villaId, userId, residencyType) => {
    const result = await dispatch(updateResidencyTypeThunk({ villaId, userId, residencyType }));
    if (updateResidencyTypeThunk.fulfilled.match(result)) {
      dispatch(fetchVillaByIdAsync(villaId));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch]);

  const removeResident = useCallback(async (villaId, userId) => {
    const result = await dispatch(removeResidentThunk({ villaId, userId }));
    if (removeResidentThunk.fulfilled.match(result)) {
      dispatch(fetchVillaByIdAsync(villaId));
      return result.payload;
    }
    throw result.payload;
  }, [dispatch]);

  return {
    villas,
    blocks,
    blocksLoading,
    stats,
    searchQuery,
    blockFilter,
    statusFilter,
    currentPage,
    totalPages,
    totalRecords,
    loading,
    error,
    selectedVilla,
    selectedVillaLoading,
    orgId,
    workspaceUsers,

    // Modal Control Flags
    detailsVisible,
    selectedVillaId,
    formVisible,
    editingVilla,
    batchVisible,
    bulkUploadVisible,

    // Callbacks
    openDetails,
    closeDetails,
    openForm,
    closeForm,
    openBatch,
    closeBatch,
    openBulkUpload,
    closeBulkUpload,
    handleSearch,
    handleBlockChange,
    handleStatusChange,
    handlePageChange,
    createVilla,
    updateVilla,
    removeVilla,
    assignResident,
    bulkUploadVillas,
    batchGenerateVillas,
    fetchWorkspaceUsers,
    assignExistingUser,
    updateResidencyType,
    removeResident
  };
};

export default useVilla;
