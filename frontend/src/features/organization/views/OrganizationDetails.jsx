import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CSpinner, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudUpload } from '@coreui/icons'
import useOrganizationDetails from '../hooks/useOrganizationDetails.js'
import useOrganizationUsers from '../hooks/useOrganizationUsers.js'
import OrganizationOverviewCards from '../components/OrganizationOverviewCards.jsx'
import OrganizationInfoCard from '../components/OrganizationInfoCard.jsx'
import OrganizationFeaturesCard from '../components/OrganizationFeaturesCard.jsx'
import OrganizationOnboardingCard from '../components/OrganizationOnboardingCard.jsx'
import UserFiltersBar from '../components/UserFiltersBar.jsx'
import UserDirectoryTable from '../components/UserDirectoryTable.jsx'
import UserDetailDrawer from '../components/UserDetailDrawer.jsx'
import BulkInviteModal from '../../userManagement/components/BulkInviteModal.jsx'
import BulkUploadVillasModal from '../../villa/components/BulkUploadVillasModal.jsx'
import { bulkUploadVillas } from '../../villa/services/villaService.js'
import '../styles/_organization.scss'
import AppLoader from '../../../components/common/AppLoader'

/**
 * Organization Details view — orchestrates overview cards, org info, user directory.
 * Follows the Notice Board theme and Thin View Pattern.
 */
