import React from 'react'
import { CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { useNavigate } from 'react-router-dom'
import { cilBuilding, cilPlus } from '@coreui/icons'
import { useTranslation } from 'react-i18next'
import useWorkspaceSwitcher from '../../features/workspace/hooks/useWorkspaceSwitcher.js'

/**
 * WorkspaceSwitcher Component
 *
 * Presentational dropdown to switch active workspace context.
 * Consumes useWorkspaceSwitcher custom hook and translates static text using react-i18next.
 *
 * @component
 */
export const WorkspaceSwitcher = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { availableWorkspaces, activeWorkspace, handleSwitchWorkspace } = useWorkspaceSwitcher()

  // Do not render switcher if there are no workspaces available
  if (!availableWorkspaces || availableWorkspaces.length === 0) {
    return null
  }

  const hasMultipleWorkspaces = availableWorkspaces.length > 1

  // If user belongs to only 1 workspace and is not platform admin, render static badge
  if (!hasMultipleWorkspaces && !activeWorkspace.isPlatform) {
    return (
      <div className="app-workspace-switcher__static" id="workspace-current-badge">
        <CIcon icon={cilBuilding} className="me-2" size="lg" />
        <span className="d-none d-md-inline text-truncate" style={{ maxWidth: '160px' }}>
          {activeWorkspace.name || t('workspace.defaultName', { defaultValue: 'Workspace' })}
        </span>
      </div>
    )
  }

  return (
    <CDropdown variant="nav-item" className="app-workspace-switcher">
      <CDropdownToggle
        caret={true}
        className="app-workspace-switcher__toggle"
        style={{ cursor: 'pointer' }}
        id="workspace-switcher-toggle"
      >
        <CIcon icon={cilBuilding} className="me-2" size="lg" />
        <span className="d-none d-md-inline text-truncate" style={{ maxWidth: '160px' }}>
          {activeWorkspace.name
            ? activeWorkspace.villaId &&
              availableWorkspaces.find(
                (ws) =>
                  ws.orgId === activeWorkspace.orgId &&
                  (ws.villaId || null) === activeWorkspace.villaId,
              )?.villaNumber
              ? `${activeWorkspace.name} - Unit ${availableWorkspaces.find((ws) => ws.orgId === activeWorkspace.orgId && (ws.villaId || null) === activeWorkspace.villaId).villaNumber}`
              : activeWorkspace.name
            : t('workspace.defaultName', { defaultValue: 'Select Workspace' })}
        </span>
      </CDropdownToggle>
      <CDropdownMenu className="app-workspace-switcher__menu" placement="bottom-end">
        {availableWorkspaces.map((ws, idx) => {
          const isActive =
            ws.orgId === activeWorkspace.orgId &&
            (ws.villaId || null) === (activeWorkspace.villaId || null)
          const displayName = ws.villaNumber
            ? `${ws.name} - Unit ${ws.villaNumber} (${ws.residentType})`
            : ws.name

          return (
            <CDropdownItem
              key={`${ws.orgId}-${ws.villaId || 'admin'}-${idx}`}
              as="button"
              type="button"
              className="app-workspace-switcher__item"
              active={isActive}
              onClick={() => handleSwitchWorkspace(ws.orgId, ws.villaId)}
              id={`workspace-switch-item-${ws.orgId}-${ws.villaId || 'admin'}`}
            >
              <div className="app-workspace-switcher__item-content">
                <div className="app-workspace-switcher__name" style={{ maxWidth: '220px' }}>
                  {displayName}
                </div>
                <div className="app-workspace-switcher__role">{ws.roleName}</div>
              </div>
              {ws.isPlatform && (
                <span className="app-workspace-switcher__badge">
                  {t('workspace.platformBadge', { defaultValue: 'Platform' })}
                </span>
              )}
            </CDropdownItem>
          )
        })}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default WorkspaceSwitcher
