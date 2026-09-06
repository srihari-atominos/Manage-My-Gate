import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { TriageTicket } from '../hooks/useComplaintTriage';
import { MapPin, User, Clock, Wrench, UserCheck, Radio } from 'lucide-react-native';

interface TicketDispatchCardProps {
  item: TriageTicket;
  onAssignPress: (item: TriageTicket) => void;
  onBroadcastPress?: (item: TriageTicket) => void;
}

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

export const TicketDispatchCard: React.FC<TicketDispatchCardProps> = ({
  item,
  onAssignPress,
  onBroadcastPress,
}) => {
  const priorityVariant = mapPriorityVariant(item.priority);

  return (
    <ListCard
      title={item.title}
      subtitle={`${item.complaintNumber} • ${item.category}`}
      leftIcon="Wrench"
      leftIconBgColor="bg-destructive/10"
      status={{ label: 'NEEDS DISPATCH', variant: 'danger' }}
    >
      {/* Priority Pill & SLA */}
      <View className="flex-row items-center justify-between pt-1 border-t border-border/40">
        <StatusBadge label={item.priority.toUpperCase()} variant={priorityVariant} size="sm" />
        {item.slaDueDate && (
          <View className="flex-row items-center gap-1">
            <Clock size={12} className="text-muted-foreground" />
            <Text className="text-[11px] text-muted-foreground">
              Target SLA: {new Date(item.slaDueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>

      {/* Location & Specialty Match */}
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
          <View className="flex-row items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-md">
            <Wrench size={11} className="text-primary" />
            <Text className="text-[11px] font-bold text-primary">Needs {item.category || 'Specialist'}</Text>
          </View>
        </View>
      </View>

      {/* Dispatch Action Row */}
      <View className="flex-row gap-2 pt-2 border-t border-border/40 mt-1">
        {onBroadcastPress && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => onBroadcastPress(item)}
            className="flex-row items-center justify-center gap-1.5 h-10 px-3 rounded-xl border-primary/30 bg-primary/5"
            accessibilityLabel="Broadcast to Team"
          >
            <Radio size={14} className="text-primary" />
            <Text className="text-xs font-semibold text-primary">Broadcast</Text>
          </Button>
        )}

        <Button
          variant="default"
          size="sm"
          onPress={() => onAssignPress(item)}
          className="flex-1 flex-row items-center justify-center gap-1.5 h-10 rounded-xl"
          accessibilityLabel="Assign Technician"
        >
          <UserCheck size={14} className="text-primary-foreground" />
          <Text className="text-xs font-bold text-primary-foreground">Assign Staff</Text>
        </Button>
      </View>
    </ListCard>
  );
};

export default TicketDispatchCard;
