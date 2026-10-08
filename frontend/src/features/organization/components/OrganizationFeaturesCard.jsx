import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  CFormSwitch,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CModalFooter,
  CButton,
  CSpinner,
} from '@coreui/react'
import { updateOrgFeatures, loadOrganizationDetails } from '../store/organizationSlice'
import toast from 'react-hot-toast'

const AVAILABLE_FEATURES = [
  {
    id: 'visitor',
    label: 'Visitor Management',
    desc: 'Gate console, visitor passes, and entry logs.',
  },
  {
    id: 'amenities',
    label: 'Amenities & Facilities',
    desc: 'Facility booking, calendars, and amenity master.',
  },
  {
    id: 'complaints',
    label: 'Complaints & HelpDesk',
    desc: 'Helpdesk tickets, maintenance requests, and issue tracking.',
  },
  {
    id: 'notices',
    label: 'Notice Board & Polls',
    desc: 'Community announcements, broadcast notices, and polls.',
  },
  {
    id: 'digital_wallet',
    label: 'Digital Wallet & Ledgers',
    desc: 'Resident digital wallet, top-ups, and transaction ledgers.',
  },
  {
    id: 'billing',
    label: 'Financial & Billing',
    desc: 'Assessments, maintenance invoices, dues, and payment gateway.',
  },
  {
    id: 'villas',
    label: 'Unit Management',
    desc: 'Manage villas, flats, blocks, and unit inventories.',
  },
  {
    id: 'users',
    label: 'User Management',
    desc: 'Manage residents, workers, imports, and user directory.',
  },
  {
    id: 'roles',
    label: 'Role Builder',
    desc: 'Custom RBAC, role definitions, and permission assignments.',
  },
  {
    id: 'workspaces',
    label: 'Workspace Settings',
    desc: 'Community preferences, branding, and organization settings.',
  },
  {
    id: 'integrations',
    label: 'IntegrationHub',
    desc: 'Third-party service connections, SMS, and WhatsApp integrations.',
  },
]

const OrganizationFeaturesCard = ({ organization }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const [modalVisible, setModalVisible] = useState(false)
  const [pendingFeatureToggle, setPendingFeatureToggle] = useState(null)
  const [loading, setLoading] = useState(false)

  const activeFeatures = organization?.allowedFeatures || []

  const handleToggleClick = (featureId) => {
    const isCurrentlyActive = activeFeatures.includes(featureId)

    if (isCurrentlyActive) {
      // Show confirmation modal before disabling
      setPendingFeatureToggle(featureId)
      setModalVisible(true)
    } else {
      // Enable immediately
      executeToggle(featureId, true)
    }
  }

  const executeToggle = async (featureId, isEnabling) => {
    setLoading(true)

    const newFeatures = isEnabling
      ? [...activeFeatures, featureId]
      : activeFeatures.filter((f) => f !== featureId)

    try {
      const resultAction = await dispatch(
        updateOrgFeatures({ orgId: organization._id, featuresArray: newFeatures }),
      )
      if (updateOrgFeatures.fulfilled.match(resultAction)) {
        toast.success(
          isEnabling
            ? t('organization.features.enabledSuccess', {
                defaultValue: 'Feature enabled successfully',
              })
            : t('organization.features.disabledSuccess', {
                defaultValue: 'Feature disabled successfully',
              }),
        )
        // Refresh details to ensure UI matches backend exactly
        dispatch(loadOrganizationDetails({ orgId: organization._id }))
      } else {
        toast.error(
          resultAction.payload ||
            t('organization.features.error', { defaultValue: 'Failed to update feature' }),
        )
      }
    } catch (err) {
      toast.error(t('organization.features.error', { defaultValue: 'Failed to update feature' }))
    } finally {
      setLoading(false)
      setModalVisible(false)
      setPendingFeatureToggle(null)
    }
  }

  return (
    <>
      <div className="section-card mt-4">
        <div className="section-card-header d-flex justify-content-between align-items-center">
          <div>
            <h4 className="section-title">
              {t('superAdmin.orgDetails.featuresTitle', { defaultValue: 'Feature Management' })}
            </h4>
            <p className="section-subtitle mb-0">
              {t('superAdmin.orgDetails.featuresSub', {
                defaultValue: 'Enable or disable specific modules for this organization.',
              })}
            </p>
          </div>
          {loading && <CSpinner size="sm" color="primary" />}
        </div>
        <div className="section-card-body p-0">
          <div className="list-group list-group-flush">
            {AVAILABLE_FEATURES.map((feature) => {
              const isActive = activeFeatures.includes(feature.id)
              return (
                <div
                  key={feature.id}
                  className="list-group-item d-flex justify-content-between align-items-center p-4"
                >
                  <div>
                    <h6 className="mb-1">
                      {t(`features.${feature.id}.label`, { defaultValue: feature.label })}
                    </h6>
                    <small className="text-muted">
                      {t(`features.${feature.id}.desc`, { defaultValue: feature.desc })}
                    </small>
                  </div>
                  <div>
                    <CFormSwitch
                      size="xl"
                      id={`switch-${feature.id}`}
                      checked={isActive}
                      onChange={() => handleToggleClick(feature.id)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Disabling */}
      <CModal visible={modalVisible} onClose={() => !loading && setModalVisible(false)}>
        <CModalHeader>
          <CModalTitle>
            {t('organization.features.disableTitle', { defaultValue: 'Disable Feature?' })}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            {t('organization.features.disableWarning', {
              defaultValue:
                'Are you sure you want to disable this feature? Existing data will be preserved but hidden from the users.',
            })}
          </p>
          <p className="mb-0 fw-bold">
            {pendingFeatureToggle &&
              t(`features.${pendingFeatureToggle}.label`, {
                defaultValue: AVAILABLE_FEATURES.find((f) => f.id === pendingFeatureToggle)?.label,
              })}
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="ghost"
            onClick={() => setModalVisible(false)}
            disabled={loading}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </CButton>
          <CButton
            color="danger"
            onClick={() => executeToggle(pendingFeatureToggle, false)}
            disabled={loading}
          >
            {loading ? <CSpinner size="sm" /> : t('common.disable', { defaultValue: 'Disable' })}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default OrganizationFeaturesCard
