import React, { useState } from 'react'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import useAuth from '../../features/auth/hooks/useAuth'
import UserProfileModal from '../../features/auth/components/UserProfileModal'

const AppHeaderDropdown = () => {
  const { currentUser, logout } = useAuth()
  const [profileModalVisible, setProfileModalVisible] = useState(false)

  // Derive avatar letter: first char of username, fallback to 'A'
  const avatarLetter = currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'

  // Derive roles list from currentUser
  const roles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])

  // Derive dynamic backend static base URL
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const backendHost = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase
  const avatarUrl = currentUser?.avatar ? `${backendHost}/${currentUser.avatar.startsWith('/') ? currentUser.avatar.substring(1) : currentUser.avatar}` : null

  return (
    <CDropdown variant="nav-item" alignment="end">
      {/* ── Text-based/Image-based avatar toggle ── */}
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
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="header-avatar-img" />
          ) : (
            avatarLetter
          )}
        </div>
      </CDropdownToggle>

      {/* ── Dropdown Menu ── */}
      <CDropdownMenu className="pt-0 header-dropdown-menu" placement="bottom-end">
        {/* Profile */}
        <CDropdownItem
          component="button"
          id="dropdown-profile"
          className="py-1 px-3 w-100 text-start"
          onClick={() => setProfileModalVisible(true)}
        >
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

      <UserProfileModal visible={profileModalVisible} onClose={() => setProfileModalVisible(false)} />
    </CDropdown>
  )
}

export default AppHeaderDropdown
