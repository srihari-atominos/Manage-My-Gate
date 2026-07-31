import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  CSpinner,
  CButton,
  CNav,
  CNavItem,
  CNavLink,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilSearch } from '@coreui/icons'
import { usePolls } from '../hooks/usePolls'
import { usePollSocket } from '../hooks/usePollSocket'
import NoticeBoardTopNav from '../../noticeBoard/components/NoticeBoardTopNav'
import PollCard from '../components/PollCard'
import CreatePollModal from '../components/CreatePollModal'
import '../styles/_poll.scss'
import '../../noticeBoard/styles/_noticeBoard.scss'
import { useAuth } from '../../auth/hooks/useAuth'

const PollDashboardView = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('active')
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState('latest')
  const searchTimeout = useRef(null)

  usePollSocket(activeTab, searchQuery, sortOption) // Initialize socket listeners with dependencies
  const {
    activePolls,
    closedPolls,
    myPolls,
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    submitNewPoll,
    submitVote,
    publishPoll,
    closePoll,
    deletePoll,
  } = usePolls()

  const fetchPolls = useCallback(
    (tab, search = searchQuery, sort = sortOption) => {
      const params = { page: 1, limit: 20, search, sort }
      if (tab === 'active') loadActivePolls(params)
      if (tab === 'closed') loadClosedPolls(params)
      if (tab === 'my') loadMyPolls(params)
    },
    [loadActivePolls, loadClosedPolls, loadMyPolls, searchQuery, sortOption],
  )

  useEffect(() => {
    fetchPolls(activeTab, searchQuery, sortOption)
  }, [activeTab]) // Fetch only on tab change or explicit search/sort change

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchPolls(activeTab, val, sortOption)
    }, 500)
  }

  const handleSortChange = (e) => {
    const val = e.target.value
    setSortOption(val)
    fetchPolls(activeTab, searchQuery, val)
  }

  const handleCreatePoll = async (pollData) => {
    await submitNewPoll(pollData)
    if (activeTab !== 'my') {
      setActiveTab('my') // Redirect to my polls so they can publish it
    } else {
      fetchPolls('my') // Refresh if already on 'my' tab
    }
  }

  const currentList =
    activeTab === 'active' ? activePolls : activeTab === 'closed' ? closedPolls : myPolls

  return (
    <div className="notice-board-theme pt-1">
      <div className="view-container">
        <NoticeBoardTopNav />

        {/* Header with title and create button */}
        <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
          <h5 className="fw-bold mb-0" style={{ fontSize: '18px' }}>
            Community Polls
          </h5>
          <CButton
            color="primary"
            size="sm"
            className="btn-pill btn-pill-primary"
            onClick={() => setCreateModalVisible(true)}
          >
            <CIcon icon={cilPlus} size="sm" className="me-1" />
            Create Poll
          </CButton>
        </div>

        {/* Filter bar — matches notice-filter-bar pattern */}
        <div className="notice-filter-bar">
          <CNav variant="tabs" className="notice-admin-tabs border-0 me-auto">
            <CNavItem>
              <CNavLink
                active={activeTab === 'active'}
                onClick={() => setActiveTab('active')}
                style={{ cursor: 'pointer' }}
              >
                Active
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'my'}
                onClick={() => setActiveTab('my')}
                style={{ cursor: 'pointer' }}
              >
                My Polls
              </CNavLink>
            </CNavItem>
          </CNav>

          <div className="notice-search-group">
            <span className="input-group-text">
              <CIcon icon={cilSearch} size="sm" />
            </span>
            <CFormInput
              type="text"
              placeholder="Search polls..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="form-control"
              style={{ width: '180px' }}
            />
          </div>
          <CFormSelect value={sortOption} onChange={handleSortChange} style={{ width: '130px' }}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="endingSoon">Ending Soon</option>
          </CFormSelect>
        </div>

        {/* Poll Cards Grid — matches NoticeBoardActiveView CRow layout */}
        {currentList.loading && currentList.data.length === 0 ? (
          <CRow xs={{ cols: 1 }} sm={{ cols: 2 }} md={{ cols: 2 }} className="g-4 mb-4">
            {[1, 2, 3].map((n) => (
              <CCol key={n} className="d-flex">
                <div
                  className="poll-card skeleton-card w-100"
                  style={{ borderRadius: '12px', padding: '24px', background: '#fff' }}
                >
                  <div className="skeleton-line title"></div>
                  <div className="skeleton-line text"></div>
                  <div className="skeleton-line option"></div>
                  <div className="skeleton-line option"></div>
                </div>
              </CCol>
            ))}
          </CRow>
        ) : currentList.error ? (
          <div className="alert alert-danger">{currentList.error}</div>
        ) : currentList.data.length === 0 ? (
          <div
            className="text-center py-5 text-muted notice-empty-state"
            style={{ borderRadius: '12px', background: '#fff', padding: '48px' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
            <h5 className="fw-bold">No polls found</h5>
            <p className="small text-muted mb-0">
              Try adjusting your search filters or create a new poll.
            </p>
          </div>
        ) : (
          <CRow xs={{ cols: 1 }} sm={{ cols: 2 }} md={{ cols: 2 }} className="g-4 mb-4">
            {currentList.data.map((poll) => (
              <CCol key={poll._id} className="d-flex">
                <PollCard
                  poll={poll}
                  onVote={submitVote}
                  onDelete={deletePoll}
                  onPublish={publishPoll}
                  onClosePoll={closePoll}
                />
              </CCol>
            ))}
          </CRow>
        )}
      </div>

      <CreatePollModal
        visible={createModalVisible}
        setVisible={setCreateModalVisible}
        onSubmit={handleCreatePoll}
      />
    </div>
  )
}

export default PollDashboardView
