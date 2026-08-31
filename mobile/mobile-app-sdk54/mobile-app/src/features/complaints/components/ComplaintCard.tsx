import React from 'react';
import { View, Pressable, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronRight, UserCheck, AlertTriangle, Sparkles, UserPlus } from 'lucide-react-native';
import { Complaint, ComplaintStatus, ComplaintPriority } from '../types';

interface ComplaintCardProps {
  complaint: Complaint;
  onPress: () => void;
  onAssignPress?: () => void;
  onCancelPress?: () => void;
  onConfirmPress?: () => void;
  showAssignButton?: boolean;
  actionButtons?: React.ReactNode;
}

const getStatusBadgeVariant = (status: ComplaintStatus) => {
  switch (status) {
    case 'Closed':
    case 'Completed':
      return 'success';
    case 'Work Completed':
    case 'Waiting For Resident Confirmation':
      return 'warning';
    case 'In Progress':
    case 'Assigned':
    case 'Accepted':
      return 'info';
    case 'Escalated':
    case 'Rejected':
    case 'Cancelled':
      return 'danger';
    case 'Submitted':
    case 'Open':
    case 'Waiting For Assignment':
    case 'Waiting For Acceptance':
    default:
      return 'neutral';
  }
};

const getPriorityBadgeVariant = (priority: ComplaintPriority) => {
  switch (priority) {
    case 'Critical':
      return 'critical';
    case 'High':
      return 'danger';
    case 'Medium':
      return 'warning';
    case 'Low':
    default:
      return 'neutral';
  }
};

