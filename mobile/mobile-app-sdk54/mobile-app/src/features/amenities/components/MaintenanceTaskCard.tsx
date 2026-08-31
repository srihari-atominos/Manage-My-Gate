import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { MaintenanceTask } from '../store/amenitySlice';
import { cn } from '@/lib/utils';

export interface MaintenanceTaskCardProps {
  task: MaintenanceTask;
  facilityImageUrl?: string;
  onEdit?: (task: MaintenanceTask) => void;
  onDelete?: (task: MaintenanceTask) => void;
  className?: string;
}

const statusVariantMap: Record<string, StatusVariant> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
};

export function MaintenanceTaskCard({
  task,
  facilityImageUrl,
  onEdit,
  onDelete,
  className,
}: MaintenanceTaskCardProps) {
  const statusRaw = (task.status || 'scheduled').toLowerCase();
  const formattedDates = `${task.startDate} to ${task.endDate}${
    task.startTime ? ` • ${task.startTime} - ${task.endTime || ''}` : ''
  }`;

  return (
    <ListCard
      key={task._id}
      title={`${task.amenityName || 'Facility'} • ${task.title}`}
      subtitle={`Schedule: ${formattedDates}\nStaff: ${task.assignedStaff || 'Unassigned'}`}
      backgroundImage={facilityImageUrl}
      leftIcon="Wrench"
      leftIconBgColor={facilityImageUrl ? 'rgba(255,255,255,0.2)' : 'bg-status-warning/15'}
      status={{
        label: statusRaw.replace('_', ' ').toUpperCase(),
        variant: statusVariantMap[statusRaw] || 'neutral',
      }}
      className={cn('mb-3', className)}
    >
      <View className="flex-row justify-end gap-2 pt-2 border-t border-border/40 mt-1">
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => onEdit(task)}
            className="py-1 px-3 border-primary/30 bg-primary/10"
            accessibilityLabel={`Edit maintenance task ${task.title}`}
          >
            <Text className="text-primary text-xs font-bold">Edit Task</Text>
          </Button>
        )}

        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onPress={() => onDelete(task)}
            className="py-1 px-3"
            accessibilityLabel={`Delete maintenance task ${task.title}`}
          >
            <Text className="text-destructive-foreground text-xs font-semibold">Delete</Text>
          </Button>
        )}
      </View>
    </ListCard>
  );
}

export default MaintenanceTaskCard;
