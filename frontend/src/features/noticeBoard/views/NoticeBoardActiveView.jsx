import React, { useState, useEffect } from 'react'
import { CRow, CCol } from '@coreui/react'
import { useNoticeBoard } from '../hooks/useNoticeBoard.js'
import NoticeBoardTopNav from '../components/NoticeBoardTopNav.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import NoticeBoardFilters from '../components/NoticeBoardFilters.jsx'
import NoticeBoardPagination from '../components/NoticeBoardPagination.jsx'
import NoticeBoardDetailsModal from '../components/NoticeBoardDetailsModal.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { useTranslation } from 'react-i18next'
import '../styles/_noticeBoard.scss'

import { useLocation } from 'react-router-dom'

export const NoticeBoardActiveView = () => {
  const { t } = useTranslation()
  const location = useLocation()

  const {
    notices,
    selectedNotice,
    loading,
    pagination,
    search,
    filters,
    sort,
    setSearch,
    applyFilters,
    resetFilters,
    changePage,
    selectNotice,
    markAsRead,
    bookmarkNotice,
    initializeResidentBoard,
  } = useNoticeBoard()

  const [detailsModalVisible, setDetailsModalVisible] = useState(false)

  // Load notices with status published and limit 4 on mount
  useEffect(() => {
    initializeResidentBoard()
  }, [initializeResidentBoard])

  // Handle deep link from dashboard feed
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const openNoticeId = params.get('openNoticeId')

    if (openNoticeId && notices && notices.length > 0) {
      const targetNotice = notices.find((n) => n._id === openNoticeId)
      if (targetNotice) {
        selectNotice(targetNotice)
        setDetailsModalVisible(true)
        if (!targetNotice.isReadByUser) {
          markAsRead(targetNotice._id)
        }
      }
    }
  }, [location.search, notices, selectNotice, markAsRead])

  const handleDetailsClick = (notice) => {
    selectNotice(notice)
    setDetailsModalVisible(true)
    // Mark as read automatically when resident views details
    if (!notice.isReadByUser) {
      markAsRead(notice._id)
    }
  }

  const handleNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      changePage(pagination.currentPage + 1)
    }
  }

  const handlePreviousPage = () => {
    if (pagination.currentPage > 1) {
      changePage(pagination.currentPage - 1)
    }
  }

  const handleSearch = (term) => {
    setSearch(term)
  }

  const handleFilterChange = (filterObj) => {
    applyFilters({ ...filterObj, status: 'Published' })
  }

  const handleResetFilters = () => {
    resetFilters(true)
  }

  return (
    <div className="notice-board-theme pt-1">
      <div className="view-container">
        <NoticeBoardTopNav />

        {/* Search & Filters */}
        <NoticeBoardFilters
          search={search}
          filters={{ ...filters, status: 'Published' }}
          sort={sort}
          onSearchChange={handleSearch}
          onFiltersChange={handleFilterChange}
          onReset={handleResetFilters}
          hideStatusFilter={true}
          showNoticeTypeFilter={true}
        />

        {/* Notice Cards List */}
        {loading && notices.length === 0 ? (
          <LoadingSkeleton count={3} />
        ) : notices.length === 0 ? (
          <EmptyState canCreate={false} onAddClick={null} />
        ) : (
          <CRow xs={{ cols: 1 }} sm={{ cols: 2 }} md={{ cols: 4 }} className="g-4 mb-4">
            {notices.map((notice) => (
              <CCol key={notice._id || notice.id} className="d-flex">
                <NoticeCard
                  notice={notice}
                  onDetails={handleDetailsClick}
                  onBookmark={(id, val) => bookmarkNotice(id, val)}
                  onMarkAsRead={(id) => markAsRead(id)}
                  isAdmin={false}
                  canUpdate={false}
                  canDelete={false}
                />
              </CCol>
            ))}
          </CRow>
        )}

        {/* Pagination */}
        {notices.length > 0 && (
          <NoticeBoardPagination
            pagination={pagination}
            onPageChange={changePage}
            onNext={handleNextPage}
            onPrevious={handlePreviousPage}
          />
        )}

        {/* Details Modal */}
        <NoticeBoardDetailsModal
          visible={detailsModalVisible}
          notice={selectedNotice}
          onClose={() => setDetailsModalVisible(false)}
        />
      </div>
    </div>
  )
}

export default NoticeBoardActiveView
