import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
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
  CFormSelect,
  CRow,
  CCol,
  CAlert,
} from '@coreui/react'
import { batchGenerateVillasAsync, fetchVillasAsync } from '../store/villaSlice'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

export const BatchGenerateModal = ({ visible, onClose }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  // Local form state
  const [startNumber, setStartNumber] = useState(1)
  const [endNumber, setEndNumber] = useState(54)
  const [blockOrBuilding, setBlockOrBuilding] = useState('Block A')
  const [type, setType] = useState('Apartment')
  const [status, setStatus] = useState('Vacant')
  const [floorAreaSqFt, setFloorAreaSqFt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (startNumber > endNumber) {
      setError(
        t('villas.batch.errorStartEnd', 'Start number must be less than or equal to end number.'),
      )
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const resultAction = await dispatch(
        batchGenerateVillasAsync({
          startNumber,
          endNumber,
          prefix: '',
          config: {
            blockOrBuilding,
            type,
            status,
            floorAreaSqFt: floorAreaSqFt ? parseFloat(floorAreaSqFt) : null,
          },
        }),
      )

      if (batchGenerateVillasAsync.fulfilled.match(resultAction)) {
        toast.success(
          t(
            'villas.batch.successMsg',
            `Successfully generated ${resultAction.payload.length} units!`,
          ),
        )
        dispatch(fetchVillasAsync({ page: 1, limit: 12 }))
        onClose()
      } else {
        setError(
          resultAction.payload || t('villas.batch.failedMsg', 'Failed to batch generate units.'),
        )
      }
    } catch (err) {
      setError(err.message || t('villas.batch.unexpectedError', 'An unexpected error occurred.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" className="batch-generate-modal">
      <CModalHeader>
        <CModalTitle className="modal-title-bold">
          {t('villas.batch.title', 'Batch Generate Units')}
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {error && (
            <CAlert color="danger" className="py-2 small">
              {error}
            </CAlert>
          )}

          <CRow className="mb-3">
            <CCol>
              <CFormLabel htmlFor="batch-start" className="small fw-semibold">
                {t('villas.batch.start', 'Start Range')}
              </CFormLabel>
              <CFormInput
                id="batch-start"
                type="number"
                min="1"
                value={startNumber}
                onChange={(e) => setStartNumber(parseInt(e.target.value, 10))}
                size="sm"
                required
              />
            </CCol>
            <CCol>
              <CFormLabel htmlFor="batch-end" className="small fw-semibold">
                {t('villas.batch.end', 'End Range')}
              </CFormLabel>
              <CFormInput
                id="batch-end"
                type="number"
                min="1"
                value={endNumber}
                onChange={(e) => setEndNumber(parseInt(e.target.value, 10))}
                size="sm"
                required
              />
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol>
              <CFormLabel htmlFor="batch-block" className="small fw-semibold">
                {t('villas.batch.blockOrBuilding', 'Block / Building')}
              </CFormLabel>
              <CFormInput
                id="batch-block"
                value={blockOrBuilding}
                onChange={(e) => setBlockOrBuilding(e.target.value)}
                placeholder="e.g. Block A"
                size="sm"
              />
            </CCol>
            <CCol>
              <CFormLabel htmlFor="batch-config" className="small fw-semibold">
                {t('villas.batch.type', 'Unit Type')}
              </CFormLabel>
              <CFormSelect
                id="batch-config"
                value={type}
                onChange={(e) => setType(e.target.value)}
                size="sm"
              >
                <option value="Studio">{t('villas.types.Studio', 'Studio')}</option>
                <option value="Apartment">{t('villas.types.Apartment', 'Apartment')}</option>
                <option value="Villa">{t('villas.types.Villa', 'Villa')}</option>
                <option value="Penthouse">{t('villas.types.Penthouse', 'Penthouse')}</option>
                <option value="BHK1">{t('villas.types.BHK1', 'BHK1')}</option>
                <option value="BHK2">{t('villas.types.BHK2', 'BHK2')}</option>
                <option value="BHK3">{t('villas.types.BHK3', 'BHK3')}</option>
                <option value="BHK4">{t('villas.types.BHK4', 'BHK4')}</option>
                <option value="Duplex">{t('villas.types.Duplex', 'Duplex')}</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <div className="mb-3">
            <CFormLabel htmlFor="batch-status" className="small fw-semibold">
              {t('villas.batch.status', 'Unit Status')}
            </CFormLabel>
            <CFormSelect
              id="batch-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              size="sm"
            >
              <option value="Vacant">Vacant</option>
              <option value="Occupied">Occupied</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Under Renovation">Under Renovation</option>
              <option value="For Sale">For Sale</option>
              <option value="For Rent">For Rent</option>
            </CFormSelect>
          </div>

          <div className="mb-3">
            <CFormLabel htmlFor="batch-floor-area" className="small fw-semibold">
              {t('villas.batch.floorArea', 'Floor Area (Sq Ft)')}
            </CFormLabel>
            <CFormInput
              id="batch-floor-area"
              type="number"
              value={floorAreaSqFt}
              onChange={(e) => setFloorAreaSqFt(e.target.value)}
              placeholder="e.g. 1500"
              size="sm"
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="light" size="sm" onClick={onClose} disabled={submitting}>
            {t('villas.batch.cancel', 'Cancel')}
          </CButton>
          <CButton
            type="submit"
            color="primary"
            size="sm"
            disabled={submitting}
            className="fw-semibold"
          >
            {submitting
              ? t('villas.batch.generating', 'Generating...')
              : t('villas.batch.submit', 'Generate Units')}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  )
}

BatchGenerateModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default BatchGenerateModal
