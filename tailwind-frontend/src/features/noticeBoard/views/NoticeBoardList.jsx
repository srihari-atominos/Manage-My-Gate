import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from 'src/components/ui/button'
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
import PageHeader from 'src/components/common/PageHeader'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import '../styles/_noticeBoard.scss'

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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 notice-board-module-wrapper">
      {/* Page Header */}
      <PageHeader
        title={t('noticeBoard.title', 'Notice Board')}
        subtitle={t('noticeBoard.subtitle', 'Stay updated with the latest community announcements.')}
        action={
          canCreate ? (
            <Button
              id="btn-add-notice"
              variant="default"
              size="sm"
              onClick={handleAddClick}
              className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
            >
              <Plus className="h-4.5 w-4.5" />
              {t('noticeBoard.actions.addNew', 'Create Notice')}
            </Button>
          ) : null
        }
      />

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
        <div className="flex flex-col gap-4">
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
