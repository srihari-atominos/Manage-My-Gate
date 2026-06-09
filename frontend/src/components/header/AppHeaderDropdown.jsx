/**
 * AppHeaderDropdown Component
 *
 * User avatar dropdown with:
 * - Dynamic text-based character avatar (first letter of username from useAuth)
 * - Profile menu item
 * - Dynamic role switcher section based on user's actual assigned roles
 * - Functional Logout button
 *
 * @component
 */

import React from 'react'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import useAuth from '../../features/auth/hooks/useAuth'

const AppHeaderDropdown = () => {
  const { currentUser, logout } = useAuth()

  // Derive avatar letter: first char of username, fallback to 'A'
  const avatarLetter = currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'

  // Derive roles list from currentUser
  const roles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])

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
          className="header-avatar"
          aria-label={`User avatar for ${currentUser?.username || 'Admin'}`}
        >
          {avatarLetter}
        </div>
      </CDropdownToggle>

      {/* ── Dropdown Menu ── */}
      <CDropdownMenu className="pt-0 header-dropdown-menu" placement="bottom-end">
        {/* Profile */}
        <CDropdownItem href="#" id="dropdown-profile">
          Profile
        </CDropdownItem>

        <CDropdownDivider />

        {/* Role Switcher Section */}
        <CDropdownHeader className="fw-semibold text-uppercase py-1 px-3 header-dropdown-role-header">
          Switch Role
        </CDropdownHeader>

        {roles.length === 0 ? (
          <CDropdownItem disabled className="text-body-secondary small py-1 px-3">
            No roles assigned
          </CDropdownItem>
        ) : (
          roles.map((roleName, index) => {
            const isActive = index === 0 // Default the first role in the array to active/checked
            return (
              <CDropdownItem
                key={roleName}
                href="#"
                id={`dropdown-role-${roleName.toLowerCase().replace(/\s+/g, '-')}`}
                className={`d-flex align-items-center justify-content-between py-1 px-3 ${isActive ? 'fw-semibold' : ''}`}
              >
                {roleName}
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
                    className="flex-shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </CDropdownItem>
            )
          })
        )}

        <CDropdownDivider />

        {/* Logout */}
        <CDropdownItem
          component="button"
          onClick={logout}
          id="dropdown-logout"
          className="text-danger py-1 px-3 w-100 text-start"
        >
          Logout
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
