import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useComplaints } from '../hooks/useComplaints'
import toast from 'react-hot-toast'
import AssignComplaint from './AssignComplaint'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Label } from 'src/components/ui/label'
import { Checkbox } from 'src/components/ui/checkbox'
import {
  X,
  Printer,
  ChevronDown,
  Phone,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  Download,
  AlertTriangle,
  ChevronRight,
  Check,
  User,
  Star,
  FileCheck,
} from 'lucide-react'
import '../styles/_complaints.scss'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('ComplaintDetails ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open={true} onOpenChange={this.props.onClose}>
          <DialogContent className="max-w-2xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-danger pb-2 border-b border-stroke dark:border-strokedark flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-xs">
              <p className="font-bold text-black dark:text-white">
                {this.state.error && this.state.error.toString()}
              </p>
              <pre className="p-3 bg-gray-50 dark:bg-meta-4/20 rounded font-mono overflow-auto max-h-48 text-[10px]">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
            <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4">
              <Button variant="outline" size="sm" onClick={() => this.props.onClose()}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
    }
    return this.props.children
  }
}

const ComplaintDetails = ({ complaintId, onClose, onProvideFeedback }) => {
  const {
    currentComplaint: complaint,
    isDetailsLoading,
    loadComplaintDetails,
    addComment,
    updateStatus,
    assignTechnician,
    cancelComplaint,
    reopenComplaint,
    confirmCompletion,
  } = useComplaints({}, { disableAutoFetch: true })

  const authUser = useSelector((state) => state.auth?.user || {})
  const userRole = authUser.role || 'Resident'

  const [localLoading, setLocalLoading] = useState(true)

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [enlargedImage, setEnlargedImage] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isInternalComment, setIsInternalComment] = useState(false)
  const [assignmentType, setAssignmentType] = useState('staff')
  const [assignForm, setAssignForm] = useState({
    technicianId: '',
    technicianName: '',
    temporaryName: '',
    temporaryPhone: '',
    adminInstructions: '',
  })
  const [updateForm, setUpdateForm] = useState({ status: '', remarks: '', priority: '' })
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    overallRating: 5,
    technicianRating: 5,
    serviceRating: 5,
    cleanlinessRating: 5,
    communicationRating: 5,
    remarks: '',
  })

  const handlePrint = () => {
    window.print()
  }

  const handleEscalate = async () => {
    try {
      await updateStatus(complaintId, { status: 'Escalated', remarks: 'Escalated by administrator' })
      toast.success('Complaint escalated')
    } catch (err) {
      toast.error('Failed to escalate complaint')
    }
  }

  useEffect(() => {
    if (complaintId) {
      setLocalLoading(true)
      loadComplaintDetails(complaintId)
        .catch((err) => {
          toast.error('Failed to load complaint details')
        })
        .finally(() => {
          setLocalLoading(false)
        })
    }
  }, [complaintId])

  useEffect(() => {
    if (complaint) {
      setUpdateForm({ status: complaint.status, remarks: '', priority: complaint.priority || 'Medium' })
    }
  }, [complaint])

  const formatDate = (dateString) => {
    const d = new Date(dateString)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getWorkflowStepIndex = (status) => {
    if (['Closed', 'Completed'].includes(status)) return 4
    if (['Resolved', 'Work Completed', 'Waiting For Resident Confirmation'].includes(status)) return 3
    if (status === 'In Progress') return 2
    if (['Assigned', 'Accepted'].includes(status)) return 1
    return 0 // Submitted/Open/Waiting For Assignment
  }

  const renderWorkflowFlow = () => {
    if (complaint.status === 'Cancelled') {
      const steps = [
        { label: 'Submitted', isCompleted: true },
        { label: 'Cancelled', isActive: true, isError: true },
      ]
      return renderSteps(steps)
    }
    if (complaint.status === 'Rejected') {
      const steps = [
        { label: 'Submitted', isCompleted: true },
        { label: 'Rejected', isActive: true, isError: true },
      ]
      return renderSteps(steps)
    }
    if (complaint.vendor === 'Temporary Vendor' || complaint.vendor === 'External Vendor') {
      const getTempVendorIndex = (s) => {
        if (['Closed', 'Completed', 'Resolved'].includes(s)) return 2
        if (['Assigned', 'In Progress'].includes(s)) return 1
        return 0
      }
      const idx = getTempVendorIndex(complaint.status)
      const tempSteps = [
        { label: 'Submitted', isCompleted: idx > 0, isActive: idx === 0 },
        { label: 'Assigned', isCompleted: idx > 1, isActive: idx === 1 },
        { label: 'Closed', isCompleted: idx > 2, isActive: idx === 2 },
      ]
      return renderSteps(tempSteps)
    }

    const currentStepIndex = getWorkflowStepIndex(complaint.status)
    const steps = [
      { label: 'Submitted', isCompleted: currentStepIndex > 0, isActive: currentStepIndex === 0 },
      { label: 'Assigned', isCompleted: currentStepIndex > 1, isActive: currentStepIndex === 1 },
      { label: 'In Progress', isCompleted: currentStepIndex > 2, isActive: currentStepIndex === 2 },
      { label: 'Resolved', isCompleted: currentStepIndex > 3, isActive: currentStepIndex === 3 },
      { label: 'Closed', isCompleted: currentStepIndex > 4, isActive: currentStepIndex === 4 },
    ]
    return renderSteps(steps)
  }

  const renderSteps = (steps) => {
    return (
      <div className="flex flex-col mt-3 space-y-4">
        {steps.map((step, idx) => {
          let circleBg = 'bg-gray-100 dark:bg-meta-4'
          let circleColor = 'text-gray-400 dark:text-gray-500'
          let circleBorder = 'border-stroke dark:border-strokedark'

          if (step.isCompleted) {
            circleBg = 'bg-success'
            circleColor = 'text-white'
            circleBorder = 'border-success'
          } else if (step.isActive) {
            if (step.isError) {
              circleBg = 'bg-danger'
              circleColor = 'text-white'
              circleBorder = 'border-danger'
            } else {
              circleBg = 'bg-primary'
              circleColor = 'text-white'
              circleBorder = 'border-primary'
            }
          }

          return (
            <div key={idx} className="flex relative items-center gap-3">
              {idx !== steps.length - 1 && (
                <div
                  className={`absolute left-3 top-6 bottom-[-22px] w-0.5 z-0 ${
                    step.isCompleted ? 'bg-success' : 'bg-stroke dark:bg-strokedark'
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-6.5 w-6.5 items-center justify-center rounded-full border text-[10px] font-bold shrink-0 ${circleBg} ${circleColor} ${circleBorder}`}
              >
                {step.isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>

              <div className="flex flex-col justify-center min-w-0">
                <span
                  className={`text-xs font-bold truncate ${
                    step.isActive
                      ? step.isError
                        ? 'text-danger'
                        : 'text-primary'
                      : step.isCompleted
                        ? 'text-black dark:text-white'
                        : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                {step.isActive && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    {step.isError ? 'Request Terminated' : 'Current Stage'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      await addComment(complaintId, { remarks: newComment, attachments: [], isInternal: isInternalComment })
      setNewComment('')
      setIsInternalComment(false)
      toast.success('Comment added')
    } catch (err) {
      toast.error('Failed to add comment')
    }
  }

  const handleUpdateStatus = async () => {
    try {
      await updateStatus(complaintId, updateForm)
      setShowUpdateModal(false)
      toast.success('Status updated')
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (isDetailsLoading || localLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-12 text-center rounded-lg shadow-default">
          <h3 className="text-sm font-bold text-black dark:text-white">Loading Details...</h3>
        </DialogContent>
      </Dialog>
    )
  }

  if (!complaint) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-8 text-center rounded-lg shadow-default">
          <h3 className="text-sm font-bold text-black dark:text-white mb-2">Ticket Not Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            We couldn't find the details for this ticket.
          </p>
          <Button variant="default" size="sm" onClick={onClose} className="font-bold">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <ErrorBoundary onClose={onClose}>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto print-section">
          {/* Header */}
          <DialogHeader className="pb-4 border-b border-stroke dark:border-strokedark">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-base font-bold text-black dark:text-white">
                  Ticket {complaint.complaintNumber}
                </DialogTitle>
                <Badge
                  variant={
                    ['Resolved', 'Closed'].includes(complaint.status)
                      ? 'lightSuccess'
                      : ['In Progress', 'Assigned'].includes(complaint.status)
                        ? 'lightWarning'
                        : 'lightError'
                  }
                  className="text-[10px] font-bold px-2 py-0.5"
                >
                  {complaint.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 pr-6">
                {['Admin', 'FacilityManager', 'Manager', 'Super Admin'].includes(userRole) && (
                  <>
                    {!['Cancelled', 'Closed', 'Resolved'].includes(complaint.status) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowUpdateModal(true)}
                          className="text-xs font-semibold px-3 py-1.5 h-8 border-stroke dark:border-strokedark text-black dark:text-white"
                        >
                          Update Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEscalate}
                          className="text-xs font-semibold px-3 py-1.5 h-8 border-stroke dark:border-strokedark text-black dark:text-white"
                        >
                          Escalate
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="text-xs font-semibold px-3 py-1.5 h-8 border-stroke dark:border-strokedark text-black dark:text-white flex items-center gap-1"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    {!['Cancelled', 'Closed', 'Resolved'].includes(complaint.status) && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowAssignModal(true)}
                        className="text-xs font-bold px-3 py-1.5 h-8"
                      >
                        Assign Technician
                      </Button>
                    )}
                  </>
                )}

                {(['Admin', 'FacilityManager', 'Manager', 'Super Admin'].includes(userRole) &&
                  ['Submitted', 'Open', 'Assigned', 'In Progress'].includes(complaint.status)) ||
                (userRole?.toLowerCase() === 'resident' &&
                  ['Submitted', 'Open', 'Assigned'].includes(complaint.status)) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const reason = prompt('Reason for cancellation:')
                      if (reason) {
                        cancelComplaint(complaintId, reason).then(() =>
                          toast.success('Complaint Cancelled'),
                        )
                      }
                    }}
                    className="text-xs font-semibold h-8 text-danger hover:bg-danger/10"
                  >
                    Cancel Request
                  </Button>
                ) : null}

                {userRole?.toLowerCase() === 'resident' &&
                  ['Resolved', 'Waiting For Resident Confirmation'].includes(complaint.status) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Reason for reopening:')
                          if (reason) {
                            reopenComplaint(complaintId, reason).then(() =>
                              toast.success('Complaint Reopened'),
                            )
                          }
                        }}
                        className="text-xs font-semibold h-8 border-stroke dark:border-strokedark text-black dark:text-white"
                      >
                        Reopen
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowFeedbackModal(true)}
                        className="text-xs font-bold h-8 bg-success hover:bg-success/90 border-0 text-white"
                      >
                        Confirm Completion
                      </Button>
                    </>
                  )}
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-2">
            {/* Left Column (Main description and timeline) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h3 className="text-sm font-bold text-black dark:text-white mb-2">
                  {complaint.title || complaint.subject}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {complaint.description}
                </p>

                {complaint.attachments && complaint.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-stroke dark:border-strokedark">
                    <h4 className="text-2xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Attached Files
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {complaint.attachments.map((att, i) => {
                        const fileUrl = typeof att === 'string' ? att : att.url
                        const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)
                        return (
                          <div
                            key={i}
                            className="relative w-16 h-16 rounded-md border border-stroke overflow-hidden bg-gray-50 dark:border-strokedark dark:bg-boxdark flex items-center justify-center shrink-0"
                          >
                            {isImage ? (
                              <img
                                src={fileUrl}
                                alt={`Attachment ${i + 1}`}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setEnlargedImage(fileUrl)}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-1 text-[10px] text-gray-400">
                                <Eye className="h-4 w-4 text-gray-400 mb-1" />
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline font-medium"
                                >
                                  View
                                </a>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h3 className="text-xs font-bold text-black dark:text-white mb-6 uppercase tracking-wider">
                  Activity & Updates
                </h3>

                <div className="relative space-y-6 ps-8">
                  {complaint.timeline
                    ?.filter((evt) => !evt.isInternal || userRole !== 'Resident')
                    .map((evt, idx) => (
                      <div key={idx} className="relative">
                        {idx !==
                          complaint.timeline.filter(
                            (e) => !e.isInternal || userRole !== 'Resident',
                          ).length -
                            1 && (
                          <div className="absolute start-[-25px] top-4 bottom-[-28px] w-px bg-stroke dark:bg-strokedark z-0" />
                        )}

                        {/* Dot */}
                        <div
                          className={`absolute start-[-30px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border-2 bg-white dark:bg-boxdark z-10 ${
                            evt.isInternal
                              ? 'border-warning'
                              : 'border-primary'
                          }`}
                        />

                        {/* Details */}
                        <div className="text-xs z-20">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-black dark:text-white">
                              {evt.action}
                            </span>
                            {evt.isInternal && (
                              <Badge
                                variant="lightWarning"
                                className="text-[9px] px-1.5 py-0 font-bold"
                              >
                                Internal
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">
                            {evt.userName ? `${evt.userName} (${evt.userRole})` : evt.userRole} •{' '}
                            {formatDate(evt.date || evt.timestamp || evt.createdAt || new Date())}
                          </div>
                          {evt.remarks && (
                            <p
                              className={`mt-2 p-3 rounded-lg text-gray-600 dark:text-gray-300 ${
                                evt.isInternal
                                  ? 'bg-warning/5 dark:bg-warning/10 border border-dashed border-warning/30'
                                  : 'bg-gray-50 dark:bg-meta-4/20'
                              }`}
                            >
                              {evt.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Comment Box Input */}
                <div className="mt-8 pt-6 border-t border-stroke dark:border-strokedark space-y-4">
                  <textarea
                    placeholder="Type an update or comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-20"
                  />
                  <div className="flex items-center justify-between">
                    {['Admin', 'FacilityManager', 'Manager', 'Super Admin'].includes(userRole) ? (
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-500 dark:text-gray-400 select-none">
                        <Checkbox
                          checked={isInternalComment}
                          onCheckedChange={(checked) => setIsInternalComment(!!checked)}
                        />
                        Mark as Internal Note
                      </label>
                    ) : (
                      <div />
                    )}
                    <Button variant="default" size="sm" onClick={handleAddComment} className="text-xs font-bold px-4">
                      Post Update
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Ticket Info & Assignee) */}
            <div className="space-y-6">
              {/* Ticket Info Card */}
              <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
                <h3 className="text-xs font-bold text-black dark:text-white pb-3 border-b border-stroke dark:border-strokedark uppercase tracking-wider">
                  Ticket Info
                </h3>

                <div className="divide-y divide-stroke dark:divide-strokedark">
                  <div className="py-4">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                      Ticket Flow
                    </span>
                    {renderWorkflowFlow()}
                  </div>

                  <div className="py-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                        Created
                      </span>
                      <span className="text-xs font-semibold text-black dark:text-white">
                        {formatDate(complaint.createdAt)}
                      </span>
                    </div>

                    {complaint.slaDueDate && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                          Expected SLA
                        </span>
                        <span className="text-xs font-semibold text-black dark:text-white">
                          {formatDate(complaint.slaDueDate)}
                        </span>
                      </div>
                    )}

                    {complaint.resolvedAt && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                          Resolved
                        </span>
                        <span className="text-xs font-semibold text-black dark:text-white">
                          {formatDate(complaint.resolvedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 space-y-2">
                    {complaint.vendor === 'Temporary Vendor' &&
                      ['Assigned', 'In Progress'].includes(complaint.status) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            confirmCompletion(complaintId, {
                              remarks: 'Work marked as done for temporary vendor.',
                            })
                              .then(() => toast.success('Work marked as done.'))
                              .catch((e) =>
                                toast.error(e.response?.data?.message || 'Error marking as done'),
                              )
                          }}
                          className="w-full text-xs font-bold py-2 bg-success hover:bg-success/95 border-0 text-white"
                        >
                          Work Done
                        </Button>
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      className="w-full text-xs font-semibold py-2 border-stroke dark:border-strokedark text-black dark:text-white"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>

              {/* Assignee Details Card */}
              {complaint.assignedTechnicianName && (
                <div className="rounded-xl border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
                  <h3 className="text-xs font-bold text-black dark:text-white pb-3 border-b border-stroke dark:border-strokedark uppercase tracking-wider">
                    Assignee Details
                  </h3>
                  <div className="pt-3 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                        Name
                      </span>
                      <span className="text-xs font-bold text-black dark:text-white">
                        {complaint.assignedTechnicianName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-0.5">
                        Phone Number
                      </span>
                      <span className="text-xs font-semibold text-black dark:text-white">
                        {(() => {
                          if (complaint.assignedTechnicianPhone) {
                            return complaint.assignedTechnicianPhone
                          }
                          if (complaint.assignedTechnicianId?.phone) {
                            return complaint.assignedTechnicianId.phone
                          }
                          if (complaint.vendor === 'Temporary Vendor') {
                            const assignEvent = complaint.timeline?.find(
                              (t) =>
                                t.action === 'Complaint Assigned' &&
                                t.remarks?.includes('Assigned to:'),
                            )
                            if (assignEvent && assignEvent.remarks) {
                              const match = assignEvent.remarks.match(
                                /Phone:\s*([\d\+\-\(\)\s]+)/i,
                              )
                              if (match && match[1]) return match[1].trim()
                            }
                          }
                          return 'N/A'
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Resolution Details Card */}
              {['Resolved', 'Closed', 'Completed', 'Waiting For Resident Confirmation'].includes(
                complaint.status,
              ) &&
                (complaint.resolutionSummary ||
                  complaint.resolutionNotes ||
                  complaint.workDone ||
                  complaint.technicianRemarks ||
                  (complaint.workNotes && complaint.workNotes.length > 0) ||
                  (complaint.workAttachments && complaint.workAttachments.length > 0)) && (
                  <div className="rounded-xl border border-success bg-success/5 p-5 shadow-default dark:bg-success/10 space-y-4">
                    <h3 className="text-xs font-bold text-success pb-2 border-b border-success/20 uppercase tracking-wider">
                      Resolution Details
                    </h3>
                    <div className="space-y-3 text-xs leading-relaxed">
                      {complaint.resolutionSummary && (
                        <div>
                          <span className="text-[9px] font-bold text-success/80 uppercase block">
                            Resolution Summary
                          </span>
                          <span className="font-semibold text-success-dark dark:text-success">
                            {complaint.resolutionSummary}
                          </span>
                        </div>
                      )}
                      {complaint.resolutionNotes && (
                        <div>
                          <span className="text-[9px] font-bold text-success/80 uppercase block">
                            Resolution Notes
                          </span>
                          <span className="font-semibold text-success-dark dark:text-success">
                            {complaint.resolutionNotes}
                          </span>
                        </div>
                      )}
                      {complaint.workDone && (
                        <div>
                          <span className="text-[9px] font-bold text-success/80 uppercase block">
                            Work Done
                          </span>
                          <span className="font-semibold text-success-dark dark:text-success">
                            {complaint.workDone}
                          </span>
                        </div>
                      )}
                      {complaint.technicianRemarks && (
                        <div>
                          <span className="text-[9px] font-bold text-success/80 uppercase block">
                            Technician Remarks
                          </span>
                          <span className="font-semibold text-success-dark dark:text-success">
                            {complaint.technicianRemarks}
                          </span>
                        </div>
                      )}
                      {complaint.workNotes && complaint.workNotes.length > 0 && (
                        <div>
                          <span className="text-[9px] font-bold text-success/80 uppercase block mb-1">
                            Work Notes
                          </span>
                          <ul className="list-disc ps-4 space-y-1 font-medium text-success-dark dark:text-success text-[10px]">
                            {complaint.workNotes.map((note, idx) => (
                              <li key={idx}>
                                <strong>{formatDate(note.createdAt)}</strong>: {note.note} (by{' '}
                                {note.authorName})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {complaint.workAttachments && complaint.workAttachments.length > 0 && (
                        <div>
                          <span className="text-[9px] font-bold text-success/80 uppercase block mb-1.5">
                            Work Photos
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {complaint.workAttachments.map((url, i) => (
                              <div
                                key={i}
                                className="w-12 h-12 rounded border border-success/20 overflow-hidden cursor-pointer"
                                onClick={() => setEnlargedImage(url)}
                              >
                                <img
                                  src={url}
                                  alt={`Work Photo ${i + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Feedback Card */}
              {['Resolved', 'Closed', 'Completed'].includes(complaint.status) &&
                complaint.feedback && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-default dark:bg-primary/10">
                    <h3 className="text-xs font-bold text-primary pb-3 border-b border-primary/20 uppercase tracking-wider mb-3">
                      Resolution Feedback
                    </h3>
                    <div className="flex gap-0.5 text-amber-400 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= (complaint.feedback.overallRating || complaint.feedback.rating)
                              ? 'fill-current'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs italic text-gray-600 dark:text-gray-300">
                      &ldquo;{complaint.feedback.remarks}&rdquo;
                    </p>
                    {complaint.feedback.feedbackDate && (
                      <div className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mt-2">
                        Submitted: {formatDate(complaint.feedback.feedbackDate)}
                      </div>
                    )}
                  </div>
                )}

              {/* Provide Feedback Button (For Resident) */}
              {['Resolved', 'Closed', 'Completed'].includes(complaint.status) &&
                !(complaint.feedback && (complaint.feedback.overallRating || complaint.feedback.rating)) &&
                onProvideFeedback && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onProvideFeedback(complaint._id)}
                    className="w-full text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/95 text-white border-0"
                  >
                    <Star className="h-4 w-4" />
                    Provide Feedback
                  </Button>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Modal */}
      {showAssignModal && (
        <AssignComplaint
          complaint={complaint}
          onCancel={() => setShowAssignModal(false)}
          onAssigned={() => setShowAssignModal(false)}
        />
      )}

      {/* Update Status Modal */}
      {showUpdateModal && (
        <Dialog open={true} onOpenChange={(open) => !open && setShowUpdateModal(false)}>
          <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
                Update Status
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="update-status" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  New Status
                </Label>
                <select
                  id="update-status"
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  <option value="Submitted" className="bg-white dark:bg-boxdark">Submitted</option>
                  <option value="Assigned" className="bg-white dark:bg-boxdark">Assigned</option>
                  <option value="In Progress" className="bg-white dark:bg-boxdark">In Progress</option>
                  <option value="Resolved" className="bg-white dark:bg-boxdark">Resolved</option>
                  <option value="Closed" className="bg-white dark:bg-boxdark">Closed</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="update-priority" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Priority
                </Label>
                <select
                  id="update-priority"
                  value={updateForm.priority}
                  onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  <option value="Low" className="bg-white dark:bg-boxdark">Low</option>
                  <option value="Medium" className="bg-white dark:bg-boxdark">Medium</option>
                  <option value="High" className="bg-white dark:bg-boxdark">High</option>
                  <option value="Critical" className="bg-white dark:bg-boxdark">Critical</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="update-remarks" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Internal Note / Remarks
                </Label>
                <textarea
                  id="update-remarks"
                  placeholder="Reason for update..."
                  value={updateForm.remarks}
                  onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-20"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpdateModal(false)}
                className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
              >
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleUpdateStatus} className="text-xs font-bold px-4 py-2">
                Save Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Enlarged Image Lightbox */}
      {enlargedImage && (
        <Dialog open={true} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-3xl bg-black border-0 p-0 text-white overflow-hidden rounded-lg">
            <div className="relative aspect-video flex items-center justify-center">
              <img
                src={enlargedImage}
                alt="Enlarged Attachment"
                className="max-h-[70vh] object-contain"
              />
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute right-4 top-4 text-white hover:text-red-500 bg-black/40 p-1.5 rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-center">
              <a
                href={enlargedImage}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-bold bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-md"
              >
                <Download className="h-4 w-4" />
                Download Image
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Provide Feedback Modal */}
      {showFeedbackModal && (
        <Dialog open={true} onOpenChange={(open) => !open && setShowFeedbackModal(false)}>
          <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
                Provide Feedback
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {[
                { label: 'Overall Rating', key: 'overallRating' },
                { label: 'Technician Rating', key: 'technicianRating' },
                { label: 'Service Quality', key: 'serviceRating' },
                { label: 'Cleanliness', key: 'cleanlinessRating' },
                { label: 'Communication', key: 'communicationRating' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    {item.label}
                  </span>
                  <div className="flex gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 cursor-pointer ${
                          star <= feedbackForm[item.key]
                            ? 'fill-current'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                        onClick={() => setFeedbackForm({ ...feedbackForm, [item.key]: star })}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <div className="space-y-1.5 mt-2">
                <Label htmlFor="feedback-remarks" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Additional Remarks
                </Label>
                <textarea
                  id="feedback-remarks"
                  rows="3"
                  value={feedbackForm.remarks}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, remarks: e.target.value })}
                  placeholder="Tell us about your experience..."
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-20"
                />
              </div>
            </div>
            <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedbackModal(false)}
                className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  confirmCompletion(complaintId, feedbackForm).then(() => {
                    toast.success('Completed and feedback submitted')
                    setShowFeedbackModal(false)
                  })
                }}
                className="text-xs font-bold px-4 py-2 bg-success hover:bg-success/90 border-0 text-white"
              >
                Submit & Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </ErrorBoundary>
  )
}

export default ComplaintDetails
