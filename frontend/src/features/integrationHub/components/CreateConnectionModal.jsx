import React from 'react'
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next'
import { CModal, CModalHeader, CModalTitle, CModalBody } from '@coreui/react'
import ConnectionForm from './ConnectionForm.jsx'
import '../styles/_integrationHub.scss'

/**
 * Dedicated modal containing only the creation form for credentials setup.
 */
export const CreateConnectionModal = ({
  isOpen,
  selectedProvider,
  onClose,
  onCreateConnection,
  isLoading,
  actionError,
}) => {
  const { t } = useTranslation()

  if (!isOpen || !selectedProvider) return null

  return (
    <CModal visible={isOpen} onClose={onClose} alignment="center" backdrop="static">
      {/* Header */}
      <CModalHeader closeButton>
        <CModalTitle className="h5 font-bold mb-0">
          {t('integrationHub.createModal.title', {
            defaultValue: `Connect ${selectedProvider.name}`,
            providerName: selectedProvider.name,
          })}
        </CModalTitle>
      </CModalHeader>

      {/* Body Wrapper */}
      <CModalBody className="p-4">
        <ConnectionForm
          selectedProvider={selectedProvider}
          onSubmit={onCreateConnection}
          isSubmitting={isLoading}
          submitError={actionError}
        />
      </CModalBody>
    </CModal>
  )
}

CreateConnectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
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
  onCreateConnection: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  actionError: PropTypes.string,
}

export default CreateConnectionModal
