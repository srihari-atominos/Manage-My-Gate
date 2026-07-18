import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPin } from '@coreui/icons'
import { useTranslation } from 'react-i18next'

/**
 * NoticeBoardDetailsModal Component
 * Renders complete notice details in a modal.
 */
export const NoticeBoardDetailsModal = ({ visible, notice, onClose }) => {
  const { t } = useTranslation()
  const [activeLightBoxImage, setActiveLightBoxImage] = useState(null)

  if (!notice) return null

  const {
    title,
    description,
    category,
    priority,
    status,
    expiryDate,
    isPinned,
    createdBy,
    createdAt,
    attachments,
    image,
    images,
  } = notice

  const getPriorityBadgeColor = (p) => {
    switch (p) {
      case 'Critical':
        return 'danger'
      case 'High':
        return 'warning'
      case 'Medium':
        return 'info'
      default:
        return 'secondary'
    }
  }

  const getStatusStyle = (s, exp) => {
    if (s === 'Expired' || (exp && new Date(exp) < new Date())) {
      return { color: 'danger', label: 'Expired' }
    }
    switch (s) {
      case 'Published':
        return { color: 'success', label: 'Published' }
      case 'Draft':
        return { color: 'warning', label: 'Draft' }
      default:
        return { color: 'secondary', label: s }
    }
  }

  const priorityColor = getPriorityBadgeColor(priority)
  const statusStyle = getStatusStyle(status, expiryDate)
  const creatorName =
    createdBy?.username || createdBy?.name || t('noticeBoard.unknownUser', 'Someone')
  const hasAttachments = attachments && attachments.length > 0

  const coverImage = image || ''

  return (
    <>
      <CModal
        visible={visible}
        onClose={onClose}
        id="notice-details-modal"
        alignment="center"
        size="lg"
      >
        <CModalHeader className="border-bottom-0 pb-0">
          <div className="d-flex align-items-center gap-2 flex-wrap w-100">
            {isPinned && (
              <CBadge color="primary" className="d-flex align-items-center gap-1 py-1.5 px-2">
                <CIcon icon={cilPin} size="sm" />
                {t('noticeBoard.pinned', 'Pinned')}
              </CBadge>
            )}
            <CBadge color="light" className="text-body border small fw-semibold">
              {t(`noticeBoard.categories.${category}`, category)}
            </CBadge>
            <CBadge color={priorityColor} className="small">
              {t(`noticeBoard.priorities.${priority}`, priority)}
            </CBadge>
            <CBadge color={statusStyle.color} variant="outline" className="small">
              {t(`noticeBoard.statuses.${statusStyle.label}`, statusStyle.label)}
            </CBadge>
          </div>
        </CModalHeader>
        <CModalBody className="px-4 py-3">
          {/* Notice Image */}
          {coverImage && (
            <div
              className="mb-4 shadow-sm"
              style={{ height: '280px', overflow: 'hidden', borderRadius: '12px' }}
            >
              <img
                src={coverImage}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=60'
                }}
              />
            </div>
          )}

          <h3 className="fw-bold text-body mb-3">{title}</h3>

          {/* Metadata section */}
          <div
            className="d-flex align-items-center gap-3 p-3 bg-body-secondary rounded text-secondary mb-4 flex-wrap small"
            style={{ borderRadius: '8px' }}
          >
            <div>
              <span className="fw-semibold text-body">
                {t('noticeBoard.postedBy', 'Posted by')}:
              </span>{' '}
              {creatorName}
            </div>
            <div
              className="d-none d-sm-block bg-secondary opacity-25"
              style={{ width: '1px', height: '14px' }}
            />
            <div>
              <span className="fw-semibold text-body">
                {t('noticeBoard.postedOn', 'Date posted')}:
              </span>{' '}
              {new Date(createdAt).toLocaleDateString()}
            </div>
            <div
              className="d-none d-sm-block bg-secondary opacity-25"
              style={{ width: '1px', height: '14px' }}
            />
            <div>
              <span className="fw-semibold text-body">
                {t('noticeBoard.expiresOn', 'Expiry Date')}:
              </span>{' '}
              {new Date(expiryDate).toLocaleDateString()}
            </div>
          </div>

          {/* Content text */}
          <div
            className="notice-detailed-content p-1"
            style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1rem', color: '#2b303a' }}
          >
            {description}
          </div>

          {/* Uploaded Images Gallery */}
          {images && images.length > 0 && (
            <div className="border-top pt-3 mt-4">
              <h6 className="fw-bold text-body mb-2">
                {t('noticeBoard.uploadedImages', 'Uploaded Images')}
              </h6>
              <div className="d-flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="border rounded p-1 bg-body cursor-pointer overflow-hidden"
                    onClick={() => setActiveLightBoxImage(img.url)}
                    style={{
                      width: '80px',
                      height: '80px',
                      transition: 'transform 0.15s ease-in-out',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                  >
                    <img
                      src={img.url}
                      alt={img.filename || `Image ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="border-top pt-3 mt-4">
              <h6 className="fw-bold text-body mb-2">
                {t('noticeBoard.attachments', 'Attachments')}
              </h6>
              <div className="d-flex flex-column gap-2">
                {attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none text-info d-inline-flex align-items-center gap-2 small fw-semibold"
                  >
                    📎{' '}
                    {t('noticeBoard.attachmentItem', {
                      index: index + 1,
                      defaultValue: 'Attachment #{{index}}',
                    })}
                  </a>
                ))}
              </div>
            </div>
          )}
        </CModalBody>
        <CModalFooter className="border-top-0 pt-0">
          <CButton
            color="secondary"
            size="sm"
            onClick={onClose}
            id="btn-close-details"
            style={{ borderRadius: '8px' }}
          >
            {t('noticeBoard.close', 'Close')}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Lightbox modal for larger view */}
      <CModal
        visible={!!activeLightBoxImage}
        onClose={() => setActiveLightBoxImage(null)}
        alignment="center"
        size="xl"
      >
        <CModalBody
          className="p-0 text-center position-relative bg-black d-flex align-items-center justify-content-center"
          style={{ minHeight: '80vh' }}
        >
          <button
            onClick={() => setActiveLightBoxImage(null)}
            className="btn btn-outline-light position-absolute top-0 end-0 m-3 d-flex align-items-center justify-content-center"
            style={{ borderRadius: '50%', zIndex: 1050, width: '36px', height: '36px', padding: 0 }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          <img
            src={activeLightBoxImage}
            alt="Expanded view"
            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
          />
        </CModalBody>
      </CModal>
    </>
  )
}

NoticeBoardDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  notice: PropTypes.object,
  onClose: PropTypes.func.isRequired,
}

export default NoticeBoardDetailsModal
