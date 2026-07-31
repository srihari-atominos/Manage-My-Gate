import React, { useEffect, useState } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import ComplaintTopNav from '../components/ComplaintTopNav'
import { useAuth } from '../../auth/hooks/useAuth'
import ComplaintDetails from './ComplaintDetails'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Search, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import '../styles/_complaints.scss'

const Assignee = () => {
  const { currentUser: user } = useAuth()

  const [filterParams, setFilterParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
  })

  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filterParams.search)
    }, 500)
    return () => clearTimeout(handler)
  }, [filterParams.search])

  const activeFilters = {
    ...filterParams,
    search: debouncedSearch,
  }

  const {
    complaints,
    pagination,
    isLoading,
    acceptAssignment,
    rejectAssignment,
    startWork,
    pauseWork,
    resumeWork,
    markWorkCompleted,
    uploadWorkAttachments,
    addWorkNotes,
    uploadFiles,
  } = useComplaints(activeFilters)

  // Filter for currently logged-in user
  const assignedComplaints = (complaints || []).filter((c) => {
    const uid = String(user?.id || user?._id || user?.userId || '')
    const assigneeIdStr =
      typeof c.assignedTechnicianId === 'object' && c.assignedTechnicianId !== null
        ? String(c.assignedTechnicianId._id)
        : String(c.assignedTechnicianId || '')
    const isMatch =
      assigneeIdStr === uid || (c.isBroadcast && c.broadcastTechnicianIds?.map(String).includes(uid))
    return isMatch
  })

  const [selectedComplaintId, setSelectedComplaintId] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [actionReason, setActionReason] = useState('')
  const [activeComplaint, setActiveComplaint] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])

  const formatDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setFilterParams((prev) => ({ ...prev, page: newPage }))
    }
  }

  const onAccept = async (e, id) => {
    e.stopPropagation()
    try {
      await acceptAssignment(id)
      toast.success('Assignment accepted')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept assignment')
    }
  }

  const onReject = (e, complaint) => {
    e.stopPropagation()
    setActiveComplaint(complaint)
    setActionReason('')
    setShowRejectModal(true)
  }

  const submitReject = async () => {
    try {
      await rejectAssignment(activeComplaint._id, actionReason)
      toast.success('Assignment rejected')
      setShowRejectModal(false)
    } catch (err) {
      toast.error('Failed to reject assignment')
    }
  }

  const onStartWork = async (e, id) => {
    e.stopPropagation()
    try {
      await startWork(id)
      toast.success('Work started')
    } catch (err) {
      toast.error('Failed to start work')
    }
  }

  const onPause = (e, complaint) => {
    e.stopPropagation()
    setActiveComplaint(complaint)
    setActionReason('')
    setShowPauseModal(true)
  }

  const submitPause = async () => {
    try {
      await pauseWork(activeComplaint._id, actionReason)
      toast.success('Work paused')
      setShowPauseModal(false)
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || err || 'Failed to pause work',
      )
    }
  }

  const onResumeWork = async (e, id) => {
    e.stopPropagation()
    try {
      await resumeWork(id)
      toast.success('Work resumed')
    } catch (err) {
      toast.error('Failed to resume work')
    }
  }

  const onComplete = (e, complaint) => {
    e.stopPropagation()
    setActiveComplaint(complaint)
    setActionReason('')
    setShowCompleteModal(true)
  }

  const submitComplete = async () => {
    try {
      await markWorkCompleted(activeComplaint._id, { notes: actionReason, attachments: [] })
      toast.success('Work marked as completed')
      setShowCompleteModal(false)
    } catch (err) {
      toast.error('Failed to mark work as completed')
    }
  }

  const submitUpload = async () => {
    if (selectedFiles.length === 0) return toast.error('Please select at least one photo')

    try {
      const formData = new FormData()
      Array.from(selectedFiles).forEach((file) => formData.append('attachments', file))

      const fileUrls = await uploadFiles(formData)
      await uploadWorkAttachments(activeComplaint._id, fileUrls)
      toast.success('Photos uploaded successfully')
      setShowUploadModal(false)
      setSelectedFiles([])
    } catch (err) {
      toast.error('Failed to upload photos')
    }
  }

  const submitNotes = async () => {
    try {
      await addWorkNotes(activeComplaint._id, actionReason)
      toast.success('Notes added successfully')
      setShowNotesModal(false)
    } catch (err) {
      toast.error('Failed to add notes')
    }
  }

  const newAssignmentsCount = assignedComplaints.filter(
    (c) => c.status === 'Assigned' || c.status === 'Waiting For Acceptance',
  ).length

  return (
    <div>
      <ComplaintTopNav />
      <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
        {/* New Assignments Alert banner */}
        {newAssignmentsCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-4 mb-6 dark:bg-primary/10">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <div className="text-xs font-medium text-black dark:text-white">
              <strong>Admin allocated work:</strong> You have {newAssignmentsCount} new pending{' '}
              {newAssignmentsCount > 1 ? 'assignments' : 'assignment'}.
            </div>
          </div>
        )}

        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">Assignee Portal</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Manage and update your assigned tasks
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Input
              type="text"
              placeholder="Search by Ticket ID..."
              value={filterParams.search}
              onChange={(e) =>
                setFilterParams({ ...filterParams, search: e.target.value, page: 1 })
              }
              className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-1.5"
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          <select
            className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white font-medium"
            value={filterParams.status}
            onChange={(e) =>
              setFilterParams({ ...filterParams, status: e.target.value, page: 1 })
            }
          >
            <option value="" className="bg-white dark:bg-boxdark">All Statuses</option>
            <option value="Waiting For Acceptance" className="bg-white dark:bg-boxdark">Waiting For Acceptance</option>
            <option value="Assigned" className="bg-white dark:bg-boxdark">Assigned / Accepted</option>
            <option value="In Progress" className="bg-white dark:bg-boxdark">In Progress</option>
            <option value="On Hold" className="bg-white dark:bg-boxdark">On Hold</option>
          </select>
        </div>

        {/* Assignments Table */}
        <div className="rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Ticket No.</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Subject</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Priority</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Category</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {assignedComplaints.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-400 dark:text-gray-500">
                      No assigned tasks found.
                    </td>
                  </tr>
                )}
                {assignedComplaints.map((c) => {
                  let priorityVariant = 'lightSecondary'
                  if (c.priority === 'High' || c.priority === 'Critical')
                    priorityVariant = 'lightError'
                  else if (c.priority === 'Medium') priorityVariant = 'lightWarning'

                  return (
                    <tr
                      key={c._id}
                      onClick={() => setSelectedComplaintId(c._id)}
                      className="hover:bg-slate-50 dark:hover:bg-meta-4/10 cursor-pointer"
                    >
                      <td className="py-3 px-5 font-bold text-black dark:text-white">
                        #{c.complaintNumber}
                      </td>
                      <td className="py-3 px-5 font-bold text-black dark:text-white">
                        {c.subject || c.title}
                      </td>
                      <td className="py-3 px-5">
                        <Badge variant={priorityVariant} className="text-[10px] px-2 py-0.5 font-bold">
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-300">{c.category}</td>
                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1.5 font-medium text-black dark:text-white">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              c.status === 'Resolved' || c.status === 'Closed'
                                ? 'bg-success'
                                : c.status === 'In Progress'
                                  ? 'bg-primary'
                                  : 'bg-warning'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {c.status === 'Waiting For Acceptance' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => onAccept(e, c._id)}
                                className="text-2xs font-semibold px-2.5 py-1 bg-success hover:bg-success/90 border-0"
                              >
                                Accept
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => onReject(e, c)}
                                className="text-2xs font-semibold px-2.5 py-1 text-danger hover:bg-danger/10"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {(c.status === 'Assigned' || c.status === 'Accepted') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => onStartWork(e, c._id)}
                              className="text-2xs font-semibold px-2.5 py-1"
                            >
                              Start Work
                            </Button>
                          )}
                          {c.status === 'In Progress' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={(e) => onComplete(e, c)}
                                className="text-2xs font-semibold px-2.5 py-1 bg-success hover:bg-success/90 border-0"
                              >
                                Mark Completed
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveComplaint(c)
                                  setShowUploadModal(true)
                                }}
                                className="text-2xs font-semibold px-2.5 py-1 text-primary hover:bg-primary/10"
                              >
                                Upload Photos
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveComplaint(c)
                                  setShowNotesModal(true)
                                  setActionReason('')
                                }}
                                className="text-2xs font-semibold px-2.5 py-1 text-primary hover:bg-primary/10"
                              >
                                Add Notes
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => onPause(e, c)}
                                className="text-2xs font-semibold px-2.5 py-1 text-warning hover:bg-warning/10"
                              >
                                Pause
                              </Button>
                            </>
                          )}
                          {c.status === 'On Hold' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => onResumeWork(e, c._id)}
                              className="text-2xs font-semibold px-2.5 py-1"
                            >
                              Resume Work
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

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-stroke dark:border-strokedark">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
                Showing {((pagination.currentPage - 1) * filterParams.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * filterParams.limit, pagination.totalRecords)} of{' '}
                {pagination.totalRecords} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filterParams.page <= 1}
                  onClick={() => handlePageChange(filterParams.page - 1)}
                  className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filterParams.page >= (pagination?.totalPages || 1)}
                  onClick={() => handlePageChange(filterParams.page + 1)}
                  className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Dialog
        open={showRejectModal}
        onOpenChange={(open) => {
          if (!open) setShowRejectModal(false)
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              Reject Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason" className="text-xs font-semibold">
                Reason for rejection
              </Label>
              <textarea
                id="reject-reason"
                placeholder="Why are you rejecting this assignment?"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectModal(false)}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={submitReject}
              className="text-xs font-bold px-4 py-2 bg-danger hover:bg-danger/90 border-0 text-white"
            >
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Modal */}
      <Dialog
        open={showPauseModal}
        onOpenChange={(open) => {
          if (!open) setShowPauseModal(false)
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              Pause Work
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pause-reason" className="text-xs font-semibold">
                Reason for pausing
              </Label>
              <textarea
                id="pause-reason"
                placeholder="E.g. Need to buy materials..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPauseModal(false)}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={submitPause}
              className="text-xs font-bold px-4 py-2"
            >
              Confirm Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog
        open={showCompleteModal}
        onOpenChange={(open) => {
          if (!open) setShowCompleteModal(false)
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              Mark Work Completed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="completion-notes" className="text-xs font-semibold">
                Completion Notes
              </Label>
              <textarea
                id="completion-notes"
                placeholder="What did you fix?"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompleteModal(false)}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={submitComplete}
              className="text-xs font-bold px-4 py-2 bg-success hover:bg-success/90 border-0 text-white"
            >
              Complete Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Photos Modal */}
      <Dialog
        open={showUploadModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowUploadModal(false)
            setSelectedFiles([])
          }
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              Upload Work Photos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="upload-photos" className="text-xs font-semibold">
                Select Photos <span className="text-danger">*</span>
              </Label>
              <input
                id="upload-photos"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              {selectedFiles.length > 0 && (
                <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-1">
                  {selectedFiles.length} file(s) selected
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowUploadModal(false)
                setSelectedFiles([])
              }}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={submitUpload}
              className="text-xs font-bold px-4 py-2"
            >
              Upload Photos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notes Modal */}
      <Dialog
        open={showNotesModal}
        onOpenChange={(open) => {
          if (!open) setShowNotesModal(false)
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              Add Work Notes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="work-notes" className="text-xs font-semibold">
                Notes
              </Label>
              <textarea
                id="work-notes"
                placeholder="Details about the work..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotesModal(false)}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={submitNotes}
              className="text-xs font-bold px-4 py-2"
            >
              Add Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedComplaintId && (
        <ComplaintDetails
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
        />
      )}
    </div>
  )
}

export default Assignee
