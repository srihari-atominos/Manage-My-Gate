import React from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CNav, CNavItem, CNavLink } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilQrCode,
  cilShieldAlt,
  cilList,
  cilSpeedometer,
  cilPeople,
  cilSettings,
} from '@coreui/icons'

export const VisitorTopNav = ({ activeTab, onTabChange }) => {
  const location = useLocation()
  const path = location.pathname
  const user = useSelector((state) => state.auth.user)
  const context = user?.visitorContext || 'None'

  console.log('[VisitorTopNav] context:', context, 'user:', user)

  let navItems = []

  // Determine top navigation options based on context view state
  if (context === 'Resident') {
    navItems = [
      { name: 'Create Pass', to: '#', id: 'create', icon: cilQrCode },
      { name: 'Walk-in Approval', to: '#', id: 'walkin', icon: cilShieldAlt },
    ]
  } else if (context === 'Admin') {
    navItems = [
      { name: 'Dashboard Overview', to: '#', id: 'overview', icon: cilSpeedometer },
      { name: 'Create Pass', to: '#', id: 'create', icon: cilQrCode },
      { name: 'Walk-in Approval', to: '#', id: 'walkin', icon: cilShieldAlt },
      { name: 'Visitor Logs', to: '#', id: 'logs', icon: cilList },
      { name: 'Blacklist Settings', to: '#', id: 'blacklist', icon: cilSettings },
    ]
  } else if (context === 'Guard') {
    navItems = [
      { name: 'Invite visitor', to: '#', id: 'invite', icon: cilPeople },
      { name: 'scaner', to: '#', id: 'scanner', icon: cilQrCode },
      { name: 'Live entries', to: '#', id: 'live', icon: cilList },
      { name: 'villa Directory', to: '#', id: 'directory', icon: cilPeople },
    ]
  }

  if (navItems.length === 0) return null

  return (
    <div className="visitor-top-nav-bar">
      <CNav
        variant="underline"
        style={{
          borderBottom: 'none',
          gap: '16px',
          flexWrap: 'nowrap',
          minWidth: 'max-content',
          paddingBottom: '4px',
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab
            ? activeTab === item.id
            : item.to !== '#' && path.startsWith(item.to)
          return (
            <CNavItem key={item.name}>
              <CNavLink
                href={item.to}
                active={isActive}
                disabled={item.disabled}
                onClick={(e) => {
                  if (onTabChange) {
                    e.preventDefault()
                    if (!item.disabled) {
                      onTabChange(item.id)
                    }
                  }
                }}
                className={`visitor-top-nav-link ${isActive ? 'active' : ''}`}
                style={{
                  opacity: item.disabled ? 0.6 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <CIcon icon={item.icon} size="lg" style={{ marginBottom: '4px' }} />
                {item.name}
              </CNavLink>
            </CNavItem>
          )
        })}
      </CNav>
    </div>
  )
}

export default VisitorTopNav
