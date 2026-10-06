import React from 'react'
import { useTranslation } from 'react-i18next'
import { CButton, CCard, CCardBody, CRow, CCol, CSpinner } from '@coreui/react'

const Step5Review = ({ data, onBack, onSubmit, loading, error }) => {
  const { t } = useTranslation()

  const org = data.organization
  const admin = data.communityAdmin
  const features = data.features

  const formattedLocation = [org.city, org.state, org.country].filter(Boolean).join(', ')

  return (
    <div>
      <h5 className="mb-4">
        {t('organization.wizard.reviewTitle', { defaultValue: 'Review & Confirm' })}
      </h5>
      <p className="text-muted small mb-4">
        {t('organization.wizard.reviewDesc', {
          defaultValue: 'Please review the organization details before final provisioning.',
        })}
      </p>

      <CCard className="mb-4 border-info">
        <CCardBody>
          <h6 className="text-info border-bottom pb-2 mb-3">
            {t('organization.wizard.orgInfoLabel', { defaultValue: 'Organization Information' })}
          </h6>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.orgName', { defaultValue: 'Organization Name' })}
            </CCol>
            <CCol sm={8}>{org.name}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.contactPhone', { defaultValue: 'Contact Phone Number' })}
            </CCol>
            <CCol sm={8}>{org.contactPhone || 'N/A'}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.contactEmail', { defaultValue: 'Contact Email' })}
            </CCol>
            <CCol sm={8}>{org.contactEmail}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('common.location', { defaultValue: 'Location' })}
            </CCol>
            <CCol sm={8}>{formattedLocation}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.timezone', { defaultValue: 'Timezone' })}
            </CCol>
            <CCol sm={8}>{org.timezone}</CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4 border-success">
        <CCardBody>
          <h6 className="text-success border-bottom pb-2 mb-3">
            {t('organization.wizard.adminInfoLabel', { defaultValue: 'Community Admin' })}
          </h6>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.fullName', { defaultValue: 'Full Name' })}
            </CCol>
            <CCol sm={8}>{admin.fullName}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.username', { defaultValue: 'Username' })}
            </CCol>
            <CCol sm={8}>{admin.username}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.email', { defaultValue: 'Email' })}
            </CCol>
            <CCol sm={8}>{admin.email}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.phone', { defaultValue: 'Phone Number' })}
            </CCol>
            <CCol sm={8}>{admin.phone}</CCol>
          </CRow>
          <CRow className="mb-2">
            <CCol sm={4} className="text-muted fw-bold">
              {t('organization.wizard.password', { defaultValue: 'Password' })}
            </CCol>
            <CCol sm={8} className="text-muted fst-italic">
              ******** (Hidden for security)
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4 border-primary">
        <CCardBody>
          <h6 className="text-primary border-bottom pb-2 mb-3">
            {t('organization.wizard.featuresLabel', { defaultValue: 'Enabled Features' })}
          </h6>
          <div className="d-flex flex-wrap gap-2">
            {features.length === 0 ? (
              <span className="text-muted fst-italic">
                {t('organization.wizard.noFeatures', {
                  defaultValue: 'No additional features selected',
                })}
              </span>
            ) : (
              features.map((f) => (
                <span key={f} className="badge bg-primary px-3 py-2 rounded-pill">
                  {f}
                </span>
              ))
            )}
          </div>
        </CCardBody>
      </CCard>

      <div className="d-flex justify-content-between mt-4">
        <CButton color="secondary" variant="ghost" onClick={onBack} disabled={loading}>
          {t('common.back', { defaultValue: 'Back' })}
        </CButton>
        <CButton color="primary" onClick={onSubmit} disabled={loading}>
          {loading ? (
            <>
              <CSpinner size="sm" className="me-2" />
              {t('organization.wizard.creating', { defaultValue: 'Creating Organization...' })}
            </>
          ) : (
            t('organization.wizard.submit', { defaultValue: 'Create Organization' })
          )}
        </CButton>
      </div>
    </div>
  )
}

export default Step5Review
