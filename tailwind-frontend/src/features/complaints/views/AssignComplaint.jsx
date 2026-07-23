import React, { useState, useEffect } from 'react'
import { useComplaints } from '../hooks/useComplaints'
import apiClient from '../../../services/apiClient.js'
import { toast } from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Button } from 'src/components/ui/button'
import { Label } from 'src/components/ui/label'
import { Input } from 'src/components/ui/input'
import { Checkbox } from 'src/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from 'src/components/ui/radio-group'
import { Badge } from 'src/components/ui/badge'
import {
  X,
  FileCheck,
  ChevronDown,
  Phone,
  Building,
  Wrench,
  Calendar,
  Clock,
  ArrowRight,
  Eye,
  Download,
  AlertCircle,
} from 'lucide-react'
import '../styles/_complaints.scss'

const AssignComplaint = ({ complaint, onAssigned, onCancel }) => {
  const { assignComplaint, assignLoading, complaints } = useComplaints()

  const [assignmentType, setAssignmentType] = useState('broadcast')
  const [techniciansList, setTechniciansList] = useState([])
  const [isFetchingTechs, setIsFetchingTechs] = useState(true)

  const [enlargedImage, setEnlargedImage] = useState(null)
  const [form, setForm] = useState({
    technicianId: '',
    technicianIds: [],
    temporaryAssigneeName: '',
    phoneNumber: '',
    companyName: '',
    specialization: '',
    expectedVisit: 'Immediately',
    customVisitDate: '',
    customVisitTime: '',
    adminInstructions: '',
    internalNotes: '',
    reassignmentReason: '',
  })

  useEffect(() => {
    setIsFetchingTechs(true)
    apiClient
      .get('/technicians')
      .then((res) => {
        const activeTechs = res?.data || []
        setTechniciansList(activeTechs.filter((t) => t.status === 'Active'))
      })
      .catch((err) => {
        console.error('Failed to fetch technicians:', err)
        toast.error('Failed to load staff list')
      })
      .finally(() => {
        setIsFetchingTechs(false)
      })
  }, [])

  const getAvailability = (techId) => {
    const activeComplaints = complaints.filter(
      (c) =>
        c.assignedTechnicianId === techId &&
        ['Assigned', 'In Progress', 'Accepted'].includes(c.status),
    )
    return activeComplaints.length > 0 ? 'Busy' : 'Available'
  }

  const getVisitDate = () => {
    const now = new Date()
    if (
      form.expectedVisit === 'Today' ||
      form.expectedVisit === 'Immediately' ||
      form.expectedVisit === 'Within 1 Hour'
    ) {
      return now.toISOString().split('T')[0]
    } else if (form.expectedVisit === 'Tomorrow') {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    } else if (form.expectedVisit === 'Custom Date & Time') {
      return form.customVisitDate
    }
    return ''
  }

  const getVisitTime = () => {
    if (form.expectedVisit === 'Custom Date & Time') {
      return form.customVisitTime
    }
    return form.expectedVisit
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    let finalAdminInstructions = form.adminInstructions
    let preferredVisitDate = getVisitDate()
    let preferredVisitTime = getVisitTime()

    const payload = {
      preferredVisitDate,
      preferredVisitTime,
      reassignmentReason: form.reassignmentReason,
    }

    if (assignmentType === 'broadcast') {
      if (!form.technicianIds || form.technicianIds.length === 0) {
        toast.error('Please select at least one staff member to broadcast to')
        return
      }
      payload.technicianIds = form.technicianIds
      payload.assignmentType = 'broadcast'
    } else if (assignmentType === 'staff') {
      if (!form.technicianId) {
        toast.error('Please select an existing staff member')
        return
      }
      payload.technicianId = form.technicianId
      payload.assignmentType = 'staff'
      const selectedTech = techniciansList.find((t) => t._id === form.technicianId)
      payload.technicianName = selectedTech ? selectedTech.name : ''
      payload.vendor = selectedTech?.type === 'External' ? 'External Vendor' : 'In-House'
      payload.instructions = finalAdminInstructions
    } else {
      if (!form.temporaryAssigneeName) {
        toast.error('Temporary Assignee Name is required')
        return
      }
      const phoneRegex = /^[0-9+\s-]{10,15}$/
      if (!form.phoneNumber || !phoneRegex.test(form.phoneNumber)) {
        toast.error('Please enter a valid Phone Number')
        return
      }
      payload.technicianId = null
      payload.technicianName = form.temporaryAssigneeName
      payload.vendor = 'Temporary Vendor'
      payload.assignmentType = 'vendor'

      const extraInfo = `\n[Temporary Vendor Details]\nPhone: ${form.phoneNumber}${form.companyName ? `\nCompany: ${form.companyName}` : ''}${form.specialization ? `\nSpecialization: ${form.specialization}` : ''}`
      payload.adminInstructions = finalAdminInstructions + extraInfo
    }

    try {
      await assignComplaint(complaint._id, payload)
      toast.success('Technician assigned successfully')
      if (onAssigned) onAssigned()
    } catch (error) {
      toast.error(error?.message || 'Failed to assign technician')
    }
  }

  const selectedTechName =
    assignmentType === 'staff'
      ? techniciansList.find((t) => t._id === form.technicianId)?.name || 'Not Selected'
      : form.temporaryAssigneeName || 'Not Entered'

  const selectedTechDept =
    assignmentType === 'staff'
      ? techniciansList.find((t) => t._id === form.technicianId)?.department || 'N/A'
      : form.specialization || 'N/A'

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
            Assign Technician
          </DialogTitle>
        </DialogHeader>

        <form id="assignForm" onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Assignment Type Selector */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-black dark:text-white select-none">
              <input
                type="radio"
                name="assignmentType"
                checked={assignmentType === 'broadcast'}
                onChange={() => setAssignmentType('broadcast')}
                className="h-4.5 w-4.5 accent-primary"
              />
              Request Assignee
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-black dark:text-white select-none">
              <input
                type="radio"
                name="assignmentType"
                checked={assignmentType === 'vendor'}
                onChange={() => setAssignmentType('vendor')}
                className="h-4.5 w-4.5 accent-primary"
              />
              Assign Temporary Vendor
            </label>
          </div>

          <div className="h-px bg-stroke dark:bg-strokedark -mx-6" />

          {/* Form Fields based on Assignment Type */}
          {assignmentType === 'broadcast' ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Select Multiple Staff to Request <span className="text-danger">*</span>
              </Label>
              {isFetchingTechs ? (
                <div className="h-20 w-full bg-slate-100 dark:bg-meta-4 animate-pulse rounded-lg" />
              ) : (
                <div className="max-h-48 overflow-y-auto border border-stroke dark:border-strokedark rounded-lg p-2 divide-y divide-stroke dark:divide-strokedark">
                  {techniciansList.map((t) => {
                    const status = getAvailability(t._id)
                    const statusText = status === 'Available' ? '✅ Available' : '🔴 Busy'
                    const isChecked = form.technicianIds.includes(t._id)
                    return (
                      <label
                        key={t._id}
                        className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer select-none transition-colors ${
                          isChecked ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-meta-4/20'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm({ ...form, technicianIds: [...form.technicianIds, t._id] })
                            } else {
                              setForm({
                                ...form,
                                technicianIds: form.technicianIds.filter((id) => id !== t._id),
                              })
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-black dark:text-white truncate">
                            {t.name}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {t.department} - {statusText}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="temp-name" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Vendor Name <span className="text-danger">*</span>
                </Label>
                <Input
                  id="temp-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.temporaryAssigneeName}
                  onChange={(e) => setForm({ ...form, temporaryAssigneeName: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="temp-phone" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Phone Number <span className="text-danger">*</span>
                </Label>
                <Input
                  id="temp-phone"
                  type="text"
                  placeholder="+91 00000 00000"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="temp-company" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Company Name (Optional)
                </Label>
                <Input
                  id="temp-company"
                  type="text"
                  placeholder="e.g. QuickFix Services"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="temp-spec" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Specialization
                </Label>
                <select
                  id="temp-spec"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
                >
                  <option value="" className="bg-white dark:bg-boxdark">-- Select --</option>
                  <option value="Plumber" className="bg-white dark:bg-boxdark">Plumber</option>
                  <option value="Electrician" className="bg-white dark:bg-boxdark">Electrician</option>
                  <option value="Carpenter" className="bg-white dark:bg-boxdark">Carpenter</option>
                  <option value="Painter" className="bg-white dark:bg-boxdark">Painter</option>
                  <option value="Lift Technician" className="bg-white dark:bg-boxdark">Lift Technician</option>
                  <option value="Gardener" className="bg-white dark:bg-boxdark">Gardener</option>
                  <option value="Cleaning Service" className="bg-white dark:bg-boxdark">Cleaning Service</option>
                  <option value="Other" className="bg-white dark:bg-boxdark">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Expected Visit Time */}
          <div className="space-y-1.5">
            <Label htmlFor="expected-visit" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Expected Visit Time (Optional)
            </Label>
            <div className="flex flex-wrap md:flex-nowrap gap-3">
              <select
                id="expected-visit"
                value={form.expectedVisit}
                onChange={(e) =>
                  setForm({ ...form, expectedVisit: e.target.value, customVisitDate: '', customVisitTime: '' })
                }
                className="flex-1 min-w-[150px] rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 text-black dark:text-white"
              >
                <option value="Immediately" className="bg-white dark:bg-boxdark">Immediately</option>
                <option value="Within 1 Hour" className="bg-white dark:bg-boxdark">Within 1 Hour</option>
                <option value="Today" className="bg-white dark:bg-boxdark">Today</option>
                <option value="Tomorrow" className="bg-white dark:bg-boxdark">Tomorrow</option>
                <option value="Custom Date & Time" className="bg-white dark:bg-boxdark">Custom Date & Time</option>
              </select>

              {form.expectedVisit === 'Custom Date & Time' && (
                <>
                  <Input
                    type="date"
                    value={form.customVisitDate}
                    onChange={(e) => setForm({ ...form, customVisitDate: e.target.value })}
                    required
                    className="flex-1 text-xs"
                  />
                  <Input
                    type="time"
                    value={form.customVisitTime}
                    onChange={(e) => setForm({ ...form, customVisitTime: e.target.value })}
                    required
                    className="flex-1 text-xs"
                  />
                </>
              )}
            </div>
          </div>

          {/* Reassignment Reason */}
          {(complaint?.assignedTechnicianId || complaint?.vendor) && (
            <div className="space-y-1.5">
              <Label htmlFor="reassign-reason" className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Reassignment Reason <span className="text-danger">*</span>
              </Label>
              <Input
                id="reassign-reason"
                type="text"
                placeholder="Enter reason for reassignment..."
                value={form.reassignmentReason}
                onChange={(e) => setForm({ ...form, reassignmentReason: e.target.value })}
                required
                className="text-xs"
              />
            </div>
          )}

          {/* Admin Instructions */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              <Label htmlFor="instructions">Admin Instructions (Optional)</Label>
              <span className={form.adminInstructions.length > 500 ? 'text-danger' : 'text-gray-400'}>
                {form.adminInstructions.length}/500
              </span>
            </div>
            <textarea
              id="instructions"
              rows="3"
              maxLength="500"
              placeholder="Example: Please call the resident before entering the apartment..."
              value={form.adminInstructions}
              onChange={(e) => setForm({ ...form, adminInstructions: e.target.value })}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-20"
            />
          </div>

          {/* Uploaded Attachments */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Uploaded Attachments</Label>
            {complaint?.attachments && complaint.attachments.length > 0 ? (
              <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/20">
                {complaint.attachments.map((att, index) => {
                  const fileUrl = typeof att === 'string' ? att : att.url
                  const isImage = fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)
                  return (
                    <div
                      key={index}
                      className="relative w-16 h-16 rounded-md border border-stroke overflow-hidden bg-white dark:border-strokedark dark:bg-boxdark flex items-center justify-center shrink-0"
                    >
                      {isImage ? (
                        <img
                          src={fileUrl}
                          alt={`Attachment ${index + 1}`}
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
                            className="text-primary hover:underline"
                          >
                            View
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="border border-dashed border-stroke dark:border-strokedark rounded-lg p-5 text-center text-xs text-gray-400 dark:text-gray-500">
                No Attachments Uploaded
              </div>
            )}
          </div>

          {/* Assignment Summary */}
          <div className="rounded-xl border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-meta-4/20">
            <h5 className="text-xs font-bold text-black dark:text-white mb-3">Assignment Summary</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] text-gray-600 dark:text-gray-400 font-medium">
              <div>
                <span className="text-gray-400 dark:text-gray-500 block mb-0.5">Complaint ID & Priority</span>
                <span className="font-bold text-black dark:text-white flex items-center gap-1.5">
                  {complaint?.complaintNumber}
                  <Badge
                    variant={complaint?.priority === 'Critical' ? 'lightError' : 'lightSecondary'}
                    className="text-[9px] px-1.5 py-0 font-bold"
                  >
                    {complaint?.priority || 'Medium'}
                  </Badge>
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block mb-0.5">Resident & Unit</span>
                <span className="font-bold text-black dark:text-white">
                  {complaint?.residentName || 'Resident'} -{' '}
                  {complaint?.location?.tower ? `${complaint.location.tower}, ` : ''}
                  {complaint?.location?.flat || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block mb-0.5">Category & Dept</span>
                <span className="font-bold text-black dark:text-white flex items-center gap-1">
                  {complaint?.category}
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  {selectedTechDept}
                </span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 block mb-0.5">Assignee</span>
                <span className="font-bold text-black dark:text-white flex items-center gap-1">
                  {selectedTechName}
                  <span className="text-primary font-semibold text-[9px]">
                    ({assignmentType === 'staff' ? 'Existing Staff' : 'Temp Vendor'})
                  </span>
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-400 dark:text-gray-500 block mb-0.5">Expected Visit Time</span>
                <span className="font-bold text-black dark:text-white">
                  {form.expectedVisit === 'Custom Date & Time'
                    ? `${form.customVisitDate} at ${form.customVisitTime}`
                    : form.expectedVisit}
                </span>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={assignLoading}
            className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="assignForm"
            disabled={assignLoading}
            size="sm"
            className="text-xs font-bold px-4 py-2 flex items-center gap-1.5"
          >
            {assignLoading && <Clock className="h-4 w-4 animate-spin" />}
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>

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
    </Dialog>
  )
}

export default AssignComplaint
