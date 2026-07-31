import React, { useState, useEffect } from 'react'
import { useNoticeBoard } from '../hooks/useNoticeBoard.js'
import NoticeBoardTopNav from '../components/NoticeBoardTopNav.jsx'
import NoticeCard from '../components/NoticeCard.jsx'
import NoticeBoardFilters from '../components/NoticeBoardFilters.jsx'
import NoticeBoardPagination from '../components/NoticeBoardPagination.jsx'
import NoticeBoardDetailsModal from '../components/NoticeBoardDetailsModal.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from 'src/components/common/PageHeader'
import { useTranslation } from 'react-i18next'
import '../styles/_noticeBoard.scss'

export const NoticeBoardActiveView = () => {
  const { t } = useTranslation()

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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 notice-board-module-wrapper">
      <PageHeader
        title={t('noticeBoard.title', 'Notice Board')}
        subtitle={t('noticeBoard.subtitle', 'Stay updated with the latest community announcements.')}
      />

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
        <LoadingSkeleton count={4} />
      ) : notices.length === 0 ? (
        <EmptyState canCreate={false} onAddClick={null} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {notices.map((notice) => (
            <NoticeCard
              key={notice._id || notice.id}
              notice={notice}
              onDetails={handleDetailsClick}
              onBookmark={(id, val) => bookmarkNotice(id, val)}
              onMarkAsRead={(id) => markAsRead(id)}
              isAdmin={false}
              canUpdate={false}
              canDelete={false}
            />
          ))}
        </div>
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
  )
}

export default NoticeBoardActiveView
