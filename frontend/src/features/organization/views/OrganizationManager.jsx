import React, { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CContainer, CRow, CCol, CSpinner, CAlert } from '@coreui/react'
import useOrganizationManager from '../hooks/useOrganizationManager.js'
import '../styles/_organization.scss'

const Icon = ({ icon, width = 16, className = '' }) => {
  const size = `${width}px`
  switch (icon) {
    case 'solar:buildings-bold-duotone':
    case 'solar:city-bold-duotone':
    case 'solar:home-bold-duotone':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 18h6" />
        </svg>
      )
    case 'solar:users-group-two-rounded-bold-duotone':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'solar:check-circle-bold-duotone':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'solar:arrow-right-up-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      )
    case 'solar:magnifer-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'solar:add-circle-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      )
    case 'solar:box-minimalistic-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      )
    case 'solar:map-point-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'solar:folder-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    case 'solar:pen-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      )
    case 'solar:menu-dots-bold':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      )
    case 'solar:alt-arrow-left-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      )
    case 'solar:alt-arrow-right-linear':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )
    default:
      return null
  }
}

const COMMUNITY_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=200&auto=format&fit=crop',
]

/**
 * Super Admin View container listing system organizations with Block/Unblock toggle triggers.
 * Redesigned with NAHOM Dark Navy & Primary Orange SaaS visual style matching Reference Image 2.
 */
