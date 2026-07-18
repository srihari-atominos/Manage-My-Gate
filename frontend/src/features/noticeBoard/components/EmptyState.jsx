import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilPlus } from '@coreui/icons'
import { useTranslation } from 'react-i18next'

/**
 * EmptyState Component
 * Visual layout rendered when notice boards have no notice items.
 */
export const EmptyState = ({ canCreate, onAddClick }) => {
  const { t } = useTranslation()

  return (
    <CCard
      className="text-center py-5 border-0 shadow-sm bg-body rounded-3 notice-empty-state"
      style={{ borderRadius: '16px' }}
    >
      <CCardBody className="d-flex flex-column align-items-center justify-content-center p-5">
        <div
          className="rounded-circle bg-body-secondary p-3 mb-3 text-secondary"
          style={{ width: 'fit-content' }}
        >
          <CIcon icon={cilWarning} size="xl" className="align-middle" />
        </div>
        <h4 className="fw-bold text-body mb-2">
          {t('noticeBoard.empty.title', 'No Notices Available')}
        </h4>
        <p
          className="text-secondary small mb-4 max-width-md px-3"
          style={{ maxWidth: '400px', lineHeight: 1.6 }}
        >
          {t(
            'noticeBoard.empty.subtitle',
            'There are no announcements, alerts, or schedules matching your filters right now.',
          )}
        </p>

        {canCreate && (
          <CButton
            color="primary"
            size="sm"
            className="fw-semibold px-4 py-2"
            style={{ borderRadius: '8px' }}
            onClick={onAddClick}
          >
            <CIcon icon={cilPlus} size="sm" className="me-1 align-middle" />
            {t('noticeBoard.actions.addNew', 'Create Notice')}
          </CButton>
        )}
      </CCardBody>
    </CCard>
  )
}

EmptyState.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  onAddClick: PropTypes.func.isRequired,
}

export default EmptyState
