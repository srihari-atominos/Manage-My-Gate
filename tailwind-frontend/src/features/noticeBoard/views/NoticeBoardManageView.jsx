import React, { useState, useEffect } from 'react'
import { Pin, Trash2, Pencil, FolderOpen } from 'lucide-react'
import { useNoticeBoard } from '../hooks/useNoticeBoard.js'
import { useNoticeSocket } from '../hooks/useNoticeSocket.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import NoticeBoardTopNav from '../components/NoticeBoardTopNav.jsx'
import NoticeBoardFilters from '../components/NoticeBoardFilters.jsx'
import NoticeBoardPagination from '../components/NoticeBoardPagination.jsx'
import NoticeBoardFormModal from '../components/NoticeBoardFormModal.jsx'
import NoticeBoardDetailsModal from '../components/NoticeBoardDetailsModal.jsx'
import DeleteNoticeDialog from '../components/DeleteNoticeDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from 'src/components/common/PageHeader'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import '../styles/_noticeBoard.scss'

export const NoticeBoardManageView = () => {
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
    initializeAdminBoard,
  } = useNoticeBoard()

  // Modal visibilities local states
  const [formModalVisible, setFormModalVisible] = useState(false)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [noticeIdToDelete, setNoticeIdToDelete] = useState(null)
  const [activeTab, setActiveTab] = useState('All')

  // Trigger load on mount
  useEffect(() => {
    initializeAdminBoard()
  }, [initializeAdminBoard])

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

  const handleTabChange = (tab) => {
    if (tab === 'Create Notice') {
      handleAddClick()
      return
    }
    setActiveTab(tab)
    const filterTab = tab === 'All' ? '' : tab
    applyFilters({ status: filterTab })
  }

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

  const getPriorityVariant = (p) => {
    switch (p) {
      case 'Critical':
        return 'lightError'
      case 'High':
        return 'lightWarning'
      case 'Medium':
        return 'lightInfo'
      default:
        return 'lightSecondary'
    }
  }

  const getStatusVariant = (s) => {
    switch (s) {
      case 'Published':
        return 'lightSuccess'
      case 'Draft':
        return 'lightWarning'
      case 'Scheduled':
        return 'lightInfo'
      case 'Archived':
        return 'lightSecondary'
      default:
        return 'lightError' // Expired
    }
  }

  const handleResetFilters = () => {
    resetFilters()
    setActiveTab('All')
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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 notice-board-module-wrapper flex flex-col min-h-[500px]">
      <PageHeader
        title="Notice Board Management"
        subtitle="Manage community announcements, pin featured notices, schedule drafts, and organize archive history."
      />

      <NoticeBoardTopNav />

      {/* Admin Action Tabs & Filters Toolbar */}
      <div className="space-y-4 mb-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          {/* Admin Tabs */}
          <div className="flex gap-1.5 flex-wrap bg-slate-100 dark:bg-meta-4 p-1 rounded-lg">
            {['All', 'Published', 'Draft', 'Scheduled', 'Archived'].map((tab) => {
              const isSelected = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2 rounded text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
                      : 'text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {t(`noticeBoard.statuses.${tab}`, tab)}
                </button>
              )
            })}
          </div>

          {canCreate && (
            <Button
              variant="default"
              size="sm"
              onClick={handleAddClick}
              className="text-xs font-bold py-2.5 px-6"
            >
              Create Notice
            </Button>
          )}
        </div>

        {/* Search & Filters */}
        <NoticeBoardFilters
          search={search}
          filters={filters}
          sort={sort}
          onSearchChange={setSearch}
          onFiltersChange={applyFilters}
          onReset={handleResetFilters}
          hideStatusFilter={true} // Hiding status select in filters as it is handled by tabs
        />
      </div>

      {/* Table Listing */}
      {loading && notices.length === 0 ? (
        <div className="flex justify-center items-center py-20 flex-grow">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      ) : notices.length === 0 ? (
        <EmptyState canCreate={canCreate} onAddClick={handleAddClick} />
      ) : (
        <div className="flex-grow">
          <div className="relative rounded-md border border-stroke dark:border-strokedark overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white w-10"></th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Title</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Category</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Priority</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white">Expiry Date</th>
                  <th className="py-2.5 px-4 font-semibold text-black dark:text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {notices.map((notice) => {
                  const creator = notice.createdBy?.username || notice.createdBy?.name || 'Someone'
                  const priorityVariant = getPriorityVariant(notice.priority)
                  const statusVariant = getStatusVariant(notice.status)

                  return (
                    <tr
                      key={notice._id || notice.id}
                      className={`hover:bg-slate-50 dark:hover:bg-meta-4/10 ${
                        notice.isPinned ? 'border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        {notice.isPinned && (
                          <Pin className="h-4 w-4 text-primary" title="Pinned notice" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              notice.image ||
                              'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=60'
                            }
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=60'
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-black dark:text-white truncate">
                              {notice.title}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-semibold">
                              By {creator}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="lightSecondary" className="text-[10px] px-2 py-0.5 font-bold">
                          {notice.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={priorityVariant} className="text-[10px] px-2 py-0.5 font-bold">
                          {notice.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 font-bold">
                          {notice.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold">
                        {new Date(notice.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            title="View details"
                            onClick={() => handleDetailsClick(notice)}
                            className="p-1.5 rounded-md border-stroke dark:border-strokedark text-black dark:text-white h-7 w-7"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>

                          {canUpdate && (
                            <>
                              <Button
                                variant={notice.isPinned ? 'default' : 'outline'}
                                size="sm"
                                title={notice.isPinned ? 'Unpin' : 'Pin'}
                                onClick={() => handlePinToggle(notice._id, !notice.isPinned)}
                                className={`p-1.5 rounded-md h-7 w-7 ${
                                  notice.isPinned 
                                    ? 'bg-primary text-white border-0' 
                                    : 'border-stroke dark:border-strokedark text-black dark:text-white'
                                }`}
                              >
                                <Pin className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                title="Edit notice"
                                onClick={() => handleEditClick(notice)}
                                className="p-1.5 rounded-md border-warning text-warning hover:bg-warning/10 h-7 w-7"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          {canDelete && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Delete notice"
                              onClick={() => handleDeleteClick(notice._id)}
                              className="p-1.5 rounded-md border-danger text-danger hover:bg-danger/10 h-7 w-7"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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

export default NoticeBoardManageView
