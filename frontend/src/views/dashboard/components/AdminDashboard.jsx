import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilWarning } from '@coreui/icons'
import apiClient from '../../../services/apiClient'
import DashboardButton from '../../../components/dashboard/DashboardButton'
import DashboardStatCard from '../../../components/dashboard/DashboardStatCard'
import ActionCard from '../../../components/dashboard/ActionCard'

const SectionHeader = ({ labelKey, defaultLabel }) => {
  const { t } = useTranslation()
  return (
    <div className="portal-section-header">
      <span className="portal-pipe" aria-hidden="true" />
      <span className="portal-section-label">{t(labelKey, { defaultValue: defaultLabel })}</span>
    </div>
  )
}

SectionHeader.propTypes = {
  labelKey: PropTypes.string.isRequired,
  defaultLabel: PropTypes.string.isRequired,
}

const actionDescriptions = {
  'user-management': 'Manage residents and access.',
  'unit-management': 'View and organize every villa.',
  'role-builder': 'Set roles and permissions.',
  'integration-hub': 'Connect your workspace tools.',
  'visitor-management': 'Review visitor activity.',
  'amenities-bookings': 'Manage amenities and bookings.',
  'notice-board': 'Publish community updates.',
  'complaints-maintenance': 'Track service requests.',
  'billing-invoices': 'Review billing and invoices.',
  'community-manager': 'Manage community workspaces.',
  'audit-logs': 'Review platform activity.',
  'issue-reports': 'Review reported issues.',
}

export const AdminDashboard = ({ groups, userName }) => {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ total: 0, vacant: 0, occupied: 0, residents: 0 })
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(false)

    const [villaResult, userResult] = await Promise.allSettled([
      apiClient.get('/villas/stats'),
      apiClient.get('/users?limit=1'),
    ])

    const updates = {}

    if (villaResult.status === 'fulfilled') {
      const summary = villaResult.value.data || {}
      updates.total = summary.total || 0
      updates.vacant = summary.vacant || 0
      updates.occupied = (summary.ownerOccupied || 0) + (summary.tenantOccupied || 0)
    }

    if (userResult.status === 'fulfilled') {
      updates.residents = userResult.value.data?.pagination?.totalRecords || 0
    }

    setStats((currentStats) => ({ ...currentStats, ...updates }))
    setStatsError(villaResult.status === 'rejected' || userResult.status === 'rejected')
    setStatsLoading(false)
  }, [])

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadStats()
    }, 0)

    return () => window.clearTimeout(requestId)
  }, [loadStats])

  const villaPath = groups
    .flatMap((category) => category.cards)
    .find((card) => card.to === '/villas')?.to

  return (
    <div className="admin-portal-dashboard">
      <header className="dashboard-page-header">
        <div>
          <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
            <span>Home</span>
            <span className="dashboard-breadcrumb__separator" aria-hidden="true">
              /
            </span>
            <span aria-current="page">Dashboard</span>
          </nav>
          <h1 className="portal-main-title">
            {t('dashboard.welcomeBack', {
              defaultValue: 'Welcome back, {{userName}}',
              userName,
            })}
          </h1>
          <p className="dashboard-page-subtitle">
            Monitor your community at a glance and move straight to the tools your team uses most.
          </p>
        </div>
        <div className="dashboard-page-actions">
          <span className="dashboard-status">
            <span className="dashboard-status__dot" aria-hidden="true" />
            Live
          </span>
          {villaPath && (
            <DashboardButton as={Link} to={villaPath} variant="primary">
              <CIcon icon={cilPlus} aria-hidden="true" />
              Add villa
            </DashboardButton>
          )}
        </div>
      </header>

      {statsError && (
        <div className="dashboard-stats-alert" role="alert">
          <CIcon icon={cilWarning} aria-hidden="true" className="dashboard-stats-alert__icon" />
          <span>
            Some dashboard figures could not be refreshed. Existing figures remain available.
          </span>
          <DashboardButton onClick={loadStats} disabled={statsLoading}>
            Retry
          </DashboardButton>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="dashboard-stat-grid" aria-busy={statsLoading} aria-live="polite">
        <DashboardStatCard
          label="Villas"
          value={stats.total}
          helper={stats.total ? `${stats.total} villas configured` : 'No villas added yet'}
          loading={statsLoading}
        />
        <DashboardStatCard
          label="Occupied"
          value={stats.occupied}
          helper={
            stats.total ? `${stats.occupied} villas currently occupied` : 'No occupied villas yet'
          }
          loading={statsLoading}
        />
        <DashboardStatCard
          label="Vacant"
          value={stats.vacant}
          helper={stats.total ? `${stats.vacant} villas available` : 'No vacant villas yet'}
          loading={statsLoading}
        />
        <DashboardStatCard
          label="Total Residents"
          value={stats.residents}
          helper={stats.residents ? 'Residents in this community' : 'No residents added yet'}
          loading={statsLoading}
        />
      </div>

      {!statsLoading && !statsError && stats.total === 0 && villaPath && (
        <section className="dashboard-setup-card" aria-labelledby="dashboard-setup-title">
          <div>
            <span className="dashboard-setup-card__eyebrow">GET STARTED</span>
            <h2 id="dashboard-setup-title">Get your community set up</h2>
            <p>Add your first villa to begin organizing residents, units, and services.</p>
            <div
              className="dashboard-setup-progress"
              role="progressbar"
              aria-label="Community setup progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="0"
            >
              <span />
            </div>
          </div>
          <DashboardButton as={Link} to={villaPath} variant="primary">
            Continue setup
          </DashboardButton>
        </section>
      )}

      {/* Category Sections */}
      <div className="portal-category-list">
        {groups.map((category) => (
          <section
            key={category.id}
            className="portal-category"
            aria-labelledby={`section-${category.id}`}
          >
            <SectionHeader labelKey={category.titleKey} defaultLabel={category.title} />
            <div className="portal-action-grid" id={`section-${category.id}`}>
              {category.cards.map((card) => (
                <ActionCard
                  key={card.id}
                  card={card}
                  title={t(card.titleKey, { defaultValue: card.name })}
                  description={actionDescriptions[card.id] || 'Open this workspace tool.'}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

AdminDashboard.propTypes = {
  groups: PropTypes.array.isRequired,
  userName: PropTypes.string.isRequired,
}

export default AdminDashboard
