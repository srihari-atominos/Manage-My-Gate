import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CCard, CCardBody, CRow, CCol } from '@coreui/react'
import apiClient from '../../../services/apiClient'

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

const PortalCard = ({ card }) => {
  const { t } = useTranslation()
  return (
    <Link to={card.to} className="portal-card-link" id={`portal-card-${card.id}`}>
      <CCard className="portal-card border-0">
        <CCardBody className="portal-card-body d-flex flex-column align-items-center justify-content-center p-0">
          <div className="portal-card-icon-wrapper">{card.icon}</div>
          <span className="portal-card-title">{t(card.titleKey, { defaultValue: card.name })}</span>
        </CCardBody>
      </CCard>
    </Link>
  )
}

PortalCard.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    titleKey: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
  }).isRequired,
}

export const AdminDashboard = ({ groups, appName }) => {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ total: 0, vacant: 0, occupied: 0, residents: 0 })

  useEffect(() => {
    // Load simple stats for admin dashboard
    apiClient
      .get('/villas/stats')
      .then((res) => {
        const s = res.data || {}
        setStats({
          total: s.total || 0,
          vacant: s.vacant || 0,
          occupied: (s.ownerOccupied || 0) + (s.tenantOccupied || 0),
          residents: 0, // Will populate dynamically or default
        })
      })
      .catch((err) => console.error('Failed to load stats for dashboard:', err))

    apiClient
      .get('/users?limit=1')
      .then((res) => {
        setStats((prev) => ({
          ...prev,
          residents: res.data?.pagination?.totalRecords || 0,
        }))
      })
      .catch((err) => console.error('Failed to load user count:', err))
  }, [])

  return (
    <div className="admin-portal-dashboard">
      <h1 className="portal-main-title">
        {t('dashboard.welcome', { defaultValue: 'Community Admin Dashboard', appName })}
      </h1>

      {/* Quick Stats Grid */}
      <CRow className="g-3 mb-5">
        <CCol xs={6} md={3}>
          <CCard className="border-0 shadow-sm text-center py-3">
            <CCardBody className="p-0">
              <div className="text-muted small fw-semibold text-uppercase">Villas</div>
              <div className="fs-3 fw-bold text-primary">{stats.total}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="border-0 shadow-sm text-center py-3">
            <CCardBody className="p-0">
              <div className="text-muted small fw-semibold text-uppercase">Occupied</div>
              <div className="fs-3 fw-bold text-success">{stats.occupied}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="border-0 shadow-sm text-center py-3">
            <CCardBody className="p-0">
              <div className="text-muted small fw-semibold text-uppercase">Vacant</div>
              <div className="fs-3 fw-bold text-secondary">{stats.vacant}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol xs={6} md={3}>
          <CCard className="border-0 shadow-sm text-center py-3">
            <CCardBody className="p-0">
              <div className="text-muted small fw-semibold text-uppercase">Total Residents</div>
              <div className="fs-3 fw-bold text-info">{stats.residents}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Category Sections */}
      <CRow className="g-4">
        {groups.map((category) => (
          <CCol
            xs={12}
            key={category.id}
            className="portal-category"
            aria-labelledby={`section-${category.id}`}
          >
            <SectionHeader labelKey={category.titleKey} defaultLabel={category.title} />
            <CRow
              className="g-3 row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6"
              id={`section-${category.id}`}
            >
              {category.cards.map((card) => (
                <CCol key={card.id}>
                  <PortalCard card={card} />
                </CCol>
              ))}
            </CRow>
          </CCol>
        ))}
      </CRow>
    </div>
  )
}

AdminDashboard.propTypes = {
  groups: PropTypes.array.isRequired,
  appName: PropTypes.string.isRequired,
}

export default AdminDashboard
