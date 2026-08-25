import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { TriageTicket } from '../hooks/useComplaintTriage';
import { MapPin, User, Clock, ShieldAlert, RefreshCw, UserCheck } from 'lucide-react-native';

interface ComplaintTriageCardProps {
  item: TriageTicket;
  onStatusClick: (item: TriageTicket) => void;
  onEscalateClick: (item: TriageTicket) => void;
  onAssignClick: (item: TriageTicket) => void;
}

const mapTriageStatusBadge = (status: string): { label: string; variant: StatusVariant } => {
  switch (status) {
    case 'Open':
    case 'Waiting For Assignment':
      return { label: 'UNASSIGNED', variant: 'danger' };
    case 'Assigned':
      return { label: 'ASSIGNED', variant: 'info' };
    case 'In Progress':
      return { label: 'IN PROGRESS', variant: 'warning' };
    case 'Work Completed':
    case 'Resolved':
    case 'Closed':
      return { label: 'RESOLVED', variant: 'success' };
    case 'Escalated':
      return { label: 'ESCALATED', variant: 'danger' };
    default:
      return { label: status.toUpperCase(), variant: 'neutral' };
  }
};

const mapPriorityVariant = (priority: string): StatusVariant => {
  switch (priority) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'warning';
    case 'Low':
      return 'neutral';
    case 'Medium':
    default:
      return 'info';
  }
};

export const ComplaintTriageCard: React.FC<ComplaintTriageCardProps> = ({
  item,
  onStatusClick,
  onEscalateClick,
  onAssignClick,
}) => {
  const statusMeta = mapTriageStatusBadge(item.status);
  const priorityVariant = mapPriorityVariant(item.priority);
  const isUnassigned = item.status === 'Open' || item.status === 'Waiting For Assignment';

  return (
    <ListCard
      title={item.title}
      subtitle={`${item.complaintNumber} • ${item.category}`}
      leftIcon="Wrench"
      leftIconBgColor="bg-primary/10"
      status={{ label: statusMeta.label, variant: statusMeta.variant }}
    >
      {/* Priority Pill & SLA Row */}
      <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
        <StatusBadge label={item.priority.toUpperCase()} variant={priorityVariant} size="sm" />
        {item.slaDueDate && (
          <View className="flex-row items-center gap-1">
            <Clock size={12} className="text-muted-foreground" />
            <Text className="text-[11px] text-muted-foreground">
              Due: {new Date(item.slaDueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>

      {/* Location & Requester Resident Info */}
      <View className="bg-muted/40 p-2.5 rounded-xl gap-1.5 mt-1">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={13} className="text-primary shrink-0" />
          <Text className="text-xs font-semibold text-foreground flex-1">
            {item.location?.flat || 'Unit'}
            {item.location?.building ? ` • ${item.location.building}` : ''}
          </Text>
        </View>
        <View className="flex-row items-center justify-between text-xs text-muted-foreground ms-4">
          <View className="flex-row items-center gap-1">
            <User size={11} className="text-muted-foreground" />
            <Text className="text-[11px] text-muted-foreground">{item.residentName || 'Resident'}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <UserCheck size={12} className={item.assignedTechnicianName ? 'text-status-success' : 'text-amber-500'} />
            <Text className="text-[11px] font-medium text-foreground">
              {item.assignedTechnicianName || 'Unassigned'}
            </Text>
          </View>
        </View>
      </View>

      {/* Manager Triage Action Row */}
      <View className="flex-row gap-2 pt-2 border-t border-border/40 mt-1">
        <Button
          variant="outline"
          size="sm"
          onPress={() => onStatusClick(item)}
          className="flex-1 flex-row items-center justify-center gap-1 h-9 rounded-xl border-border bg-muted/30"
          accessibilityLabel="Update Status"
        >
          <RefreshCw size={13} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">Status</Text>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onPress={() => onEscalateClick(item)}
          className="flex-1 flex-row items-center justify-center gap-1 h-9 rounded-xl bg-destructive/10 border-destructive/20"
          accessibilityLabel="Escalate Ticket"
        >
          <ShieldAlert size={13} className="text-destructive" />
          <Text className="text-xs font-bold text-destructive">Escalate</Text>
        </Button>

        {isUnassigned ? (
          <Button
            variant="default"
            size="sm"
            onPress={() => onAssignClick(item)}
            className="flex-1 flex-row items-center justify-center gap-1 h-9 rounded-xl"
            accessibilityLabel="Assign Staff"
          >
            <UserCheck size={13} className="text-primary-foreground" />
            <Text className="text-xs font-bold text-primary-foreground">Assign</Text>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onPress={() => onAssignClick(item)}
            className="flex-1 flex-row items-center justify-center gap-1 h-9 rounded-xl border-primary/30 bg-primary/5"
            accessibilityLabel="Reassign Staff"
          >
            <UserCheck size={13} className="text-primary" />
            <Text className="text-xs font-semibold text-primary">Reassign</Text>
          </Button>
        )}
      </View>
    </ListCard>
  );
};

export default ComplaintTriageCard;
