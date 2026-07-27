import React from 'react'
import PropTypes from 'prop-types'
import { CNav, CNavItem, CNavLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSpeedometer, cilWallet, cilSettings } from '@coreui/icons'
import usePermission from '../../../hooks/usePermission'

/**
 * BillingTopNav
 *
 * Top navigation bar for the Billing module.
 * Matches the same visual pattern used by VisitorTopNav.
 */
export const BillingTopNav = ({ activeTab, onTabChange }) => {
  const hasDashboard = usePermission('billing', 'dashboard')
  const hasActionCenter = usePermission('billing', 'action_center')
  const hasAssessmentManager = usePermission('billing', 'assessment_manager')

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: cilSpeedometer, show: hasDashboard },
    { id: 'action-center', name: 'Action Center', icon: cilWallet, show: hasActionCenter },
    {
      id: 'assessment-manager',
      name: 'Assessment Manager',
      icon: cilSettings,
      show: hasAssessmentManager,
    },
  ].filter((item) => item.show)

  return (
    <div className="billing-top-nav-bar">
      <CNav variant="underline" className="border-bottom-0 gap-3 flex-nowrap min-w-max pb-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id
          return (
            <CNavItem key={item.id}>
              <CNavLink
                href="#"
                active={isActive}
                onClick={(e) => {
                  e.preventDefault()
                  onTabChange(item.id)
                }}
                className={`billing-top-nav-link ${isActive ? 'active' : ''}`}
              >
                <CIcon icon={item.icon} size="lg" className="mb-1" />
                {item.name}
              </CNavLink>
            </CNavItem>
          )
        })}
      </CNav>
    </div>
  )
}

BillingTopNav.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
}

export default BillingTopNav
