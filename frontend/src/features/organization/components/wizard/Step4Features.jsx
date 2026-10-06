import React from 'react'
import { useTranslation } from 'react-i18next'
import { CFormCheck, CButton, CRow, CCol, CCard, CCardBody } from '@coreui/react'

const AVAILABLE_FEATURES = [
  { id: 'visitor', label: 'Visitor Management', desc: 'Gate console, visitor passes, and entry logs.' },
  { id: 'amenities', label: 'Amenities & Facilities', desc: 'Facility booking, calendars, and amenity master.' },
  { id: 'complaints', label: 'Complaints & HelpDesk', desc: 'Helpdesk tickets, maintenance requests, and issue tracking.' },
  { id: 'notices', label: 'Notice Board & Polls', desc: 'Community announcements, broadcast notices, and polls.' },
  { id: 'digital_wallet', label: 'Digital Wallet & Ledgers', desc: 'Resident digital wallet, top-ups, and transaction ledgers.' },
  { id: 'billing', label: 'Financial & Billing', desc: 'Assessments, maintenance invoices, dues, and payment gateway.' },
  { id: 'villas', label: 'Unit Management', desc: 'Manage villas, flats, blocks, and unit inventories.' },
  { id: 'users', label: 'User Management', desc: 'Manage residents, workers, imports, and user directory.' },
  { id: 'roles', label: 'Role Builder', desc: 'Custom RBAC, role definitions, and permission assignments.' },
  { id: 'workspaces', label: 'Workspace Settings', desc: 'Community preferences, branding, and organization settings.' },
  { id: 'integrations', label: 'IntegrationHub', desc: 'Third-party service connections, SMS, and WhatsApp integrations.' },
]

const Step4Features = ({ data, onNext, onBack }) => {
  const { t } = useTranslation()
  const [selectedFeatures, setSelectedFeatures] = React.useState(data || [])

  const handleToggle = (featureId) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((f) => f !== featureId) : [...prev, featureId],
    )
  }

  const handleSelectAll = () => {
    setSelectedFeatures(AVAILABLE_FEATURES.map((f) => f.id))
  }

  const handleClearAll = () => {
    setSelectedFeatures([])
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5>
            {t('organization.wizard.featuresTitle', { defaultValue: 'Select Community Features' })}
          </h5>
          <p className="text-muted small mb-0">
            {t('organization.wizard.featuresDesc', {
              defaultValue:
                'Enable or disable specific modules for this organization. You can update this later.',
            })}
          </p>
        </div>
        <div>
          <CButton color="link" className="text-decoration-none px-2" onClick={handleSelectAll}>
            {t('common.selectAll', { defaultValue: 'Select All' })}
          </CButton>
          <CButton
            color="link"
            className="text-decoration-none px-2 text-danger"
            onClick={handleClearAll}
          >
            {t('common.clearAll', { defaultValue: 'Clear All' })}
          </CButton>
        </div>
      </div>

      <CRow>
        {AVAILABLE_FEATURES.map((feature) => (
          <CCol md={6} key={feature.id} className="mb-3">
            <CCard
              className={`h-100 cursor-pointer transition-all ${selectedFeatures.includes(feature.id) ? 'border-primary bg-light' : ''}`}
              onClick={() => handleToggle(feature.id)}
              style={{ cursor: 'pointer' }}
            >
              <CCardBody className="d-flex align-items-start">
                <CFormCheck
                  id={`feature-${feature.id}`}
                  checked={selectedFeatures.includes(feature.id)}
                  onChange={() => handleToggle(feature.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="me-3 mt-1"
                />
                <div>
                  <label
                    htmlFor={`feature-${feature.id}`}
                    className="fw-bold mb-1"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t(`features.${feature.id}.label`, { defaultValue: feature.label })}
                  </label>
                  <p className="text-muted small mb-0">
                    {t(`features.${feature.id}.desc`, { defaultValue: feature.desc })}
                  </p>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      <div className="d-flex justify-content-between mt-4">
        <CButton color="secondary" variant="ghost" onClick={onBack}>
          {t('common.back', { defaultValue: 'Back' })}
        </CButton>
        <CButton color="primary" onClick={() => onNext(selectedFeatures)}>
          {t('common.next', { defaultValue: 'Next' })}
        </CButton>
      </div>
    </div>
  )
}

export default Step4Features
