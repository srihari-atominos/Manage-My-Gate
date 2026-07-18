import React from 'react'
import PropTypes from 'prop-types'
import {
  CCard,
  CCardBody,
  CBadge,
  CButton,
  CTooltip,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPin,
  cilTrash,
  cilPencil,
  cilFolderOpen,
  cilPaperclip,
  cilStar,
  cilCheck,
  cilOptions,
} from '@coreui/icons'
import { useTranslation } from 'react-i18next'

/**
 * NoticeCard Component
 * Displays a single notice as a clean card matching the dashboard aesthetics.
 * Reusable for both Admin and Resident views.
 */
export const NoticeCard = ({
  notice,
  onDetails,
  onEdit,
  onDelete,
  onPinToggle,
  onBookmark,
  onMarkAsRead,
  isAdmin = false,
  canUpdate = false,
  canDelete = false,
}) => {
  const { t } = useTranslation()
  const {
    _id,
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
    isReadByUser,
    isBookmarkedByUser,
  } = notice

  // Local style formatters
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
      case 'Scheduled':
        return { color: 'info', label: 'Scheduled' }
      case 'Archived':
        return { color: 'secondary', label: 'Archived' }
      default:
        return { color: 'secondary', label: s }
    }
  }

  const priorityColor = getPriorityBadgeColor(priority)
  const statusStyle = getStatusStyle(status, expiryDate)
  const creatorName =
    createdBy?.username || createdBy?.name || t('noticeBoard.unknownUser', 'Someone')
  const hasAttachments = attachments && attachments.length > 0

  // Default fallback image if none provided
  const displayImage = image || ''

  // Format posted time
  const postedDate = new Date(createdAt)
  const formattedDate = postedDate.toLocaleDateString()
  const formattedTime = postedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <CCard
      className={`mb-3 border-0 shadow-sm notice-card position-relative h-100 d-flex flex-column ${isPinned ? 'pinned-notice-card' : ''}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Notice Media/Image */}
      {displayImage && (
        <div
          className="notice-card-media position-relative"
          style={{ height: '120px', overflow: 'hidden' }}
        >
          <img
            src={displayImage}
            alt={title}
            className="w-100 h-100"
            style={{ objectFit: 'cover' }}
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=60'
            }}
          />
          {isPinned && (
            <div className="position-absolute top-0 start-0 m-2">
              <CBadge
                color="primary"
                className="d-flex align-items-center gap-1 py-1 px-2 shadow-sm border border-white border-opacity-25"
                style={{ borderRadius: '6px', fontSize: '10px' }}
              >
                <CIcon icon={cilPin} size="sm" />
                <span>{t('noticeBoard.pinned', 'Pinned')}</span>
              </CBadge>
            </div>
          )}
          {/* Unread dot indicator for resident */}
          {!isAdmin && !isReadByUser && (
            <div className="position-absolute top-0 end-0 m-2">
              <span
                className="d-flex align-items-center justify-content-center p-1 bg-danger border border-light rounded-circle shadow-sm"
                style={{ width: '10px', height: '10px' }}
                title={t('noticeBoard.unread', 'Unread')}
              ></span>
            </div>
          )}
        </div>
      )}

      <CCardBody className="p-3 d-flex flex-column flex-grow-1 gap-2">
        {/* Top Badges Row */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-1">
            {!displayImage && isPinned && (
              <CBadge
                color="primary"
                className="d-flex align-items-center gap-1 py-1 px-2 shadow-sm border border-secondary border-opacity-25"
                style={{ borderRadius: '6px', fontSize: '10px' }}
              >
                <CIcon icon={cilPin} size="sm" />
                <span>{t('noticeBoard.pinned', 'Pinned')}</span>
              </CBadge>
            )}
            {!displayImage && !isAdmin && !isReadByUser && (
              <span
                className="d-inline-block p-1 bg-danger border border-light rounded-circle shadow-sm me-1"
                style={{ width: '10px', height: '10px' }}
                title={t('noticeBoard.unread', 'Unread')}
              ></span>
            )}
            <CBadge
              color="light"
              className="text-body border border-secondary border-opacity-25 small fw-semibold"
              style={{ fontSize: '10px' }}
            >
              {t(`noticeBoard.categories.${category}`, category)}
            </CBadge>
            <CBadge color={priorityColor} className="small" style={{ fontSize: '10px' }}>
              {t(`noticeBoard.priorities.${priority}`, priority)}
            </CBadge>
            {/* Read badge for residents */}
            {!isAdmin && isReadByUser && (
              <CBadge
                color="success"
                variant="outline"
                className="small"
                style={{ fontSize: '10px' }}
              >
                {t('noticeBoard.statuses.Read', 'Read')}
              </CBadge>
            )}
          </div>
          <div>
            <CBadge
              color={statusStyle.color}
              variant="outline"
              className="small"
              style={{ fontSize: '10px' }}
            >
              {t(`noticeBoard.statuses.${statusStyle.label}`, statusStyle.label)}
            </CBadge>
          </div>
        </div>

        {/* Notice Title */}
        <h5
          className="fw-bold text-body mt-1 mb-1 cursor-pointer hover-text-primary text-truncate-2"
          onClick={() => onDetails(notice)}
          style={{ fontSize: '14.5px', minHeight: '38px', margin: '4px 0' }}
        >
          {title}
        </h5>

        {/* Notice Description */}
        <p
          className="text-secondary small mb-2 text-truncate-2"
          style={{ lineHeight: 1.4, minHeight: '34px', fontSize: '12px' }}
        >
          {description}
        </p>

        {/* Card Footer: Metadata and Actions */}
        <div className="d-flex justify-content-between align-items-center pt-2 border-top flex-wrap gap-2 mt-auto">
          {/* Metadata */}
          <div
            className="text-body-secondary small d-flex align-items-center gap-1 flex-wrap"
            style={{ fontSize: '11px' }}
          >
            <span className="fw-semibold text-body">{creatorName}</span>
            <span className="text-opacity-50">•</span>
            <span>{formattedDate}</span>
            {hasAttachments && (
              <>
                <span className="text-opacity-50">•</span>
                <CTooltip content={t('noticeBoard.hasAttachments', 'Has attachments')}>
                  <span className="text-info d-inline-flex align-items-center gap-1">
                    <CIcon icon={cilPaperclip} size="sm" />
                    <span className="fw-semibold">{attachments.length}</span>
                  </span>
                </CTooltip>
              </>
            )}
          </div>

          {/* Action triggers */}
          <div className="d-flex align-items-center gap-1 ms-auto flex-wrap">
            {/* View Details */}
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              className="fw-semibold px-2 btn-read-more"
              onClick={() => onDetails(notice)}
              title={t('noticeBoard.actions.view', 'Read More')}
              style={{ fontSize: '11.5px', padding: '2px 8px' }}
            >
              <CIcon icon={cilFolderOpen} size="sm" className="me-1 align-middle" />
              {t('noticeBoard.actions.view', 'Read More')}
            </CButton>

            {/* Admin actions */}
            {isAdmin && (
              <>
                {canUpdate && (
                  <>
                    <CButton
                      color="primary"
                      variant={isPinned ? 'solid' : 'outline'}
                      size="sm"
                      className="px-2 btn-pin-toggle"
                      title={
                        isPinned ? t('noticeBoard.unpin', 'Unpin') : t('noticeBoard.pin', 'Pin')
                      }
                      onClick={() => onPinToggle(_id, !isPinned)}
                      style={{ padding: '2px 8px' }}
                    >
                      <CIcon icon={cilPin} size="sm" className={isPinned ? 'text-white' : ''} />
                    </CButton>

                    <CButton
                      color="warning"
                      variant="outline"
                      size="sm"
                      className="fw-semibold px-2"
                      onClick={() => onEdit(notice)}
                      title={t('noticeBoard.actions.edit', 'Edit')}
                      style={{ padding: '2px 8px' }}
                    >
                      <CIcon icon={cilPencil} size="sm" />
                    </CButton>
                  </>
                )}

                {canDelete && (
                  <CButton
                    color="danger"
                    variant="outline"
                    size="sm"
                    className="fw-semibold px-2"
                    onClick={() => onDelete(_id)}
                    title={t('noticeBoard.actions.delete', 'Delete')}
                    style={{ padding: '2px 8px' }}
                  >
                    <CIcon icon={cilTrash} size="sm" />
                  </CButton>
                )}

                {/* More Options Dropdown */}
                {canUpdate && (
                  <CDropdown variant="btn-group">
                    <CDropdownToggle
                      color="light"
                      size="sm"
                      variant="outline"
                      className="px-2"
                      style={{ padding: '2px 8px' }}
                    >
                      <CIcon icon={cilOptions} size="sm" />
                    </CDropdownToggle>
                    <CDropdownMenu>
                      <CDropdownItem onClick={() => onEdit({ ...notice, status: 'Archived' })}>
                        {t('noticeBoard.actions.archive', 'Archive Notice')}
                      </CDropdownItem>
                      {status === 'Draft' && (
                        <CDropdownItem onClick={() => onEdit({ ...notice, status: 'Published' })}>
                          {t('noticeBoard.actions.publish', 'Publish Draft')}
                        </CDropdownItem>
                      )}
                    </CDropdownMenu>
                  </CDropdown>
                )}
              </>
            )}

            {/* Resident actions */}
            {!isAdmin && (
              <>
                {/* Bookmark Toggle */}
                <CButton
                  color="warning"
                  variant={isBookmarkedByUser ? 'solid' : 'outline'}
                  size="sm"
                  className="px-2 btn-bookmark-toggle"
                  onClick={() => onBookmark(_id, !isBookmarkedByUser)}
                  title={
                    isBookmarkedByUser
                      ? t('noticeBoard.unbookmark', 'Unbookmark')
                      : t('noticeBoard.bookmark', 'Bookmark')
                  }
                  style={{ padding: '2px 8px' }}
                >
                  <CIcon
                    icon={cilStar}
                    size="sm"
                    className={isBookmarkedByUser ? 'text-white' : ''}
                  />
                </CButton>

                {/* Mark as Read */}
                <CButton
                  color={isReadByUser ? 'success' : 'primary'}
                  variant={isReadByUser ? 'solid' : 'outline'}
                  size="sm"
                  className="px-2 btn-read-toggle"
                  disabled={isReadByUser}
                  onClick={() => onMarkAsRead(_id)}
                  title={
                    isReadByUser
                      ? t('noticeBoard.read', 'Read')
                      : t('noticeBoard.markAsRead', 'Mark as Read')
                  }
                  style={{ padding: '2px 8px' }}
                >
                  <CIcon icon={cilCheck} size="sm" className={isReadByUser ? 'text-white' : ''} />
                </CButton>
              </>
            )}
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

NoticeCard.propTypes = {
  notice: PropTypes.object.isRequired,
  onDetails: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onPinToggle: PropTypes.func,
  onBookmark: PropTypes.func,
  onMarkAsRead: PropTypes.func,
  isAdmin: PropTypes.bool,
  canUpdate: PropTypes.bool,
  canDelete: PropTypes.bool,
}

export default NoticeCard
