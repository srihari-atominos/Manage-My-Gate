import React from 'react'
import { useTranslation } from 'react-i18next'
import { CButton, CAlert } from '@coreui/react'

const Step3CommunityStructure = ({ onNext, onBack }) => {
  const { t } = useTranslation()

  return (
    <div>
      <h5 className="mb-4">
        {t('organization.wizard.structureTitle', { defaultValue: 'Community Structure' })}
      </h5>

      <CAlert color="info" className="mb-4">
        {t('organization.wizard.structureInfo', {
          defaultValue:
            'Bulk upload of Blocks, Towers, and Villas is not required during the initial organization setup. You or the Community Admin can configure the full community hierarchy and import units via the Organization Dashboard after creation.',
        })}
      </CAlert>

      <p className="text-muted mb-4">
        {t('organization.wizard.structureDetails', {
          defaultValue:
            'The community structure module supports dynamic unit numbers, blocks, floors, and types. This step is currently a placeholder to preserve the wizard flow and does not create individual units yet.',
        })}
      </p>

      <div className="d-flex justify-content-between mt-4">
        <CButton color="secondary" variant="ghost" onClick={onBack}>
          {t('common.back', { defaultValue: 'Back' })}
        </CButton>
        <CButton color="primary" onClick={onNext}>
          {t('common.next', { defaultValue: 'Next' })}
        </CButton>
      </div>
    </div>
  )
}

export default Step3CommunityStructure
