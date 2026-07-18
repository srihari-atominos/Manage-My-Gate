import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import useAuth from '../../features/auth/hooks/useAuth'
import { switchWorkspaceContext } from '../../features/auth/store/authSlice'
import UserProfileModal from '../../features/auth/components/UserProfileModal'
import useWorkspace from '../../features/workspace/hooks/useWorkspace.js'
import { useTranslation } from 'react-i18next'

const AppHeaderDropdown = () => {
  const { t } = useTranslation()
  const { currentUser, logout } = useAuth()
  const dispatch = useDispatch()
  const { organizationName, activeOrganizationId, switchWorkspace, isPlatform } = useWorkspace()
  const [profileModalVisible, setProfileModalVisible] = useState(false)

  // Derive avatar letter: first char of username, fallback to 'A'
  const avatarLetter = currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'A'

  // Derive roles list from currentUser
  const roles = currentUser?.roles && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser?.role ? currentUser.role.split(',').map(r => r.trim()).filter(Boolean) : [])
  const activeRole = currentUser?.role || ''

  const handleSwitchRole = async (roleName) => {
    if (roleName === activeRole) return
    try {
      await dispatch(switchWorkspaceContext({ targetOrgId: activeOrganizationId, targetRole: roleName })).unwrap()
      window.location.reload()
    } catch (err) {
      console.error('Failed to switch role context:', err)
    }
  }

  const availableWorkspaces = useSelector((state) => state.workspace.availableWorkspaces) || []

  const handleSwitchWorkspace = async (targetOrgId) => {
    if (targetOrgId === activeOrganizationId) return
    try {
      await dispatch(switchWorkspaceContext(targetOrgId)).unwrap()
      window.location.hash = '#/dashboard'
      window.location.reload()
    } catch (err) {
      console.error('Failed to switch workspace context:', err)
    }
  }

  // Derive dynamic backend static base URL
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
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
          {t('header.dropdown.profile', { defaultValue: 'Profile' })}
        </CDropdownItem>

        <CDropdownDivider />

        {/* Role Switcher Section */}
        <CDropdownHeader className="fw-semibold text-uppercase py-1 px-3 header-dropdown-role-header">
          {t('header.dropdown.switchRole', { defaultValue: 'Switch Role' })}
        </CDropdownHeader>

        {roles.length === 0 ? (
          <CDropdownItem disabled className="text-body-secondary small py-1 px-3">
            No roles assigned
          </CDropdownItem>
        ) : (
          roles.map((roleName) => {
            const isActive = roleName === activeRole
            return (
              <CDropdownItem
                key={roleName}
                component="button"
                id={`dropdown-role-${roleName.toLowerCase().replace(/\s+/g, '-')}`}
                className={`d-flex align-items-center justify-content-between py-1 px-3 ${isActive ? 'fw-semibold' : ''}`}
                onClick={() => handleSwitchRole(roleName)}
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

        {/* Organization Switcher Section */}
        <CDropdownHeader className="fw-semibold text-uppercase py-1 px-3 header-dropdown-org-header">
          {t('header.dropdown.switchOrg', { defaultValue: 'Switch Organization' })}
        </CDropdownHeader>

        {availableWorkspaces.length === 0 ? (
          <CDropdownItem disabled className="text-body-secondary small py-1 px-3">
            {isPlatform
              ? t('header.dropdown.globalPlatform', { defaultValue: 'Global Platform' })
              : t('header.dropdown.noActiveWorkspace', { defaultValue: 'No active workspace' })}
          </CDropdownItem>
        ) : (
          availableWorkspaces.map((ws) => {
            const isActive = ws.orgId === activeOrganizationId
            return (
              <CDropdownItem
                key={ws.orgId}
                component="button"
                id={`dropdown-org-${ws.orgId}`}
                className={`d-flex align-items-center justify-content-between py-1 px-3 ${isActive ? 'fw-semibold' : ''}`}
                onClick={() => handleSwitchWorkspace(ws.orgId)}
              >
                {ws.name}
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
                    aria-label="Active workspace"
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
          {t('header.dropdown.logout', { defaultValue: 'Logout' })}
        </CDropdownItem>
      </CDropdownMenu>

      <UserProfileModal visible={profileModalVisible} onClose={() => setProfileModalVisible(false)} />
    </CDropdown>
  )
}

export default AppHeaderDropdown
