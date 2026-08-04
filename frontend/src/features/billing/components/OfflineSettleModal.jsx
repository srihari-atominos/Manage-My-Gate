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
  ({ visible, onClose, settleRef, setSettleRef, settleAmount, setSettleAmount, maxAmount, onSubmit }) => {
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
            <div className="mb-3">
              <CFormLabel htmlFor="offline-amount" className="small fw-semibold">
                Payment Amount (₹) *
              </CFormLabel>
              <CFormInput
                id="offline-amount"
                type="number"
                placeholder="0.00"
                value={settleAmount}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  if (rawVal === '') {
                    setSettleAmount('');
                    return;
                  }
                  let val = Number(rawVal);
                  if (maxAmount && val > maxAmount) val = maxAmount;
                  if (val < 0) val = 0;
                  setSettleAmount(val.toString());
                }}
                required
                min="1"
                max={maxAmount}
                step="0.01"
                size="sm"
              />
              {maxAmount && (
                <div className="small text-muted mt-1">
                  Maximum allowed: ₹{maxAmount.toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton type="button" color="secondary" size="sm" onClick={onClose}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" size="sm" disabled={!settleRef.trim() || !settleAmount || settleAmount <= 0}>
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
  settleAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  setSettleAmount: PropTypes.func.isRequired,
  maxAmount: PropTypes.number,
  onSubmit: PropTypes.func.isRequired,
}

export default OfflineSettleModal
