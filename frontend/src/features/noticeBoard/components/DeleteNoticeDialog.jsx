import React from 'react'
import PropTypes from 'prop-types'
import { CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter, CButton } from '@coreui/react'
import { useTranslation } from 'react-i18next'

/**
 * DeleteNoticeDialog Component
 * Simple modal dialog confirming deletion of a notice record.
 */
export const DeleteNoticeDialog = ({ visible, onClose, onConfirm, loading }) => {
  const { t } = useTranslation()

  return (
    <CModal visible={visible} onClose={onClose} id="delete-notice-dialog" alignment="center">
      <CModalHeader className="border-0 pb-0">
        <CModalTitle className="h5 fw-bold text-danger">
          {t('noticeBoard.deleteDialog.title', 'Delete Notice')}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-0 text-secondary">
          {t(
            'noticeBoard.deleteDialog.warning',
            'Are you sure you want to delete this notice? This action is permanent and cannot be undone.',
          )}
        </p>
      </CModalBody>
      <CModalFooter className="border-0 pt-0">
        <CButton
          color="light"
          size="sm"
          onClick={onClose}
          disabled={loading}
          id="btn-cancel-delete"
          style={{ borderRadius: '8px' }}
        >
          {t('noticeBoard.deleteDialog.cancel', 'Cancel')}
        </CButton>
        <CButton
          color="danger"
          size="sm"
          onClick={onConfirm}
          disabled={loading}
          id="btn-confirm-delete"
          className="fw-semibold text-white"
          style={{ borderRadius: '8px' }}
        >
          {loading
            ? t('noticeBoard.deleteDialog.deleting', 'Deleting...')
            : t('noticeBoard.deleteDialog.confirm', 'Delete')}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

DeleteNoticeDialog.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
}

export default DeleteNoticeDialog
