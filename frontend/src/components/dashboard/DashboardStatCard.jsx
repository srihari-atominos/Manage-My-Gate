import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody } from '@coreui/react'

const DashboardStatCard = ({ label, value, helper, loading }) => (
  <CCard className="dashboard-stat-card border-0 h-100">
    <CCardBody>
      <div className="dashboard-stat-label">{label}</div>
      {loading ? (
        <>
          <div className="dashboard-skeleton dashboard-skeleton--value" aria-hidden="true" />
          <div className="dashboard-skeleton dashboard-skeleton--note" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="dashboard-stat-value">{value}</div>
          <div className="dashboard-stat-note">{helper}</div>
        </>
      )}
    </CCardBody>
  </CCard>
)

DashboardStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  helper: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
}

export default DashboardStatCard
