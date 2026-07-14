import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CButton,
} from '@coreui/react';
import { createTechnician, updateTechnician } from '../store/complaintSlice';
import { fetchUsersAsync } from '../../userManagement/store/userSlice';
import toast from 'react-hot-toast';

const TechnicianModal = ({ visible, technician, onClose }) => {
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Electrical',
    type: 'In-House Staff',
    status: 'Pending',
    whatsappEnabled: true
  });

  useEffect(() => {
    if (visible) {
      if (technician) {
        setFormData({
          name: technician.name || '',
          email: technician.email || '',
          phone: technician.phone || '',
          department: technician.department || 'Electrical',
          type: technician.type || 'In-House Staff',
          status: technician.status || 'Pending',
          whatsappEnabled: technician.whatsappEnabled !== undefined ? technician.whatsappEnabled : true
        });
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          department: 'Electrical',
          type: 'In-House Staff',
          status: 'Pending',
          whatsappEnabled: true
        });
      }
    }
  }, [visible, technician]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required.');
      return;
    }

    try {
      if (technician && technician._id) {
        await dispatch(updateTechnician({ id: technician._id, data: formData })).unwrap();
        toast.success('Staff/Vendor updated successfully.');
      } else {
        await dispatch(createTechnician(formData)).unwrap();
        toast.success('Staff/Vendor added and invitation sent successfully.');
        
        // Refresh User Management list instantly
        dispatch(fetchUsersAsync({ page: 1, limit: 10 }));
      }
      onClose(true);
    } catch (err) {
      const errMsg = err?.message || (typeof err === 'string' ? err : 'Failed to save Staff/Vendor.');
      toast.error(errMsg);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader>
        <CModalTitle>{technician ? 'Edit Staff/Vendor' : 'Invite Staff/Vendor'}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm id="technicianForm" onSubmit={handleSubmit}>
          <div className="mb-3">
            <CFormLabel>Name</CFormLabel>
            <CFormInput 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              required 
              placeholder="e.g. John Doe" 
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Email Address (Optional)</CFormLabel>
            <CFormInput 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="e.g. john@example.com" 
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Phone Number</CFormLabel>
            <CFormInput 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              required 
              placeholder="+91 9876543210" 
            />
          </div>
          <div className="mb-3">
            <CFormLabel>Department / Trade</CFormLabel>
            <CFormSelect name="department" value={formData.department} onChange={handleChange}>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Housekeeping">Housekeeping</option>
              <option value="Security">Security</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Others">Others</option>
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel>Type</CFormLabel>
            <CFormSelect name="type" value={formData.type} onChange={handleChange}>
              <option value="In-House Staff">In-House Staff</option>
              <option value="External Vendor">External Vendor</option>
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel>Status</CFormLabel>
            <CFormSelect name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Pending">Pending Invitation</option>
              <option value="Inactive">Inactive</option>
            </CFormSelect>
          </div>

        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" type="submit" form="technicianForm">
          {technician ? 'Save Changes' : 'Send Invitation'}
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

TechnicianModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  technician: PropTypes.object,
  onClose: PropTypes.func.isRequired,
};

export default TechnicianModal;

