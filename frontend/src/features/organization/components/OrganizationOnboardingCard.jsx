import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { CSpinner } from '@coreui/react'
import { updateOrganizationOnboardingMode } from '../services/organizationApi'
import { loadOrganizationDetails } from '../store/organizationSlice'
import toast from 'react-hot-toast'

const OrganizationOnboardingCard = ({ organization }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  const currentMode = organization?.onboardingMode || 'INVITATION'

  const handleModeChange = async (newMode) => {
    if (newMode === currentMode) return
    setLoading(true)
    try {
      await updateOrganizationOnboardingMode(organization._id, newMode)
      toast.success('Organization onboarding mode updated successfully.')
      // Refresh the organization details to update the Redux store
      dispatch(loadOrganizationDetails({ orgId: organization._id }))
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || 'Failed to update onboarding mode.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!organization) return null

  return (
    <div className="section-card">
      <div className="section-card-header">
        <h4 className="section-title">Global Onboarding Strategy</h4>
      </div>
      <div className="section-card-body position-relative">
        {loading && (
          <div
            className="position-absolute w-100 h-100 d-flex justify-content-center align-items-center"
            style={{ top: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10 }}
          >
            <CSpinner color="primary" />
          </div>
        )}
        <div className="d-flex flex-column gap-3">
          <label className="d-flex align-items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="globalOnboardingMode"
              value="INVITATION"
              checked={currentMode === 'INVITATION'}
              onChange={(e) => handleModeChange(e.target.value)}
              className="mt-1"
            />
            <div>
              <strong className="d-block small">Normal Invitation</strong>
              <span className="text-muted small">
                Membership is <em>Pending</em> until the user accepts the invitation link via email
                or SMS. Recommended for public or tenant invitations.
              </span>
            </div>
          </label>
          <label className="d-flex align-items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="globalOnboardingMode"
              value="ADMIN_ANNOUNCEMENT"
              checked={currentMode === 'ADMIN_ANNOUNCEMENT'}
              onChange={(e) => handleModeChange(e.target.value)}
              className="mt-1"
            />
            <div>
              <strong className="d-block small">Admin Announcement (Immediate Activation)</strong>
              <span className="text-muted small">
                Membership is activated immediately. Existing user passwords are preserved. New
                users receive a secure first-time password setup link. Recommended for bulk-loading
                trusted staff or pre-verified residents.
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

export default OrganizationOnboardingCard
