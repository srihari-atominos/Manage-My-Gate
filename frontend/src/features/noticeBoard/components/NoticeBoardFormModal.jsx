import React, { useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CFormCheck,
  CButton,
  CSpinner,
} from '@coreui/react'
import { CATEGORIES, PRIORITIES, STATUSES } from '../store/noticeBoardSlice.js'
import { useTranslation } from 'react-i18next'

// Define validation schema using Yup
const schema = yup.object().shape({
  title: yup.string().required('Title is required').max(100, 'Title cannot exceed 100 characters'),
  description: yup
    .string()
    .required('Description is required')
    .max(1000, 'Description cannot exceed 1000 characters'),
  category: yup
    .string()
    .required('Category is required')
    .oneOf(Object.values(CATEGORIES), 'Invalid category selection'),
  priority: yup
    .string()
    .required('Priority is required')
    .oneOf(Object.values(PRIORITIES), 'Invalid priority selection'),
  status: yup
    .string()
    .required('Status is required')
    .oneOf(Object.values(STATUSES), 'Invalid status selection'),
  expiryDate: yup
    .string()
    .required('Expiry date is required')
    .test('future-date', 'Expiry date must be in the future', (value) => {
      if (!value) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const inputDate = new Date(value)
      return inputDate >= today
    }),
  isPinned: yup.boolean().default(false),
  image: yup.string().optional().nullable(),
  scheduleDate: yup
    .string()
    .optional()
    .nullable()
    .test('future-schedule', 'Schedule date must be today or in the future', (value, context) => {
      const status = context?.parent?.status
      if (status !== STATUSES.SCHEDULED) return true
      if (!value) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const inputDate = new Date(value)
      return inputDate >= today
    }),
})

/**
 * NoticeBoardFormModal Component
 * Serves as the popup form modal for creating and editing notices.
 */
