import React from 'react'
import { useSelector } from 'react-redux'
import useDashboard from './hooks/useDashboard'
import { useAuth } from '../../features/auth/hooks/useAuth'
import AdminDashboard from './components/AdminDashboard'
import ResidentDashboard from './components/ResidentDashboard'
import GuardDashboard from './components/GuardDashboard'

const Dashboard = () => {
  const { checkPermission } = useAuth()
  const { groups } = useDashboard()
  const userName = useSelector(
    (state) => state.auth.user?.username || state.auth.user?.name || 'there',
  )

  const isGuard = checkPermission('visitors:guard') || checkPermission('guard:dashboard')
  const isAdmin =
    checkPermission('users:read') ||
    checkPermission('dashboard:view_analytics') ||
    checkPermission('roles:read') ||
    checkPermission('billing:dashboard')

  return (
    <div className="portal-hub">
      {/* Dynamic Dashboard Selector based on Role */}
      {isAdmin ? (
        <AdminDashboard groups={groups} userName={userName} />
      ) : isGuard ? (
        <GuardDashboard />
      ) : (
        <ResidentDashboard />
      )}
    </div>
  )
}

export default Dashboard
