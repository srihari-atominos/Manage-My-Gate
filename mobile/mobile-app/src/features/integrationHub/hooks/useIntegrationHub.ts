import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchCatalogAsync,
  fetchConnectionsAsync,
  connectIntegrationAsync,
  updateConnectionLabelAsync,
  deleteConnectionAsync,
  setSelectedProvider,
  clearError,
} from '../store/integrationHubSlice';
import { ProviderCatalogItem, IntegrationConnection } from '../services/integrationHubApi';

export const useIntegrationHub = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    catalog,
    connections,
    selectedProvider,
    isLoading,
    isSubmitting,
    error,
    pagination,
  } = useSelector((state: RootState) => state.integrationHub);

  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [targetConnection, setTargetConnection] = useState<IntegrationConnection | null>(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProviderCatalogItem | null>(null);

  // Load catalog and connections on mount
  useEffect(() => {
    dispatch(fetchCatalogAsync());
    dispatch(fetchConnectionsAsync({ provider: selectedProvider, page: 1 }));
  }, [dispatch]);

  const handleSelectProvider = useCallback(
    (provider: string) => {
      dispatch(setSelectedProvider(provider));
      dispatch(fetchConnectionsAsync({ provider, page: 1 }));
    },
    [dispatch]
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchConnectionsAsync({ provider: selectedProvider, page: 1 }));
  }, [dispatch, selectedProvider]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(fetchConnectionsAsync({ provider: selectedProvider, page }));
    },
    [dispatch, selectedProvider]
  );

  const openConnectModal = useCallback(
    (catalogItem?: ProviderCatalogItem) => {
      if (catalogItem) {
        setSelectedCatalogItem(catalogItem);
      } else if (catalog.length > 0) {
        setSelectedCatalogItem(catalog[0]);
      }
      setConnectModalVisible(true);
    },
    [catalog]
  );

  const closeConnectModal = useCallback(() => {
    setConnectModalVisible(false);
    setSelectedCatalogItem(null);
    dispatch(clearError());
  }, [dispatch]);

  const handleConnectSubmit = useCallback(
    async (payload: { provider: string; accountLabel: string; credentials: Record<string, any> }) => {
      const action = await dispatch(connectIntegrationAsync(payload));
      if (connectIntegrationAsync.fulfilled.match(action)) {
        setConnectModalVisible(false);
        setSelectedCatalogItem(null);
        return true;
      }
      return false;
    },
    [dispatch]
  );

  const promptDelete = useCallback((connection: IntegrationConnection) => {
    setTargetConnection(connection);
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setDeleteModalVisible(false);
    setTargetConnection(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (targetConnection) {
      await dispatch(deleteConnectionAsync(targetConnection.id));
      setDeleteModalVisible(false);
      setTargetConnection(null);
    }
  }, [dispatch, targetConnection]);

  return {
    catalog,
    connections,
    selectedProvider,
    isLoading,
    isSubmitting,
    error,
    pagination,
    connectModalVisible,
    deleteModalVisible,
    targetConnection,
    selectedCatalogItem,
    setSelectedCatalogItem,
    handleSelectProvider,
    handleRefresh,
    handlePageChange,
    openConnectModal,
    closeConnectModal,
    handleConnectSubmit,
    promptDelete,
    closeDeleteModal,
    confirmDelete,
  };
};

export default useIntegrationHub;
