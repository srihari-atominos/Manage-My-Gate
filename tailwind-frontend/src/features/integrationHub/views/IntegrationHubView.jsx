import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CFormInput, CRow, CCol, CAlert, CToast, CToastBody, CToastHeader, CToaster } from '@coreui/react';
import PageHeader from '../../../components/common/PageHeader';
import useIntegrationHub from '../hooks/useIntegrationHub.js';
import ProviderCard from '../components/ProviderCard.jsx';
import ProviderConnectionsModal from '../components/ProviderConnectionsModal.jsx';
import CreateConnectionModal from '../components/CreateConnectionModal.jsx';
import '../styles/_integrationHub.scss';

/**
 * Main View container for the Integration Hub.
 * Binds the useIntegrationHub hook to visual UI components.
 */
export const IntegrationHubView = () => {
  const { t } = useTranslation();
  const {
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
  } = useIntegrationHub();

  const [toastMessage, setToastMessage] = useState(null);
  const [toastColor, setToastColor] = useState('success');

  // Local actions error state to prevent overriding global loader/error
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Filter catalog based on search query
  const filteredCatalog = useMemo(() => {
    return catalog.filter((provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [catalog, searchQuery]);

  const showToast = (message, color = 'success') => {
    setToastMessage(message);
    setToastColor(color);
  };

  const handleConnectionCreate = async (formData) => {
    setActionLoading(true);
    setActionError(null);
    const result = await handleCreateConnection(formData);
    setActionLoading(false);
    if (result.success) {
      showToast(
        t('integrationHub.toast.connectSuccess', 'Integration connected successfully!'),
        'success'
      );
      return true;
    } else {
      setActionError(result.error);
      return false;
    }
  };

  const handleLabelUpdate = async (id, newLabel) => {
    setActionLoading(true);
    setActionError(null);
    const result = await handleUpdateLabel(id, newLabel);
    setActionLoading(false);
    if (result.success) {
      showToast(t('integrationHub.toast.updateSuccess', 'Label updated successfully!'), 'success');
      return true;
    } else {
      setActionError(result.error);
      return false;
    }
  };

  const handleConnectionDelete = async (id) => {
    if (
      !window.confirm(
        t('integrationHub.confirm.delete', 'Are you sure you want to disconnect this account?')
      )
    ) {
      return;
    }
    setActionLoading(true);
    setActionError(null);
    const result = await handleDeleteConnection(id);
    setActionLoading(false);
    if (result.success) {
      showToast(
        t('integrationHub.toast.deleteSuccess', 'Integration disconnected successfully!'),
        'success'
      );
    } else {
      // Gracefully catch and expose HTTP 409 errors (Orphan Mapping protection)
      showToast(result.error, 'danger');
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader
        title={t('integrationHub.title', 'Integration Hub')}
        subtitle={t('integrationHub.subtitle', 'Configure and map external third-party API credentials.')}
      />

      {error && (
        <CAlert color="danger" dismissible onClose={handleClearError}>
          {error}
        </CAlert>
      )}

      {/* Search Input */}
      <div className="relative w-full md:max-w-md lg:max-w-lg mb-4">
        <CFormInput
          type="text"
          placeholder={t('integrationHub.searchPlaceholder', 'Search providers...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Catalog Grid */}
      {filteredCatalog.length === 0 ? (
        <div className="text-center py-5 text-muted">
          {t('integrationHub.catalogEmpty', 'No matching providers found.')}
        </div>
      ) : (
        <CRow className="g-4">
          {filteredCatalog.map((provider) => (
            <CCol xs={12} sm={6} lg={4} key={provider.id}>
              <ProviderCard provider={provider} onClick={handleSelectProvider} />
            </CCol>
          ))}
        </CRow>
      )}

      {/* Connections List Modal */}
      <ProviderConnectionsModal
        isOpen={isModalOpen}
        isMaximized={isMaximized}
        selectedProvider={selectedProvider}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProvider(null);
          setActionError(null);
        }}
        onToggleMaximize={() => setIsMaximized(!isMaximized)}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        connections={connections}
        pagination={pagination}
        onPageChange={handlePageChange}
        onUpdateLabel={handleLabelUpdate}
        onDeleteConnection={handleConnectionDelete}
        isLoading={actionLoading || isLoading}
      />

      {/* Connection Setup/Creation Modal */}
      <CreateConnectionModal
        isOpen={isCreateModalOpen}
        selectedProvider={selectedProvider}
        onClose={() => {
          setIsCreateModalOpen(false);
          setActionError(null);
        }}
        onCreateConnection={handleConnectionCreate}
        isLoading={actionLoading || isLoading}
        actionError={actionError}
      />

      {/* Toast Notifications */}
      {toastMessage && (
        <CToaster placement="top-end" className="position-fixed p-3">
          <CToast
            visible={true}
            autohide={true}
            delay={4000}
            color={toastColor}
            onClose={() => setToastMessage(null)}
          >
            <CToastHeader closeButton>
              <strong className="me-auto">
                {toastColor === 'danger'
                  ? t('integrationHub.toast.errorTitle', 'Error')
                  : t('integrationHub.toast.successTitle', 'Success')}
              </strong>
            </CToastHeader>
            <CToastBody className={toastColor === 'success' || toastColor === 'danger' ? 'text-white' : ''}>
              {toastMessage}
            </CToastBody>
          </CToast>
        </CToaster>
      )}
    </div>
  );
};

export default IntegrationHubView;
