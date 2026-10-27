import React from 'react'
import KpiCard from '../../../components/common/KpiCard'
import Button from '../../../components/common/Button'

const Dashboard = () => {
  return (
    <div className="portal-hub p-4 p-md-5">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4 pb-2 border-bottom">
        <div>
          <h2
            className="fw-bold mb-1"
            style={{
              color: 'var(--nahom-text, #1e2a4a)',
              letterSpacing: '-0.02em',
            }}
          >
            Platform Overview
          </h2>
          <p
            className="mb-0"
            style={{
              color: 'var(--nahom-text-muted, #5b6680)',
              fontSize: '0.9rem',
            }}
          >
            Super Admin global metrics, system health, and tenancy analytics.
          </p>
        </div>
        <div>
          <Button variant="primary">Open CRM Workspace</Button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <KpiCard label="Open Enquiries" value="24" trend="3 today" trendDirection="up" />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <KpiCard
            label="Quotes Awaiting Action"
            value="8"
            trend="Requires follow up"
            trendDirection="neutral"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <KpiCard
            label="Active Free Trials"
            value="12"
            trend="2 expiring soon"
            trendDirection="down"
          />
        </div>
        <div className="col-12 col-sm-6 col-lg-3">
          <KpiCard label="Active Subscriptions" value="86" trend="12% MRR" trendDirection="up" />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
