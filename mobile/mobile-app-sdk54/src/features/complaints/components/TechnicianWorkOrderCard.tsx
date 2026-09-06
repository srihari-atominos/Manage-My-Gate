import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { Wrench, MapPin, Clock, Play, Pause, CheckCircle2, Phone } from 'lucide-react-native';
import { WorkOrderItem } from '../hooks/useTechnicianWorkbench';

export interface TechnicianWorkOrderCardProps {
  item: WorkOrderItem;
  onAccept?: (id: string) => void;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onComplete?: (id: string) => void;
}

const mapWorkOrderStatus = (status: string): { label: string; variant: StatusVariant } => {
  switch (status) {
    case 'In Progress':
      return { label: 'IN PROGRESS', variant: 'warning' };
    case 'Work Completed':
    case 'Completed':
      return { label: 'WORK COMPLETED', variant: 'success' };
    case 'On Hold':
      return { label: 'ON HOLD', variant: 'neutral' };
    case 'Assigned':
    case 'Accepted':
    default:
      return { label: 'ASSIGNED', variant: 'info' };
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

export const TechnicianWorkOrderCard: React.FC<TechnicianWorkOrderCardProps> = ({
  item,
  onAccept,
  onStart,
  onPause,
  onResume,
  onComplete,
}) => {
  const statusMeta = mapWorkOrderStatus(item.status);
  const priorityVariant = mapPriorityVariant(item.priority);

  const isAssigned = item.status === 'Assigned';
  const isInProgress = item.status === 'In Progress';
  const isOnHold = item.status === 'On Hold';
  const isCompleted = item.status === 'Work Completed' || item.status === 'Completed';

  return (
    <ListCard
      title={item.title}
      subtitle={`${item.complaintNumber} • ${item.category}`}
      leftIcon="Wrench"
      leftIconBgColor="bg-primary/10"
      status={{ label: statusMeta.label, variant: statusMeta.variant }}
    >
      {/* Priority Pill & Category Row */}
      <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
        <StatusBadge label={item.priority.toUpperCase()} variant={priorityVariant} size="sm" />
        {item.slaDueDate && (
          <View className="flex-row items-center gap-1">
            <Clock size={12} className="text-muted-foreground" />
            <Text className="text-[11px] text-muted-foreground">
              SLA Due: {new Date(item.slaDueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>

      {/* Location & Resident Details */}
      <View className="bg-muted/40 p-2.5 rounded-xl gap-1.5 mt-1">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={13} className="text-primary shrink-0" />
          <Text className="text-xs font-semibold text-foreground flex-1">
            {item.location?.flat || 'Unit Location'}
            {item.location?.building ? ` • ${item.location.building}` : ''}
            {item.location?.exactLocation ? ` (${item.location.exactLocation})` : ''}
          </Text>
        </View>
        {item.residentName && (
          <View className="flex-row items-center justify-between text-xs text-muted-foreground ms-4">
            <Text className="text-[11px] text-muted-foreground">Resident: {item.residentName}</Text>
            {item.residentMobile && (
              <View className="flex-row items-center gap-1">
                <Phone size={11} className="text-muted-foreground" />
                <Text className="text-[11px] text-primary font-medium">{item.residentMobile}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Technician Action Buttons Row */}
      {!isCompleted && (
        <View className="flex-row gap-2 pt-2 border-t border-border/40 mt-1">
          {isAssigned && onAccept && (
            <Button
              variant="default"
              size="sm"
              onPress={() => onAccept(item._id)}
              className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl"
              accessibilityLabel="Accept Work Order"
            >
              <Play size={14} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Accept & Start</Text>
            </Button>
          )}

          {isInProgress && (
            <>
              {onPause && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => onPause(item._id)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl bg-amber-500/10 border-amber-500/20"
                  accessibilityLabel="Pause Job"
                >
                  <Pause size={14} className="text-amber-600 dark:text-amber-400" />
                  <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">Pause Job</Text>
                </Button>
              )}
              {onComplete && (
                <Button
                  variant="default"
                  size="sm"
                  onPress={() => onComplete(item._id)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl"
                  accessibilityLabel="Complete Job"
                >
                  <CheckCircle2 size={14} className="text-primary-foreground" />
                  <Text className="text-xs font-bold text-primary-foreground">Complete & Proof</Text>
                </Button>
              )}
            </>
          )}

          {isOnHold && onResume && (
            <Button
              variant="default"
              size="sm"
              onPress={() => onResume(item._id)}
              className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl"
              accessibilityLabel="Resume Job"
            >
              <Play size={14} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Resume Job</Text>
            </Button>
          )}
        </View>
      )}

      {isCompleted && (
        <View className="flex-row items-center gap-1.5 bg-status-success/10 border border-status-success/20 p-2.5 rounded-xl mt-1">
          <CheckCircle2 size={14} className="text-status-success" />
          <Text className="text-xs font-bold text-status-success">Resolution Submitted • Waiting Resident Sign-Off</Text>
        </View>
      )}
    </ListCard>
  );
};

export default TechnicianWorkOrderCard;
