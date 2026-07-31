import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useComplaints } from '../hooks/useComplaints'
import toast from 'react-hot-toast'
import ComplaintTopNav from '../components/ComplaintTopNav'
import { userPreferencesService } from '../services/userPreferences.service'
import { Button } from 'src/components/ui/button'
import { Badge } from 'src/components/ui/badge'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { Checkbox } from 'src/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from 'src/components/ui/dialog'
import {
  Search,
  Wrench,
  Bolt,
  Car,
  Shield,
  Brush,
  Dumbbell,
  Leaf,
  ArrowUp,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Camera,
  UploadCloud,
  File,
  X,
  AlertTriangle,
  Send,
  Flame,
  CheckCircle,
  Printer,
} from 'lucide-react'
import '../styles/_complaints.scss'

const defaultIcons = {
  Electrical: Bolt,
  Plumbing: Wrench,
  Parking: Car,
  Security: Shield,
  Housekeeping: Brush,
  Amenities: Dumbbell,
  Landscaping: Leaf,
  Elevators: ArrowUp,
}

const getCategoryIcon = (name) => defaultIcons[name] || Wrench

const CreateComplaint = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { createNewComplaint, uploadFiles, loadSettings, settings, resetErrors } = useComplaints()

  // Auto-populate from auth user
  const authUser = useSelector((state) => state.auth?.user)
  const user = {
    name: authUser?.firstName ? `${authUser.firstName} ${authUser.lastName || ''}`.trim() : 'Resident',
    id: authUser?._id || 'RES-101',
    flat: authUser?.flat || '',
    floor: authUser?.floor || '',
    block: authUser?.block || '',
    tower: authUser?.tower || '',
    building: authUser?.building || '',
    organization: authUser?.orgId || '',
    mobile: authUser?.mobile || '',
    email: authUser?.email || '',
  }

  useEffect(() => {
    loadSettings()
    return () => resetErrors()
  }, [])

  const dynamicCategories = settings?.categories?.filter((c) => c.isActive) || []

  const baseCategories =
    dynamicCategories.length > 0
      ? dynamicCategories
      : [
          { name: 'Electrical' },
          { name: 'Plumbing' },
          { name: 'Parking' },
          { name: 'Security' },
          { name: 'Housekeeping' },
          { name: 'Amenities' },
          { name: 'Landscaping' },
          { name: 'Elevators' },
        ]

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: user.name !== 'Resident' ? user.name : '',
    flat: user.flat ? `${user.block ? user.block + '-' : ''}${user.flat}` : '',
    category: '',
    department: '',
    title: '',
    description: '',
    priority: 'Medium',
    isEmergency: false,
    ignoreDuplicateWarning: false,
  })
  const [selectedFiles, setSelectedFiles] = useState([])
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false)
  const [duplicateTicketData, setDuplicateTicketData] = useState(null)
  const [customCategory, setCustomCategory] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [newTicket, setNewTicket] = useState(null)

  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      setStream(mediaStream)
      setShowCamera(true)
    } catch (err) {
      console.error('Error accessing camera:', err)
      toast.error('Could not access camera. Please check permissions.')
    }
  }

  useEffect(() => {
    if (showCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [showCamera, stream])

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
              type: 'image/jpeg',
            })
            if (selectedFiles.length < 5) {
              setSelectedFiles((prev) => [...prev, file])
            } else {
              toast.error('Maximum 5 files allowed')
            }
            stopCamera()
          }
        },
        'image/jpeg',
        0.8,
      )
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  const [showDropdown, setShowDropdown] = useState(false)
  const [focusedSuggestionIdx, setFocusedSuggestionIdx] = useState(-1)
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')

  const filteredCategories = globalSearchTerm.trim()
    ? baseCategories.filter((c) => c.name.toLowerCase().includes(globalSearchTerm.toLowerCase()))
    : baseCategories

  const displayCategories = [...filteredCategories, { name: 'Others' }]

  const activeSuggestedIssues = useMemo(() => {
    if (!formData.category) return []
    const selectedCategoryData = settings?.categories?.find((c) => c.name === formData.category)

    let issues = selectedCategoryData?.suggestedIssues
    if (!issues || issues.length === 0) {
      const mockData = {
        Plumbing: [
          { name: 'Kitchen Tap Leakage', isActive: true, usageCount: 45, isArchived: false, order: 0 },
          { name: 'Bathroom Tap Leakage', isActive: true, usageCount: 30, isArchived: false, order: 1 },
          { name: 'Flush Tank Not Working', isActive: true, usageCount: 25, isArchived: false, order: 2 },
          { name: 'Washbasin Pipe Blocked', isActive: true, usageCount: 20, isArchived: false, order: 3 },
          { name: 'Kitchen Sink Blocked', isActive: true, usageCount: 18, isArchived: false, order: 4 },
          { name: 'No Water Supply in Bathroom', isActive: true, usageCount: 15, isArchived: false, order: 5 },
        ],
        Electrical: [
          { name: 'Power Outage in Flat', isActive: true, usageCount: 50, isArchived: false, order: 0 },
          { name: 'MCB Tripping Frequently', isActive: true, usageCount: 35, isArchived: false, order: 1 },
          { name: 'Tube Light Replacement', isActive: true, usageCount: 25, isArchived: false, order: 2 },
          { name: 'Fan Regulator Not Working', isActive: true, usageCount: 20, isArchived: false, order: 3 },
          { name: 'Switch Board Sparking', isActive: true, usageCount: 15, isArchived: false, order: 4 },
        ],
        Parking: [
          { name: 'Someone Parked in My Slot', isActive: true, usageCount: 30, isArchived: false, order: 0 },
          { name: 'Unknown Vehicle in Visitor Parking', isActive: true, usageCount: 20, isArchived: false, order: 1 },
        ],
        Security: [
          { name: 'Guard Not Present at Gate', isActive: true, usageCount: 15, isArchived: false, order: 0 },
          { name: 'Unattended Delivery Package', isActive: true, usageCount: 20, isArchived: false, order: 1 },
        ],
        Housekeeping: [
          { name: 'Corridor Not Swept', isActive: true, usageCount: 35, isArchived: false, order: 0 },
          { name: 'Garbage Not Collected', isActive: true, usageCount: 50, isArchived: false, order: 1 },
        ],
        Elevators: [
          { name: 'Lift Stuck', isActive: true, usageCount: 15, isArchived: false, order: 0 },
          { name: 'Lift Making Noise', isActive: true, usageCount: 25, isArchived: false, order: 1 },
        ],
      }
      issues = mockData[formData.category] || []
    }

    const recent = userPreferencesService.getRecentlyUsedIssues(user?._id, formData.category) || []

    return issues
      .filter((issue) => issue.isActive !== false)
      .map((issue) => ({
        ...issue,
        isRecent: recent.includes(issue.name),
        isTrending:
          issue.usageCount >= (issues[0]?.usageCount || 0) && issue.usageCount > 5,
      }))
      .sort((a, b) => {
        if (a.isRecent && !b.isRecent) return -1
        if (!a.isRecent && b.isRecent) return 1
        if (a.isRecent && b.isRecent) return recent.indexOf(a.name) - recent.indexOf(b.name)
        if (b.usageCount !== a.usageCount) return (b.usageCount || 0) - (a.usageCount || 0)
        if (a.order !== b.order) return (a.order || 0) - (b.order || 0)
        return a.name.localeCompare(b.name)
      })
  }, [settings?.categories, formData.category, user?._id])

  const filteredSuggestions = useMemo(() => {
    if (!formData.title) return activeSuggestedIssues
    const lowerTitle = formData.title.toLowerCase()

    return [...activeSuggestedIssues]
      .filter((issue) => issue.name.toLowerCase().includes(lowerTitle))
      .sort((a, b) => {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        if (aName === lowerTitle && bName !== lowerTitle) return -1
        if (bName === lowerTitle && aName !== lowerTitle) return 1
        const aStarts = aName.startsWith(lowerTitle)
        const bStarts = bName.startsWith(lowerTitle)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1
        return 0
      })
  }, [activeSuggestedIssues, formData.title])

  const globalCategoryRecommendations = useMemo(() => {
    if (!globalSearchTerm || !settings?.categories) return []
    const lowerTerm = globalSearchTerm.toLowerCase()

    const scores = []
    settings.categories.forEach((cat) => {
      let score = 0
      if (cat.name.toLowerCase().includes(lowerTerm)) score += 50

      const matchIssues =
        cat.suggestedIssues?.filter(
          (i) => i.isActive !== false && i.name.toLowerCase().includes(lowerTerm),
        ) || []
      if (matchIssues.length > 0) {
        score += 30
        if (matchIssues.some((i) => i.name.toLowerCase() === lowerTerm)) score += 20
      }

      if (score > 0) {
        scores.push({ name: cat.name, score })
      }
    })

    return scores.sort((a, b) => b.score - a.score)
  }, [globalSearchTerm, settings?.categories])

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredSuggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedSuggestionIdx((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedSuggestionIdx((prev) => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedSuggestionIdx >= 0 && focusedSuggestionIdx < filteredSuggestions.length) {
        setFormData({ ...formData, title: filteredSuggestions[focusedSuggestionIdx].name })
        setShowDropdown(false)
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  useEffect(() => {
    if (formData.isEmergency) {
      setFormData((prev) => ({ ...prev, priority: 'Critical' }))
    }
  }, [formData.isEmergency])

  const submitComplaint = async (ignoreWarning = false) => {
    try {
      setIsSubmitting(true)

      let uploadedUrls = []
      if (selectedFiles.length > 0) {
        const uploadData = new FormData()
        selectedFiles.forEach((f) => uploadData.append('attachments', f))
        uploadedUrls = await uploadFiles(uploadData)
      }

      const submitData = {
        ...formData,
        category: formData.category === 'Others' ? customCategory : formData.category,
        attachments: uploadedUrls,
        location: {
          building: user?.building || '',
          tower: user?.villaBlock || user?.tower || '',
          floor: user?.floor || '',
          flat: formData.flat || user?.villaNumber || user?.flat || '',
        },
        residentName: formData.name || user?.username || user?.firstName || '',
        ignoreDuplicateWarning: ignoreWarning,
      }

      const res = await createNewComplaint(submitData)

      if (submitData.title) {
        userPreferencesService.addRecentlyUsedIssue(user?._id, submitData.category, submitData.title)
      }

      setNewTicket(res)
      setShowSuccess(true)
      setShowDuplicateWarning(false)
    } catch (err) {
      if (err?.status === 409 || err === 409 || err?.message?.includes('duplicate')) {
        setDuplicateTicketData(err?.data?.duplicateTicket || null)
        setShowDuplicateWarning(true)
      } else {
        toast.error('Failed to submit ticket')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.category) {
        toast.error('Please select a category')
        return
      }
      if (formData.category === 'Others' && !customCategory.trim()) {
        toast.error('Please specify the category')
        return
      }
    }

    if (step < 4) {
      setStep(step + 1)
    } else {
      submitComplaint(formData.ignoreDuplicateWarning)
    }
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const resetForm = () => {
    setFormData({
      name: user.name !== 'Resident' ? user.name : '',
      flat: user.flat ? `${user.block ? user.block + '-' : ''}${user.flat}` : '',
      category: '',
      department: '',
      title: '',
      description: '',
      priority: 'Medium',
      isEmergency: false,
      ignoreDuplicateWarning: false,
    })
    setSelectedFiles([])
    setStep(1)
    setShowSuccess(false)
    setNewTicket(null)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (selectedFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed')
      return
    }
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024)
    if (validFiles.length < files.length) {
      toast.error('Some files exceed the 10MB limit')
    }
    setSelectedFiles((prev) => [...prev, ...validFiles])
  }

  if (showSuccess) {
    return (
      <div>
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-section, .print-section * {
              visibility: visible;
            }
            .print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 20px;
            }
            .print-section button {
              display: none !important;
            }
          }
        `}</style>
        <ComplaintTopNav />
        <div className="mx-auto max-w-lg p-4 sm:p-6 print-section">
          <div className="rounded-xl border border-stroke bg-white p-8 shadow-default dark:border-strokedark dark:bg-boxdark text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success mx-auto mb-6">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white">Ticket Submitted</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Your request has been routed to the facility management team.
            </p>

            <Badge variant="lightPrimary" className="text-sm px-4 py-1.5 mt-6 font-bold">
              Ticket ID: #{newTicket?.complaintNumber}
            </Badge>

            <div className="rounded-lg bg-gray-50 dark:bg-meta-4/20 p-4 text-xs mt-6 space-y-3 text-left">
              <div className="flex justify-between border-b border-stroke dark:border-strokedark pb-2">
                <span className="text-gray-400 dark:text-gray-500 font-semibold">Status</span>
                <span className="font-bold text-black dark:text-white">{newTicket?.status}</span>
              </div>
              <div className="flex justify-between border-b border-stroke dark:border-strokedark pb-2">
                <span className="text-gray-400 dark:text-gray-500 font-semibold">Priority</span>
                <span className="font-bold text-black dark:text-white">{newTicket?.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500 font-semibold">Expected SLA</span>
                <span className="font-bold text-black dark:text-white">{newTicket?.expectedSLA}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <Button variant="outline" size="sm" onClick={resetForm} className="text-xs font-semibold">
                Raise Another
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/admin/complaints/my-tickets')}
                className="text-xs font-bold"
              >
                Track Request
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              className="mt-4 text-xs font-semibold text-primary flex items-center gap-1.5 mx-auto"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ComplaintTopNav />
      <div className="mx-auto max-w-xl p-4 sm:p-6">
        <h2 className="text-lg font-bold text-black dark:text-white mb-6">Raise a Ticket</h2>

        <div className="rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= s ? 'bg-primary' : 'bg-gray-100 dark:bg-meta-4'
                }`}
              />
            ))}
          </div>

          {/* Form Step 1: Category */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white">Select a Category</h3>
                <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">What kind of issue are you facing?</p>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for an issue..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className="text-xs"
                />
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                {globalSearchTerm && globalCategoryRecommendations.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark z-30 max-h-50 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
                    {globalCategoryRecommendations.map((cat, i) => {
                      const Icon = getCategoryIcon(cat.name)
                      return (
                        <div
                          key={i}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              category: cat.name,
                              department: cat.name !== 'Others' ? cat.name : '',
                            })
                            setGlobalSearchTerm('')
                          }}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-meta-4/20 text-xs text-black dark:text-white"
                        >
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{cat.name}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {displayCategories.map((c, i) => {
                  const Icon = getCategoryIcon(c.name)
                  const isSelected = formData.category === c.name
                  return (
                    <div
                      key={i}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          category: c.name,
                          department: c.name !== 'Others' ? c.name : '',
                        })
                      }
                      className={`flex flex-col items-center justify-center p-5 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                          : 'border-stroke bg-transparent text-gray-600 dark:border-strokedark dark:text-gray-300 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-meta-4/10'
                      }`}
                    >
                      <Icon className="h-7 w-7 mb-3" />
                      <span className="text-xs font-bold">{c.name}</span>
                    </div>
                  )
                })}
              </div>

              {formData.category === 'Others' && (
                <div className="space-y-1.5">
                  <Label htmlFor="custom-category" className="text-xs font-semibold">
                    Please specify category
                  </Label>
                  <Input
                    id="custom-category"
                    type="text"
                    placeholder="Enter category name..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Form Step 2: Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white">Describe the issue</h3>
                <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">Provide clear details for the maintenance team.</p>
              </div>

              <div className="space-y-1.5 relative">
                <Label htmlFor="subject" className="text-xs font-semibold">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="e.g., Kitchen tap leaking"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                    setShowDropdown(true)
                    setFocusedSuggestionIdx(-1)
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  className="text-xs pr-8"
                />
                {showDropdown && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark z-30 max-h-50 overflow-y-auto divide-y divide-stroke dark:divide-strokedark">
                    {filteredSuggestions.map((issue, idx) => (
                      <div
                        key={idx}
                        onMouseEnter={() => setFocusedSuggestionIdx(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setFormData({ ...formData, title: issue.name })
                          setShowDropdown(false)
                        }}
                        className={`px-4 py-2.5 cursor-pointer text-xs text-black dark:text-white transition-colors ${
                          focusedSuggestionIdx === idx
                            ? 'bg-slate-100 dark:bg-meta-4'
                            : 'hover:bg-slate-50 dark:hover:bg-meta-4/20'
                        }`}
                      >
                        {issue.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeSuggestedIssues.length > 0 && !formData.title && (
                <div className="space-y-2">
                  <div className="text-2xs font-semibold text-gray-500 dark:text-gray-400">
                    Top Suggested Issues
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeSuggestedIssues.slice(0, 3).map((issue, idx) => (
                      <Badge
                        key={idx}
                        variant={issue.isRecent ? 'lightPrimary' : 'outlineSecondary'}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setFormData({ ...formData, title: issue.name })
                          setShowDropdown(false)
                        }}
                        className="cursor-pointer px-3 py-1 font-semibold text-2xs flex items-center gap-1"
                      >
                        {issue.isTrending && <Flame className="h-3.5 w-3.5 fill-current text-amber-500" />}
                        {issue.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-semibold">
                  Detailed Description (Optional)
                </Label>
                <textarea
                  id="description"
                  placeholder="Please describe the problem, exact location, and when it started..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical min-h-24"
                />
              </div>
            </div>
          )}

          {/* Form Step 3: Attachments */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white">Upload Supporting Images</h3>
                <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">Visuals help our team resolve issues faster. (Optional)</p>
              </div>

              <div className="flex gap-4">
                <input
                  type="file"
                  id="fileUploadGallery"
                  multiple
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,video/mp4,video/webm"
                  className="hidden"
                />
                <label
                  htmlFor="fileUploadGallery"
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stroke dark:border-strokedark rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary cursor-pointer p-6 transition-all"
                >
                  <UploadCloud className="h-7 w-7 text-gray-400 mb-2" />
                  <b className="text-xs text-black dark:text-white">Gallery Upload</b>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Images, PDF, Docs, Video</span>
                </label>

                <div
                  onClick={startCamera}
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-stroke dark:border-strokedark rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary cursor-pointer p-6 transition-all"
                >
                  <Camera className="h-7 w-7 text-gray-400 mb-2" />
                  <b className="text-xs text-black dark:text-white">Take Photo</b>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Use Device Camera</span>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {selectedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="relative flex items-center gap-2 rounded-lg border border-stroke p-3 bg-gray-50 dark:border-strokedark dark:bg-meta-4/20"
                    >
                      <File className="h-5 w-5 text-gray-400 shrink-0" />
                      <span className="text-xs truncate font-medium flex-1 pr-4">
                        {file.name}
                      </span>
                      <button
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Step 4: Urgency/Priority */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white">Set Urgency</h3>
                <p className="text-2xs text-gray-500 dark:text-gray-400 mt-1">Select the priority level for this request.</p>
              </div>

              <div
                className={`grid grid-cols-3 gap-3 ${
                  formData.isEmergency ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                {[
                  { priority: 'Medium', label: 'Standard', duration: '48h SLA', color: 'border-stroke hover:border-primary/45' },
                  { priority: 'High', label: 'High', duration: '24h SLA', color: 'border-warning/40 hover:border-warning' },
                  { priority: 'Critical', label: 'Critical', duration: 'Immediate', color: 'border-danger/40 hover:border-danger' },
                ].map(({ priority, label, duration, color }) => {
                  const isSelected = formData.priority === priority
                  return (
                    <div
                      key={priority}
                      onClick={() => setFormData({ ...formData, priority })}
                      className={`rounded-lg border p-4 text-center cursor-pointer transition-all duration-200 ${color} ${
                        isSelected ? 'border-primary bg-primary/5 text-primary border-2' : ''
                      }`}
                    >
                      <span className="text-xs font-bold block">{label}</span>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mt-1 block">
                        {duration}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-950/10">
                <Checkbox
                  id="emergencyToggle"
                  checked={formData.isEmergency}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEmergency: !!checked })}
                  className="checkbox border-danger data-[state=checked]:bg-danger data-[state=checked]:border-danger"
                />
                <Label
                  htmlFor="emergencyToggle"
                  className="text-xs font-bold text-danger cursor-pointer select-none"
                >
                  🚨 This is an Emergency
                </Label>
              </div>

              <div>
                <h4 className="text-xs font-bold text-black dark:text-white mb-2">Ticket Summary</h4>
                <div className="rounded-lg bg-gray-50 dark:bg-meta-4/20 p-4 text-xs space-y-3">
                  <div className="flex justify-between border-b border-stroke dark:border-strokedark pb-2">
                    <span className="text-gray-400 dark:text-gray-500 font-semibold">Department</span>
                    <span className="font-bold text-black dark:text-white">
                      {formData.category || 'Not Selected'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-stroke dark:border-strokedark pb-2">
                    <span className="text-gray-400 dark:text-gray-500 font-semibold">Priority</span>
                    <span className="font-bold text-black dark:text-white">{formData.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 dark:text-gray-500 font-semibold">Attachments</span>
                    <span className="font-bold text-black dark:text-white">
                      {selectedFiles.length} files
                    </span>
                  </div>
                </div>
              </div>

              {showDuplicateWarning && (
                <div className="flex items-start gap-3 rounded-xl border border-warning bg-warning/5 p-4 dark:bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-black dark:text-white mb-1">
                      This issue looks similar to one already reported.
                    </h4>
                    <p className="text-2xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      You have an active ticket for a similar subject.
                    </p>
                    <div className="flex gap-3 mt-3">
                      {duplicateTicketData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/complaints/${duplicateTicketData._id}`, '_blank')}
                          className="text-[10px] font-semibold h-7 border-warning text-warning hover:bg-warning/10"
                        >
                          View Existing Ticket
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => submitComplaint(true)}
                        className="text-[10px] font-bold h-7 bg-warning hover:bg-warning/90 border-0"
                      >
                        Continue Anyway
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions footer */}
          <div className="flex items-center justify-between border-t border-stroke dark:border-strokedark mt-8 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                step === 1 ? 'invisible' : ''
              }`}
              disabled={isSubmitting || showDuplicateWarning}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={nextStep}
              disabled={
                (step === 1 && !formData.category) ||
                (step === 2 && !formData.title) ||
                isSubmitting ||
                showDuplicateWarning
              }
              className="text-xs font-bold flex items-center gap-1.5"
            >
              {step === 4 ? (
                isSubmitting ? (
                  'Submitting...'
                ) : (
                  <>
                    Submit Ticket
                    <Send className="h-4 w-4" />
                  </>
                )
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Built-in Camera Dialog */}
      <Dialog
        open={showCamera}
        onOpenChange={(open) => {
          if (!open) stopCamera()
        }}
      >
        <DialogContent className="max-w-md bg-black text-white p-0 rounded-lg overflow-hidden border-0">
          <DialogHeader className="p-4 bg-zinc-900 border-b border-zinc-800">
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="text-sm font-bold text-white">Take a Photo</DialogTitle>
              <button onClick={stopCamera} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          <div className="relative bg-black flex justify-center items-center aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <DialogFooter className="p-5 bg-zinc-900 border-t border-zinc-800 flex justify-center sm:justify-center">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-zinc-400 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <div className="w-12 h-12 rounded-full border-2 border-black" />
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CreateComplaint
