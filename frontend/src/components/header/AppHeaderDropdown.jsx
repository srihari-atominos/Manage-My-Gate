/**
 * AppHeaderDropdown Component
 *
 * User avatar dropdown with:
 * - Dynamic text-based character avatar (first letter of username from Redux)
 * - Profile menu item
 * - Role switcher section (mock UI, non-functional)
 *
 * @component
 */

import React from 'react'
import { useSelector } from 'react-redux'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'

// Mock role list for the role-switcher UI
const MOCK_ROLES = [
  { id: 'super-admin', label: 'Super Admin' },
  { id: 'branch-manager', label: 'Branch Manager' },
]

// Currently active mock role (placeholder — will be driven by real data later)
const ACTIVE_ROLE_ID = 'super-admin'

const AppHeaderDropdown = () => {
  const { user } = useSelector((state) => state.auth)

  // Derive avatar letter: first char of username, fallback to 'A'
  const avatarLetter = user?.username
    ? user.username.charAt(0).toUpperCase()
    : 'A'

  return (
    <CDropdown variant="nav-item" alignment="end">
      {/* ── Text-based character avatar toggle ── */}
      <CDropdownToggle
        placement="bottom-end"
        className="py-0 pe-0"
        caret={false}
        id="avatar-dropdown-toggle"
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--cui-primary, #321fdb)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.02em',
            userSelect: 'none',
            flexShrink: 0,
          }}
          aria-label={`User avatar for ${user?.username || 'Admin'}`}
        >
          {avatarLetter}
        </div>
      </CDropdownToggle>

      {/* ── Dropdown Menu ── */}
      <CDropdownMenu className="pt-0" placement="bottom-end" style={{ minWidth: '180px' }}>

        {/* Profile */}
        <CDropdownItem href="#" id="dropdown-profile">
          Profile
        </CDropdownItem>

        <CDropdownDivider />

        {/* Role Switcher Section */}
        <CDropdownHeader
          className="fw-semibold text-uppercase py-1 px-3"
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.1em',
            color: 'var(--cui-text-muted, #768192)',
            background: 'transparent',
          }}
        >
          Switch Role
        </CDropdownHeader>

        {MOCK_ROLES.map((role) => {
          const isActive = role.id === ACTIVE_ROLE_ID
          return (
            <CDropdownItem
              key={role.id}
              href="#"
              id={`dropdown-role-${role.id}`}
              className="d-flex align-items-center justify-content-between"
              style={{ fontWeight: isActive ? 600 : 400 }}
            >
              {role.label}
              {isActive && (
                <svg
                  viewBox="0 0 24 24"
                  width="13"
                  height="13"
                  stroke="var(--cui-primary, #321fdb)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-label="Active role"
                  style={{ flexShrink: 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </CDropdownItem>
          )
        })}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