export const OrganizationDetails = () => {
  const { organizationId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false)
  const [showBulkUploadUnitsModal, setShowBulkUploadUnitsModal] = useState(false)

  const {
    organization,
    summary,
    loading: detailsLoading,
    error: detailsError,
    fetchDetails,
    resetDetails,
  } = useOrganizationDetails()

  const {
    users,
    total: usersTotal,
    page: usersPage,
    totalPages: usersTotalPages,
    search: usersSearch,
    roleFilter: usersRoleFilter,
    statusFilter: usersStatusFilter,
    loading: usersLoading,
    error: usersError,
    selectedUser,
    userDrawerOpen,
    userDrawerLoading,
    fetchUsers,
    handleSearch,
    handleRoleFilter,
    handleStatusFilter,
    handleViewUser,
    handleCloseDrawer,
    bulkInviteUsers,
  } = useOrganizationUsers(organizationId)

  useEffect(() => {
    if (organizationId) {
      fetchDetails(organizationId)
      fetchUsers(1)
    }
    return () => {
      resetDetails()
    }
  }, [organizationId])

  const handleBack = () => {
    navigate('/super-admin/organizations')
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-active'
      case 'Pending':
        return 'status-pending'
      case 'Rejected':
        return 'status-rejected'
      default:
        return 'status-inactive'
    }
  }

  const handleBulkUploadUnits = async (villas) => {
    const res = await bulkUploadVillas(villas)
    fetchDetails(organizationId)
    fetchUsers(usersPage)
    return res
  }

  return (
    <div className="org-manager-theme pt-3">
      <div className="view-container">
        {/* Back Navigation */}
        <button className="back-nav" onClick={handleBack}>
          <CIcon icon={cilArrowLeft} size="sm" />
          <span>
            {t('superAdmin.orgDetails.backBtn', { defaultValue: 'Back to Organizations' })}
          </span>
        </button>

        {/* Page Header */}
        <div className="page-header">
          <div>
            <h2
              className="page-title"
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <span>
                {organization?.name ||
                  t('superAdmin.orgDetails.title', { defaultValue: 'Organization Details' })}
              </span>
              {organization?.status && (
                <span className={`status-pill ${getStatusClass(organization.status)}`}>
                  {organization.status}
                </span>
              )}
            </h2>
            {organization && (
              <p className="page-subtitle">
                {t('superAdmin.orgDetails.orgIdLabel', { defaultValue: 'ID:' })}{' '}
                <code
                  style={{
                    fontSize: '13px',
                    color: '#321fdb',
                    fontWeight: 700,
                    background: '#ebedff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {organization._id}
                </code>
              </p>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {detailsError && (
          <div
            className="alert alert-danger mb-4"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span>{detailsError}</span>
            <button
              className="btn-pill btn-pill-outline"
              onClick={() => fetchDetails(organizationId)}
            >
              {t('superAdmin.orgDetails.retryBtn', { defaultValue: 'Retry' })}
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {detailsLoading && !organization ? (
          <div className="loading-center">
            <AppLoader variant="block" />
            <span>
              {t('superAdmin.orgDetails.loadingDetails', {
                defaultValue: 'Loading community details...',
              })}
            </span>
          </div>
        ) : (
          <>
            {/* Overview KPI Cards */}
            <OrganizationOverviewCards summary={summary} />

            {/* Organization Information */}
            <OrganizationInfoCard organization={organization} />

            {/* Feature Management */}
            <OrganizationFeaturesCard organization={organization} />

            {/* Global Onboarding Strategy */}
            <OrganizationOnboardingCard organization={organization} />

            {/* User Directory Section */}
            <div className="section-card">
              <div
                className="section-card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h4 className="section-title">
                    {t('superAdmin.orgDetails.userDirectoryTitle', {
                      defaultValue: 'User Directory',
                    })}
                  </h4>
                  <p className="section-subtitle">
                    {t('superAdmin.orgDetails.userDirectorySub', {
                      defaultValue:
                        'Browse, search, filter, and inspect member details belonging to this community.',
                    })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CButton color="outline-primary" onClick={() => setShowBulkUploadUnitsModal(true)}>
                    <CIcon icon={cilCloudUpload} className="me-2" />
                    {t('superAdmin.orgDetails.bulkUploadUnitsBtn', {
                      defaultValue: 'Bulk Onboard Units',
                    })}
                  </CButton>
                  <CButton color="primary" onClick={() => setShowBulkInviteModal(true)}>
                    <CIcon icon={cilCloudUpload} className="me-2" />
                    {t('superAdmin.orgDetails.bulkOnboardBtn', {
                      defaultValue: 'Bulk Onboard Users',
                    })}
                  </CButton>
                </div>
              </div>
              <div className="section-card-body">
                {usersError && <div className="alert alert-danger mb-3">{usersError}</div>}

                {/* Filters & Search Bar */}
                <UserFiltersBar
                  search={usersSearch}
                  roleFilter={usersRoleFilter}
                  statusFilter={usersStatusFilter}
                  onSearchChange={handleSearch}
                  onRoleChange={handleRoleFilter}
                  onStatusChange={handleStatusFilter}
                />

                {/* Users Directory Table */}
                <UserDirectoryTable
                  users={users}
                  loading={usersLoading}
                  page={usersPage}
                  totalPages={usersTotalPages}
                  total={usersTotal}
                  onPageChange={(page) => fetchUsers(page)}
                  onViewUser={handleViewUser}
                />
              </div>
            </div>
          </>
        )}

        {/* User Detail Offcanvas Drawer */}
        {userDrawerOpen && (
          <UserDetailDrawer
            visible={userDrawerOpen}
            onClose={handleCloseDrawer}
            user={selectedUser}
            loading={userDrawerLoading}
            organizationName={organization?.name}
          />
        )}

        {/* Bulk Invite Modal */}
        {showBulkInviteModal && (
          <BulkInviteModal
            visible={showBulkInviteModal}
            onClose={() => setShowBulkInviteModal(false)}
            onBulkInvite={bulkInviteUsers}
            globalOnboardingMode={organization?.onboardingMode || 'INVITATION'}
          />
        )}

        {/* Bulk Upload Units Modal */}
        {showBulkUploadUnitsModal && (
          <BulkUploadVillasModal
            visible={showBulkUploadUnitsModal}
            onClose={() => setShowBulkUploadUnitsModal(false)}
            onBulkUpload={handleBulkUploadUnits}
          />
        )}
      </div>
    </div>
  )
}

export default OrganizationDetails
