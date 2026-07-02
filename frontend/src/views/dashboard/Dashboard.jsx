import React from 'react'
import { useSelector } from 'react-redux'
import useDashboard from './hooks/useDashboard'
import AdminDashboard from './components/AdminDashboard'
import ResidentDashboard from './components/ResidentDashboard'
import GuardDashboard from './components/GuardDashboard'

const Dashboard = () => {
  const activeRole = useSelector((state) => state.workspace?.activeRole);
  const { groups, appName } = useDashboard();

  return (
    <div className="portal-hub">
      <style>{`
        /* ── Hub Container ── */
        .portal-hub {
          padding: 2rem 2rem 4rem;
          max-width: 1100px;
          margin: 0 auto;
        }
  
        /* ── Main Title ── */
        .portal-main-title {
          font-size: 1.55rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: -0.02em;
          color: var(--cui-body-color);
          margin-bottom: 2.75rem;
        }
  
        /* ── Category Section ── */
        .portal-category {
          margin-bottom: 2.5rem;
        }
  
        /* ── Section Header: | LABEL ── */
        .portal-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1.25rem;
        }
        .portal-pipe {
          display: inline-block;
          width: 3px;
          height: 14px;
          border-radius: 2px;
          background: var(--cui-primary, #321fdb);
          flex-shrink: 0;
        }
        .portal-section-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--cui-text-muted, #768192);
        }
  
        /* ── Card Link Reset ── */
        .portal-card-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
  
        /* ── Individual Card ── */
        .portal-card {
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.07) !important;
          background: var(--cui-card-bg, #ffffff) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.025);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }
        .portal-card-body {
          padding: 1rem 0.5rem !important;
          height: 110px;
        }
        .portal-card-link:hover .portal-card {
          transform: translateY(-4px);
          box-shadow: 0 8px 22px rgba(50, 31, 219, 0.12);
          border-color: var(--cui-primary, #321fdb) !important;
        }
        [data-coreui-theme='dark'] .portal-card {
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          background: rgba(255, 255, 255, 0.025) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
        [data-coreui-theme='dark'] .portal-card-link:hover .portal-card {
          background: rgba(50, 31, 219, 0.08) !important;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.3);
        }
  
        /* ── Icon Wrapper ── */
        .portal-card-icon-wrapper {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(50, 31, 219, 0.06);
          color: var(--cui-primary, #321fdb);
          transition: background 0.2s ease, color 0.2s ease;
          margin-bottom: 0.75rem;
          flex-shrink: 0;
        }
        .portal-card-icon-wrapper .nav-icon {
          width: 22px;
          height: 22px;
          margin: 0;
          color: inherit;
        }
        .portal-card-link:hover .portal-card-icon-wrapper {
          background: var(--cui-primary, #321fdb);
          color: #ffffff;
        }
  
        /* ── Card Title ── */
        .portal-card-title {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: var(--cui-body-color);
          text-align: center;
          line-height: 1.2;
          padding: 0 8px;
        }
  
        /* ── Responsive ── */
        @media (max-width: 576px) {
          .portal-hub {
            padding: 1.25rem 1rem 3rem;
          }
          .portal-main-title {
            font-size: 1.2rem;
            margin-bottom: 2rem;
          }
          .portal-card-body {
            height: 98px;
          }
        }
      `}</style>

      {/* Dynamic Dashboard Selector based on Role */}
      {activeRole === 'Resident Owner' || activeRole === 'Resident Tenant' || activeRole === 'Family Member' ? (
        <ResidentDashboard />
      ) : activeRole === 'Security Guard' ? (
        <GuardDashboard />
      ) : (
        <AdminDashboard groups={groups} appName={appName} />
      )}
    </div>
  )
}

export default Dashboard