export const NoticeBoardFormModal = ({ visible, notice, onClose, onSave }) => {
  const { t } = useTranslation()
  const [selectedFiles, setSelectedFiles] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [validationError, setValidationError] = useState('')

  // Built-in Camera States
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [cameraModalVisible, setCameraModalVisible] = useState(false)
  const [cameraPermissionError, setCameraPermissionError] = useState('')
  const [activePreviewImage, setActivePreviewImage] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      category: CATEGORIES.GENERAL,
      priority: PRIORITIES.MEDIUM,
      status: STATUSES.PUBLISHED,
      expiryDate: '',
      isPinned: false,
      image: '',
      scheduleDate: '',
    },
  })

  const statusValue = watch('status')

  // Reset fields when active notice changing (edit mode)
  useEffect(() => {
    if (visible) {
      setSelectedFiles([])
      setValidationError('')
      if (notice) {
        setExistingImages(notice.images || [])
        reset({
          title: notice.title || '',
          description: notice.description || '',
          category: notice.category || CATEGORIES.GENERAL,
          priority: notice.priority || PRIORITIES.MEDIUM,
          status: notice.status || STATUSES.PUBLISHED,
          expiryDate: notice.expiryDate ? notice.expiryDate.split('T')[0] : '',
          isPinned: notice.isPinned || false,
          image: notice.image || '',
          scheduleDate: notice.scheduleDate ? notice.scheduleDate.split('T')[0] : '',
        })
      } else {
        setExistingImages([])
        const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        reset({
          title: '',
          description: '',
          category: CATEGORIES.GENERAL,
          priority: PRIORITIES.MEDIUM,
          status: STATUSES.PUBLISHED,
          expiryDate: defaultExpiry.toISOString().split('T')[0],
          isPinned: false,
          image: '',
          scheduleDate: '',
        })
      }
    }
  }, [visible, notice, reset])

  // Cleanup camera stream on unmount or close
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  // Camera capture methods
  const startCamera = async () => {
    setCameraPermissionError('')
    setCapturedPhoto(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Camera access error:', err)
      setCameraPermissionError(
        t(
          'noticeBoard.camera.denied',
          'Camera access is required to capture photos. Please enable camera permission in your browser settings.',
        ),
      )
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCapturedPhoto(null)
    setCameraPermissionError('')
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/jpeg')
      setCapturedPhoto(dataUrl)
    }
  }

  const usePhoto = () => {
    if (capturedPhoto && canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `captured-${Date.now()}.jpg`, { type: 'image/jpeg' })

          if (selectedFiles.length + existingImages.length >= 5) {
            setValidationError(
              t('noticeBoard.form.maxImagesError', 'Maximum of 5 images allowed per notice.'),
            )
            return
          }

          setSelectedFiles((prev) => [...prev, file])
          setValidationError('')
          setCameraModalVisible(false)
          stopCamera()
        }
      }, 'image/jpeg')
    }
  }

  const handleFileChange = (e) => {
    setValidationError('')
    const files = Array.from(e.target.files)

    if (selectedFiles.length + existingImages.length + files.length > 5) {
      setValidationError(
        t('noticeBoard.form.maxImagesError', 'Maximum of 5 images allowed per notice.'),
      )
      return
    }

    const validFiles = []
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']

    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        setValidationError(
          t(
            'noticeBoard.form.invalidTypeError',
            `Invalid file type for: ${file.name}. Only JPG, JPEG, PNG, WEBP are accepted.`,
          ),
        )
        continue
      }

      if (file.size > 10 * 1024 * 1024) {
        setValidationError(
          t(
            'noticeBoard.form.sizeLimitError',
            `File too large: ${file.name}. Maximum size is 10MB.`,
          ),
        )
        continue
      }

      validFiles.push(file)
    }

    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data) => {
    try {
      if (selectedFiles.length === 0 && existingImages.length === 0) {
        setValidationError(t('noticeBoard.form.noImageSelected', 'At least one image is required.'))
        return
      }
      const formDataToSend = new FormData()
      formDataToSend.append('title', data.title)
      formDataToSend.append('description', data.description)
      formDataToSend.append('category', data.category)
      formDataToSend.append('priority', data.priority)
      formDataToSend.append('status', data.status)
      formDataToSend.append('expiryDate', data.expiryDate)
      formDataToSend.append('isPinned', data.isPinned)
      if (data.image) formDataToSend.append('image', data.image)
      if (data.scheduleDate) formDataToSend.append('scheduleDate', data.scheduleDate)

      formDataToSend.append('existingImages', JSON.stringify(existingImages))

      selectedFiles.forEach((file) => {
        formDataToSend.append('images', file)
      })

      await onSave(formDataToSend)
    } catch (err) {
      console.error('Failed to submit notice form:', err)
    }
  }

  return (
    <>
      <CModal
        visible={visible}
        onClose={onClose}
        id="notice-form-modal"
        alignment="center"
        size="lg"
        scrollable
      >
        <CModalHeader className="border-bottom-0 pb-0">
          <CModalTitle style={{ fontSize: '1.25rem', fontWeight: 700 }} className="text-body">
            {notice
              ? t('noticeBoard.form.editTitle', 'Edit Notice')
              : t('noticeBoard.form.createTitle', 'Create New Notice')}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="py-3 px-4">
          <form id="notice-form" onSubmit={handleSubmit(onSubmit)}>
            {/* Title */}
            <div className="mb-3">
              <CFormLabel htmlFor="notice-title-input" className="small fw-semibold text-secondary">
                {t('noticeBoard.form.titleLabel', 'Title')}
              </CFormLabel>
              <CFormInput
                id="notice-title-input"
                type="text"
                placeholder={t('noticeBoard.form.titlePlaceholder', 'Enter notice title...')}
                invalid={!!errors.title}
                {...register('title')}
                style={{ borderRadius: '8px' }}
              />
              {errors.title && (
                <div className="text-danger small mt-1" id="notice-title-error">
                  {errors.title.message}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-3">
              <CFormLabel htmlFor="notice-desc-input" className="small fw-semibold text-secondary">
                {t('noticeBoard.form.descriptionLabel', 'Description')}
              </CFormLabel>
              <CFormTextarea
                id="notice-desc-input"
                placeholder={t(
                  'noticeBoard.form.descriptionPlaceholder',
                  'Enter detailed description...',
                )}
                rows={4}
                invalid={!!errors.description}
                {...register('description')}
                style={{ borderRadius: '8px' }}
              />
              {errors.description && (
                <div className="text-danger small mt-1" id="notice-desc-error">
                  {errors.description.message}
                </div>
              )}
            </div>

            {/* Image URL */}
            <div className="mb-3">
              <CFormLabel htmlFor="notice-image-input" className="small fw-semibold text-secondary">
                {t('noticeBoard.form.imageLabel', 'Notice Image URL (Optional)')}
              </CFormLabel>
              <CFormInput
                id="notice-image-input"
                type="text"
                placeholder={t(
                  'noticeBoard.form.imagePlaceholder',
                  'https://example.com/image.jpg',
                )}
                invalid={!!errors.image}
                {...register('image')}
                style={{ borderRadius: '8px' }}
              />
              {errors.image && <div className="text-danger small mt-1">{errors.image.message}</div>}
            </div>

            {/* Upload Images Section */}
            <div className="mb-3 border rounded p-3 bg-body-secondary">
              <CFormLabel className="small fw-semibold text-body mb-2 d-block">
                {t('noticeBoard.form.uploadImagesLabel', 'Upload Images')}
              </CFormLabel>

              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div>
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    style={{ borderRadius: '8px' }}
                    onClick={() => document.getElementById('notice-file-input').click()}
                  >
                    <i className="fa-solid fa-cloud-arrow-up me-2"></i>
                    {t('noticeBoard.form.browseFiles', 'Browse Files')}
                  </CButton>
                  <input
                    id="notice-file-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="d-none"
                  />
                </div>

                <div>
                  <CButton
                    color="primary"
                    variant="outline"
                    size="sm"
                    style={{ borderRadius: '8px' }}
                    onClick={() => {
                      setCameraModalVisible(true)
                      startCamera()
                    }}
                  >
                    <i className="fa-solid fa-camera me-2"></i>
                    {t('noticeBoard.form.capturePhotoLive', 'Capture Photo')}
                  </CButton>
                </div>
              </div>

              <div className="text-body-secondary small mt-2">
                {t(
                  'noticeBoard.form.uploadHint',
                  'Accepted formats: JPG, JPEG, PNG, WEBP. Max 10MB per image. Max 5 images total.',
                )}
              </div>

              {validationError && (
                <div className="text-danger small mt-2 fw-semibold">{validationError}</div>
              )}

              {/* Thumbnail Gallery Preview */}
              {(existingImages.length > 0 || selectedFiles.length > 0) && (
                <div className="d-flex flex-wrap gap-3 mt-3">
                  {/* Existing Images */}
                  {existingImages.map((img, idx) => (
                    <div
                      key={`existing-${idx}`}
                      className="position-relative border rounded p-1 bg-body"
                      style={{ width: '100px', height: '100px' }}
                    >
                      <img
                        src={img.url}
                        alt={img.filename || 'existing'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                      />

                      {/* Hover action overlay */}
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-1 opacity-0 bg-dark bg-opacity-50"
                        style={{
                          transition: 'opacity 0.2s ease-in-out',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0'
                        }}
                      >
                        <CButton
                          color="primary"
                          size="sm"
                          className="px-1.5 py-0.5 text-white"
                          onClick={() => setActivePreviewImage(img.url)}
                          title="Preview"
                          style={{ fontSize: '10px' }}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </CButton>
                        <CButton
                          color="danger"
                          size="sm"
                          className="px-1.5 py-0.5 text-white"
                          onClick={() => removeExistingImage(idx)}
                          title="Remove"
                          style={{ fontSize: '10px' }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </CButton>
                      </div>
                    </div>
                  ))}

                  {/* New selected files */}
                  {selectedFiles.map((file, idx) => {
                    const objectUrl = URL.createObjectURL(file)
                    return (
                      <div
                        key={`new-${idx}`}
                        className="position-relative border rounded p-1 bg-body"
                        style={{ width: '100px', height: '100px' }}
                      >
                        <img
                          src={objectUrl}
                          alt={file.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '4px',
                          }}
                        />

                        {/* Hover action overlay */}
                        <div
                          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-1 opacity-0 bg-dark bg-opacity-50"
                          style={{
                            transition: 'opacity 0.2s ease-in-out',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0'
                          }}
                        >
                          <CButton
                            color="primary"
                            size="sm"
                            className="px-1.5 py-0.5 text-white"
                            onClick={() => setActivePreviewImage(objectUrl)}
                            title="Preview"
                            style={{ fontSize: '10px' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            className="px-1.5 py-0.5 text-white"
                            onClick={() => removeSelectedFile(idx)}
                            title="Remove"
                            style={{ fontSize: '10px' }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </CButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grid fields */}
            <div className="row">
              <div className="col-md-6 mb-3">
                <CFormLabel
                  htmlFor="notice-category-select"
                  className="small fw-semibold text-secondary"
                >
                  {t('noticeBoard.form.categoryLabel', 'Category')}
                </CFormLabel>
                <CFormSelect
                  id="notice-category-select"
                  invalid={!!errors.category}
                  {...register('category')}
                  style={{ borderRadius: '8px' }}
                >
                  {Object.values(CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`noticeBoard.categories.${cat}`, cat)}
                    </option>
                  ))}
                </CFormSelect>
                {errors.category && (
                  <div className="text-danger small mt-1">{errors.category.message}</div>
                )}
              </div>

              <div className="col-md-6 mb-3">
                <CFormLabel
                  htmlFor="notice-priority-select"
                  className="small fw-semibold text-secondary"
                >
                  {t('noticeBoard.form.priorityLabel', 'Priority')}
                </CFormLabel>
                <CFormSelect
                  id="notice-priority-select"
                  invalid={!!errors.priority}
                  {...register('priority')}
                  style={{ borderRadius: '8px' }}
                >
                  {Object.values(PRIORITIES).map((pri) => (
                    <option key={pri} value={pri}>
                      {t(`noticeBoard.priorities.${pri}`, pri)}
                    </option>
                  ))}
                </CFormSelect>
                {errors.priority && (
                  <div className="text-danger small mt-1">{errors.priority.message}</div>
                )}
              </div>
            </div>

            <div className="row">
              <div className={`col-md-${statusValue === STATUSES.SCHEDULED ? '4' : '6'} mb-3`}>
                <CFormLabel
                  htmlFor="notice-status-select"
                  className="small fw-semibold text-secondary"
                >
                  {t('noticeBoard.form.statusLabel', 'Status')}
                </CFormLabel>
                <CFormSelect
                  id="notice-status-select"
                  invalid={!!errors.status}
                  {...register('status')}
                  style={{ borderRadius: '8px' }}
                >
                  {Object.values(STATUSES).map((st) => (
                    <option key={st} value={st}>
                      {t(`noticeBoard.statuses.${st}`, st)}
                    </option>
                  ))}
                </CFormSelect>
                {errors.status && (
                  <div className="text-danger small mt-1">{errors.status.message}</div>
                )}
              </div>

              <div className={`col-md-${statusValue === STATUSES.SCHEDULED ? '4' : '6'} mb-3`}>
                <CFormLabel
                  htmlFor="notice-expiry-input"
                  className="small fw-semibold text-secondary"
                >
                  {t('noticeBoard.form.expiryLabel', 'Expiry Date')}
                </CFormLabel>
                <CFormInput
                  id="notice-expiry-input"
                  type="date"
                  invalid={!!errors.expiryDate}
                  {...register('expiryDate')}
                  style={{ borderRadius: '8px' }}
                />
                {errors.expiryDate && (
                  <div className="text-danger small mt-1" id="notice-expiry-error">
                    {errors.expiryDate.message}
                  </div>
                )}
              </div>

              {statusValue === STATUSES.SCHEDULED && (
                <div className="col-md-4 mb-3">
                  <CFormLabel
                    htmlFor="notice-schedule-input"
                    className="small fw-semibold text-secondary"
                  >
                    {t('noticeBoard.form.scheduleLabel', 'Schedule Date')}
                  </CFormLabel>
                  <CFormInput
                    id="notice-schedule-input"
                    type="date"
                    invalid={!!errors.scheduleDate}
                    {...register('scheduleDate')}
                    style={{ borderRadius: '8px' }}
                  />
                  {errors.scheduleDate && (
                    <div className="text-danger small mt-1">{errors.scheduleDate.message}</div>
                  )}
                </div>
              )}
            </div>

            {/* Pin Check */}
            <div className="mb-3 pt-2">
              <CFormCheck
                id="notice-pin-check"
                label={t('noticeBoard.form.pinLabel', 'Pin this notice to top')}
                disabled={statusValue === STATUSES.DRAFT}
                {...register('isPinned')}
              />
              <span className="text-body-secondary small ms-4 d-block mt-1">
                {t(
                  'noticeBoard.form.pinHint',
                  'Note: Pinning this notice will automatically unpin other active notices.',
                )}
              </span>
            </div>
          </form>
        </CModalBody>
        <CModalFooter className="border-top-0 pt-0">
          <CButton
            id="close-notice-form-btn"
            color="light"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ borderRadius: '8px' }}
          >
            {t('noticeBoard.form.cancel', 'Cancel')}
          </CButton>
          <CButton
            id="save-notice-btn"
            type="submit"
            form="notice-form"
            color="primary"
            size="sm"
            disabled={isSubmitting}
            style={{ fontWeight: 600, borderRadius: '8px' }}
          >
            {isSubmitting ? (
              <>
                <CSpinner size="sm" className="me-2" style={{ width: '1rem', height: '1rem' }} />
                {t('noticeBoard.form.saving', 'Saving...')}
              </>
            ) : notice ? (
              t('noticeBoard.form.save', 'Save')
            ) : (
              t('noticeBoard.form.create', 'Create Notice')
            )}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Live Camera Preview Modal */}
      <CModal
        visible={cameraModalVisible}
        onClose={() => {
          stopCamera()
          setCameraModalVisible(false)
        }}
        alignment="center"
        size="md"
        backdrop="static"
      >
        <CModalHeader className="border-bottom-0 pb-0">
          <CModalTitle style={{ fontSize: '1.1rem', fontWeight: 700 }} className="text-body">
            {t('noticeBoard.camera.title', 'Capture Photo')}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="py-3 px-4 text-center">
          {cameraPermissionError ? (
            <div
              className="alert alert-danger my-2 text-start"
              role="alert"
              style={{ fontSize: '13px' }}
            >
              {cameraPermissionError}
            </div>
          ) : (
            <div
              className="position-relative bg-black rounded overflow-hidden"
              style={{
                minHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
              }}
            >
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    transform: 'scaleX(-1)',
                  }}
                />
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured frame"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              )}
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </CModalBody>
        <CModalFooter className="border-top-0 pt-0 justify-content-center">
          {cameraPermissionError ? (
            <CButton
              color="secondary"
              size="sm"
              style={{ borderRadius: '8px' }}
              onClick={() => {
                setCameraModalVisible(false)
                stopCamera()
              }}
            >
              {t('noticeBoard.camera.close', 'Close')}
            </CButton>
          ) : !capturedPhoto ? (
            <>
              <CButton
                color="secondary"
                size="sm"
                style={{ borderRadius: '8px' }}
                onClick={() => {
                  setCameraModalVisible(false)
                  stopCamera()
                }}
              >
                {t('noticeBoard.camera.cancel', 'Cancel')}
              </CButton>
              <CButton
                color="primary"
                size="sm"
                style={{ borderRadius: '8px', fontWeight: 600 }}
                onClick={capturePhoto}
              >
                <i className="fa-solid fa-circle-dot me-2"></i>
                {t('noticeBoard.camera.capture', 'Capture')}
              </CButton>
            </>
          ) : (
            <>
              <CButton
                color="secondary"
                size="sm"
                style={{ borderRadius: '8px' }}
                onClick={() => setCapturedPhoto(null)}
              >
                {t('noticeBoard.camera.retake', 'Retake')}
              </CButton>
              <CButton
                color="success"
                size="sm"
                style={{ borderRadius: '8px', fontWeight: 600, color: '#ffffff' }}
                onClick={usePhoto}
              >
                <i className="fa-solid fa-check me-2"></i>
                {t('noticeBoard.camera.usePhoto', 'Use Photo')}
              </CButton>
            </>
          )}
        </CModalFooter>
      </CModal>

      {/* Image Preview Lightbox modal */}
      <CModal
        visible={!!activePreviewImage}
        onClose={() => setActivePreviewImage(null)}
        alignment="center"
        size="lg"
      >
        <CModalBody
          className="p-0 text-center position-relative bg-black d-flex align-items-center justify-content-center"
          style={{ minHeight: '60vh' }}
        >
          <button
            onClick={() => setActivePreviewImage(null)}
            className="btn btn-outline-light position-absolute top-0 end-0 m-3 d-flex align-items-center justify-content-center"
            style={{ borderRadius: '50%', zIndex: 1050, width: '36px', height: '36px', padding: 0 }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img
            src={activePreviewImage}
            alt="Preview"
            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </CModalBody>
      </CModal>
    </>
  )
}

NoticeBoardFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  notice: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default NoticeBoardFormModal
