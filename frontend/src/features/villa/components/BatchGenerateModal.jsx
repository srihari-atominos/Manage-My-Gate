import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
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
  CAlert
} from '@coreui/react';
import { batchGenerateVillasAsync, fetchVillasAsync } from '../store/villaSlice';
import toast from 'react-hot-toast';

export const BatchGenerateModal = ({ visible, onClose }) => {
  const dispatch = useDispatch();
  
  // Local form state
  const [prefix, setPrefix] = useState('Villa');
  const [startNumber, setStartNumber] = useState(1);
  const [endNumber, setEndNumber] = useState(54);
  const [block, setBlock] = useState('Block A');
  const [configuration, setConfiguration] = useState('3 BHK');
  const [intercomPrefix, setIntercomPrefix] = useState('80');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (startNumber > endNumber) {
      setError('Start number must be less than or equal to end number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const resultAction = await dispatch(batchGenerateVillasAsync({
        startNumber,
        endNumber,
        prefix,
        config: {
          block,
          configuration,
          intercomPrefix
        }
      }));

      if (batchGenerateVillasAsync.fulfilled.match(resultAction)) {
        toast.success(`Successfully generated ${resultAction.payload.length} villas!`);
        dispatch(fetchVillasAsync({ page: 1, limit: 12 }));
        onClose();
      } else {
        setError(resultAction.payload || 'Failed to batch generate villas.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      id="batch-generate-modal"
      alignment="center"
    >
      <CModalHeader>
        <CModalTitle style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          Batch Generate Villas
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {error && (
            <CAlert color="danger" className="py-2 small">
              {error}
            </CAlert>
          )}

          <div className="mb-3">
            <CFormLabel htmlFor="batch-prefix" className="small fw-semibold">Villa Prefix</CFormLabel>
            <CFormInput
              id="batch-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. Villa"
              size="sm"
            />
            <div className="text-muted small-text mt-1" style={{ fontSize: '0.72rem' }}>
              Suffix numbers will be appended automatically, e.g. "Villa 01".
            </div>
          </div>

          <CRow className="mb-3">
            <CCol>
              <CFormLabel htmlFor="batch-start" className="small fw-semibold">Start Range</CFormLabel>
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
              <CFormLabel htmlFor="batch-end" className="small fw-semibold">End Range</CFormLabel>
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
              <CFormLabel htmlFor="batch-block" className="small fw-semibold">Block / Phase</CFormLabel>
              <CFormInput
                id="batch-block"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                placeholder="e.g. Block A"
                size="sm"
              />
            </CCol>
            <CCol>
              <CFormLabel htmlFor="batch-config" className="small fw-semibold">Configuration</CFormLabel>
              <CFormSelect
                id="batch-config"
                value={configuration}
                onChange={(e) => setConfiguration(e.target.value)}
                size="sm"
              >
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="5 BHK">5 BHK</option>
                <option value="2 BHK">2 BHK</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <div className="mb-3">
            <CFormLabel htmlFor="batch-intercom" className="small fw-semibold">Intercom Number Prefix</CFormLabel>
            <CFormInput
              id="batch-intercom"
              value={intercomPrefix}
              onChange={(e) => setIntercomPrefix(e.target.value)}
              placeholder="e.g. 80"
              size="sm"
            />
            <div className="text-muted small-text mt-1" style={{ fontSize: '0.72rem' }}>
              Appended with unit suffix. e.g., Prefix "80" makes "8001" for Villa 01.
            </div>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="light" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </CButton>
          <CButton type="submit" color="primary" size="sm" disabled={submitting} className="fw-semibold">
            {submitting ? 'Generating...' : 'Generate Villas'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
};

BatchGenerateModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BatchGenerateModal;
