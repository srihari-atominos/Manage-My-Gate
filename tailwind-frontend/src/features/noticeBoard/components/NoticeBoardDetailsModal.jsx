import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Pin, User, Calendar, Paperclip, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
      default:
        return { variant: 'lightSecondary', label: s }
    }
  }

  const priorityVariant = getPriorityVariant(priority)
  const statusStyle = getStatusStyle(status, expiryDate)
  const creatorName =
    createdBy?.username || createdBy?.name || t('noticeBoard.unknownUser', 'Someone')
  const hasAttachments = attachments && attachments.length > 0

  const coverImage = image || ''

  return (
    <>
      <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 w-full pb-2 border-b border-stroke dark:border-strokedark">
              {isPinned && (
                <Badge variant="lightPrimary" className="flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold">
                  <Pin className="h-3.5 w-3.5" />
                  {t('noticeBoard.pinned', 'Pinned')}
                </Badge>
              )}
              <Badge variant="lightSecondary" className="text-[10px] px-2 py-0.5 font-bold">
                {t(`noticeBoard.categories.${category}`, category)}
              </Badge>
              <Badge variant={priorityVariant} className="text-[10px] px-2 py-0.5 font-bold">
                {t(`noticeBoard.priorities.${priority}`, priority)}
              </Badge>
              <Badge variant={statusStyle.variant} className="text-[10px] px-2 py-0.5 font-bold">
                {t(`noticeBoard.statuses.${statusStyle.label}`, statusStyle.label)}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Notice Cover Image */}
            {coverImage && (
              <div className="h-64 rounded-xl overflow-hidden shadow-sm shrink-0">
                <img
                  src={coverImage}
                  alt={title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=60'
                  }}
                />
              </div>
            )}

            <h3 className="font-bold text-lg text-black dark:text-white leading-normal">{title}</h3>

            {/* Metadata section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-meta-4/20 rounded-xl border border-stroke dark:border-strokedark text-gray-500 dark:text-gray-400 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="truncate">
                  <strong className="text-black dark:text-white font-bold">{t('noticeBoard.postedBy', 'Posted by')}:</strong> {creatorName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="truncate">
                  <strong className="text-black dark:text-white font-bold">{t('noticeBoard.postedOn', 'Date posted')}:</strong> {new Date(createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="truncate">
                  <strong className="text-black dark:text-white font-bold">{t('noticeBoard.expiresOn', 'Expiry Date')}:</strong> {new Date(expiryDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Content text */}
            <div className="text-sm leading-relaxed text-black dark:text-white whitespace-pre-wrap py-2 border-b border-stroke dark:border-strokedark">
              {description}
            </div>

            {/* Uploaded Images Gallery */}
            {images && images.length > 0 && (
              <div className="space-y-2.5">
                <h6 className="font-bold text-xs text-black dark:text-white">
                  {t('noticeBoard.uploadedImages', 'Uploaded Images')}
                </h6>
                <div className="flex flex-wrap gap-2">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="border border-stroke dark:border-strokedark rounded-lg p-1 bg-white dark:bg-boxdark cursor-pointer overflow-hidden h-20 w-20 hover:scale-105 transition-transform duration-150 shrink-0"
                      onClick={() => setActiveLightBoxImage(img.url)}
                    >
                      <img
                        src={img.url}
                        alt={img.filename || `Image ${idx + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <div className="space-y-2.5 pt-2">
                <h6 className="font-bold text-xs text-black dark:text-white">
                  {t('noticeBoard.attachments', 'Attachments')}
                </h6>
                <div className="flex flex-col gap-2">
                  {attachments.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>
                        {t('noticeBoard.attachmentItem', {
                          index: index + 1,
                          defaultValue: 'Attachment #{{index}}',
                        })}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full text-xs font-semibold py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              {t('noticeBoard.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox modal for larger view */}
      {activeLightBoxImage && (
        <Dialog open={!!activeLightBoxImage} onOpenChange={(open) => !open && setActiveLightBoxImage(null)}>
          <DialogContent className="max-w-4xl bg-black border-0 p-0 text-center flex items-center justify-center min-h-[70vh]">
            <button
              onClick={() => setActiveLightBoxImage(null)}
              className="absolute top-4 right-4 h-9 w-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white border-0 cursor-pointer z-50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={activeLightBoxImage}
              alt="Expanded view"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

NoticeBoardDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  notice: PropTypes.object,
  onClose: PropTypes.func.isRequired,
}

export default NoticeBoardDetailsModal
