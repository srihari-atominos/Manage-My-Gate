import React from 'react'
import PropTypes from 'prop-types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Button } from 'src/components/ui/button'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'

export const DeleteNoticeDialog = ({ visible, onClose, onConfirm, loading }) => {
  const { t } = useTranslation()

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-danger">
            <AlertCircle className="h-5 w-5 text-danger shrink-0" />
            <span>{t('noticeBoard.deleteDialog.title', 'Delete Notice')}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
            {t(
              'noticeBoard.deleteDialog.warning',
              'Are you sure you want to delete this notice? This action is permanent and cannot be undone.',
            )}
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-2 w-full sm:space-x-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
          >
            {t('noticeBoard.deleteDialog.cancel', 'Cancel')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs font-semibold px-4 py-2 bg-danger hover:bg-danger/95 border-0 text-white"
          >
            {loading
              ? t('noticeBoard.deleteDialog.deleting', 'Deleting...')
              : t('noticeBoard.deleteDialog.confirm', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

DeleteNoticeDialog.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
}

export default DeleteNoticeDialog
