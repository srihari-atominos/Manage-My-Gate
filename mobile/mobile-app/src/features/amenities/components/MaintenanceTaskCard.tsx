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
  cancelled: 'danger',
};

export function MaintenanceTaskCard({
  task,
  facilityImageUrl,
  onEdit,
  onDelete,
  className,
}: MaintenanceTaskCardProps) {
  const statusRaw = (task.status || 'scheduled').toLowerCase();

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const formattedDates =
    task.startDateTime && task.endDateTime
      ? `${formatDateTime(task.startDateTime)} – ${formatDateTime(task.endDateTime)}`
      : (task as any).startDate && (task as any).endDate
      ? `${(task as any).startDate} to ${(task as any).endDate}`
      : 'Scheduled Window';

  const title = task.reason || (task as any).title || 'Routine Maintenance';
  const closureType = task.isCompleteClosure === false ? 'Partial Closure' : 'Full Closure';
  const capacityInfo =
    task.isCompleteClosure === false && task.degradedCapacity
      ? ` (Cap: ${task.degradedCapacity})`
      : '';

  return (
    <ListCard
      key={task._id}
      title={`${task.amenityName || 'Facility'} • ${title}`}
      subtitle={`Schedule: ${formattedDates}\nType: ${closureType}${capacityInfo}`}
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
        {onEdit && statusRaw !== 'cancelled' && statusRaw !== 'completed' && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => onEdit(task)}
            className="py-1 px-3 border-blue-500/30 bg-blue-500/10 active:bg-blue-500/20"
            accessibilityLabel={`Edit maintenance task ${title}`}
          >
            <Text className="text-blue-600 dark:text-blue-400 text-xs font-bold">Edit Task</Text>
          </Button>
        )}

        {onDelete && statusRaw !== 'cancelled' && statusRaw !== 'completed' && (
          <Button
            variant="destructive"
            size="sm"
            onPress={() => onDelete(task)}
            className="py-1 px-3 bg-red-600 active:bg-red-700"
            accessibilityLabel={`Cancel maintenance task ${title}`}
          >
            <Text className="text-white text-xs font-semibold">Cancel Block</Text>
          </Button>
        )}
      </View>
    </ListCard>
  );
}

export default MaintenanceTaskCard;
