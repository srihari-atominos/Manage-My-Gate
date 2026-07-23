import React, { useEffect, useState } from 'react';
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
  CSpinner
} from '@coreui/react';
import useManualBooking from '../../hooks/useManualBooking.js';
import apiClient from '../../../../services/apiClient.js';

const ManualBookingModal = ({ visible, onClose, onSuccess }) => {
  const { submitManualBooking, isLoading, error } = useManualBooking(() => {
    onClose();
    if (onSuccess) onSuccess();
  });

  const [formData, setFormData] = useState({
    amenityId: '',
    residentId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    paymentStatus: 'paid'
  });

  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [users, setUsers] = useState([]); // Simplified for manual entry
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDependencies();
      setFormData({
        amenityId: '',
        residentId: '',
        bookingDate: '',
        startTime: '',
        endTime: '',
        paymentStatus: 'paid'
      });
    }
  }, [visible]);

  const loadDependencies = async () => {
    try {
      setLoadingAmenities(true);
      setLoadingUsers(true);
      const amRes = await apiClient.get('/amenities?status=active');
      setAmenities(amRes.data || []);
      const usersRes = await apiClient.get('/users?role=Resident');
      setUsers(usersRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load dependencies', err);
    } finally {
      setLoadingAmenities(false);
      setLoadingUsers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const selectedAmenity = amenities.find(a => a._id === formData.amenityId);
  const isDaily = selectedAmenity?.pricing?.pricingType === 'daily';

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (isDaily) {
      payload.startTime = selectedAmenity.bookingRules?.openTime;
      payload.endTime = selectedAmenity.bookingRules?.closeTime;
    }
    submitManualBooking(payload);
  };

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>New Manual Booking</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="mb-3">
            <CFormLabel>Resident</CFormLabel>
            {loadingUsers ? <CSpinner size="sm" /> : (
              <CFormSelect name="residentId" value={formData.residentId} onChange={handleChange} required>
                <option value="">Select Resident...</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </CFormSelect>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel>Amenity</CFormLabel>
            {loadingAmenities ? <CSpinner size="sm" /> : (
              <CFormSelect name="amenityId" value={formData.amenityId} onChange={handleChange} required>
                <option value="">Select Amenity...</option>
                {amenities.map(a => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </CFormSelect>
            )}
          </div>

          <div className="mb-3">
            <CFormLabel>Booking Date</CFormLabel>
            <CFormInput type="date" name="bookingDate" value={formData.bookingDate} onChange={handleChange} required />
          </div>

          {isDaily ? (
            <div className="mb-3">
              <div className="alert alert-success py-2 m-0 text-center">
                <div className="d-flex flex-column align-items-center">
                  <div className="mb-1">
                    <i className="fa-solid fa-clock me-2"></i>
                    <strong>Operating Hours: {selectedAmenity?.bookingRules?.openTime} - {selectedAmenity?.bookingRules?.closeTime}</strong>
                  </div>
                  <div>
                    <i className="fa-solid fa-money-bill me-2"></i>
                    <strong>Daily Price: {selectedAmenity?.pricing?.baseRate || 0}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="row">
              <div className="col-6 mb-3">
                <CFormLabel>Start Time</CFormLabel>
                <CFormInput type="time" name="startTime" value={formData.startTime} onChange={handleChange} required={!isDaily} />
              </div>
              <div className="col-6 mb-3">
                <CFormLabel>End Time</CFormLabel>
                <CFormInput type="time" name="endTime" value={formData.endTime} onChange={handleChange} required={!isDaily} />
              </div>
            </div>
          )}

          <div className="mb-3">
            <CFormLabel>Payment Status Override</CFormLabel>
            <CFormSelect name="paymentStatus" value={formData.paymentStatus} onChange={handleChange}>
              <option value="paid">Paid (Cash/Offline)</option>
              <option value="waived">Waived</option>
              <option value="pending">Pending</option>
            </CFormSelect>
          </div>

        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="ghost" onClick={onClose}>Cancel</CButton>
          <CButton color="primary" type="submit" disabled={isLoading}>
            {isLoading ? <CSpinner size="sm" /> : 'Confirm Booking'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
};

export default ManualBookingModal;
