import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CAlert,
  CProgress,
  CProgressBar,
} from '@coreui/react'
import { useDispatch } from 'react-redux'
import { createOrganization } from '../store/organizationSlice'
import Step1OrgInfo from '../components/wizard/Step1OrgInfo'
import Step2AdminDetails from '../components/wizard/Step2AdminDetails'
import Step4Features from '../components/wizard/Step4Features'
import Step5Review from '../components/wizard/Step5Review'
import '../styles/_organization.scss'

const CreateOrganizationWizard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState(null)

  const [formData, setFormData] = useState({
    organization: {
      name: '',
      organizationType: 'Residential',
      contactPhone: '',
      contactEmail: '',
      country: 'India',
      state: '',
      city: '',
      timezone: 'Asia/Kolkata',
    },
    communityAdmin: {
      fullName: '',
      username: '',
      email: '',
      phone: '',
    },
    features: [],
  })

  const updateFormData = (stepKey, data) => {
    setFormData((prev) => ({
      ...prev,
      [stepKey]: data,
    }))
  }

  const handleNext = () => setCurrentStep((prev) => prev + 1)
  const handleBack = () => setCurrentStep((prev) => prev - 1)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    const payload = {
      organization: formData.organization,
      communityAdmin: formData.communityAdmin,
      features: formData.features,
    }

    try {
      const resultAction = await dispatch(createOrganization(payload))
      if (createOrganization.fulfilled.match(resultAction)) {
        setSuccessData(resultAction.payload)
      } else {
        setError(
          resultAction.payload ||
            t('organization.wizard.error', { defaultValue: 'Failed to Create Community' }),
        )
      }
    } catch (err) {
      setError(t('organization.wizard.error', { defaultValue: 'An unexpected error occurred' }))
    } finally {
      setLoading(false)
    }
  }

  if (successData) {
    return (
      <div className="org-manager-theme pt-3">
        <div className="view-container">
          <CCard className="mt-4 shadow-sm text-center p-5">
            <CCardBody>
              <div className="mb-4">
                <div style={{ fontSize: '4rem', color: 'green' }}>✅</div>
                <h2 className="mt-3">
                  {t('organization.wizard.successTitle', {
                    defaultValue: 'Organization Created Successfully!',
                  })}
                </h2>
                <p className="text-muted">
                  {successData.organization?.name}{' '}
                  {t('organization.wizard.successSubtitle', {
                    defaultValue: 'has been provisioned.',
                  })}
                </p>
              </div>

              <div className="text-start d-inline-block text-muted mb-4 p-4 border rounded bg-light">
                <p className="mb-1">
                  <strong>Community Admin:</strong> {successData.communityAdmin?.fullName}
                </p>
                <p className="mb-1">
                  <strong>Email:</strong> {successData.communityAdmin?.email}
                </p>
                <p className="mb-0">
                  <strong>Enabled Features:</strong>{' '}
                  {successData.organization?.allowedFeatures?.length}
                </p>
              </div>

              <div>
                <CButton
                  color="primary"
                  onClick={() =>
                    navigate(
                      `/super-admin/organizations/${successData.organization?._id || successData.organization?.id || ''}`,
                    )
                  }
                >
                  {t('organization.wizard.goToDashboard', {
                    defaultValue: 'Go to Organization Dashboard',
                  })}
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1OrgInfo
            data={formData.organization}
            onNext={(data) => {
              updateFormData('organization', data)
              handleNext()
            }}
            onCancel={() => navigate('/super-admin/organizations')}
          />
        )
      case 2:
        return (
          <Step2AdminDetails
            data={formData.communityAdmin}
            onNext={(data) => {
              updateFormData('communityAdmin', data)
              handleNext()
            }}
            onBack={handleBack}
          />
        )
      case 3:
        return (
          <Step4Features
            data={formData.features}
            onNext={(data) => {
              updateFormData('features', data)
              handleNext()
            }}
            onBack={handleBack}
          />
        )
      case 4:
        return (
          <Step5Review
            data={formData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        )
      default:
        return null
    }
  }

  const stepTitles = [
    t('organization.wizard.step1', { defaultValue: 'Organization Info' }),
    t('organization.wizard.step2', { defaultValue: 'Admin Details' }),
    t('organization.wizard.step4', { defaultValue: 'Features' }),
    t('organization.wizard.step5', { defaultValue: 'Review' }),
  ]

  return (
    <div className="org-manager-theme pt-3">
      <div className="view-container">
        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="bg-white pb-0">
            <h4>{t('organization.wizard.title', { defaultValue: 'Create Community' })}</h4>
            <p className="text-muted small mb-3">
              {t('organization.wizard.subtitle', {
                defaultValue: 'Provision a new community and community admin',
              })}
            </p>
            <div className="mb-4 position-relative">
              <CProgress height={4} className="mb-3">
                <CProgressBar color="primary" value={(currentStep / 4) * 100} />
              </CProgress>
              <div className="d-flex justify-content-between text-muted small px-1">
                {stepTitles.map((title, index) => (
                  <span
                    key={index}
                    className={currentStep >= index + 1 ? 'text-primary fw-bold' : ''}
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </CCardHeader>
          <CCardBody className="p-4">
            {error && <CAlert color="danger">{error}</CAlert>}
            {renderStep()}
          </CCardBody>
        </CCard>
      </div>
    </div>
  )
}

export default CreateOrganizationWizard
