import { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getCatalog as fetchCatalog,
  getConnections as fetchConnections,
  connectIntegration as createConnection,
  updateLabel,
  disconnectIntegration as deleteConnection,
  clearError,
} from '../store/integrationHubSlice.js';

/**
 * Controller Hook for the Integration Hub feature.
 * Separates visual UI rendering from business logic, state selectors, and API actions.
 */
export const useIntegrationHub = () => {
  const dispatch = useDispatch();

  // Redux state selectors
  const { catalog, connections, pagination, isLoading, error } = useSelector(
    (state) => state.integrationHub
  );

  // Local UI-only state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Auto-fetch catalog on mount
  useEffect(() => {
    dispatch(fetchCatalog());
  }, [dispatch]);

  // Auto-fetch connections whenever the selected provider changes
  useEffect(() => {
    if (selectedProvider) {
      dispatch(fetchConnections({ provider: selectedProvider.id, page: 1, limit: 10 }));
    }
  }, [dispatch, selectedProvider]);

  /**
   * Handle selecting a provider from the catalog
   */
  const handleSelectProvider = useCallback((provider) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  }, []);

  /**
   * Handle pagination page change
   */
  const handlePageChange = useCallback((newPage) => {
    if (selectedProvider) {
      dispatch(
        fetchConnections({
          provider: selectedProvider.id,
          page: newPage,
          limit: pagination.limit || 10,
        })
      );
    }
  }, [dispatch, selectedProvider, pagination.limit]);

  /**
   * Handle connection creation/validation submission
   */
  const handleCreateConnection = useCallback(async (formData) => {
    try {
      const result = await dispatch(createConnection(formData)).unwrap();
      setIsCreateModalOpen(false);
      if (selectedProvider) {
        dispatch(
          fetchConnections({
            provider: selectedProvider.id,
            page: pagination.currentPage || 1,
            limit: pagination.limit || 10,
          })
        );
      }
      return { success: true, data: result };
    } catch (err) {
      console.error('Create connection error:', err);
      return { success: false, error: err };
    }
  }, [dispatch, selectedProvider, pagination.currentPage, pagination.limit]);

  /**
   * Handle updating a connection label
   */
  const handleUpdateLabel = useCallback(async (id, newLabel) => {
    try {
      const result = await dispatch(updateLabel({ id, accountLabel: newLabel })).unwrap();
      return { success: true, data: result };
    } catch (err) {
      console.error('Update label error:', err);
      return { success: false, error: err };
    }
  }, [dispatch]);

  /**
   * Handle deleting/disconnecting a connection
   * Gracefully catches and returns error strings (such as 409 conflict checks)
   */
  const handleDeleteConnection = useCallback(async (id) => {
    try {
      const result = await dispatch(deleteConnection(id)).unwrap();
      if (selectedProvider) {
        dispatch(
          fetchConnections({
            provider: selectedProvider.id,
            page: pagination.currentPage || 1,
            limit: pagination.limit || 10,
          })
        );
      }
      return { success: true, data: result };
    } catch (err) {
      console.error('Delete connection error:', err);
      // Surface the exact error message so the UI view can trigger a toast
      return { success: false, error: err };
    }
  }, [dispatch, selectedProvider, pagination.currentPage, pagination.limit]);

  /**
   * Clear error state
   */
  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    // Redux State
    catalog,
    connections,
    pagination,
    isLoading,
    error,

    // Local UI State
    searchQuery,
    setSearchQuery,
    selectedProvider,
    setSelectedProvider,
    isModalOpen,
    setIsModalOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isMaximized,
    setIsMaximized,

    // Handlers
    handleSelectProvider,
    handlePageChange,
    handleCreateConnection,
    handleUpdateLabel,
    handleDeleteConnection,
    handleClearError,
  };
};

export default useIntegrationHub;
