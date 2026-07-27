import React, { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'

const schema = yup
  .object()
  .shape({
    name: yup.string().required('Name is required'),
    type: yup.string().required('Category is required'),
    location: yup.string().required('Location is required'),
    description: yup.string(),
    capacity: yup
      .number()
      .typeError('Capacity must be a number')
      .positive()
      .integer()
      .required('Capacity is required'),
    pricing: yup.object().shape({
      pricingType: yup.string().required('Pricing Type is required'),
      baseRate: yup
        .number()
        .typeError('Rate must be a number')
        .min(0, 'Rate cannot be negative')
        .required('Rate is required'),
      securityDeposit: yup
        .number()
        .typeError('Deposit must be a number')
        .min(0, 'Deposit cannot be negative'),
    }),
    status: yup.string().default('active'),
    bookingRules: yup.object().shape({
      openTime: yup
        .string()
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format')
        .required('Required'),
      closeTime: yup
        .string()
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Invalid time format')
        .required('Required'),
      slotDurationMinutes: yup
        .number()
        .typeError('Must be a number')
        .nullable()
        .transform((v, o) => (o === '' ? null : v)),
      bufferTimeMinutes: yup.number().typeError('Must be a number').min(0, 'Min 0'),
      advanceBookingDays: yup.number().typeError('Must be a number').min(0, 'Min 0'),
      isCancellationEnabled: yup.boolean().default(false),
      cancellationRefundRules: yup.array().of(
        yup.object().shape({
          cancelBeforeHours: yup
            .number()
            .typeError('Must be a number')
            .min(0, 'Min 0')
            .required('Required'),
          refundPercentage: yup
            .number()
            .typeError('Must be a number')
            .min(0, 'Min 0')
            .max(100, 'Max 100')
            .required('Required'),
        }),
      ),
    }),
    openDays: yup.array().of(yup.number()).min(1, 'Select at least one day'),
    images: yup.array().of(yup.string()),
    maxBookingsPerUserPerSlot: yup
      .number()
      .typeError('Must be a number')
      .nullable()
      .transform((v, o) => (o === '' ? null : v)),
  })
  .test('conditional-validation', null, function (value) {
    const isDaily = value.pricing?.pricingType === 'daily'
    if (!isDaily) {
      if (
        value.maxBookingsPerUserPerSlot === undefined ||
        value.maxBookingsPerUserPerSlot === null ||
        value.maxBookingsPerUserPerSlot < 1
      ) {
        return this.createError({ path: 'maxBookingsPerUserPerSlot', message: 'Min 1' })
      }
      if (
        value.bookingRules?.slotDurationMinutes === undefined ||
        value.bookingRules?.slotDurationMinutes === null ||
        value.bookingRules.slotDurationMinutes < 15
      ) {
        return this.createError({ path: 'bookingRules.slotDurationMinutes', message: 'Min 15 min' })
      }
    }
    return true
  })

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const AmenityFormModal = ({ visible, onClose, onSave, initialData }) => {
  const [imagePreview, setImagePreview] = useState(null)

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting, isDirty, errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: initialData || {
      name: '',
      type: 'Event Space',
      location: '',
      description: '',
      capacity: 50,
      status: 'active',
      maxBookingsPerUserPerSlot: 2,
      pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
      bookingRules: {
        openTime: '08:00',
        closeTime: '21:00',
        slotDurationMinutes: 60,
        bufferTimeMinutes: 0,
        advanceBookingDays: 7,
        isCancellationEnabled: false,
        cancellationRefundRules: [],
      },
      openDays: [0, 1, 2, 3, 4, 5, 6],
      images: [],
    },
  })

  const {
    fields: rulesFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control,
    name: 'bookingRules.cancellationRefundRules',
  })

  const isCancellationEnabled = watch('bookingRules.isCancellationEnabled')
  const pricingType = watch('pricing.pricingType')

  useEffect(() => {
    if (visible) {
      if (initialData) {
        reset(initialData)
        setImagePreview(
          initialData.images && initialData.images.length > 0 ? initialData.images[0] : null,
        )
      } else {
        reset({
          name: '',
          type: 'Event Space',
          location: '',
          description: '',
          capacity: 50,
          status: 'active',
          maxBookingsPerUserPerSlot: 2,
          pricing: { pricingType: 'hourly', baseRate: 500, securityDeposit: 0 },
          bookingRules: {
            openTime: '08:00',
            closeTime: '21:00',
            slotDurationMinutes: 60,
            bufferTimeMinutes: 0,
            advanceBookingDays: 7,
            isCancellationEnabled: false,
            cancellationRefundRules: [],
          },
          openDays: [0, 1, 2, 3, 4, 5, 6],
          images: [],
        })
        setImagePreview(null)
      }
    }
  }, [visible, initialData, reset])

  const onSubmit = async (data) => {
    if (data.bookingRules?.cancellationRefundRules) {
      data.bookingRules.cancellationRefundRules.sort(
        (a, b) => b.cancelBeforeHours - a.cancelBeforeHours,
      )
    }
    await onSave(data)
  }

  const handleClose = () => {
    reset()
    setImagePreview(null)
    onClose()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result
        setImagePreview(base64String)
        setValue('images', [base64String], { shouldDirty: true })
      }
      reader.readAsDataURL(file)
    }
  }

  if (!visible) return null

  return (
    <div className="modal-overlay active amenity-os-theme" onClick={handleClose}>
      <div className="modal-box" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h4 style={{ margin: 0 }} className="fs-4">
            {initialData ? 'Edit Amenity' : 'Add New Amenity'}
          </h4>
          <button type="button" className="modal-close" onClick={handleClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <form id="amenity-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label className="form-label">Amenity Name *</label>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <input
                      type="text"
                      className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                      placeholder="e.g. Rooftop Lounge"
                      {...field}
                    />
                    {fieldState.error && (
                      <span className="text-danger small">{fieldState.error.message}</span>
                    )}
                  </>
                )}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <textarea
                      className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                      placeholder="Describe the amenity..."
                      rows="3"
                      {...field}
                    ></textarea>
                    {fieldState.error && (
                      <span className="text-danger small">{fieldState.error.message}</span>
                    )}
                  </>
                )}
              />
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Location *</label>
                <Controller
                  name="location"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        type="text"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="e.g. Block 1 Near Gym"
                        {...field}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <select
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        {...field}
                      >
                        <option value="Event Space">Event Space</option>
                        <option value="Fitness">Fitness</option>
                        <option value="Sports">Sports</option>
                        <option value="Workspace">Workspace</option>
                        <option value="Wellness">Wellness</option>
                      </select>
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">Capacity *</label>
                <Controller
                  name="capacity"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        type="number"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="e.g. 50"
                        {...field}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>
              <div
                className="form-group"
                style={{ opacity: pricingType === 'daily' ? 0.5 : 1, transition: 'opacity 0.2s' }}
              >
                <label className="form-label text-uppercase">
                  Max Bookings/User/Per Slots {pricingType !== 'daily' && '*'}
                </label>
                <Controller
                  name="maxBookingsPerUserPerSlot"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        type="number"
                        min="1"
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e') e.preventDefault()
                        }}
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="e.g. 2"
                        {...field}
                        disabled={pricingType === 'daily'}
                        style={{
                          backgroundColor: pricingType === 'daily' ? '#f1f5f9' : '',
                          cursor: pricingType === 'daily' ? 'not-allowed' : 'auto',
                        }}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="form-row-grid form-row-grid-3">
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Pricing Type *</label>
                <Controller
                  name="pricing.pricingType"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div style={{ marginTop: 'auto' }}>
                      <select
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        {...field}
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                      </select>
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </div>
                  )}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Base Rate (₹) *</label>
                <Controller
                  name="pricing.baseRate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div style={{ marginTop: 'auto' }}>
                      <input
                        type="number"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="e.g. 500"
                        {...field}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </div>
                  )}
                />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">
                  Security Deposit (₹){' '}
                  <span
                    className="text-muted fw-normal"
                    style={{ fontSize: '11px', display: 'block' }}
                  >
                    (Fixed Amount)
                  </span>
                </label>
                <Controller
                  name="pricing.securityDeposit"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div style={{ marginTop: 'auto' }}>
                      <input
                        type="number"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="e.g. 0"
                        {...field}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '16px', marginBottom: '24px' }}>
              <label className="form-label text-uppercase">Security Deposit Description</label>
              <Controller
                name="pricing.securityDepositDescription"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <input
                      type="text"
                      className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                      placeholder="e.g. Refundable upon inspection"
                      {...field}
                      value={field.value || ''}
                    />
                    {fieldState.error && (
                      <span className="text-danger small">{fieldState.error.message}</span>
                    )}
                  </>
                )}
              />
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
                  padding: imagePreview ? '0' : '20px',
                }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                    }}
                  />
                ) : (
                  <>
                    <i
                      className="fa-solid fa-cloud-arrow-up fa-3x"
                      style={{ marginBottom: '16px', color: 'var(--primary)' }}
                    ></i>
                    <div id="drop-zone-text" className="fw-medium">
                      Drag & drop an image here or{' '}
                      <span style={{ color: 'var(--primary)' }} className="fw-bold">
                        browse files
                      </span>
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

            <div className="form-group">
              <label className="form-label">Operating Hours *</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Controller
                  name="bookingRules.openTime"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div style={{ flex: 1 }}>
                      <input
                        type="time"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        {...field}
                      />
                      {fieldState.error && (
                        <div className="text-danger small">{fieldState.error.message}</div>
                      )}
                    </div>
                  )}
                />
                <span
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                  className="fw-semibold small"
                >
                  to
                </span>
                <Controller
                  name="bookingRules.closeTime"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div style={{ flex: 1 }}>
                      <input
                        type="time"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        {...field}
                      />
                      {fieldState.error && (
                        <div className="text-danger small">{fieldState.error.message}</div>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            <div className="form-row-grid">
              <div
                className="form-group"
                style={{ opacity: pricingType === 'daily' ? 0.5 : 1, transition: 'opacity 0.2s' }}
              >
                <label className="form-label">
                  Slot Duration (Mins) {pricingType !== 'daily' && '*'}
                </label>
                <Controller
                  name="bookingRules.slotDurationMinutes"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        type="number"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="60"
                        {...field}
                        disabled={pricingType === 'daily'}
                        style={{
                          backgroundColor: pricingType === 'daily' ? '#f1f5f9' : '',
                          cursor: pricingType === 'daily' ? 'not-allowed' : 'auto',
                        }}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Buffer (Mins)</label>
                <Controller
                  name="bookingRules.bufferTimeMinutes"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        type="number"
                        className={`form-control ${fieldState.error ? 'is-invalid' : ''}`}
                        placeholder="0"
                        {...field}
                      />
                      {fieldState.error && (
                        <span className="text-danger small">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="form-section mt-4 mb-3 border-top pt-3">
              <h5 style={{ marginBottom: '16px' }} className="fw-semibold fs-6">
                Cancellation & Refund Policy
              </h5>

              <div className="form-group">
                <div
                  className="form-check form-switch"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <Controller
                    name="bookingRules.isCancellationEnabled"
                    control={control}
                    render={({ field }) => (
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="cancelToggle"
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                  <label
                    className="fw-medium form-check-label mb-0"
                    htmlFor="cancelToggle"
                    style={{ cursor: 'pointer' }}
                  >
                    Enable Cancellation
                  </label>
                </div>
              </div>

              {isCancellationEnabled && (
                <div className="cancellation-rules-container p-3 bg-body-secondary rounded border mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Refund Rules</h6>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => appendRule({ cancelBeforeHours: 24, refundPercentage: 100 })}
                    >
                      <i className="fa-solid fa-plus me-1"></i> Add Rule
                    </button>
                  </div>

                  {rulesFields.length === 0 ? (
                    <div
                      className="text-center p-3 text-muted"
                      style={{
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: '1px dashed #ccc',
                      }}
                    >
                      No rules configured. Users will not get any refund if they cancel.
                    </div>
                  ) : (
                    <div className="rules-table">
                      <div className="small row fw-bold mb-2 pb-2 border-bottom text-muted">
                        <div className="col-5">Cancel Before (Hours)</div>
                        <div className="col-5">Refund Percentage (%)</div>
                        <div className="col-2 text-center">Action</div>
                      </div>
                      {rulesFields.map((item, index) => (
                        <div className="row align-items-center mb-2" key={item.id}>
                          <div className="col-5">
                            <Controller
                              name={`bookingRules.cancellationRefundRules.${index}.cancelBeforeHours`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    className={`form-control form-control-sm ${fieldState.error ? 'is-invalid' : ''}`}
                                    placeholder="e.g. 24"
                                    {...field}
                                  />
                                  {fieldState.error && (
                                    <span className="text-danger small">
                                      {fieldState.error.message}
                                    </span>
                                  )}
                                </>
                              )}
                            />
                          </div>
                          <div className="col-5">
                            <Controller
                              name={`bookingRules.cancellationRefundRules.${index}.refundPercentage`}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    onInput={(e) => {
                                      if (e.target.value > 100) e.target.value = 100
                                      if (e.target.value < 0) e.target.value = 0
                                    }}
                                    className={`form-control form-control-sm ${fieldState.error ? 'is-invalid' : ''}`}
                                    placeholder="e.g. 100"
                                    {...field}
                                  />
                                  {fieldState.error && (
                                    <span className="text-danger small">
                                      {fieldState.error.message}
                                    </span>
                                  )}
                                </>
                              )}
                            />
                          </div>
                          <div className="col-2 text-center">
                            <button
                              type="button"
                              className="btn btn-sm btn-danger text-white px-2 py-1"
                              onClick={() => removeRule(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="small mt-2 text-muted">
                    <i className="fa-solid fa-circle-info me-1"></i> Rules are automatically sorted
                    by hours (Highest → Lowest) when saved.
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Open Days</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Controller
                  name="openDays"
                  control={control}
                  render={({ field }) => (
                    <>
                      {DAYS.map((day, index) => {
                        const isActive = field.value?.includes(index)
                        return (
                          <div
                            key={day}
                            className={`day-chip ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              if (isActive) {
                                field.onChange(field.value.filter((d) => d !== index))
                              } else {
                                field.onChange([...(field.value || []), index].sort())
                              }
                            }}
                          >
                            {day}
                          </div>
                        )
                      })}
                    </>
                  )}
                />
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="amenity-form"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Update Amenity' : 'Create Amenity'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AmenityFormModal
