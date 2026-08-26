import React, { useState } from 'react';
import { View, ScrollView, Image, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { Rating } from '@/components/common/Rating';
import { CheckCircle, Image as ImageIcon, X, MapPin, Clock, ShieldAlert, Sparkles, Phone, UserPlus, Play, Pause, CheckSquare, Send, XCircle } from 'lucide-react-native';
import { AssignTechnicianSheet } from './AssignTechnicianSheet';
import { useComplaints } from '../hooks/useComplaints';
import { Complaint } from '../types';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { getImageUrl } from '@/src/utils/imageUrl';

interface ComplaintDetailSheetProps {
  visible: boolean;
  complaint: Complaint | null;
  onClose: () => void;
  onAddComment?: (id: string, text: string) => Promise<any>;
  onConfirmCompletion?: (id: string, feedback?: any) => Promise<any>;
  onCancelTicket?: (id: string) => Promise<any>;
  onReopenTicket?: (id: string, remarks: string) => Promise<any>;
  onDeleteTicket?: (id: string) => Promise<any>;
  onAssignPress?: (complaint: Complaint) => void;
  onUpdateStatus?: (id: string, data: { status?: string; priority?: string; remarks?: string }) => Promise<any>;
  onAcceptAssignment?: (id: string) => Promise<any>;
  onRejectPress?: (complaint: Complaint) => void;
  onStartWork?: (id: string) => Promise<any>;
  onPauseWorkPress?: (complaint: Complaint) => void;
  onResumeWork?: (id: string) => Promise<any>;
  onCompleteWorkPress?: (complaint: Complaint) => void;
  isResident?: boolean;
  viewMode?: 'resident' | 'manager' | 'assignee';
}

export const ComplaintDetailSheet: React.FC<ComplaintDetailSheetProps> = ({
  visible,
  complaint,
  onClose,
  onAddComment,
  onConfirmCompletion,
  onCancelTicket,
  onReopenTicket,
  onDeleteTicket,
  onAssignPress,
  onUpdateStatus,
  onAcceptAssignment,
  onRejectPress,
  onStartWork,
  onPauseWorkPress,
  onResumeWork,
  onCompleteWorkPress,
  isResident = true,
  viewMode,
}) => {
  const effectiveViewMode = viewMode || (isResident ? 'resident' : 'manager');
  const { assignTechnician, updateStatus: hookUpdateStatus, acceptAssignment, startWork, resumeWork } = useComplaints();

  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [overallRating, setOverallRating] = useState(5);
  const [technicianRating, setTechnicianRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [feedbackRemarks, setFeedbackRemarks] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Reopen/Delete State
  const [showReopenInput, setShowReopenInput] = useState(false);
  const [reopenRemarks, setReopenRemarks] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Status Update State
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showManagerUpdateModal, setShowManagerUpdateModal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(complaint?.status || 'Assigned');
  const [newPriority, setNewPriority] = useState<string>(complaint?.priority || 'Medium');
  const [managerRemarks, setManagerRemarks] = useState('');
  const [isSubmittingManagerUpdate, setIsSubmittingManagerUpdate] = useState(false);

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  if (!complaint) return null;

  const handleSendComment = async () => {
    if (!commentText.trim() || !onAddComment) return;
    try {
      setIsSubmittingComment(true);
      await onAddComment(complaint._id, commentText);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleConfirmAndRate = async () => {
    if (!onConfirmCompletion) return;
    try {
      setIsSubmittingFeedback(true);
      await onConfirmCompletion(complaint._id, {
        overallRating,
        technicianRating,
        cleanlinessRating,
        remarks: feedbackRemarks,
      });
      onClose();
    } catch (err) {
      console.error('Failed to confirm completion:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleCancelTicketAction = async () => {
    if (!onCancelTicket) return;
    try {
      setIsSubmittingCancel(true);
      await onCancelTicket(complaint._id);
      onClose();
    } catch (err) {
      console.error('Failed to cancel ticket:', err);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleReopenTicketAction = async () => {
    if (!onReopenTicket || !reopenRemarks.trim()) return;
    try {
      setIsSubmittingReopen(true);
      await onReopenTicket(complaint._id, reopenRemarks);
      setShowReopenInput(false);
      setReopenRemarks('');
      onClose();
    } catch (err) {
      console.error('Failed to reopen ticket:', err);
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  const handleDeleteTicketAction = async () => {
    if (!onDeleteTicket) return;
    try {
      setIsSubmittingDelete(true);
      await onDeleteTicket(complaint._id);
      setShowDeleteConfirm(false);
      // Wait a bit before closing the sheet so the list has time to update
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const handleManagerStatusUpdate = async () => {
    const statusHandler = onUpdateStatus || hookUpdateStatus;
    try {
      setIsSubmittingManagerUpdate(true);
      await statusHandler(complaint._id, {
        status: newStatus,
        priority: newPriority as any,
        remarks: managerRemarks.trim() || undefined,
      });
      setShowManagerUpdateModal(false);
      setManagerRemarks('');
      onClose();
    } catch (err) {
      console.error('Failed to update status:', err);
      Alert.alert('Error', 'Failed to update ticket status');
    } finally {
      setIsSubmittingManagerUpdate(false);
    }
  };

  const handleManagerEscalate = async () => {
    const statusHandler = onUpdateStatus || hookUpdateStatus;
    try {
      setIsSubmittingManagerUpdate(true);
      await statusHandler(complaint._id, {
        status: 'Escalated',
        remarks: 'Escalated by facility manager',
      });
      onClose();
    } catch (err) {
      console.error('Failed to escalate ticket:', err);
    } finally {
      setIsSubmittingManagerUpdate(false);
    }
  };

  const handleCallResident = (mobile?: string) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`);
  };

  const isPendingResidentConfirmation =
    complaint.status === 'Work Completed' || complaint.status === 'Waiting For Resident Confirmation';
  const isClosed = complaint.status === 'Closed' || complaint.status === 'Completed';
  const isOpenState = ['Submitted', 'Open', 'Waiting For Assignment'].includes(complaint.status);
  const isUnassigned = !complaint.assignedTechnicianName && !complaint.vendor;

  const locationStr = [
    complaint.location?.flat ? `Flat ${complaint.location.flat}` : null,
    complaint.location?.building,
    complaint.location?.tower ? `Tower ${complaint.location.tower}` : null,
    complaint.location?.commonArea,
  ]
    .filter(Boolean)
    .join(', ');

  const commentsList: any[] = (complaint as any).comments || [];

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={`Ticket #${complaint.complaintNumber}`}>
        <View className="py-2 pb-8">
          {/* CONSOLIDATED UNIFIED TICKET CARD */}
          <View className="bg-card border border-border rounded-2xl p-4 mb-3 shadow-xs gap-3.5">
            {/* Priority & Status Header */}
            <View className="flex-row items-center justify-between">
              <StatusBadge
                label={complaint.priority}
                variant={complaint.priority === 'Critical' ? 'critical' : 'warning'}
              />
              <StatusBadge label={complaint.status} variant={isClosed ? 'success' : 'info'} dot />
            </View>

            {/* Title & Description */}
            <View>
              <Text className="text-base font-bold text-foreground mb-1 text-start">
                {complaint.title}
              </Text>
              <Text className="text-xs text-muted-foreground leading-relaxed text-start">
                {complaint.description || 'No additional description provided.'}
              </Text>
            </View>

            {/* Resident Contact & Flat Location Info Bar */}
            <View className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 flex-row items-center justify-between">
              <View className="flex-1 me-2">
                <Text className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider mb-0.5 text-start">
                  RESIDENT INFO & LOCATION
                </Text>
                <Text className="text-xs font-bold text-foreground text-start">
                  {complaint.residentName || 'Building Resident'}
                </Text>
                
                {locationStr ? (
                  <View className="flex-row items-center mt-1">
                    <Icon as={MapPin} size={12} className="text-primary me-1" />
                    <Text className="text-xs font-bold text-primary text-start">
                      {locationStr}
                    </Text>
                  </View>
                ) : null}

                {complaint.residentMobile ? (
                  <Text className="text-[11px] font-medium text-muted-foreground mt-0.5 text-start">
                    📞 {complaint.residentMobile}
                  </Text>
                ) : null}
              </View>

              {complaint.residentMobile ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleCallResident(complaint.residentMobile)}
                  className="bg-primary py-1.5 px-3 rounded-full flex-row items-center justify-center"
                >
                  <Icon as={Phone} size={12} className="text-primary-foreground me-1" />
                  <Text className="text-xs font-bold text-primary-foreground">Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Metadata Grid */}
            <View className="bg-muted/40 border border-border/50 rounded-xl p-3 gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-medium text-muted-foreground">Category</Text>
                <Text className="text-xs font-bold text-foreground">
                  {complaint.category}{complaint.subCategory ? ` / ${complaint.subCategory}` : ''}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-medium text-muted-foreground">Created Date</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {new Date(complaint.createdAt).toLocaleString()}
                </Text>
              </View>

              {complaint.preferredVisitDate ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-muted-foreground">Preferred Visit Schedule</Text>
                  <Text className="text-xs font-bold text-primary">
                    {new Date(complaint.preferredVisitDate).toLocaleDateString()} {complaint.preferredVisitTime || ''}
                  </Text>
                </View>
              ) : null}

              {complaint.slaDueDate ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-muted-foreground">SLA Target Due Date</Text>
                  <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {new Date(complaint.slaDueDate).toLocaleString()}
                  </Text>
                </View>
              ) : null}

              {locationStr ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-muted-foreground">Location</Text>
                  <Text className="text-xs font-semibold text-foreground">{locationStr}</Text>
                </View>
              ) : null}

              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-medium text-muted-foreground">Assigned Technician</Text>
                <Text className="text-xs font-bold text-foreground">
                  {complaint.assignedTechnicianName || complaint.vendor || 'Unassigned'}
                </Text>
              </View>
            </View>

            {/* Photo Evidence Gallery */}
            {complaint.attachments && complaint.attachments.length > 0 ? (
              <View className="pt-3 border-t border-border/40">
                <Text className="text-xs font-bold text-muted-foreground uppercase mb-2 flex-row items-center text-start">
                  <Icon as={ImageIcon} size={13} className="me-1" /> Photo Evidence ({complaint.attachments.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
                  {complaint.attachments.map((imgUrl, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => setPreviewImageUrl(imgUrl)}
                      className="w-16 h-16 rounded-xl bg-muted border border-border me-2 overflow-hidden"
                    >
                      <Image source={{ uri: getImageUrl(imgUrl) }} className="w-full h-full object-cover" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* 1. FACILITY MANAGER QUICK ACTION CONTROLS */}
          {effectiveViewMode === 'manager' && (
            <View className="bg-card border border-border rounded-2xl p-4 my-3 shadow-xs gap-3">
              <Text className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-1 text-start">
                Manager Quick Actions
              </Text>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (onAssignPress) {
                      onClose();
                      onAssignPress(complaint);
                    } else {
                      setShowAssignSheet(true);
                    }
                  }}
                  className="bg-primary py-2.5 px-3 rounded.xl flex-row items-center justify-center flex-1 me-1"
                >
                  <Icon as={UserPlus} size={14} className="text-primary-foreground me-1.5" />
                  <Text className="text-xs font-bold text-primary-foreground">Assign Staff</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowManagerUpdateModal(!showManagerUpdateModal)}
                  className={`py-2.5 px-3 rounded-xl border flex-row items-center justify-center flex-1 me-1 ${
                    showManagerUpdateModal
                      ? 'bg-amber-600 border-amber-600'
                      : 'bg-card border-border'
                  }`}
                >
                  <Icon
                    as={Clock}
                    size={14}
                    className={`me-1.5 ${showManagerUpdateModal ? 'text-white' : 'text-foreground'}`}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      showManagerUpdateModal ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {showManagerUpdateModal ? 'Close Form' : 'Update Status'}
                  </Text>
                </TouchableOpacity>

                {complaint.status !== 'Escalated' ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleManagerEscalate}
                    className="bg-rose-500/10 border border-rose-500/40 p-2.5 rounded-xl items-center justify-center"
                  >
                    <Icon as={ShieldAlert} size={16} className="text-rose-600 dark:text-rose-400" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}

          {/* 2. TECHNICIAN / ASSIGNEE QUICK ACTION CONTROLS */}
          {effectiveViewMode === 'assignee' && (
            <View className="bg-card border border-border rounded-2xl p-4 my-3 shadow-xs gap-3">
              <Text className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-1 text-start">
                Technician Quick Actions
              </Text>

              <View className="flex-row items-center gap-2 flex-wrap">
                {isUnassigned && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      const handler = onAcceptAssignment || acceptAssignment;
                      await handler(complaint._id);
                      onClose();
                    }}
                    className="bg-primary py-2.5 px-4 rounded-xl flex-row items-center justify-center flex-1"
                  >
                    <Icon as={Send} size={14} className="text-primary-foreground me-1.5" />
                    <Text className="text-xs font-bold text-primary-foreground">Accept & Claim Job</Text>
                  </TouchableOpacity>
                )}

                {(complaint.status === 'Accepted' || complaint.status === 'Assigned') && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      const handler = onStartWork || startWork;
                      await handler(complaint._id);
                      onClose();
                    }}
                    className="bg-emerald-600 py-2.5 px-4 rounded-xl flex-row items-center justify-center flex-1"
                  >
                    <Icon as={Play} size={14} className="text-white me-1.5" />
                    <Text className="text-xs font-bold text-white">Start Work</Text>
                  </TouchableOpacity>
                )}

                {complaint.status === 'In Progress' && (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onPauseWorkPress) onPauseWorkPress(complaint);
                      }}
                      className="bg-amber-500/10 border border-amber-500/30 py-2 px-3 rounded-xl flex-row items-center justify-center"
                    >
                      <Icon as={Pause} size={14} className="text-amber-600 dark:text-amber-400 me-1" />
                      <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">Pause</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (onCompleteWorkPress) onCompleteWorkPress(complaint);
                      }}
                      className="bg-emerald-600 py-2 px-4 rounded-xl flex-row items-center justify-center flex-1"
                    >
                      <Icon as={CheckSquare} size={14} className="text-white me-1.5" />
                      <Text className="text-xs font-bold text-white">Mark Completed</Text>
                    </TouchableOpacity>
                  </>
                )}

                {(complaint.status === 'On Hold' || complaint.status === 'Paused') && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={async () => {
                      const handler = onResumeWork || resumeWork;
                      await handler(complaint._id);
                      onClose();
                    }}
                    className="bg-primary py-2.5 px-4 rounded-xl flex-row items-center justify-center flex-1"
                  >
                    <Icon as={Play} size={14} className="text-primary-foreground me-1.5" />
                    <Text className="text-xs font-bold text-primary-foreground">Resume Work</Text>
                  </TouchableOpacity>
                )}

                {(complaint.status === 'Assigned' || complaint.status === 'Waiting For Acceptance') && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (onRejectPress) onRejectPress(complaint);
                      else onClose();
                    }}
                    className="bg-rose-500/10 border border-rose-500/30 py-2.5 px-3 rounded-xl flex-row items-center justify-center"
                  >
                    <Icon as={XCircle} size={14} className="text-rose-600 dark:text-rose-400 me-1" />
                    <Text className="text-xs font-bold text-rose-600 dark:text-rose-400">Decline Job</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                className="bg-card border border-border py-2 rounded-xl items-center justify-center mt-1"
              >
                <Text className="text-xs font-bold text-muted-foreground">Close Sheet</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STATUS UPDATE FORM EXPANSION CARD */}
          {effectiveViewMode === 'manager' && showManagerUpdateModal && (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 my-2 gap-3 shadow-xs">
              <Text className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase text-start">
                Update Ticket Status & Priority
              </Text>

              <DropdownSelect
                label="Ticket Status"
                value={newStatus}
                options={[
                  { label: 'Assigned', value: 'Assigned' },
                  { label: 'In Progress', value: 'In Progress' },
                  { label: 'On Hold / Pending Parts', value: 'On Hold' },
                  { label: 'Work Completed', value: 'Work Completed' },
                  { label: 'Closed / Resolved', value: 'Closed' },
                ]}
                onValueChange={(val) => setNewStatus(val)}
              />

              <DropdownSelect
                label="Priority Level"
                value={newPriority}
                options={[
                  { label: 'Low', value: 'Low' },
                  { label: 'Medium', value: 'Medium' },
                  { label: 'High', value: 'High' },
                  { label: 'Critical', value: 'Critical' },
                ]}
                onValueChange={(val) => setNewPriority(val as any)}
              />

              <TextInput
                label="Manager Remarks / Instructions"
                placeholder="Enter internal manager notes..."
                value={managerRemarks}
                onChangeText={setManagerRemarks}
                multiline
                numberOfLines={2}
              />

              <Button
                variant="default"
                size="default"
                loading={isSubmittingManagerUpdate}
                onPress={handleManagerStatusUpdate}
                className="bg-amber-600 border-amber-600 mt-1"
              >
                Apply Status Change
              </Button>
            </View>
          )}

          {/* RESIDENT RATING & FEEDBACK VERIFICATION SECTION */}
          {complaint.feedback ? (
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 my-3 shadow-xs gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase flex-row items-center text-start">
                  <Icon as={Sparkles} size={14} className="text-emerald-600 me-1" /> Resident Verification & Rating
                </Text>
                <StatusBadge label="Confirmed" variant="success" />
              </View>

              <View className="bg-card border border-border/60 rounded-xl p-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold text-foreground">Overall Satisfaction</Text>
                  <Rating rating={complaint.feedback.overallRating || (complaint.feedback as any).rating || 5} size={16} />
                </View>

                {complaint.feedback.technicianRating ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-medium text-muted-foreground">Technician Professionalism</Text>
                    <Rating rating={complaint.feedback.technicianRating} size={14} />
                  </View>
                ) : null}

                {complaint.feedback.cleanlinessRating ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-medium text-muted-foreground">Work Cleanliness</Text>
                    <Rating rating={complaint.feedback.cleanlinessRating} size={14} />
                  </View>
                ) : null}

                {complaint.feedback.remarks ? (
                  <View className="pt-2 border-t border-border/40 mt-1">
                    <Text className="text-xs text-foreground italic text-start">"{complaint.feedback.remarks}"</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* RESIDENT ACTION CARD */}
          {effectiveViewMode === 'resident' && isPendingResidentConfirmation && (
            <View className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 my-3 shadow-xs gap-3">
              <View className="flex-row items-center gap-2">
                <Icon as={Sparkles} size={18} className="text-amber-600 dark:text-amber-400 me-1" />
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-amber-900 dark:text-amber-200 text-start">
                    Work Completed by Technician
                  </Text>
                  <Text className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 text-start">
                    Please confirm satisfaction and rate the technician service.
                  </Text>
                </View>
              </View>

              <View className="bg-card border border-border/70 rounded-xl p-3 gap-3">
                <View className="gap-1">
                  <Text className="text-xs font-bold text-foreground text-start">Overall Satisfaction *</Text>
                  <Rating rating={overallRating} onRatingChange={setOverallRating} size={22} />
                </View>

                <View className="gap-1">
                  <Text className="text-xs font-semibold text-muted-foreground text-start">Technician Behavior & Punctuality</Text>
                  <Rating rating={technicianRating} onRatingChange={setTechnicianRating} size={18} />
                </View>

                <View className="gap-1">
                  <Text className="text-xs font-semibold text-muted-foreground text-start">Work Cleanliness & Quality</Text>
                  <Rating rating={cleanlinessRating} onRatingChange={setCleanlinessRating} size={18} />
                </View>

                <TextInput
                  label="Resident Comments / Review (Optional)"
                  placeholder="Share your experience with the technician..."
                  value={feedbackRemarks}
                  onChangeText={setFeedbackRemarks}
                  multiline
                  numberOfLines={2}
                />

                <Button
                  variant="default"
                  size="default"
                  loading={isSubmittingFeedback}
                  onPress={handleConfirmAndRate}
                  className="bg-amber-600 border-amber-600 mt-2"
                >
                  Confirm & Submit Rating ⭐
                </Button>
              </View>
            </View>
          )}

          {/* ACTIVITY TIMELINE FLOW */}
          <View className="bg-card border border-border rounded-2xl p-4 my-3 shadow-xs gap-3">
            <Text className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-1 text-start">
              Activity Timeline Flow ({complaint.timeline?.length || 1} Steps)
            </Text>

            <View className="gap-3">
              {complaint.timeline && complaint.timeline.length > 0 ? (
                complaint.timeline.map((item, idx) => (
                  <View key={idx} className="flex-row items-start gap-3">
                    <View className="items-center">
                      <View className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 items-center justify-center">
                        <Icon as={CheckCircle} size={14} className="text-primary" />
                      </View>
                      {idx < (complaint.timeline?.length || 1) - 1 && (
                        <View className="w-0.5 h-6 bg-border my-1" />
                      )}
                    </View>
                    <View className="flex-1 bg-muted/30 border border-border/60 rounded-xl p-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs font-extrabold text-foreground">{item.status || item.action}</Text>
                        <Text className="text-[10px] text-muted-foreground">
                          {item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      {item.remarks ? (
                        <Text className="text-xs text-muted-foreground mb-1 text-start">{item.remarks}</Text>
                      ) : null}
                      {item.userName ? (
                        <View className="bg-card px-2 py-0.5 rounded border border-border/40 self-start">
                          <Text className="text-[10px] font-bold text-foreground">
                            By {item.userName} {item.userRole ? `(${item.userRole})` : ''}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <View className="flex-row items-start gap-3">
                  <View className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 items-center justify-center">
                    <Icon as={CheckCircle} size={14} className="text-primary" />
                  </View>
                  <View className="flex-1 bg-muted/30 border border-border/60 rounded-xl p-3">
                    <Text className="text-xs font-bold text-foreground text-start">Ticket Created</Text>
                    <Text className="text-xs text-muted-foreground text-start">Complaint ticket initiated.</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* COMMENTS & DISCUSSION LOG */}
          <View className="bg-card border border-border rounded-2xl p-4 my-3 shadow-xs gap-3">
            <Text className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-1 text-start">
              Internal Comments & Activity Notes
            </Text>

            {commentsList && commentsList.length > 0 ? (
              <View className="gap-2 mb-2">
                {commentsList.map((c: any, idx: number) => (
                  <View key={idx} className="bg-muted/40 border border-border/50 rounded-xl p-3 gap-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-bold text-foreground">
                        {c.userName || 'Staff Member'} {c.userRole ? `(${c.userRole})` : ''}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </Text>
                    </View>
                    <Text className="text-xs text-muted-foreground leading-relaxed text-start">{c.comment}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-xs text-muted-foreground italic mb-2 text-start">No internal notes added yet.</Text>
            )}

            <View className="gap-2">
              <TextInput
                placeholder="Write a comment or internal work note..."
                value={commentText}
                onChangeText={setCommentText}
                multiline
                numberOfLines={2}
              />
              <Button
                variant="default"
                size="sm"
                loading={isSubmittingComment}
                onPress={handleSendComment}
                className="self-end px-4"
              >
                Add Comment
              </Button>
            </View>
          </View>

          {/* RESIDENT CANCEL / REOPEN ACTIONS */}
          {effectiveViewMode === 'resident' && (
            <View className="my-3 gap-2">
              {isOpenState ? (
                <Button
                  variant="outline"
                  size="default"
                  loading={isSubmittingCancel}
                  onPress={handleCancelTicketAction}
                  className="border-rose-500/40 text-rose-600 font-semibold"
                >
                  Cancel Complaint Request
                </Button>
              ) : null}

              {['Closed', 'Completed', 'Resolved', 'Cancelled'].includes(complaint.status) ? (
                <View className="gap-2">
                  {!showReopenInput ? (
                    <View className="flex-row items-center gap-2">
                      <Button
                        variant="outline"
                        size="default"
                        onPress={() => setShowReopenInput(true)}
                        className="flex-1 border-amber-500/40 text-amber-600"
                      >
                        Reopen Ticket Issue
                      </Button>
                      
                      {onDeleteTicket && (
                        <Button
                          variant="outline"
                          size="default"
                          onPress={() => setShowDeleteConfirm(true)}
                          className="flex-1 border-red-500/40 text-red-600"
                        >
                          Delete Ticket
                        </Button>
                      )}
                    </View>
                  ) : (
                    <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 gap-2">
                      <Text className="text-xs font-bold text-amber-900 dark:text-amber-200 text-start">
                        Reason for Reopening Ticket
                      </Text>
                      <TextInput
                        placeholder="Explain why the issue was not completely resolved..."
                        value={reopenRemarks}
                        onChangeText={setReopenRemarks}
                        multiline
                        numberOfLines={2}
                      />
                      <View className="flex-row items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={() => setShowReopenInput(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          loading={isSubmittingReopen}
                          onPress={handleReopenTicketAction}
                          className="bg-amber-600 border-amber-600"
                        >
                          Confirm Reopen
                        </Button>
                      </View>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </BottomSheet>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={showDeleteConfirm}
        onCancel={() => !isSubmittingDelete && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTicketAction}
        loading={isSubmittingDelete}
        title="Delete Ticket?"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmLabel="Yes, Delete Ticket"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Internal Manager Assign Technician Fallback Drawer */}
      <AssignTechnicianSheet
        visible={showAssignSheet}
        complaint={complaint}
        onClose={() => setShowAssignSheet(false)}
        onAssign={async (id, payload) => {
          await assignTechnician(id, payload);
          setShowAssignSheet(false);
          onClose();
        }}
      />

      {/* FULLSCREEN PHOTO PREVIEW MODAL */}
      <Modal visible={!!previewImageUrl} transparent animationType="fade">
        <View className="flex-1 bg-black/90 items-center justify-center p-4">
          <TouchableOpacity
            onPress={() => setPreviewImageUrl(null)}
            className="absolute top-12 right-6 p-2 rounded-full bg-white/20"
          >
            <Icon as={X} size={24} color="#ffffff" />
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image source={{ uri: getImageUrl(previewImageUrl) }} className="w-full h-4/6 object-contain rounded-2xl" />
          ) : null}
        </View>
      </Modal>
    </>
  );
};

export default ComplaintDetailSheet;