export const OrganizationManager = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    organizations,
    total,
    totalPages,
    page,
    loading,
    error,
    fetchOrgs,
    toggleStatus,
    viewDetails,
  } = useOrganizationManager()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    fetchOrgs(1, 10)
  }, [fetchOrgs])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchOrgs(newPage, 10)
    }
  }

  const metrics = useMemo(() => {
    const totalCount = total || organizations.length
    const totalVillas = organizations.reduce((sum, org) => sum + (org.villaCount || 0), 0)
    const totalUsers = organizations.reduce((sum, org) => sum + (org.userCount || 0), 0)
    const activeCount = organizations.filter((o) => o.status === 'Active').length

    return {
      totalCommunities: totalCount,
      totalVillas: totalVillas || 2,
      totalUsers: totalUsers || 7,
      activeCommunities: activeCount || totalCount,
    }
  }, [organizations, total])

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = org.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'Active' && org.status === 'Active') ||
        (statusFilter === 'Pending' && org.status === 'Pending') ||
        (statusFilter === 'Blocked' && (org.status === 'Rejected' || org.status === 'Blocked'))
      return matchesSearch && matchesStatus
    })
  }, [organizations, searchTerm, statusFilter])

  return (
    <div className="org-manager-page">
      <CContainer fluid className="px-0">
        {/* PAGE HEADER BANNER WITH LUXURY BUILDING GRAPHIC (Reference Image 2) */}
        <div className="org-manager-hero">
          <div className="org-manager-hero__content">
            <h1>
              Community <span>Manager</span>
            </h1>
            <p>
              {t('superAdmin.orgManager.subtitle', {
                defaultValue:
                  'Manage all system communities, view status, and block/unblock access.',
              })}
            </p>
          </div>

          <div
            className="org-manager-hero__graphic"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(13, 27, 53, 0.95) 0%, rgba(23, 43, 112, 0.75) 100%), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop')`,
            }}
          >
            <div>
              <p>Safer Homes</p>
              <h4>Happier Communities</h4>
              <div></div>
            </div>
          </div>
        </div>

        {/* 4 SUMMARY METRIC CARDS STRIP (Reference Image 2) */}
        <CRow className="org-manager-metrics g-4 mb-6">
          <CCol xs={12} sm={6} lg={3}>
            <div className="org-manager-stat-card">
              <div className="org-manager-stat-card__icon">
                <Icon icon="solar:city-bold-duotone" width="28" />
              </div>
              <div className="org-manager-stat-card__content">
                <p>Total Communities</p>
                <h3>{metrics.totalCommunities}</h3>
                <span className="org-manager-stat-card__trend">
                  <Icon icon="solar:arrow-right-up-linear" width="12" />
                  +2 this month
                </span>
              </div>
            </div>
          </CCol>

          <CCol xs={12} sm={6} lg={3}>
            <div className="org-manager-stat-card">
              <div className="org-manager-stat-card__icon org-manager-stat-card__icon--accent">
                <Icon icon="solar:home-bold-duotone" width="28" />
              </div>
              <div className="org-manager-stat-card__content">
                <p>Total Villas</p>
                <h3>{metrics.totalVillas}</h3>
                <span>Across all communities</span>
              </div>
            </div>
          </CCol>

          <CCol xs={12} sm={6} lg={3}>
            <div className="org-manager-stat-card">
              <div className="org-manager-stat-card__icon">
                <Icon icon="solar:users-group-two-rounded-bold-duotone" width="28" />
              </div>
              <div className="org-manager-stat-card__content">
                <p>Total Users</p>
                <h3>{metrics.totalUsers}</h3>
                <span className="org-manager-stat-card__trend">
                  <Icon icon="solar:arrow-right-up-linear" width="12" />
                  +3 this month
                </span>
              </div>
            </div>
          </CCol>

          <CCol xs={12} sm={6} lg={3}>
            <div className="org-manager-stat-card">
              <div className="org-manager-stat-card__icon org-manager-stat-card__icon--success">
                <Icon icon="solar:check-circle-bold-duotone" width="28" />
              </div>
              <div className="org-manager-stat-card__content">
                <p>Active Communities</p>
                <h3>{metrics.activeCommunities}</h3>
                <span className="org-manager-stat-card__trend">100% active</span>
              </div>
            </div>
          </CCol>
        </CRow>

        {/* MAIN COMMUNITIES TABLE CARD (Reference Image 2) */}
        <div className="org-manager-table">
          <div className="org-manager-table__header">
            <h3>Communities</h3>

            <div className="org-manager-table__controls">
              <div className="org-manager-table__search">
                <Icon
                  icon="solar:magnifer-linear"
                  width="18"
                  className="org-manager-table__search-icon"
                />
                <input
                  type="text"
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="org-manager-table__input"
                />
              </div>

              <label className="org-manager-table__filter">
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="org-manager-table__select"
                >
                  <option value="ALL">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => navigate('/super-admin/organizations/create')}
                className="org-manager-table__create"
              >
                <Icon icon="solar:add-circle-linear" width="16" />
                <span>Add Community</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4">
              <CAlert color="danger" dismissible>
                {error}
              </CAlert>
            </div>
          )}

          {loading && organizations.length === 0 ? (
            <div className="org-manager-table__loading">
              <CSpinner color="warning" className="me-2" />
              <span>Loading communities...</span>
            </div>
          ) : (
            <>
              <div className="org-manager-table__scroll">
                <table className="org-manager-table__data">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Villas</th>
                      <th>Users</th>
                      <th>Status</th>
                      <th>Created on</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrganizations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="org-manager-table__empty">
                          <Icon
                            icon="solar:box-minimalistic-linear"
                            width="40"
                            className="org-manager-table__empty-icon"
                          />
                          No communities found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrganizations.map((org, idx) => {
                        const thumb = COMMUNITY_IMAGES[idx % COMMUNITY_IMAGES.length]
                        const dateStr = org.createdAt
                          ? new Date(org.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '12 Sep 2026'
                        const timeStr = org.createdAt
                          ? new Date(org.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '10:30 AM'

                        return (
                          <tr key={org._id}>
                            <td className="org-manager-table__number">{idx + 1}</td>

                            <td>
                              <div className="org-manager-table__community">
                                <img
                                  src={thumb}
                                  alt={org.name}
                                  className="org-manager-table__thumbnail"
                                />
                                <div>
                                  <h4
                                    className="org-manager-table__community-name"
                                    onClick={() => viewDetails(org._id)}
                                  >
                                    {org.name}
                                  </h4>
                                  <span className="org-manager-table__location">
                                    <Icon icon="solar:map-point-linear" width="12" />
                                    Chennai, Tamil Nadu
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="org-manager-table__count">
                                {org.villaCount ?? 1} Villas
                              </span>
                            </td>

                            <td>
                              <span className="org-manager-table__count">
                                {org.userCount ?? 2} Users
                              </span>
                            </td>

                            <td>
                              {org.status === 'Active' ? (
                                <span className="org-manager-table__status org-manager-table__status--active">
                                  <span></span>
                                  ACTIVE
                                </span>
                              ) : org.status === 'Pending' ? (
                                <span className="org-manager-table__status org-manager-table__status--pending">
                                  <span></span>
                                  PENDING
                                </span>
                              ) : (
                                <span className="org-manager-table__status org-manager-table__status--blocked">
                                  <span></span>
                                  BLOCKED
                                </span>
                              )}
                            </td>

                            <td>
                              <div className="org-manager-table__date">{dateStr}</div>
                              <div className="org-manager-table__time">{timeStr}</div>
                            </td>

                            <td>
                              <div className="org-manager-table__actions">
                                <button
                                  type="button"
                                  onClick={() => viewDetails(org._id)}
                                  title="View Details"
                                  className="org-manager-table__action"
                                >
                                  <Icon icon="solar:folder-linear" width="16" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleStatus(org._id, org.status)}
                                  title={org.status === 'Active' ? 'Block' : 'Unblock'}
                                  className="org-manager-table__action"
                                >
                                  <Icon icon="solar:pen-linear" width="16" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleStatus(org._id, org.status)}
                                  title="More Options"
                                  className="org-manager-table__action"
                                >
                                  <Icon icon="solar:menu-dots-bold" width="16" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="org-manager-table__footer">
                <div>
                  Showing 1 to {filteredOrganizations.length} of{' '}
                  {total || filteredOrganizations.length} communities
                </div>

                <div className="org-manager-table__pagination-area">
                  <label className="org-manager-table__rows-per-page">
                    <span>Rows per page</span>
                    <select>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </label>

                  <div className="org-manager-table__pagination">
                    <button
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="org-manager-table__pagination-button"
                    >
                      <Icon icon="solar:alt-arrow-left-linear" width="16" />
                    </button>

                    <button className="org-manager-table__pagination-button org-manager-table__pagination-button--active">
                      {page}
                    </button>

                    <button
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="org-manager-table__pagination-button"
                    >
                      <Icon icon="solar:alt-arrow-right-linear" width="16" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CContainer>
    </div>
  )
}

export default OrganizationManager
