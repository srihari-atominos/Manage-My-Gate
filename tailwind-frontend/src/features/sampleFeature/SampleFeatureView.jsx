import React from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react';
import SampleList from './components/SampleList.jsx';
import SampleForm from './components/SampleForm.jsx';
import useSampleFeature from './hooks/useSampleFeature.js';

export const SampleFeatureView = () => {
  const {
    items,
    loading,
    error,
    successMsg,
    editingItem,
    handleFormSubmit,
    handleEditSelect,
    handleDelete,
    handleCancelEdit,
  } = useSampleFeature();

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
