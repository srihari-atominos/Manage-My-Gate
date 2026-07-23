import React from 'react'
import PropTypes from 'prop-types'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from 'src/components/ui/button'
import { useTranslation } from 'react-i18next'

export const EmptyState = ({ canCreate, onAddClick }) => {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-stroke bg-white p-8 text-center shadow-default dark:border-strokedark dark:bg-boxdark flex flex-col items-center justify-center min-h-[300px]">
      <div className="rounded-full bg-slate-100 dark:bg-meta-4 p-4 text-gray-500 dark:text-gray-400 mb-4 shrink-0">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
      </div>
      
      <h4 className="font-bold text-sm text-black dark:text-white mb-2">
        {t('noticeBoard.empty.title', 'No Notices Available')}
      </h4>
      
      <p className="text-gray-500 dark:text-gray-400 text-xs mb-6 max-w-sm leading-relaxed">
        {t(
          'noticeBoard.empty.subtitle',
          'There are no announcements, alerts, or schedules matching your filters right now.',
        )}
      </p>

      {canCreate && (
        <Button
          variant="default"
          size="sm"
          className="text-xs font-semibold px-5 py-2.5 flex items-center gap-1.5"
          onClick={onAddClick}
        >
          <Plus className="h-4.5 w-4.5" />
          {t('noticeBoard.actions.addNew', 'Create Notice')}
        </Button>
      )}
    </div>
  )
}

EmptyState.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  onAddClick: PropTypes.func.isRequired,
}

export default EmptyState
