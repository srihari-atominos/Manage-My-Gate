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

  // Modals state
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Target item selections
  const [selectedConnection, setSelectedConnection] = useState<IntegrationConnection | null>(null);
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
    dispatch(fetchCatalogAsync());
    dispatch(fetchConnectionsAsync({ provider: selectedProvider, page: 1 }));
  }, [dispatch, selectedProvider]);

  const handlePageChange = useCallback(
    (page: number) => {
      dispatch(fetchConnectionsAsync({ provider: selectedProvider, page }));
    },
    [dispatch, selectedProvider]
  );

  // Connect Provider Modal handlers
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

  // Bank Details Modal handlers
  const openBankModal = useCallback(() => {
    setBankModalVisible(true);
  }, []);

  const closeBankModal = useCallback(() => {
    setBankModalVisible(false);
    dispatch(clearError());
  }, [dispatch]);

  const handleBankDetailsSubmit = useCallback(
    async (bankingData: {
      accountHolderName: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
      accountType: string;
      razorpayKeyId?: string;
      razorpayKeySecret?: string;
    }) => {
      const bankAction = await dispatch(
        connectIntegrationAsync({
          provider: 'banking',
          accountLabel: `${bankingData.bankName} Vault`,
          credentials: {
            accountName: bankingData.accountHolderName,
            accountNumber: bankingData.accountNumber,
            ifscCode: bankingData.ifscCode,
          },
        })
      );

      if (bankingData.razorpayKeyId && bankingData.razorpayKeySecret) {
        await dispatch(
          connectIntegrationAsync({
            provider: 'razorpay',
            accountLabel: 'Razorpay Payment Gateway',
            credentials: {
              keyId: bankingData.razorpayKeyId,
              keySecret: bankingData.razorpayKeySecret,
            },
          })
        );
      }

      if (connectIntegrationAsync.fulfilled.match(bankAction)) {
        setBankModalVisible(false);
        return true;
      }
      return false;
    },
    [dispatch]
  );

  // Edit Label Modal handlers
  const openEditModal = useCallback((connection: IntegrationConnection) => {
    setSelectedConnection(connection);
    setEditModalVisible(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
    setSelectedConnection(null);
    dispatch(clearError());
  }, [dispatch]);

  const handleUpdateLabelSubmit = useCallback(
    async (id: string, newLabel: string) => {
      const action = await dispatch(updateConnectionLabelAsync({ id, accountLabel: newLabel }));
      if (updateConnectionLabelAsync.fulfilled.match(action)) {
        setEditModalVisible(false);
        setSelectedConnection(null);
        dispatch(fetchConnectionsAsync({ provider: selectedProvider, page: 1 }));
        return true;
      }
      return false;
    },
    [dispatch, selectedProvider]
  );

  // Connection Details Modal handlers
  const openDetailsModal = useCallback((connection: IntegrationConnection) => {
    setSelectedConnection(connection);
    setDetailsModalVisible(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModalVisible(false);
    setSelectedConnection(null);
  }, []);

  // Delete Modal handlers
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
    bankModalVisible,
    editModalVisible,
    detailsModalVisible,
    deleteModalVisible,
    selectedConnection,
    targetConnection,
    selectedCatalogItem,
    setSelectedCatalogItem,
    handleSelectProvider,
    handleRefresh,
    handlePageChange,
    openConnectModal,
    closeConnectModal,
    handleConnectSubmit,
    openBankModal,
    closeBankModal,
    handleBankDetailsSubmit,
    openEditModal,
    closeEditModal,
    handleUpdateLabelSubmit,
    openDetailsModal,
    closeDetailsModal,
    promptDelete,
    closeDeleteModal,
    confirmDelete,
  };
};

export default useIntegrationHub;
