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
  clearSelectedVilla
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

    // Handlers
    openDetails,
    closeDetails,
    openBatch,
    closeBatch,
    handleSearch,
    handleBlockChange,
    handleStatusChange,
    handlePageChange,
    removeVilla,
  };
};

export default useVillaManager;
