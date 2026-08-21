import React from 'react';
import { AlertTriangle, Info } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';

export interface ActivityLogItemProps {
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string | Date;
  isLastItem?: boolean;
  variant?: 'card' | 'row';
  onPress?: () => void;
  className?: string;
}

const mapNoticeStatusVariant = (status: string, priority: string): StatusVariant => {
  const p = (priority || '').toUpperCase();
  const s = (status || '').toUpperCase();
  if (p === 'CRITICAL' || p === 'HIGH' || p === 'URGENT' || s === 'URGENT') {
    return 'danger';
  }
  if (s === 'ACTIVE' || s === 'PUBLISHED' || s === 'LIVE') {
    return 'success';
  }
  if (s === 'DRAFT' || s === 'PENDING') {
    return 'warning';
  }
  if (s === 'EXPIRED' || s === 'ARCHIVED') {
    return 'neutral';
  }
  return 'info';
};

export const ActivityLogItem = ({
  title,
  category,
  priority,
  status,
  createdAt,
  isLastItem = false,
  variant = 'card',
  onPress,
  className,
}: ActivityLogItemProps) => {
  const isEmergency = category === 'Emergency' || priority === 'High' || priority === 'Critical';
  const statusVariant = mapNoticeStatusVariant(status, priority);

  return (
    <ListCard
      title={title}
      subtitle={`${category} • ${priority} Priority`}
      leftIcon={isEmergency ? AlertTriangle : Info}
      leftIconBgColor={
        isEmergency
          ? 'bg-destructive/10 border border-destructive/20'
          : 'bg-primary/10 border border-primary/20'
      }
      leftIconColor={isEmergency ? '#ef4444' : '#6366f1'}
      status={{
        label: status || 'ACTIVE',
        variant: statusVariant,
      }}
      timestamp={createdAt}
      variant={variant}
      isLastItem={isLastItem}
      onPress={onPress}
      className={className}
    />
  );
};

export default ActivityLogItem;

