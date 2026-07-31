import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  CForm,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CButton,
  CFormLabel,
} from '@coreui/react';

export const SampleForm = ({ onSubmit, initialValues, onCancel, isSubmitting }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');

  useEffect(() => {
    if (initialValues) {
      setTitle(initialValues.title || '');
      setDescription(initialValues.description || '');
      setStatus(initialValues.status || 'pending');
    } else {
      setTitle('');
      setDescription('');
      setStatus('pending');
    }
  }, [initialValues]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
    });
  };

  return (
    <CForm onSubmit={handleSubmit} className="row g-3">
      <div className="col-12">
        <CFormLabel htmlFor="sampleTitle">Title</CFormLabel>
        <CFormInput
          type="text"
          id="sampleTitle"
          placeholder="Enter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="col-12">
        <CFormLabel htmlFor="sampleDesc">Description</CFormLabel>
        <CFormTextarea
          id="sampleDesc"
          rows={3}
          placeholder="Enter description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="col-12">
        <CFormLabel htmlFor="sampleStatus">Status</CFormLabel>
        <CFormSelect
          id="sampleStatus"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </CFormSelect>
      </div>
      <div className="col-12 d-flex justify-content-end gap-2">
        {onCancel && (
          <CButton type="button" color="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </CButton>
        )}
        <CButton type="submit" color="primary" disabled={!title.trim() || isSubmitting}>
          {isSubmitting ? 'Saving...' : initialValues ? 'Update Sample' : 'Add Sample'}
        </CButton>
      </div>
    </CForm>
  );
};

SampleForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialValues: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
    status: PropTypes.string,
  }),
  onCancel: PropTypes.func,
  isSubmitting: PropTypes.bool,
};

export default SampleForm;
