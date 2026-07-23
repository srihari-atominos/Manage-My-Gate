import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useComplaints } from '../hooks/useComplaints'
import ComplaintTopNav from '../components/ComplaintTopNav'
import ComplaintDetails from './ComplaintDetails'
import AssignComplaint from './AssignComplaint'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { FileDown, Search, Star, ChevronLeft, ChevronRight, User } from 'lucide-react'
import toast from 'react-hot-toast'
import '../styles/_complaints.scss'

const ComplaintManagement = () => {
  const navigate = useNavigate()

  const [filterParams, setFilterParams] = useState({
    page: 1,
    limit: 10,
    search: '',
    status: '',
    priority: '',
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

  const { complaints, pagination, isLoading } = useComplaints(activeFilters)
  const authUser = useSelector((state) => state.auth?.user || {})
  const userRole = authUser.role || 'Resident'

  const handleExport = () => {
    if (!complaints || complaints.length === 0) {
      toast.error('No records to export')
      return
    }
    const wb = XLSX.utils.book_new()
    const data = [
      ['Ticket ID', 'Title', 'Category', 'Status', 'Priority', 'Assigned To', 'Date Submitted'],
    ]
    complaints.forEach((c) => {
      data.push([
        c.complaintNumber || 'N/A',
        c.title || 'N/A',
        c.category || 'N/A',
        c.status || 'N/A',
        c.priority || 'N/A',
        c.assignedTechnicianName || 'Unassigned',
        new Date(c.createdAt).toLocaleDateString(),
      ])
    })
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints Management')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, 'complaints_management.xlsx')
  }

  const [filter, setFilter] = useState('All Statuses')
  const [priorityFilter, setPriorityFilter] = useState('All Priorities')
  const [search, setSearch] = useState('')
  const [selectedComplaintId, setSelectedComplaintId] = useState(null)
  const [assigningComplaintId, setAssigningComplaintId] = useState(null)
  const [showRatingsModal, setShowRatingsModal] = useState(false)

  const ratedComplaints =
    complaints?.filter(
      (c) => c.feedback?.rating || c.feedback?.overallRating || c.category === 'Feedback',
    ) || []

  const filteredComplaints =
    complaints?.filter((c) => {
      if (c.status === 'Cancelled') return false
      return true
    }) || []

  const handleStatusFilter = (value) => {
    setFilter(value)
    setFilterParams((prev) => ({ ...prev, page: 1, status: value === 'All Statuses' ? '' : value }))
  }

  const handlePriorityFilter = (value) => {
    setPriorityFilter(value)
    setFilterParams((prev) => ({
      ...prev,
      page: 1,
      priority: value === 'All Priorities' ? '' : value,
    }))
  }

  const handleSearchChange = (value) => {
    setSearch(value)
    setFilterParams((prev) => ({ ...prev, page: 1, search: value }))
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
        {/* Title and Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">Complaint Management</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Admin console for overseeing housing complaints and assigning staff
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1.5"
            >
              <FileDown className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowRatingsModal(true)}
              className="text-xs font-bold px-4 py-2 flex items-center gap-1.5"
            >
              <Star className="h-4 w-4" />
              View All Feedback
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <Input
              type="text"
              placeholder="Search ID, subject, or resident..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="text-xs bg-white dark:bg-meta-4 border-stroke dark:border-strokedark text-black dark:text-white pr-8 py-1.5"
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-lg border border-stroke bg-transparent py-2 px-4 text-xs outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white font-medium"
              value={filter}
              onChange={(e) => handleStatusFilter(e.target.value)}
            >
              <option value="All Statuses" className="bg-white dark:bg-boxdark">All Statuses</option>
              <option value="Submitted" className="bg-white dark:bg-boxdark">Submitted</option>
              <option value="Assigned" className="bg-white dark:bg-boxdark">Assigned</option>
              <option value="Waiting For Acceptance" className="bg-white dark:bg-boxdark">Waiting For Acceptance</option>
              <option value="In Progress" className="bg-white dark:bg-boxdark">In Progress</option>
              <option value="Waiting For Resident Confirmation" className="bg-white dark:bg-boxdark">Waiting For Confirmation</option>
              <option value="Resolved" className="bg-white dark:bg-boxdark">Resolved</option>
              <option value="Closed" className="bg-white dark:bg-boxdark">Closed</option>
              <option value="Escalated" className="bg-white dark:bg-boxdark">Escalated</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="rounded-xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 dark:bg-meta-4/40 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">ID</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Subject & Location</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Category</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">SLA Priority</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white">Assignee</th>
                  <th className="py-3 px-5 font-semibold text-black dark:text-white text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {filteredComplaints.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-gray-400 dark:text-gray-500">
                      No tickets match criteria.
                    </td>
                  </tr>
                )}
                {filteredComplaints.map((c) => {
                  let statusVariant = 'lightSecondary'
                  if (['Submitted', 'Open'].includes(c.status)) statusVariant = 'lightError'
                  else if (['In Progress', 'Assigned'].includes(c.status)) statusVariant = 'lightWarning'
                  else if (['Resolved', 'Closed'].includes(c.status)) statusVariant = 'lightSuccess'
                  else if (['Cancelled', 'Rejected'].includes(c.status)) statusVariant = 'lightSecondary'

                  let priorityVariant = 'lightSecondary'
                  if (c.priority === 'Critical') priorityVariant = 'lightError'
                  else if (c.priority === 'High') priorityVariant = 'lightWarning'
                  else if (c.priority === 'Medium') priorityVariant = 'lightInfo'

                  return (
                    <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-meta-4/10">
                      <td className="py-3 px-5">
                        <span
                          className="font-bold text-primary hover:underline cursor-pointer"
                          onClick={() => setSelectedComplaintId(c._id)}
                        >
                          {c.complaintNumber}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-bold text-black dark:text-white">{c.title}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {c.location?.flat || ''}{' '}
                          {c.location?.building ? `(${c.location.building})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-300">{c.category}</td>
                      <td className="py-3 px-5">
                        <Badge variant={priorityVariant} className="text-[10px] px-2 py-0.5 font-bold">
                          {c.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-5">
                        <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 font-bold">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-300">
                        {c.assignedTechnicianName ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                              {c.assignedTechnicianName.charAt(0)}
                            </div>
                            <span className="font-medium text-black dark:text-white">
                              {c.assignedTechnicianName}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-gray-400 dark:text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <Button
                          variant="default"
                          size="sm"
                          disabled={!['Submitted', 'Open', 'Waiting For Assignment'].includes(c.status)}
                          onClick={() => setAssigningComplaintId(c._id)}
                          className="text-xs font-semibold px-3 py-1"
                        >
                          Assign
                        </Button>
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

      {/* Ratings Modal */}
      <Dialog
        open={showRatingsModal}
        onOpenChange={(open) => {
          if (!open) setShowRatingsModal(false)
        }}
      >
        <DialogContent className="max-w-2xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              All Resident Ratings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {ratedComplaints.length === 0 ? (
              <div className="text-center text-gray-400 dark:text-gray-500 py-6">
                No ratings have been submitted yet.
              </div>
            ) : (
              ratedComplaints.map((c) => (
                <div
                  key={c._id}
                  className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark"
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="lightPrimary" className="text-[10px] px-2 py-0.5 font-bold">
                          {c.complaintNumber}
                        </Badge>
                        <span className="font-semibold text-black dark:text-white">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <User className="h-3 w-3" />
                        <span>
                          {c.residentName ||
                            (c.residentId && c.residentId.username) ||
                            'Unknown Resident'}{' '}
                          {c.location?.flat ? ` • Flat ${c.location.flat}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 text-amber-400 shrink-0">
                      {c.category !== 'Feedback' ? (
                        [...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < (c.feedback?.overallRating || c.feedback?.rating || 0)
                                ? 'fill-current'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))
                      ) : (
                        <Badge variant="lightSecondary" className="text-[10px] px-2 py-0.5 font-bold">
                          General Feedback
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(c.feedback?.remarks || c.category === 'Feedback') && (
                    <div className="rounded-lg bg-gray-50 dark:bg-meta-4/20 p-3 text-xs text-black dark:text-white border-l-4 border-primary">
                      &ldquo;{c.feedback?.remarks || c.description}&rdquo;
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRatingsModal(false)}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Close
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

      {assigningComplaintId && (
        <AssignComplaint
          complaint={complaints?.find((c) => c._id === assigningComplaintId)}
          onCancel={() => setAssigningComplaintId(null)}
          onAssigned={() => setAssigningComplaintId(null)}
        />
      )}
    </div>
  )
}

export default ComplaintManagement
