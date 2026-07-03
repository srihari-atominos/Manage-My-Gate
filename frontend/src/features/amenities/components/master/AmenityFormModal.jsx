import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const schema = yup.object().shape({
  name: yup.string().required('Name is required'),
  type: yup.string().required('Category is required'),
  location: yup.string().required('Location is required'),
  capacity: yup.number().positive().integer().required('Capacity is required'),
  ratePerHour: yup.number().min(0).required('Rate is required'),
  status: yup.string().default('active'),
  bookingRules: yup.object().shape({
    openTime: yup.string().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid format').required('Required'),
    closeTime: yup.string().matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid format').required('Required'),
  }),
  openDays: yup.array().of(yup.number()).min(1, 'Select at least one day'),
  images: yup.array().of(yup.string()),
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AmenityFormModal = ({ visible, onClose, onSave, initialData }) => {
  const { control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData || {
      name: '', type: 'Event Space', location: '', capacity: 50, ratePerHour: 500, status: 'active',
      bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, maxBookingsPerUserPerDay: 1, advanceBookingDays: 7 },
      openDays: [0, 1, 2, 3, 4, 5, 6],
      images: []
    }
  });

  useEffect(() => {
    if (visible) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({ 
          name: '', type: 'Event Space', location: '', capacity: 50, ratePerHour: 500, status: 'active',
          bookingRules: { openTime: '08:00', closeTime: '21:00', slotDurationMinutes: 60, maxBookingsPerUserPerDay: 1, advanceBookingDays: 7 },
          openDays: [0, 1, 2, 3, 4, 5, 6],
          images: []
        });
      }
    }
  }, [visible, initialData, reset]);

  const onSubmit = async (data) => {
    await onSave(data);
    onClose();
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
    // Basic file upload handling mock, since this is a UI recreation
    const file = e.target.files[0];
    if (file) {
      document.getElementById('drop-zone-text').innerHTML = `File selected: <strong>${file.name}</strong>`;
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
              <label className="form-label">Amenity Name</label>
              <Controller name="name" control={control} render={({ field }) => (
                <input type="text" className="form-control" placeholder="e.g. Rooftop Lounge" {...field} />
              )} />
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <Controller name="location" control={control} render={({ field }) => (
                <input type="text" className="form-control" placeholder="e.g. Block 1 Near Gym" {...field} />
              )} />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <Controller name="type" control={control} render={({ field }) => (
                <select className="form-control" {...field}>
                  <option value="Event Space">Event Space</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Sports">Sports</option>
                  <option value="Workspace">Workspace</option>
                  <option value="Wellness">Wellness</option>
                </select>
              )} />
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Capacity</label>
                <Controller name="capacity" control={control} render={({ field }) => (
                  <input type="number" className="form-control" placeholder="e.g. 50" {...field} />
                )} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Rate (₹/hr)</label>
                <Controller name="ratePerHour" control={control} render={({ field }) => (
                  <input type="number" className="form-control" placeholder="e.g. 500" {...field} />
                )} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amenity Image</label>
              <div className="file-drop-zone" onClick={() => document.getElementById('new-amenity-file').click()}>
                <i className="fa-solid fa-cloud-arrow-up fa-3x" style={{ marginBottom: '16px', color: 'var(--primary)' }}></i>
                <div id="drop-zone-text" style={{ fontSize: '15px', fontWeight: '500' }}>
                  Drag & drop an image here or <span style={{ color: 'var(--primary)', fontWeight: '700' }}>browse files</span>
                </div>
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

            <div className="form-group">
              <label className="form-label">Operating Hours</label>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Controller name="bookingRules.openTime" control={control} render={({ field }) => (
                  <input type="time" className="form-control" {...field} />
                )} />
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>to</span>
                <Controller name="bookingRules.closeTime" control={control} render={({ field }) => (
                  <input type="time" className="form-control" {...field} />
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
