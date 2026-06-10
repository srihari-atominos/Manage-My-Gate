import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react';
import {
  getSamples,
  addSample,
  editSample,
  removeSample,
  clearStatus,
} from './store/sampleFeatureSlice.js';
import SampleList from './components/SampleList.jsx';
import SampleForm from './components/SampleForm.jsx';

export const SampleFeatureView = () => {
  const dispatch = useDispatch();
  const { items, loading, error, successMsg } = useSelector((state) => state.sampleFeature);
  
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    dispatch(getSamples());
  }, [dispatch]);

  useEffect(() => {
    if (successMsg || error) {
      const timer = setTimeout(() => {
        dispatch(clearStatus());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, error, dispatch]);

  const handleFormSubmit = (data) => {
    if (editingItem) {
      dispatch(editSample({ id: editingItem._id, sampleData: data }))
        .unwrap()
        .then(() => setEditingItem(null));
    } else {
      dispatch(addSample(data));
    }
  };

  const handleEditSelect = (item) => {
    setEditingItem(item);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this sample record?')) {
      dispatch(removeSample(id));
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  return (
    <CRow>
      <CCol xs={12}>
        {successMsg && <CAlert color="success">{successMsg}</CAlert>}
        {error && <CAlert color="danger">{error}</CAlert>}
      </CCol>

      <CCol lg={4} xs={12} className="mb-4">
        <CCard>
          <CCardHeader className="fw-semibold">
            {editingItem ? 'Edit Sample Record' : 'Create New Sample'}
          </CCardHeader>
          <CCardBody>
            <SampleForm
              onSubmit={handleFormSubmit}
              initialValues={editingItem}
              onCancel={editingItem ? handleCancelEdit : null}
              isSubmitting={loading}
            />
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={8} xs={12}>
        <CCard>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Sample Records</span>
            {loading && <CSpinner size="sm" color="primary" />}
          </CCardHeader>
          <CCardBody>
            <SampleList
              items={items}
              onEdit={handleEditSelect}
              onDelete={handleDelete}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default SampleFeatureView;
