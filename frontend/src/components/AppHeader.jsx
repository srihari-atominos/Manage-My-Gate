/**
 * AppHeader Component
 *
 * Main application header with navigation, theme switcher, and user menu.
 * Features include:
 * - Sidebar toggle button
 * - Primary navigation links
 * - Notification and action icons
 * - Theme switcher (light/dark/auto)
 * - User dropdown menu
 * - Breadcrumb navigation
 * - Sticky positioning with scroll shadow effect
 *
 * @component
 * @example
 * return (
 *   <AppHeader />
 * )
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CFormInput,
  useColorModes,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilMoon, cilSearch, cilSun } from '@coreui/icons'

import { AppHeaderDropdown } from './header/index'
import NotificationBell from '../features/notification/components/NotificationBell.jsx'
import WorkspaceSwitcher from './common/WorkspaceSwitcher.jsx'

const APP_SEARCH_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', keywords: 'home overview' },
  {
    label: 'Community Manager',
    to: '/super-admin/organizations',
    keywords: 'organization community',
  },
  { label: 'Audit Logs', to: '/super-admin/audit-logs', keywords: 'activity security events' },
  { label: 'Issue Reports', to: '/super-admin/issue-reports', keywords: 'reports bugs feedback' },
  { label: 'Workspace Settings', to: '/workspace/settings', keywords: 'workspace configuration' },
  { label: 'Unit Management', to: '/villas', keywords: 'villa unit property' },
  { label: 'User Management', to: '/users', keywords: 'users residents members' },
  { label: 'Invitations', to: '/users/invitations', keywords: 'invite invitation' },
  { label: 'Role Builder', to: '/role-builder', keywords: 'roles permissions access' },
  { label: 'Integration Hub', to: '/integrations', keywords: 'integration smtp email' },
  { label: 'Visitor Management', to: '/visitor-management', keywords: 'visitor passes guest' },
  { label: 'Notice Board', to: '/notices', keywords: 'notices announcements' },
  {
    label: 'Complaints / Maintenance',
    to: '/complaints',
    keywords: 'complaint maintenance request',
  },
]

/**
 * AppHeader functional component
 *
 * Manages header UI including:
 * - Redux integration for sidebar state
 * - Theme management with CoreUI useColorModes hook
 * - Scroll-based shadow effect
 * - Responsive navigation
 *
 * @returns {React.ReactElement} Header component with navigation and controls
 */
const AppHeader = () => {
  const headerRef = useRef()
  const navigate = useNavigate()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.ui.sidebarShow)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const searchResults = useMemo(
    () =>
      normalizedSearchTerm
        ? APP_SEARCH_ITEMS.filter(({ label, keywords }) =>
            `${label} ${keywords}`.toLowerCase().includes(normalizedSearchTerm),
          ).slice(0, 6)
        : [],
    [normalizedSearchTerm],
  )

  const goToSearchResult = (item) => {
    navigate(item.to)
    setSearchTerm('')
    setSearchOpen(false)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    if (searchResults[0]) goToSearchResult(searchResults[0])
  }

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    document.addEventListener('scroll', handleScroll, { passive: true })
    return () => document.removeEventListener('scroll', handleScroll, { passive: true })
  }, [])

  return (
    <CHeader position="sticky" className="app-header mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          className="app-header-icon-button"
          aria-label="Toggle navigation menu"
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <div className="app-header-search ms-3 d-none d-md-flex">
          <form className="app-header-search__form" onSubmit={handleSearchSubmit}>
            <CIcon icon={cilSearch} aria-hidden="true" />
            <CFormInput
              type="search"
              value={searchTerm}
              placeholder="Search pages..."
              aria-label="Search application pages"
              aria-autocomplete="list"
              aria-controls="app-header-search-results"
              aria-expanded={searchOpen && normalizedSearchTerm.length > 0}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
            />
          </form>
          {searchOpen && normalizedSearchTerm && (
            <div
              id="app-header-search-results"
              className="app-header-search__results"
              role="listbox"
            >
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    role="option"
                    className="app-header-search__result"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToSearchResult(item)}
                  >
                    {item.label}
                  </button>
                ))
              ) : (
                <p className="app-header-search__empty">No matching pages</p>
              )}
            </div>
          )}
        </div>
        <CHeaderNav className="ms-auto align-items-center">
          <div className="me-3">
            <WorkspaceSwitcher />
          </div>
          <div className="me-3">
            <NotificationBell />
          </div>
          <div className="me-3">
            <button
              type="button"
              className="app-theme-toggle"
              onClick={() => {
                const nextMode = colorMode === 'dark' ? 'light' : 'dark'
                setColorMode(nextMode)
                document.documentElement.setAttribute('data-coreui-theme', nextMode)
                localStorage.setItem('coreui-free-react-admin-template-theme', nextMode)
              }}
              aria-label={`Switch to ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${colorMode === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <CIcon icon={colorMode === 'dark' ? cilMoon : cilSun} size="lg" aria-hidden="true" />
            </button>
          </div>
          <div className="ms-2">
            <AppHeaderDropdown />
          </div>
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
