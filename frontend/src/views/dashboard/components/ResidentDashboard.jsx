import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CBadge,
  CSpinner,
  CAlert,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilHome,
  cilPeople,
  cilPhone,
  cilCheckCircle,
  cilNotes,
  cilBullhorn,
  cilCopy,
  cilPlus,
  cilBuilding,
} from '@coreui/icons'
import apiClient from '../../../services/apiClient'
import toast from 'react-hot-toast'
import AppLoader from '../../../components/common/AppLoader'

export const ResidentDashboard = () => {
  const { user } = useSelector((state) => state.auth)
  const [villaDetails, setVillaDetails] = useState(null)
  const [loading, setLoading] = useState(false)

  // Guest pass generator state
  const [guestName, setGuestName] = useState('')
  const [generatedPass, setGeneratedPass] = useState(null)

  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  const [feedFilter, setFeedFilter] = useState('ALL') // 'ALL' | 'NOTICE' | 'AMENITY_MAINTENANCE'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const fetchAnnouncements = () => {
    setAnnouncementsLoading(true)
    apiClient
      .get('/dashboard-feed/announcements')
      .then((res) => {
        setAnnouncements(res.data?.data || [])
      })
      .catch((err) => {
        console.error('Failed to load dashboard announcements', err)
      })
      .finally(() => {
        setAnnouncementsLoading(false)
      })
  }

  useEffect(() => {
    const initialFetchId = window.setTimeout(fetchAnnouncements, 0)
    const intervalId = setInterval(fetchAnnouncements, 30000)

    return () => {
      window.clearTimeout(initialFetchId)
      clearInterval(intervalId)
    }
  }, [])

  const formatRelativeTime = (isoDate, timeString = '') => {
    if (!isoDate) return ''
    const target = new Date(isoDate)
    const now = new Date()
    const diffMs = target - now
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return `Today ${timeString}`
    if (diffDays === 1) return `Tomorrow ${timeString}`
    if (diffDays === -1) return `Yesterday ${timeString}`
    if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days ${timeString}`

    return `${target.toLocaleDateString()} ${timeString}`
  }

  const handleAnnouncementClick = (item) => {
    if (item.type === 'NOTICE') {
      navigate(`/dashboard/community-notices/${item.id}`)
    } else if (item.type === 'AMENITY_MAINTENANCE') {
      navigate(`/dashboard/maintenance/${item.id}`)
    }
  }

  useEffect(() => {
    if (user?.villaId) {
      const loadVillaId = window.setTimeout(() => {
        setLoading(true)
        apiClient
          .get(`/villas/${user.villaId}`)
          .then((res) => {
            setVillaDetails(res.data || null)
          })
          .catch((err) => {
            console.error('Failed to load resident villa details:', err)
          })
          .finally(() => {
            setLoading(false)
          })
      }, 0)

      return () => window.clearTimeout(loadVillaId)
    }
  }, [user])

  const handleCreatePass = (e) => {
    e.preventDefault()
    if (!guestName.trim()) return

    const passCode = `G-${Math.floor(100000 + Math.random() * 900000)}`
    setGeneratedPass({
      guestName: guestName.trim(),
      code: passCode,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString(),
    })
    setGuestName('')
    toast.success(`Guest pass generated for ${guestName.trim()}`)
  }

  const handleCopyPass = () => {
    if (!generatedPass) return
    const text = `Nahom Guest Pass\nGuest: ${generatedPass.guestName}\nCode: ${generatedPass.code}\nValid Until: ${generatedPass.validUntil}`
    navigator.clipboard.writeText(text)
    toast.success('Copied pass details to clipboard!')
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const displayName = useMemo(() => {
    if (!user) return 'Neighbor'
    return user.firstName || user.name?.split(' ')[0] || user.username || 'Neighbor'
  }, [user])

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    if (feedFilter === 'ALL') return announcements
    return announcements.filter((item) => item.type === feedFilter)
  }, [announcements, feedFilter])

  // Calculate pagination state
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage)
  const currentAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredAnnouncements.length)

  if (!user?.villaId) {
    return (
      <div className="portal-hub p-4 p-md-5">
        <CAlert color="warning" className="text-center py-5 shadow-sm border rounded-4 bg-body">
          <CIcon icon={cilHome} size="xl" className="mb-3 text-warning" />
          <h4 className="fw-bold text-body-emphasis">Pending Unit Allocation</h4>
          <p className="text-muted mx-auto mb-0" style={{ maxWidth: '480px' }}>
            Your account is verified, but you are not currently allocated to a villa or apartment.
            Please contact your community administrator to link your residency record.
          </p>
        </CAlert>
      </div>
    )
  }

  const villaNumber = villaDetails?.villa?.villaNumber || user.villaNumber || 'My Villa'
  const blockName = villaDetails?.villa?.block || user.block || 'Main Community'
  const intercom = villaDetails?.villa?.intercom || 'None'
  const config = villaDetails?.villa?.configuration || 'Standard Unit'
  const residentType = user.residentType || 'Resident'

  return (
    <div className="portal-hub resident-portal-dashboard">
      {/* Top Welcome & Subtitle */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <nav className="dashboard-breadcrumb" aria-label="Breadcrumb">
            <span>Resident Portal</span>
            <span className="dashboard-breadcrumb__separator" aria-hidden="true">
              /
            </span>
            <span aria-current="page">{villaNumber}</span>
          </nav>
          <h1 className="portal-main-title">
            {greeting}, {displayName}
          </h1>
          <p className="dashboard-page-subtitle">
            Welcome to your residential hub. Manage passes, review community broadcasts, and stay
            connected.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="dashboard-status">
            <span className="dashboard-status__dot" />
            <span>Community Active</span>
          </span>
        </div>
      </div>

      <CRow className="g-4">
        {/* Left column: Villa Architectural Hero Card and Co-residents Directory */}
        <CCol lg={7}>
          {loading || !villaDetails ? (
            <div className="text-center py-5 bg-body rounded-4 shadow-sm border mb-4">
              <AppLoader variant="block" />
              <div className="text-muted small mt-2">Loading villa occupancy data...</div>
            </div>
          ) : (
            <>
              {/* Premium Villa Architectural Card */}
              <CCard
                className="border-0 shadow-sm rounded-4 mb-4 overflow-hidden position-relative"
                style={{
                  background: 'linear-gradient(135deg, #172B70 0%, #1E2A4A 60%, #131E35 100%)',
                  color: '#FFFFFF',
                  borderTop: '3px solid #C2410C',
                }}
              >
                {/* Subtle decorative architectural grid lines */}
                <div
                  className="position-absolute end-0 top-0 bottom-0 pointer-events-none opacity-10"
                  style={{
                    width: '240px',
                    backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                  aria-hidden="true"
                />

                <CCardBody className="p-4 position-relative">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span
                          className="badge rounded-pill fw-bold text-uppercase px-2.5 py-1"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            color: '#FFFFFF',
                            fontSize: '0.7rem',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {blockName}
                        </span>
                        <span
                          className="badge rounded-pill fw-bold text-uppercase px-2.5 py-1"
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.25)',
                            color: '#6EE7B7',
                            fontSize: '0.7rem',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                          }}
                        >
                          {residentType}
                        </span>
                      </div>
                      <h2
                        className="fw-bold mb-0 text-white"
                        style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}
                      >
                        {villaNumber}
                      </h2>
                    </div>

                    <div className="text-end">
                      <span className="text-white-50 small d-block">RESIDENT STATUS</span>
                      <span className="fw-semibold text-white small">Verified Account</span>
                    </div>
                  </div>

                  <CRow className="mt-4 pt-3 border-top border-white-50 g-3">
                    <CCol xs={6} sm={4}>
                      <div
                        className="text-white-50 small text-uppercase fw-semibold"
                        style={{ fontSize: '0.68rem' }}
                      >
                        INTERCOM EXT
                      </div>
                      <div className="fw-bold text-white fs-6 d-flex align-items-center gap-2 mt-1">
                        <CIcon icon={cilPhone} style={{ width: '15px', color: '#FF9CA9' }} />
                        {intercom}
                      </div>
                    </CCol>

                    <CCol xs={6} sm={4}>
                      <div
                        className="text-white-50 small text-uppercase fw-semibold"
                        style={{ fontSize: '0.68rem' }}
                      >
                        UNIT CONFIG
                      </div>
                      <div className="fw-bold text-white fs-6 d-flex align-items-center gap-2 mt-1">
                        <CIcon icon={cilHome} style={{ width: '15px', color: '#93C5FD' }} />
                        {config}
                      </div>
                    </CCol>

                    <CCol xs={12} sm={4}>
                      <div
                        className="text-white-50 small text-uppercase fw-semibold"
                        style={{ fontSize: '0.68rem' }}
                      >
                        COMMUNITY
                      </div>
                      <div className="fw-bold text-white fs-6 d-flex align-items-center gap-2 mt-1">
                        <CIcon icon={cilBuilding} style={{ width: '15px', color: '#FDE68A' }} />
                        Nahom Estates
                      </div>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              {/* Co-residents Directory */}
              <CCard className="border-0 shadow-sm rounded-4">
                <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="rounded-3 p-1.5 d-flex align-items-center justify-content-center"
                      style={{
                        backgroundColor: 'rgba(194, 65, 12, 0.08)',
                        color: 'var(--nahom-primary)',
                      }}
                    >
                      <CIcon icon={cilPeople} style={{ width: '18px' }} />
                    </div>
                    <h5 className="mb-0 fw-bold" style={{ color: 'var(--nahom-text)' }}>
                      Co-residents Directory
                    </h5>
                  </div>
                  <span className="badge bg-body-secondary text-body-secondary fw-semibold">
                    {villaDetails.residents?.length || 1} Registered
                  </span>
                </CCardHeader>

                <CCardBody className="px-4 pb-4">
                  {villaDetails.residents && villaDetails.residents.length <= 1 ? (
                    <div className="text-center py-4 bg-body-secondary rounded-3 text-muted small">
                      No other family members or co-residents registered yet for this unit.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2.5">
                      {villaDetails.residents
                        ?.filter((r) => r.id !== user.id)
                        .map((res) => (
                          <div
                            key={res.id}
                            className="d-flex align-items-center justify-content-between p-3 border rounded-3 bg-body transition-all"
                            style={{
                              borderColor: 'var(--nahom-border)',
                              transition: 'all 150ms ease',
                            }}
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle fw-bold text-white d-flex align-items-center justify-content-center shadow-2xs"
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  fontSize: '0.85rem',
                                  backgroundColor: 'var(--nahom-accent, #1e2a4a)',
                                }}
                              >
                                {res.name ? res.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div className="fw-semibold text-body-emphasis small">
                                  {res.name || res.email.split('@')[0]}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                  {res.email}
                                </div>
                              </div>
                            </div>
                            <div>
                              <CBadge
                                color="light"
                                className="text-uppercase fw-bold border text-body-secondary"
                                style={{ fontSize: '0.65rem' }}
                              >
                                {res.residentType || 'Resident'}
                              </CBadge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CCardBody>
              </CCard>
            </>
          )}
        </CCol>

        {/* Right Column: Visitor Gate Pass Generator and Dashboard Feed */}
        <CCol xs={12} lg={5}>
          {/* Visitor Gate Pass */}
          <CCard className="border-0 shadow-sm rounded-4 mb-4">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2 d-flex align-items-center gap-2">
              <div
                className="rounded-3 p-1.5 d-flex align-items-center justify-content-center"
                style={{
                  backgroundColor: 'rgba(29, 107, 58, 0.1)',
                  color: 'var(--nahom-success, #1d6b3a)',
                }}
              >
                <CIcon icon={cilCheckCircle} style={{ width: '18px' }} />
              </div>
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--nahom-text)' }}>
                Visitor Gate Pass
              </h5>
            </CCardHeader>

            <CCardBody className="px-4 pb-4">
              {generatedPass ? (
                <div
                  className="text-center p-4 rounded-3 border"
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.06)',
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <div
                    className="small fw-bold text-uppercase mb-1"
                    style={{ color: 'var(--nahom-success, #1d6b3a)', letterSpacing: '0.06em' }}
                  >
                    Pass Generated for {generatedPass.guestName}
                  </div>
                  <div
                    className="fw-extrabold my-2"
                    style={{
                      fontSize: '2rem',
                      letterSpacing: '0.08em',
                      color: 'var(--nahom-text, #1e2a4a)',
                    }}
                  >
                    {generatedPass.code}
                  </div>
                  <div className="text-muted small mb-4">
                    Valid for 24 Hours • Expires: {generatedPass.validUntil}
                  </div>
                  <div className="d-flex gap-2 justify-content-center">
                    <CButton
                      color="outline-secondary"
                      size="sm"
                      className="px-3 fw-semibold"
                      onClick={() => setGeneratedPass(null)}
                    >
                      New Pass
                    </CButton>
                    <CButton
                      color="primary"
                      size="sm"
                      className="px-4 fw-semibold text-white d-inline-flex align-items-center gap-1.5"
                      onClick={handleCopyPass}
                    >
                      <CIcon icon={cilCopy} size="sm" />
                      Copy & Share
                    </CButton>
                  </div>
                </div>
              ) : (
                <CForm onSubmit={handleCreatePass}>
                  <div className="mb-3">
                    <CFormLabel
                      htmlFor="guest-name-input"
                      className="small fw-bold text-uppercase text-muted"
                      style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}
                    >
                      Guest or Visitor Name
                    </CFormLabel>
                    <CFormInput
                      id="guest-name-input"
                      type="text"
                      placeholder="e.g. David Miller, Courier, etc."
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                      className="rounded-3"
                    />
                    <div className="form-text small text-muted">
                      Generates an instant 6-digit touchless gate verification code.
                    </div>
                  </div>
                  <CButton
                    type="submit"
                    color="primary"
                    className="w-100 fw-semibold text-white d-inline-flex align-items-center justify-content-center gap-2"
                  >
                    <CIcon icon={cilPlus} size="sm" />
                    Generate Entry Code
                  </CButton>
                </CForm>
              )}
            </CCardBody>
          </CCard>

          {/* Unified Announcement & Community Feed */}
          <CCard className="border-0 shadow-sm rounded-4">
            <CCardHeader className="bg-transparent border-0 pt-4 px-4 pb-2">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-3 p-1.5 d-flex align-items-center justify-content-center"
                    style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}
                  >
                    <CIcon icon={cilBullhorn} style={{ width: '18px' }} />
                  </div>
                  <h5 className="mb-0 fw-bold" style={{ color: 'var(--nahom-text)' }}>
                    Dashboard Feed
                  </h5>
                </div>
                <span className="badge bg-body-secondary text-body-secondary fw-semibold">
                  {announcements.length} Total
                </span>
              </div>

              {/* Feed Category Filter Tabs */}
              <div className="d-flex gap-1 mt-2">
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-0.5 fw-semibold ${feedFilter === 'ALL' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => {
                    setFeedFilter('ALL')
                    setCurrentPage(1)
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-0.5 fw-semibold ${feedFilter === 'NOTICE' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => {
                    setFeedFilter('NOTICE')
                    setCurrentPage(1)
                  }}
                >
                  Notices
                </button>
                <button
                  type="button"
                  className={`btn btn-sm rounded-pill px-2.5 py-0.5 fw-semibold ${feedFilter === 'AMENITY_MAINTENANCE' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => {
                    setFeedFilter('AMENITY_MAINTENANCE')
                    setCurrentPage(1)
                  }}
                >
                  Maintenance
                </button>
              </div>
            </CCardHeader>

            <CCardBody className="px-4 pb-4">
              {announcementsLoading ? (
                <div className="text-center p-4">
                  <CSpinner color="primary" size="sm" />
                  <div className="text-muted small mt-2">Loading updates...</div>
                </div>
              ) : currentAnnouncements.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {currentAnnouncements.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 border-start border-4 bg-body shadow-2xs rounded-3 cursor-pointer ${
                        item.type === 'NOTICE' ? 'border-primary' : 'border-warning'
                      }`}
                      onClick={() => handleAnnouncementClick(item)}
                      style={{
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                        border: '1px solid var(--nahom-border)',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1.5">
                        <div
                          className={`fw-bold small d-flex align-items-center gap-1.5 ${
                            item.type === 'NOTICE' ? 'text-primary' : 'text-warning'
                          }`}
                        >
                          {item.type === 'NOTICE' ? (
                            <>
                              <CIcon icon={cilBullhorn} size="sm" /> Community Notice
                            </>
                          ) : (
                            <>
                              <CIcon icon={cilCheckCircle} size="sm" /> Amenity Maintenance
                            </>
                          )}
                        </div>

                        {item.priority &&
                          ['High', 'Critical', 'high', 'critical'].includes(item.priority) && (
                            <CBadge color="danger" shape="rounded-pill" className="fw-semibold">
                              High Priority
                            </CBadge>
                          )}
                      </div>

                      <div className="fw-bold text-body-emphasis fs-6 mb-1">{item.title}</div>
                      <p className="text-secondary small mb-2 text-truncate">{item.description}</p>

                      <div className="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                        <div
                          className="text-muted fw-medium text-truncate pe-2"
                          style={{ fontSize: '0.72rem' }}
                        >
                          <CIcon icon={cilNotes} size="sm" className="me-1" />
                          {item.type === 'NOTICE'
                            ? formatRelativeTime(item.createdAt)
                            : formatRelativeTime(
                                item.metadata?.startDate,
                                item.metadata?.startTime
                                  ? `${item.metadata.startTime} - ${item.metadata.endTime || ''}`
                                  : '',
                              )}
                        </div>
                        <div
                          className="text-muted text-end"
                          style={{ fontSize: '0.70rem', minWidth: '80px' }}
                        >
                          <span className="text-truncate d-block">By {item.createdBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-2 pt-3 border-top">
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        Showing {startItem}–{endItem} of {filteredAnnouncements.length}
                      </div>
                      <CPagination
                        className="mb-0"
                        size="sm"
                        aria-label="Dashboard feed pagination"
                      >
                        <CPaginationItem
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </CPaginationItem>
                        {[...Array(totalPages)].map((_, i) => (
                          <CPaginationItem
                            key={i + 1}
                            active={i + 1 === currentPage}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </CPaginationItem>
                        ))}
                        <CPaginationItem
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </CPaginationItem>
                      </CPagination>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted small p-4 bg-body-secondary rounded-3">
                  No announcements match your current filter.
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default ResidentDashboard