export const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint,
  onPress,
  onAssignPress,
  onCancelPress,
  onConfirmPress,
  showAssignButton = false,
  actionButtons,
}) => {
  const isPendingConfirmation =
    complaint.status === 'Work Completed' || complaint.status === 'Waiting For Resident Confirmation';
  const isOpenState = ['Submitted', 'Open', 'Waiting For Assignment'].includes(complaint.status);
  const isUnassigned = !complaint.assignedTechnicianName && !complaint.vendor;

  const locationStr = [
    complaint.location?.flat ? `Flat ${complaint.location.flat}` : null,
    complaint.location?.floor ? `Floor ${complaint.location.floor}` : null,
    complaint.location?.building,
    complaint.location?.tower ? `Tower ${complaint.location.tower}` : null,
    complaint.location?.commonArea,
  ]
    .filter(Boolean)
    .join(', ');

  const dateStr = complaint.createdAt
    ? new Date(complaint.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : '';

  const statusVariant = getStatusBadgeVariant(complaint.status);
  const priorityVariant = getPriorityBadgeVariant(complaint.priority);

  const getSLAInfo = () => {
    if (complaint.status === 'Closed' || complaint.status === 'Completed' || complaint.status === 'Cancelled') {
      return null;
    }
    if (complaint.slaDueDate) {
      const dueTime = new Date(complaint.slaDueDate).getTime();
      const nowTime = Date.now();
      const diffHours = Math.round((dueTime - nowTime) / (1000 * 60 * 60));
      if (diffHours < 0) {
        return { label: 'SLA Breached', isBreached: true };
      }
    }
    return null;
  };

  const slaInfo = getSLAInfo();

  // Mobile Long-Press Gesture Context Action
  const handleLongPress = () => {
    const ticketRef = complaint.complaintNumber || complaint._id.slice(-6);
    Clipboard.setString(ticketRef);
    Alert.alert(
      'Ticket Number Copied',
      `Ticket #${ticketRef} copied to clipboard.\n\nStatus: ${complaint.status}\nCategory: ${complaint.category}`
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`View ticket ${complaint.complaintNumber}: ${complaint.title}`}
      className={`bg-card p-3.5 mb-2.5 rounded-2xl border ${
        isPendingConfirmation ? 'border-amber-500/60' : 'border-border/80'
      } shadow-xs active:opacity-75`}
    >
      {/* 1. Header Row: Ticket #, Priority, SLA | Status Badge */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5 flex-1 me-2 flex-wrap">
          <View className="bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md">
            <Text className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
              #{complaint.complaintNumber}
            </Text>
          </View>
          
          <StatusBadge label={complaint.priority} variant={priorityVariant} size="sm" />

          {slaInfo ? (
            <View className="bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md flex-row items-center">
              <Icon as={AlertTriangle} size={10} className="text-amber-600 dark:text-amber-400 me-1" />
              <Text className="text-[9px] font-bold text-amber-700 dark:text-amber-300">
                {slaInfo.label}
              </Text>
            </View>
          ) : null}
        </View>

        <StatusBadge label={complaint.status} variant={statusVariant} size="sm" dot />
      </View>

      {/* 2. Main Title & Meta info */}
      <View className="flex-row items-start justify-between mb-1.5">
        <View className="flex-1 me-2">
          <Text className="text-sm font-bold text-foreground mb-1 text-start" numberOfLines={1}>
            {complaint.title}
          </Text>

          {/* Category & Location Row */}
          <View className="flex-row items-center flex-wrap gap-1.5 mb-1">
            <Text className="text-xs font-medium text-muted-foreground text-start">
              Category: <Text className="font-semibold text-foreground">{complaint.category}</Text>
            </Text>

            {locationStr ? (
              <View className="bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md flex-row items-center">
                <Icon as={MapPin} size={10} className="text-primary me-1" />
                <Text className="text-[10px] font-semibold text-primary">
                  {locationStr}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Resident Info Row */}
          {complaint.residentName ? (
            <Text className="text-xs font-medium text-muted-foreground text-start">
              Resident: <Text className="font-semibold text-foreground">{complaint.residentName}</Text>
            </Text>
          ) : null}
        </View>

        <Icon as={ChevronRight} size={16} className="text-muted-foreground/60 mt-0.5" />
      </View>

      {/* 3. Action Needed Highlight Row */}
      {isPendingConfirmation ? (
        <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2 my-1 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 me-2">
            <Icon as={Sparkles} size={12} className="text-amber-600 dark:text-amber-400 me-1.5" />
            <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex-1 text-start">
              Work Completed • Rate & Confirm
            </Text>
          </View>
          {onConfirmPress ? (
            <Button
              variant="default"
              size="sm"
              className="bg-amber-600 border-amber-600 py-1 px-2.5 h-7"
              onPress={(e: any) => {
                e?.stopPropagation?.();
                onConfirmPress();
              }}
            >
              Rate ⭐
            </Button>
          ) : null}
        </View>
      ) : null}

      {/* 4. Details Footer: Assignee & Action Buttons */}
      <View className="border-t border-border/60 pt-2 mt-2 flex-row items-center justify-between">
        <View className="flex-1 me-2 flex-row items-center">
          <Icon as={UserCheck} size={12} className="text-muted-foreground me-1.5" />
          <Text className="text-xs font-medium text-muted-foreground text-start" numberOfLines={1}>
            Assigned: {' '}
            <Text className={`font-semibold ${isUnassigned ? 'text-muted-foreground' : 'text-foreground'}`}>
              {complaint.assignedTechnicianName || complaint.vendor || 'Unassigned'}
            </Text>
          </Text>
        </View>

        {actionButtons ? (
          <View className="flex-row items-center gap-1.5">
            {actionButtons}
          </View>
        ) : showAssignButton && onAssignPress ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e?.stopPropagation?.();
              onAssignPress();
            }}
            className={`px-2.5 py-1 rounded-lg flex-row items-center justify-center ${
              isUnassigned ? 'bg-primary' : 'bg-card border border-border'
            }`}
          >
            <Icon as={UserPlus} size={12} className={`me-1 ${isUnassigned ? 'text-primary-foreground' : 'text-foreground'}`} />
            <Text className={`text-xs font-bold ${isUnassigned ? 'text-primary-foreground' : 'text-foreground'}`}>
              {isUnassigned ? 'Assign Staff' : 'Reassign'}
            </Text>
          </TouchableOpacity>
        ) : isOpenState && onCancelPress ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e?.stopPropagation?.();
              onCancelPress();
            }}
            className="bg-card border border-red-500/40 px-2.5 py-1 rounded-lg flex-row items-center justify-center"
          >
            <Text className="text-xs font-semibold text-red-600 dark:text-red-400">Cancel</Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-[11px] font-semibold text-muted-foreground">{dateStr}</Text>
        )}
      </View>
    </Pressable>
  );
};

export default ComplaintCard;
