import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComplaints } from '../hooks/useComplaints'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import ComplaintTopNav from '../components/ComplaintTopNav'
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
import { FileDown, Search, Star, X, ChevronLeft, ChevronRight } from 'lucide-react'
import '../styles/_complaints.scss'
import toast from 'react-hot-toast'

const MyComplaints = () => {
  const navigate = useNavigate()

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

  // Pass debounced values to useComplaints
  const activeFilters = {
    ...filterParams,
    search: debouncedSearch,
  }

  const { complaints, pagination, isLoading, cancelComplaint, addFeedback } =
    useComplaints(activeFilters)

  const handleExport = () => {
    if (!complaints || complaints.length === 0) {
      toast.error('No records to export')
      return
    }
    const wb = XLSX.utils.book_new()
    const data = [['Ticket ID', 'Title', 'Category', 'Status', 'Priority', 'Date Submitted']]
    complaints.forEach((c) => {
      data.push([
        c.complaintNumber || 'N/A',
        c.title || 'N/A',
        c.category || 'N/A',
        c.status || 'N/A',
        c.priority || 'N/A',
        new Date(c.createdAt).toLocaleDateString(),
      ])
    })
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'My Complaints')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'my_complaints.xlsx')
  }

  const [selectedComplaintId, setSelectedComplaintId] = useState(null)
  const [feedbackModalId, setFeedbackModalId] = useState(null)
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    remarks: '',
  })

  const formatDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setFilterParams((prev) => ({ ...prev, page: newPage }))
    }
  }

  return (
    <div>
      <ComplaintTopNav />
      <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
        {/* Title & Export */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">Track Requests</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Check the real-time status of your reported issues
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Input
              type="text"
              placeholder="Search by Ticket ID or Subject..."
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
            <option value="Submitted" className="bg-white dark:bg-boxdark">Submitted</option>
            <option value="Assigned" className="bg-white dark:bg-boxdark">Assigned</option>
            <option value="In Progress" className="bg-white dark:bg-boxdark">In Progress</option>
            <option value="Resolved" className="bg-white dark:bg-boxdark">Resolved</option>
            <option value="Closed" className="bg-white dark:bg-boxdark">Closed</option>
            <option value="Cancelled" className="bg-white dark:bg-boxdark">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">ID</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Subject</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Department</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Logged Date</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {complaints?.filter((c) => c.status !== 'Cancelled').length === 0 && !isLoading && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-400 dark:text-gray-500">
                      No complaints found.
                    </td>
                  </tr>
                )}
                {complaints
                  ?.filter((c) => c.status !== 'Cancelled')
                  .map((c) => {
                    let badgeVariant = 'lightSecondary'
                    if (['Submitted', 'Open'].includes(c.status)) badgeVariant = 'lightError'
                    else if (['In Progress', 'Assigned'].includes(c.status)) badgeVariant = 'lightWarning'
                    else if (['Resolved', 'Closed'].includes(c.status)) badgeVariant = 'lightSuccess'
                    else if (['Cancelled', 'Rejected'].includes(c.status)) badgeVariant = 'lightSecondary'

                    return (
                      <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                        <td className="py-3 px-5 font-bold text-black dark:text-white">
                          {c.complaintNumber}
                        </td>
                        <td className="py-3 px-5 font-bold text-black dark:text-white">
                          {c.title}
                        </td>
                        <td className="py-3 px-5 text-gray-600 dark:text-gray-300">{c.category}</td>
                        <td className="py-3 px-5">
                          <Badge variant={badgeVariant} className="text-[10px] px-2 py-0.5 font-bold">
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-5 text-gray-600 dark:text-gray-300">
                          {formatDate(c.createdAt)}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedComplaintId(c._id)}
                              className="text-xs font-semibold text-primary hover:bg-primary/10"
                            >
                              View
                            </Button>
                            {['Submitted', 'Open'].includes(c.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const reason = prompt('Reason for cancellation:')
                                  if (reason) {
                                    cancelComplaint(c._id, reason).then(() =>
                                      toast.success('Complaint Cancelled'),
                                    )
                                  }
                                }}
                                className="text-xs font-semibold text-danger hover:bg-danger/10"
                              >
                                Cancel Request
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
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  className="text-xs font-semibold px-3 py-1.5 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let p = i + 1
                    if (pagination.totalPages > 5 && pagination.currentPage > 3) {
                      p = pagination.currentPage - 2 + i
                      if (p > pagination.totalPages) return null
                    }
                    return (
                      <Button
                        key={p}
                        variant={pagination.currentPage === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(p)}
                        className={`text-xs px-3 py-1.5 ${
                          pagination.currentPage === p
                            ? 'font-bold'
                            : 'border-stroke dark:border-strokedark text-black dark:text-white'
                        }`}
                      >
                        {p}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === pagination.totalPages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
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

      {selectedComplaintId && (
        <ComplaintDetails
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onProvideFeedback={(id) => {
            setSelectedComplaintId(null)
            setFeedbackModalId(id)
          }}
        />
      )}

      {/* Feedback Dialog */}
      <Dialog
        open={!!feedbackModalId}
        onOpenChange={(open) => {
          if (!open) setFeedbackModalId(null)
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              Provide Feedback
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-black dark:text-white">
                Overall Rating
              </span>
              <div className="flex gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 cursor-pointer ${
                      star <= feedbackForm.rating ? 'fill-current text-amber-400' : 'text-gray-300 dark:text-gray-600'
                    }`}
                    onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Additional Remarks
              </Label>
              <textarea
                id="remarks"
                rows="3"
                value={feedbackForm.remarks}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, remarks: e.target.value })}
                placeholder="Tell us about your experience..."
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackModalId(null)}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                addFeedback(feedbackModalId, feedbackForm).then(() => {
                  toast.success('Feedback submitted successfully')
                  setFeedbackModalId(null)
                })
              }}
              className="text-xs font-bold px-4 py-2"
            >
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MyComplaints
