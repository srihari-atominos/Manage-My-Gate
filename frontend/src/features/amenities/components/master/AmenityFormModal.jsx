import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const schema = yup.object().shape({
  name: yup.string().required('Name is required'),
  type: yup.string().required('Category is required'),
  location: yup.string().required('Location is required'),
  description: yup.string(),
  capacity: yup.number().typeError('Capacity must be a number').positive().integer().required('Capacity is required'),
  pricing: yup.object().shape({
    pricingType: yup.string().required('Pricing Type is required'),
    baseRate: yup.number().typeError('Rate must be a number').min(0, 'Rate cannot be negative').required('Rate is required'),
    securityDeposit: yup.number().typeError('Deposit must be a number').min(0, 'Deposit cannot be negative'),
  }),
  status: yup.string().default('active'),
  bookingRules: yup.object().shape({
    openTime: yup.string().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format').required('Required'),
    closeTime: yup.string().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format').required('Required'),
    slotDurationMinutes: yup.number().typeError('Must be a number').min(15, 'Min 15 min').required('Required'),
    bufferTimeMinutes: yup.number().typeError('Must be a number').min(0, 'Min 0'),
    maxBookingsPerUserPerDay: yup.number().typeError('Must be a number').min(1, 'Min 1').required('Required'),
    advanceBookingDays: yup.number().typeError('Must be a number').min(0, 'Min 0')
  }),
  openDays: yup.array().of(yup.number()).min(1, 'Select at least one day'),
  images: yup.array().of(yup.string()),
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AmenityFormModal = ({ visible, onClose, onSave, initialData }) => {
  const [imagePreview, setImagePreview] = useState(null);

  const { control, handleSubmit, reset, setValue, formState: { isSubmitting, isDirty } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData || {
      name: '', type: 'Event Space', location: '', description: '', capacity: 50, status: 'active',
      pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
      bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, bufferTimeMinutes: 0, maxBookingsPerUserPerDay: 1, advanceBookingDays: 7 },
      openDays: [0, 1, 2, 3, 4, 5, 6],
      images: []
    }
  });

  useEffect(() => {
    if (visible) {
      if (initialData) {
        reset(initialData);
        setImagePreview(initialData.images && initialData.images.length > 0 ? initialData.images[0] : null);
      } else {
        reset({ 
          name: '', type: 'Event Space', location: '', description: '', capacity: 50, status: 'active',
          pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
          bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, bufferTimeMinutes: 0, maxBookingsPerUserPerDay: 1, advanceBookingDays: 7 },
          openDays: [0, 1, 2, 3, 4, 5, 6],
          images: []
        });
        setImagePreview(null);
      }
    }
  }, [visible, initialData, reset]);

  const onSubmit = async (data) => {
    await onSave(data);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImagePreview(base64String);
        setValue('images', [base64String], { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!visible) return null;

  return (
    <div className="modal-overlay active amenity-os-theme">
      <div className="modal-box">
        <div className="modal-header">
          <h4 style={{ fontSize: '20px', margin: 0 }}>{initialData ? 'Edit Amenity' : 'Add New Amenity'}</h4>
          <button type="button" className="modal-close" onClick={handleClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <form id="amenity-form" onSubmit={handleSubmit(onSubmit)}>
            
            <div className="form-group">
              <label className="form-label">Amenity Name *</label>
              <Controller name="name" control={control} render={({ field, fieldState }) => (
                <>
                  <input type="text" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="e.g. Rooftop Lounge" {...field} />
                  {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                </>
              )} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <Controller name="description" control={control} render={({ field, fieldState }) => (
                <>
                  <textarea className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="Describe the amenity..." rows="3" {...field}></textarea>
                  {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                </>
              )} />
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Location *</label>
                <Controller name="location" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="text" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="e.g. Block 1 Near Gym" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Category *</label>
                <Controller name="type" control={control} render={({ field, fieldState }) => (
                  <>
                    <select className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} {...field}>
                      <option value="Event Space">Event Space</option>
                      <option value="Fitness">Fitness</option>
                      <option value="Sports">Sports</option>
                      <option value="Workspace">Workspace</option>
                      <option value="Wellness">Wellness</option>
                    </select>
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Capacity *</label>
                <Controller name="capacity" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="number" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="e.g. 50" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Max Bookings/User/Day *</label>
                <Controller name="bookingRules.maxBookingsPerUserPerDay" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="number" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="e.g. 1" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Pricing Type *</label>
                <Controller name="pricing.pricingType" control={control} render={({ field, fieldState }) => (
                  <>
                    <select className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} {...field}>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="session">Session</option>
                      <option value="fixed">Fixed</option>
                    </select>
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Base Rate (₹) *</label>
                <Controller name="pricing.baseRate" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="number" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="e.g. 500" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Security Deposit (₹)</label>
                <Controller name="pricing.securityDeposit" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="number" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="e.g. 0" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amenity Image</label>
              <div 
                className="file-drop-zone" 
                onClick={() => document.getElementById('new-amenity-file').click()}
                style={{ 
                  position: 'relative', 
                  overflow: 'hidden', 
                  minHeight: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: imagePreview ? '0' : '20px'
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up fa-3x" style={{ marginBottom: '16px', color: 'var(--primary)' }}></i>
                    <div id="drop-zone-text" style={{ fontSize: '15px', fontWeight: '500' }}>
                      Drag & drop an image here or <span style={{ color: 'var(--primary)', fontWeight: '700' }}>browse files</span>
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  id="new-amenity-file" 
                  style={{ display: 'none' }} 
                  accept="image/*" 
                  onClick={(e) => e.stopPropagation()} 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Operating Hours *</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <Controller name="bookingRules.openTime" control={control} render={({ field, fieldState }) => (
                    <div>
                      <input type="time" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} {...field} />
                      {fieldState.error && <div className="text-danger small">{fieldState.error.message}</div>}
                    </div>
                  )} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>to</span>
                  <Controller name="bookingRules.closeTime" control={control} render={({ field, fieldState }) => (
                    <div>
                      <input type="time" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} {...field} />
                      {fieldState.error && <div className="text-danger small">{fieldState.error.message}</div>}
                    </div>
                  )} />
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Slot Duration (Mins) *</label>
                <Controller name="bookingRules.slotDurationMinutes" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="number" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="60" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Buffer (Mins)</label>
                <Controller name="bookingRules.bufferTimeMinutes" control={control} render={({ field, fieldState }) => (
                  <>
                    <input type="number" className={`form-control ${fieldState.error ? 'is-invalid' : ''}`} placeholder="0" {...field} />
                    {fieldState.error && <span className="text-danger small">{fieldState.error.message}</span>}
                  </>
                )} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Open Days</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Controller name="openDays" control={control} render={({ field }) => (
                  <>
                    {DAYS.map((day, index) => {
                      const isActive = field.value?.includes(index);
                      return (
                        <div 
                          key={day}
                          className={`day-chip ${isActive ? 'active' : ''}`} 
                          onClick={() => {
                            if (isActive) {
                              field.onChange(field.value.filter(d => d !== index));
                            } else {
                              field.onChange([...(field.value || []), index].sort());
                            }
                          }}
                        >
                          {day}
                        </div>
                      )
                    })}
                  </>
                )} />
              </div>
            </div>

          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" style={{ borderRadius: 'var(--radius-pill)' }} onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" form="amenity-form" className="btn btn-primary" style={{ borderRadius: 'var(--radius-pill)' }} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Amenity' : 'Create Amenity')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmenityFormModal;
