import React, { useEffect, useState, useRef } from 'react'
import PropTypes from 'prop-types'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Label } from 'src/components/ui/label'
import { Input } from 'src/components/ui/input'
import { Textarea } from 'src/components/ui/textarea'
import { Checkbox } from 'src/components/ui/checkbox'
import { Button } from 'src/components/ui/button'
import { UploadCloud, Camera, Eye, Trash2, CameraOff, X, Check, EyeOff } from 'lucide-react'
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
    setValue,
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
  const isPinnedValue = watch('isPinned')

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
      <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              {notice
                ? t('noticeBoard.form.editTitle', 'Edit Notice')
                : t('noticeBoard.form.createTitle', 'Create New Notice')}
            </DialogTitle>
          </DialogHeader>

          <form id="notice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="notice-title-input" className="text-xs font-semibold">
                {t('noticeBoard.form.titleLabel', 'Title')}
              </Label>
              <Input
                id="notice-title-input"
                type="text"
                placeholder={t('noticeBoard.form.titlePlaceholder', 'Enter notice title...')}
                {...register('registerTitle')} // register input correctly
                onChange={(e) => setValue('title', e.target.value, { shouldValidate: true })}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
              {errors.title && (
                <div className="text-danger text-2xs font-semibold mt-1" id="notice-title-error">
                  {errors.title.message}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="notice-desc-input" className="text-xs font-semibold">
                {t('noticeBoard.form.descriptionLabel', 'Description')}
              </Label>
              <Textarea
                id="notice-desc-input"
                placeholder={t(
                  'noticeBoard.form.descriptionPlaceholder',
                  'Enter detailed description...',
                )}
                rows={4}
                {...register('description')}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white resize-none"
              />
              {errors.description && (
                <div className="text-danger text-2xs font-semibold mt-1" id="notice-desc-error">
                  {errors.description.message}
                </div>
              )}
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="notice-image-input" className="text-xs font-semibold">
                {t('noticeBoard.form.imageLabel', 'Notice Image URL (Optional)')}
              </Label>
              <Input
                id="notice-image-input"
                type="text"
                placeholder={t(
                  'noticeBoard.form.imagePlaceholder',
                  'https://example.com/image.jpg',
                )}
                {...register('image')}
                className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
              />
              {errors.image && <div className="text-danger text-2xs font-semibold mt-1">{errors.image.message}</div>}
            </div>

            {/* Upload Images Section */}
            <div className="rounded-xl border border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/20 p-4 space-y-3">
              <Label className="text-xs font-semibold text-black dark:text-white">
                {t('noticeBoard.form.uploadImagesLabel', 'Upload Images')}
              </Label>

              <div className="flex align-items-center gap-3 flex-wrap">
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1.5"
                    onClick={() => document.getElementById('notice-file-input').click()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {t('noticeBoard.form.browseFiles', 'Browse Files')}
                  </Button>
                  <input
                    id="notice-file-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1.5"
                    onClick={() => {
                      setCameraModalVisible(true)
                      startCamera()
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    {t('noticeBoard.form.capturePhotoLive', 'Capture Photo')}
                  </Button>
                </div>
              </div>

              <div className="text-gray-400 dark:text-gray-500 text-[10px] leading-normal font-semibold">
                {t(
                  'noticeBoard.form.uploadHint',
                  'Accepted formats: JPG, JPEG, PNG, WEBP. Max 10MB per image. Max 5 images total.',
                )}
              </div>

              {validationError && (
                <div className="text-danger text-2xs font-semibold mt-2">{validationError}</div>
              )}

              {/* Thumbnail Gallery Preview */}
              {(existingImages.length > 0 || selectedFiles.length > 0) && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {/* Existing Images */}
                  {existingImages.map((img, idx) => (
                    <div
                      key={`existing-${idx}`}
                      className="relative border border-stroke dark:border-strokedark rounded-lg p-1 bg-white dark:bg-boxdark h-20 w-20 group"
                    >
                      <img
                        src={img.url}
                        alt={img.filename || 'existing'}
                        className="w-full h-full object-cover rounded"
                      />

                      {/* Hover action overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 bg-black/60 rounded transition-opacity duration-150">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 border-white text-white bg-transparent hover:bg-white/20"
                          onClick={() => setActivePreviewImage(img.url)}
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 border-danger text-danger bg-transparent hover:bg-danger/10"
                          onClick={() => removeExistingImage(idx)}
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* New selected files */}
                  {selectedFiles.map((file, idx) => {
                    const objectUrl = URL.createObjectURL(file)
                    return (
                      <div
                        key={`new-${idx}`}
                        className="relative border border-stroke dark:border-strokedark rounded-lg p-1 bg-white dark:bg-boxdark h-20 w-20 group"
                      >
                        <img
                          src={objectUrl}
                          alt={file.name}
                          className="w-full h-full object-cover rounded"
                        />

                        {/* Hover action overlay */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 bg-black/60 rounded transition-opacity duration-150">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 border-white text-white bg-transparent hover:bg-white/20"
                            onClick={() => setActivePreviewImage(objectUrl)}
                            title="Preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0 border-danger text-danger bg-transparent hover:bg-danger/10"
                            onClick={() => removeSelectedFile(idx)}
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Grid fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="notice-category-select" className="text-xs font-semibold">
                  {t('noticeBoard.form.categoryLabel', 'Category')}
                </Label>
                <select
                  id="notice-category-select"
                  {...register('category')}
                  className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  {Object.values(CATEGORIES).map((cat) => (
                    <option key={cat} value={cat} className="bg-white dark:bg-boxdark">
                      {t(`noticeBoard.categories.${cat}`, cat)}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <div className="text-danger text-2xs font-semibold mt-1">{errors.category.message}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notice-priority-select" className="text-xs font-semibold">
                  {t('noticeBoard.form.priorityLabel', 'Priority')}
                </Label>
                <select
                  id="notice-priority-select"
                  {...register('priority')}
                  className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  {Object.values(PRIORITIES).map((pri) => (
                    <option key={pri} value={pri} className="bg-white dark:bg-boxdark">
                      {t(`noticeBoard.priorities.${pri}`, pri)}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <div className="text-danger text-2xs font-semibold mt-1">{errors.priority.message}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="notice-status-select" className="text-xs font-semibold">
                  {t('noticeBoard.form.statusLabel', 'Status')}
                </Label>
                <select
                  id="notice-status-select"
                  {...register('status')}
                  className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  {Object.values(STATUSES).map((st) => (
                    <option key={st} value={st} className="bg-white dark:bg-boxdark">
                      {t(`noticeBoard.statuses.${st}`, st)}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <div className="text-danger text-2xs font-semibold mt-1">{errors.status.message}</div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notice-expiry-input" className="text-xs font-semibold">
                  {t('noticeBoard.form.expiryLabel', 'Expiry Date')}
                </Label>
                <Input
                  id="notice-expiry-input"
                  type="date"
                  {...register('expiryDate')}
                  className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                />
                {errors.expiryDate && (
                  <div className="text-danger text-2xs font-semibold mt-1" id="notice-expiry-error">
                    {errors.expiryDate.message}
                  </div>
                )}
              </div>

              {statusValue === STATUSES.SCHEDULED && (
                <div className="space-y-1.5">
                  <Label htmlFor="notice-schedule-input" className="text-xs font-semibold">
                    {t('noticeBoard.form.scheduleLabel', 'Schedule Date')}
                  </Label>
                  <Input
                    id="notice-schedule-input"
                    type="date"
                    {...register('scheduleDate')}
                    className="w-full text-xs bg-transparent border-stroke dark:border-strokedark text-black dark:text-white"
                  />
                  {errors.scheduleDate && (
                    <div className="text-danger text-2xs font-semibold mt-1">{errors.scheduleDate.message}</div>
                  )}
                </div>
              )}
            </div>

            {/* Pin Check */}
            <div className="space-y-1 pt-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notice-pin-check"
                  checked={isPinnedValue || false}
                  onCheckedChange={(checked) => setValue('isPinned', !!checked)}
                  disabled={statusValue === STATUSES.DRAFT}
                  className="checkbox"
                />
                <Label htmlFor="notice-pin-check" className="text-xs font-semibold text-black dark:text-white cursor-pointer select-none">
                  {t('noticeBoard.form.pinLabel', 'Pin this notice to top')}
                </Label>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold pl-6 block leading-normal">
                {t(
                  'noticeBoard.form.pinHint',
                  'Note: Pinning this notice will automatically unpin other active notices.',
                )}
              </span>
            </div>
          </form>

          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              id="close-notice-form-btn"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              {t('noticeBoard.form.cancel', 'Cancel')}
            </Button>
            <Button
              id="save-notice-btn"
              type="submit"
              form="notice-form"
              variant="default"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-bold px-4 py-2"
            >
              {isSubmitting ? (
                <>
                  <div className="inline-block h-3 w-3 animate-spin rounded-full border border-solid border-white border-r-transparent mr-2" />
                  {t('noticeBoard.form.saving', 'Saving...')}
                </>
              ) : notice ? (
                t('noticeBoard.form.save', 'Save')
              ) : (
                t('noticeBoard.form.create', 'Create Notice')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Camera Preview Modal */}
      {cameraModalVisible && (
        <Dialog 
          open={cameraModalVisible} 
          onOpenChange={(open) => {
            if (!open) {
              stopCamera()
              setCameraModalVisible(false)
            }
          }}
        >
          <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-black dark:text-white">
                {t('noticeBoard.camera.title', 'Capture Photo')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-3 text-center space-y-4">
              {cameraPermissionError ? (
                <div className="text-xs text-red-500 p-2.5 bg-red-50/10 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-md text-left">
                  {cameraPermissionError}
                </div>
              ) : (
                <div className="relative bg-black rounded-lg overflow-hidden h-80 flex items-center justify-center">
                  {!capturedPhoto ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <img
                      src={capturedPhoto}
                      alt="Captured frame"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <DialogFooter className="flex justify-center gap-3 pt-2 w-full sm:space-x-0">
              {cameraPermissionError ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCameraModalVisible(false)
                    stopCamera()
                  }}
                  className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
                >
                  {t('noticeBoard.camera.close', 'Close')}
                </Button>
              ) : !capturedPhoto ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCameraModalVisible(false)
                      stopCamera()
                    }}
                    className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
                  >
                    {t('noticeBoard.camera.cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={capturePhoto}
                    className="text-xs font-bold px-4 py-2 flex items-center gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    {t('noticeBoard.camera.capture', 'Capture')}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCapturedPhoto(null)}
                    className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
                  >
                    {t('noticeBoard.camera.retake', 'Retake')}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={usePhoto}
                    className="text-xs font-bold px-4 py-2 flex items-center gap-1.5 bg-success hover:bg-success/95 border-0 text-white"
                  >
                    <Check className="h-4 w-4" />
                    {t('noticeBoard.camera.usePhoto', 'Use Photo')}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Preview Lightbox modal */}
      {activePreviewImage && (
        <Dialog open={!!activePreviewImage} onOpenChange={(open) => !open && setActivePreviewImage(null)}>
          <DialogContent className="max-w-4xl bg-black border-0 p-0 text-center flex items-center justify-center min-h-[70vh]">
            <button
              onClick={() => setActivePreviewImage(null)}
              className="absolute top-4 right-4 h-9 w-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white border-0 cursor-pointer z-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activePreviewImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
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
