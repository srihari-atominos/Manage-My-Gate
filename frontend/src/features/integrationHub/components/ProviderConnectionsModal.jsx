import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { CModal, CModalHeader, CModalTitle, CModalBody, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFullscreen, cilFullscreenExit, cilPlus, cilX } from '@coreui/icons'
import ConnectionTable from './ConnectionTable.jsx'
import '../styles/_integrationHub.scss'

/**
 * Modal displaying existing integration connections with an option to open the creation form.
 */
export const ProviderConnectionsModal = ({
  isOpen,
  isMaximized,
  selectedProvider,
  onClose,
  onToggleMaximize,
  onOpenCreateModal,
  connections,
  pagination,
  onPageChange,
  onUpdateLabel,
  onDeleteConnection,
  isLoading,
}) => {
  const { t } = useTranslation()

  if (!isOpen || !selectedProvider) return null

  return (
    <CModal
      visible={isOpen}
      onClose={onClose}
      size="xl"
      fullscreen={isMaximized}
      backdrop="static"
      alignment="center"
    >
      {/* Header */}
      <CModalHeader closeButton>
        <CModalTitle className="h5 font-bold mb-0">
          {t('integrationHub.modal.title', {
            defaultValue: `Manage ${selectedProvider.name} Connections`,
            providerName: selectedProvider.name,
          })}
        </CModalTitle>
        <div className="d-flex align-items-center gap-2 ms-auto me-2">
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={onToggleMaximize}
            title={
              isMaximized
                ? t('integrationHub.modal.minimize', 'Minimize')
                : t('integrationHub.modal.maximize', 'Maximize')
            }
            className="p-1"
          >
            <CIcon icon={isMaximized ? cilFullscreenExit : cilFullscreen} />
          </CButton>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            onClick={onClose}
            title={t('integrationHub.modal.close', 'Close')}
            className="p-1"
          >
            <CIcon icon={cilX} />
          </CButton>
        </div>
      </CModalHeader>

      {/* Toolbar */}
      <div className="d-flex justify-content-end p-3 border-bottom bg-body-secondary">
        <CButton
          color="primary"
          size="sm"
          onClick={onOpenCreateModal}
          className="d-flex align-items-center gap-1"
        >
          <CIcon icon={cilPlus} />
          <span>{t('integrationHub.modal.addConnection', 'Add Connection')}</span>
        </CButton>
      </div>

      {/* Body Wrapper */}
      <CModalBody className="p-0 d-flex flex-column h-100">
        <ConnectionTable
          connections={connections}
          pagination={pagination}
          onPageChange={onPageChange}
          onUpdateLabel={onUpdateLabel}
          onDelete={onDeleteConnection}
          isActionLoading={isLoading}
        />
      </CModalBody>
    </CModal>
  )
}

ProviderConnectionsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isMaximized: PropTypes.bool.isRequired,
  selectedProvider: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    fields: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      }),
    ).isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  onToggleMaximize: PropTypes.func.isRequired,
  onOpenCreateModal: PropTypes.func.isRequired,
  connections: PropTypes.array.isRequired,
  pagination: PropTypes.object.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onUpdateLabel: PropTypes.func.isRequired,
  onDeleteConnection: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
}

export default ProviderConnectionsModal
