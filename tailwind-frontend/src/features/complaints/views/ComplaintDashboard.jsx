import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ComplaintTopNav from '../components/ComplaintTopNav'
import { useAuth } from '../../auth/hooks/useAuth'
import { useAmenities } from '../../amenities/hooks/useAmenities'
import { useComplaints } from '../hooks/useComplaints'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'src/components/ui/dialog'
import { Button } from 'src/components/ui/button'
import { Label } from 'src/components/ui/label'
import { Wrench, SearchCheck, MessageSquare, Megaphone } from 'lucide-react'
import '../styles/_complaints.scss'

const ComplaintDashboard = () => {
  const navigate = useNavigate()
  const { currentUser: user } = useAuth()

  const { amenities, loading } = useAmenities()

  const maintenanceNotices = useMemo(() => {
    const notices = []
    if (amenities && amenities.length > 0) {
      amenities.forEach((amenity) => {
        if (amenity.status === 'maintenance' || amenity.maintenanceSchedules?.length > 0) {
          const activeSchedules =
            amenity.maintenanceSchedules?.filter(
              (s) => s.status !== 'completed' && s.status !== 'cancelled',
            ) || []

          if (amenity.status === 'maintenance' && activeSchedules.length === 0) {
            notices.push({
              id: `amn-${amenity._id}`,
              title: `${amenity.name} is Closed`,
              message: `The ${amenity.name} is currently temporarily unavailable due to maintenance.`,
              timestamp: new Date(amenity.updatedAt || Date.now()),
            })
          }

          activeSchedules.forEach((schedule) => {
            notices.push({
              id: `amn-sch-${schedule._id}`,
              title: schedule.title || `${amenity.name} Maintenance`,
              message:
                schedule.description ||
                `Maintenance scheduled from ${schedule.startDate} to ${schedule.endDate}.`,
              timestamp: new Date(schedule.startDate),
            })
          })
        }
      })
    }
    return notices.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
  }, [amenities])

  const { createNewComplaint } = useComplaints()
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [generalFeedback, setGeneralFeedback] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  const handleFeedbackSubmit = async () => {
    if (!generalFeedback.trim()) {
      toast.error('Please enter your feedback before submitting.')
      return
    }
    try {
      setIsSubmittingFeedback(true)
      await createNewComplaint({
        title: 'Resident Feedback',
        description: generalFeedback,
        category: 'Feedback',
        priority: 'Medium',
        department: 'Management',
        flat: user?.flat || '',
        name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Resident',
        isEmergency: false,
        location: {
          building: user?.building || '',
          tower: user?.tower || '',
          floor: user?.floor || '',
          flat: user?.flat || '',
        },
      })
      toast.success('Thank you! Your feedback has been submitted successfully.')
      setGeneralFeedback('')
      setShowFeedbackModal(false)
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  return (
    <div>
      <ComplaintTopNav />
      <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
        {/* PRIMARY ACTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {/* Action 1: Raise Ticket */}
          <div
            onClick={() => navigate('/admin/complaints/create')}
            className="group cursor-pointer rounded-xl border border-stroke bg-white p-6 shadow-default transition-all duration-200 hover:shadow-lg hover:-translate-y-1 dark:border-strokedark dark:bg-boxdark border-b-4 border-b-primary"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 transition-transform group-hover:scale-110">
              <Wrench className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white mb-2">Raise a Ticket</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Report electrical, plumbing, or facility issues instantly.
            </p>
          </div>

          {/* Action 2: Track Requests */}
          <div
            onClick={() => navigate('/admin/complaints/my-tickets')}
            className="group cursor-pointer rounded-xl border border-stroke bg-white p-6 shadow-default transition-all duration-200 hover:shadow-lg hover:-translate-y-1 dark:border-strokedark dark:bg-boxdark border-b-4 border-b-warning"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/10 text-warning mb-4 transition-transform group-hover:scale-110">
              <SearchCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white mb-2">Track Requests</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Check the real-time status of your reported issues.
            </p>
          </div>

          {/* Action 3: Provide Feedback */}
          <div
            onClick={() => setShowFeedbackModal(true)}
            className="group cursor-pointer rounded-xl border border-stroke bg-white p-6 shadow-default transition-all duration-200 hover:shadow-lg hover:-translate-y-1 dark:border-strokedark dark:bg-boxdark border-b-4 border-b-danger"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger mb-4 transition-transform group-hover:scale-110">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-black dark:text-white mb-2">
              Provide Feedback
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Share your suggestions or overall feedback with us.
            </p>
          </div>
        </div>

        {/* MAINTENANCE BOARD */}
        <div>
          <h3 className="text-base font-bold text-black dark:text-white mb-4">
            Maintenance Board
          </h3>

          {loading ? (
            <div className="flex items-center justify-center rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark text-sm text-gray-400 dark:text-gray-500">
              Loading maintenance updates...
            </div>
          ) : maintenanceNotices.length > 0 ? (
            <div className="space-y-3">
              {maintenanceNotices.map((notice) => (
                <div
                  key={notice.id}
                  className="flex items-center gap-4 rounded-xl border border-stroke bg-primary/5 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm dark:border-strokedark dark:bg-primary/10"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm dark:bg-boxdark">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary dark:text-primary mb-1">
                      {notice.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed truncate">
                      {notice.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark text-sm text-gray-400 dark:text-gray-500">
              No active maintenance announcements.
            </div>
          )}
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog
        open={showFeedbackModal}
        onOpenChange={(open) => {
          if (!open) setShowFeedbackModal(false)
        }}
      >
        <DialogContent className="max-w-md bg-white dark:bg-boxdark border-stroke dark:border-strokedark text-black dark:text-white p-6 rounded-lg shadow-default">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-black dark:text-white pb-2 border-b border-stroke dark:border-strokedark">
              General Feedback
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="general-feedback" className="text-xs font-semibold">
                Your Feedback
              </Label>
              <textarea
                id="general-feedback"
                rows="5"
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                placeholder="Tell us what's on your mind..."
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-sm text-black outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white resize-vertical"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-stroke dark:border-strokedark pt-4 w-full sm:space-x-0 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFeedbackModal(false)}
              disabled={isSubmittingFeedback}
              className="text-xs font-semibold px-4 py-2 border-stroke dark:border-strokedark text-black dark:text-white"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleFeedbackSubmit}
              disabled={isSubmittingFeedback}
              className="text-xs font-bold px-4 py-2"
            >
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ComplaintDashboard
