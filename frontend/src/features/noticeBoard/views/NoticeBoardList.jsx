import React, { useState, useEffect } from 'react'
import { CContainer, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import { useNoticeBoard } from '../hooks/useNoticeBoard.js'
import { useNoticeSocket } from '../hooks/useNoticeSocket.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import NoticeCard from '../components/NoticeCard.jsx'
import NoticeBoardFilters from '../components/NoticeBoardFilters.jsx'
import NoticeBoardPagination from '../components/NoticeBoardPagination.jsx'
import NoticeBoardFormModal from '../components/NoticeBoardFormModal.jsx'
import NoticeBoardDetailsModal from '../components/NoticeBoardDetailsModal.jsx'
import DeleteNoticeDialog from '../components/DeleteNoticeDialog.jsx'
import LoadingSkeleton from '../components/LoadingSkeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import '../styles/_noticeBoard.scss'

/**
 * NoticeBoardList View Orchestrator
 * Main content container displaying announcements cards layout.
 */
export const NoticeBoardList = () => {
  useNoticeSocket()
  const { t } = useTranslation()
  const { checkPermission } = useAuth()

  // Enforce permissions checks
  const canCreate = checkPermission('notices:create')
  const canUpdate = checkPermission('notices:update')
  const canDelete = checkPermission('notices:delete')

  const {
    notices,
    selectedNotice,
    loading,
    error,
    success,
    pagination,
    search,
    filters,
    sort,
    loadNotices,
    createNotice,
    updateNotice,
    deleteNotice,
    togglePin,
    setSearch,
    applyFilters,
    resetFilters,
    changePage,
    changeLimit,
    selectNotice,
    clearNoticeErrors,
    clearNoticeSuccess,
  } = useNoticeBoard()

  // Modal visibilities local states
  const [formModalVisible, setFormModalVisible] = useState(false)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [noticeIdToDelete, setNoticeIdToDelete] = useState(null)

  // Trigger load on mount
  useEffect(() => {
    loadNotices()
  }, [loadNotices])

  // Sync toasts
  useEffect(() => {
    if (success) {
      toast.success(t(`noticeBoard.messages.${success}`, { defaultValue: 'Operation successful' }))
      clearNoticeSuccess()
    }
    if (error) {
      toast.error(error)
      clearNoticeErrors()
    }
  }, [success, error, clearNoticeSuccess, clearNoticeErrors, t])

  const handleAddClick = () => {
    selectNotice(null)
    setFormModalVisible(true)
  }

  const handleEditClick = (notice) => {
    selectNotice(notice)
    setFormModalVisible(true)
  }

  const handleDeleteClick = (id) => {
    setNoticeIdToDelete(id)
    setDeleteDialogVisible(true)
  }

  const handleDetailsClick = (notice) => {
    selectNotice(notice)
    setDetailsModalVisible(true)
  }

  const handleSaveNotice = async (formData) => {
    try {
      if (selectedNotice) {
        await updateNotice(selectedNotice._id, formData)
      } else {
        await createNotice(formData)
        resetFilters()
      }
      setFormModalVisible(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleConfirmDelete = async () => {
    if (noticeIdToDelete) {
      try {
        await deleteNotice(noticeIdToDelete)
        setDeleteDialogVisible(false)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handlePinToggle = async (id, isPinned) => {
    try {
      await togglePin(id, isPinned)
    } catch (err) {
      console.error(err)
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

  return (
    <div className="notice-board-view pt-3">
      <CContainer fluid className="px-4">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div className="d-flex flex-column">
            <h2 className="fw-bold text-body mb-1">{t('noticeBoard.title', 'Notice Board')}</h2>
            <span className="text-secondary small">
              {t('noticeBoard.subtitle', 'Stay updated with the latest community announcements.')}
            </span>
          </div>

          <div>
            {canCreate && (
              <CButton
                color="primary"
                className="fw-semibold px-4 py-2"
                style={{ borderRadius: '8px', backgroundColor: '#321fdb', border: 'none' }}
                id="btn-add-notice"
                onClick={handleAddClick}
              >
                <CIcon icon={cilPlus} size="sm" className="me-1 align-middle" />
                {t('noticeBoard.actions.addNew', 'Create Notice')}
              </CButton>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <NoticeBoardFilters
          search={search}
          filters={filters}
          sort={sort}
          onSearchChange={setSearch}
          onFiltersChange={applyFilters}
          onReset={resetFilters}
        />

        {/* Notice Cards List */}
        {loading && notices.length === 0 ? (
          <LoadingSkeleton count={3} />
        ) : notices.length === 0 ? (
          <EmptyState canCreate={canCreate} onAddClick={handleAddClick} />
        ) : (
          <div className="d-flex flex-column gap-3">
            {notices.map((notice) => (
              <NoticeCard
                key={notice._id || notice.id}
                notice={notice}
                onDetails={handleDetailsClick}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onPinToggle={handlePinToggle}
                canUpdate={canUpdate}
                canDelete={canDelete}
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
      </CContainer>

      {/* Pop-up Form Modal */}
      <NoticeBoardFormModal
        visible={formModalVisible}
        notice={selectedNotice}
        onClose={() => setFormModalVisible(false)}
        onSave={handleSaveNotice}
      />

      {/* Details Modal */}
      <NoticeBoardDetailsModal
        visible={detailsModalVisible}
        notice={selectedNotice}
        onClose={() => setDetailsModalVisible(false)}
      />

      {/* Confirmation removal modal */}
      <DeleteNoticeDialog
        visible={deleteDialogVisible}
        loading={loading}
        onClose={() => setDeleteDialogVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default NoticeBoardList
