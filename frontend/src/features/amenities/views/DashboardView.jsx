import React from 'react'
import useDashboard from '../hooks/useDashboard.js'
import KpiWidget from '../components/dashboard/KpiWidget.jsx'
import RevenueChart from '../components/dashboard/RevenueChart.jsx'
import RecentActivityWidget from '../components/dashboard/RecentActivityWidget.jsx'
import AmenitiesTopNav from '../components/AmenitiesTopNav.jsx'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import '../styles/_amenities.scss'

const DashboardView = () => {
  const { kpis, recentActivity } = useDashboard()

  const handleExport = () => {
    const wb = XLSX.utils.book_new()

    // Summary Sheet
    const summaryData = [
      ['Dashboard Summary'],
      [],
      ['Metric', 'Value'],
      ["Today's Check-Ins", kpis?.checkIns || 0],
      ["Today's Revenue", `₹${kpis?.revenue || 0}`],
      ['Occupancy Rate', `${kpis?.occupancy || 0}%`],
      ['Active Maintenance', kpis?.activeMaintenance || 0],
    ]
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

    // Activity Sheet
    if (recentActivity && recentActivity.length > 0) {
      const activityData = [['Activity', 'Details', 'Status', 'Date & Time']]
      recentActivity.forEach((activity) => {
        activityData.push([
          activity.title || 'N/A',
          activity.subtitle || 'N/A',
          activity.status || 'N/A',
          activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'N/A',
        ])
      })
      const activityWs = XLSX.utils.aoa_to_sheet(activityData)
      XLSX.utils.book_append_sheet(wb, activityWs, 'Recent Activity')
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'dashboard_report.xlsx')
  }

  return (
    <div className="amenities-module-wrapper amenity-os-theme">
      <AmenitiesTopNav />
      <div className="view-container">
        <div className="view active" id="view-admin-dashboard">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px',
            }}
          >
            <div>
              <h2 style={{ margin: 0 }} className="fs-2">
                Management Overview
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }} className="fw-medium">
                Real-time metrics across all community facilities.
              </p>
            </div>
            <button className="btn btn-primary" onClick={handleExport}>
              <i className="fa-solid fa-download" style={{ marginRight: '8px' }}></i> Export Report
            </button>
          </div>

          <KpiWidget />

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <RevenueChart />
            </div>
            <RecentActivityWidget />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardView
