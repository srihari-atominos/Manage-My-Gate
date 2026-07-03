import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchVillasAsync,
  fetchVillaStatsAsync,
  deleteVillaAsync,
  setSearchQuery,
  setBlockFilter,
  setStatusFilter,
  setCurrentPage,
  clearSelectedVilla,
  bulkUploadVillasAsync
} from '../store/villaSlice';

/**
 * useVillaManager controller hook
 * Encapsulates Redux mapping and local modal control flags.
 */
export const useVillaManager = () => {
  const dispatch = useDispatch();

  // Selectors
  const {
    villas,
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
  } = useSelector((state) => state.villa);

  // Fetch villas on filter/pagination changes
  useEffect(() => {
    dispatch(fetchVillasAsync({ page: currentPage, limit: rowsPerPage }));
  }, [dispatch, currentPage, rowsPerPage, searchQuery, blockFilter, statusFilter]);

  // Fetch stats on mount
  useEffect(() => {
    dispatch(fetchVillaStatsAsync());
  }, [dispatch]);

  // Modal Controls
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedVillaId, setSelectedVillaId] = useState(null);
  const [batchVisible, setBatchVisible] = useState(false);
  const [bulkUploadVisible, setBulkUploadVisible] = useState(false);

  const openDetails = useCallback((villa) => {
    setSelectedVillaId(villa._id);
    setDetailsVisible(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsVisible(false);
    setSelectedVillaId(null);
    dispatch(clearSelectedVilla());
  }, [dispatch]);

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

  // Filter modifiers
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

  const removeVilla = useCallback(async (id) => {
    await dispatch(deleteVillaAsync(id));
  }, [dispatch]);

  const bulkUploadVillas = useCallback(async (villas) => {
    const resultAction = await dispatch(bulkUploadVillasAsync(villas));
    if (bulkUploadVillasAsync.fulfilled.match(resultAction)) {
      return resultAction.payload;
    } else {
      throw resultAction.payload || resultAction.error?.message || 'Failed to bulk upload villas';
    }
  }, [dispatch]);

  return {
    // State
    villas,
    stats,
    searchQuery,
    blockFilter,
    statusFilter,
    currentPage,
    totalPages,
    totalRecords,
    loading,
    error,
    
    // Modal states
    detailsVisible,
    selectedVillaId,
    batchVisible,
    bulkUploadVisible,

    // Handlers
    openDetails,
    closeDetails,
    openBatch,
    closeBatch,
    openBulkUpload,
    closeBulkUpload,
    handleSearch,
    handleBlockChange,
    handleStatusChange,
    handlePageChange,
    removeVilla,
    bulkUploadVillas,
  };
};

export default useVillaManager;
