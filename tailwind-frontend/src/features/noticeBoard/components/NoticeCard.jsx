import React from 'react'
import PropTypes from 'prop-types'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from 'src/components/ui/dropdown-menu'
import {
  Pin,
  Trash2,
  Pencil,
  FolderOpen,
  Paperclip,
  Star,
  Check,
  MoreVertical
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
    isReadByUser,
    isBookmarkedByUser,
  } = notice

  // Local style formatters
  const getPriorityVariant = (p) => {
    switch (p) {
      case 'Critical':
        return 'lightError'
      case 'High':
        return 'lightWarning'
      case 'Medium':
        return 'lightInfo'
      default:
        return 'lightSecondary'
    }
  }

  const getStatusStyle = (s, exp) => {
    if (s === 'Expired' || (exp && new Date(exp) < new Date())) {
      return { variant: 'lightError', label: 'Expired' }
    }
    switch (s) {
      case 'Published':
        return { variant: 'lightSuccess', label: 'Published' }
      case 'Draft':
        return { variant: 'lightWarning', label: 'Draft' }
      case 'Scheduled':
        return { variant: 'lightInfo', label: 'Scheduled' }
      case 'Archived':
        return { variant: 'lightSecondary', label: 'Archived' }
      default:
        return { variant: 'lightSecondary', label: s }
    }
  }

  const priorityVariant = getPriorityVariant(priority)
  const statusStyle = getStatusStyle(status, expiryDate)
  const creatorName =
    createdBy?.username || createdBy?.name || t('noticeBoard.unknownUser', 'Someone')
  const hasAttachments = attachments && attachments.length > 0

  const displayImage = image || ''

  // Format posted time
  const postedDate = new Date(createdAt)
  const formattedDate = postedDate.toLocaleDateString()

  return (
    <div
      className={`rounded-xl border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col justify-between h-full relative transition-all duration-200 hover:shadow-md ${
        isPinned ? 'border-l-4 border-l-primary' : ''
      }`}
    >
      <div className="space-y-3.5">
        {/* Notice Media/Image */}
        {displayImage && (
          <div className="relative h-32 rounded-lg overflow-hidden shrink-0">
            <img
              src={displayImage}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src =
                  'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=60'
              }}
            />
            {isPinned && (
              <div className="absolute top-2 left-2">
                <Badge variant="lightPrimary" className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold">
                  <Pin className="h-3 w-3" />
                  <span>{t('noticeBoard.pinned', 'Pinned')}</span>
                </Badge>
              </div>
            )}
            {/* Unread dot indicator for resident */}
            {!isAdmin && !isReadByUser && (
              <div className="absolute top-2 right-2">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-danger border border-white dark:border-boxdark shadow-sm"
                  title={t('noticeBoard.unread', 'Unread')}
                />
              </div>
            )}
          </div>
        )}

        {/* Top Badges Row */}
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {!displayImage && isPinned && (
              <Badge variant="lightPrimary" className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold">
                <Pin className="h-3 w-3" />
                <span>{t('noticeBoard.pinned', 'Pinned')}</span>
              </Badge>
            )}
            {!displayImage && !isAdmin && !isReadByUser && (
              <span
                className="h-2.5 w-2.5 rounded-full bg-danger border border-white dark:border-boxdark shadow-sm"
                title={t('noticeBoard.unread', 'Unread')}
              />
            )}
            <Badge variant="lightSecondary" className="text-[10px] px-2 py-0.5 font-bold">
              {t(`noticeBoard.categories.${category}`, category)}
            </Badge>
            <Badge variant={priorityVariant} className="text-[10px] px-2 py-0.5 font-bold">
              {t(`noticeBoard.priorities.${priority}`, priority)}
            </Badge>
            {/* Read badge for residents */}
            {!isAdmin && isReadByUser && (
              <Badge variant="lightSuccess" className="text-[10px] px-2 py-0.5 font-bold">
                {t('noticeBoard.statuses.Read', 'Read')}
              </Badge>
            )}
          </div>
          <div>
            <Badge variant={statusStyle.variant} className="text-[10px] px-2 py-0.5 font-bold">
              {t(`noticeBoard.statuses.${statusStyle.label}`, statusStyle.label)}
            </Badge>
          </div>
        </div>

        {/* Notice Title */}
        <h5
          className="font-bold text-black dark:text-white mt-1 cursor-pointer hover:text-primary transition-colors line-clamp-2 text-sm leading-snug min-h-[36px]"
          onClick={() => onDetails(notice)}
        >
          {title}
        </h5>

        {/* Notice Description */}
        <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 leading-relaxed min-h-[32px]">
          {description}
        </p>
      </div>

      {/* Card Footer: Metadata and Actions */}
      <div className="flex justify-between items-center pt-2.5 border-t border-stroke/50 dark:border-strokedark/50 gap-2 mt-4">
        {/* Metadata */}
        <div className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold flex items-center gap-1.5 flex-wrap">
          <span className="text-black dark:text-white">{creatorName}</span>
          <span>&bull;</span>
          <span>{formattedDate}</span>
          {hasAttachments && (
            <>
              <span>&bull;</span>
              <span className="text-primary flex items-center gap-1" title={t('noticeBoard.hasAttachments', 'Has attachments')}>
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span>{attachments.length}</span>
              </span>
            </>
          )}
        </div>

        {/* Action triggers */}
        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {/* View Details */}
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-bold h-7 px-2.5 border-primary text-primary hover:bg-primary hover:text-white dark:hover:bg-primary flex items-center gap-1"
            onClick={() => onDetails(notice)}
            title={t('noticeBoard.actions.view', 'Read More')}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {t('noticeBoard.actions.view', 'Read More')}
          </Button>

          {/* Admin actions */}
          {isAdmin && (
            <>
              {canUpdate && (
                <>
                  <Button
                    variant={isPinned ? 'default' : 'outline'}
                    size="sm"
                    className={`text-[10px] font-bold h-7 px-2 ${
                      isPinned 
                        ? 'bg-primary text-white border-0 hover:bg-primary/95' 
                        : 'border-primary text-primary hover:bg-primary/10'
                    }`}
                    title={isPinned ? t('noticeBoard.unpin', 'Unpin') : t('noticeBoard.pin', 'Pin')}
                    onClick={() => onPinToggle(_id, !isPinned)}
                  >
                    <Pin className={`h-3.5 w-3.5 ${isPinned ? 'text-white' : ''}`} />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] font-bold h-7 px-2 border-warning text-warning hover:bg-warning/10"
                    onClick={() => onEdit(notice)}
                    title={t('noticeBoard.actions.edit', 'Edit')}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-bold h-7 px-2 border-danger text-danger hover:bg-danger/10"
                  onClick={() => onDelete(_id)}
                  title={t('noticeBoard.actions.delete', 'Delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* More Options Dropdown */}
              {canUpdate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] font-bold h-7 px-2 border-stroke dark:border-strokedark text-black dark:text-white"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-md shadow-default z-30">
                    <DropdownMenuItem 
                      onClick={() => onEdit({ ...notice, status: 'Archived' })}
                      className="py-2 px-4 cursor-pointer text-xs text-black dark:text-white hover:bg-slate-50 dark:hover:bg-meta-4/20 transition-colors"
                    >
                      {t('noticeBoard.actions.archive', 'Archive Notice')}
                    </DropdownMenuItem>
                    {status === 'Draft' && (
                      <DropdownMenuItem 
                        onClick={() => onEdit({ ...notice, status: 'Published' })}
                        className="py-2 px-4 cursor-pointer text-xs text-black dark:text-white hover:bg-slate-50 dark:hover:bg-meta-4/20 transition-colors"
                      >
                        {t('noticeBoard.actions.publish', 'Publish Draft')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          {/* Resident actions */}
          {!isAdmin && (
            <>
              {/* Bookmark Toggle */}
              <Button
                variant={isBookmarkedByUser ? 'default' : 'outline'}
                size="sm"
                className={`text-[10px] font-bold h-7 px-2 ${
                  isBookmarkedByUser 
                    ? 'bg-warning text-white border-0 hover:bg-warning/95' 
                    : 'border-warning text-warning hover:bg-warning/10'
                }`}
                onClick={() => onBookmark(_id, !isBookmarkedByUser)}
                title={
                  isBookmarkedByUser
                    ? t('noticeBoard.unbookmark', 'Unbookmark')
                    : t('noticeBoard.bookmark', 'Bookmark')
                }
              >
                <Star className={`h-3.5 w-3.5 ${isBookmarkedByUser ? 'fill-white text-white' : ''}`} />
              </Button>

              {/* Mark as Read */}
              <Button
                variant={isReadByUser ? 'default' : 'outline'}
                size="sm"
                className={`text-[10px] font-bold h-7 px-2 ${
                  isReadByUser 
                    ? 'bg-success text-white border-0 cursor-not-allowed' 
                    : 'border-primary text-primary hover:bg-primary/10'
                }`}
                disabled={isReadByUser}
                onClick={() => onMarkAsRead(_id)}
                title={
                  isReadByUser
                    ? t('noticeBoard.read', 'Read')
                    : t('noticeBoard.markAsRead', 'Mark as Read')
                }
              >
                <Check className={`h-3.5 w-3.5 ${isReadByUser ? 'text-white' : ''}`} />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
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
