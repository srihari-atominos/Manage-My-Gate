import React, { memo } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
} from '@coreui/react'

export const OfflineSettleModal = memo(
  ({ visible, onClose, settleRef, setSettleRef, onSubmit }) => {
    if (!visible) return null

    return (
      <CModal visible={visible} onClose={onClose} alignment="center">
        <CModalHeader>
          <CModalTitle className="fw-semibold">Enter Offline Settlement Details</CModalTitle>
        </CModalHeader>
        <CForm
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="offline-ref" className="small fw-semibold">
                Transaction ID / Reference Number (Cheque/NEFT) *
              </CFormLabel>
              <CFormInput
                id="offline-ref"
                type="text"
                placeholder="e.g. CHQ-92842 or UTR-28194"
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
                required
                autoFocus
                size="sm"
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton type="button" color="secondary" size="sm" onClick={onClose}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" size="sm" disabled={!settleRef.trim()}>
              Record Settlement
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    )
  },
)

OfflineSettleModal.displayName = 'OfflineSettleModal'

OfflineSettleModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  settleRef: PropTypes.string.isRequired,
  setSettleRef: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
}

export default OfflineSettleModal
