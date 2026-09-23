import React from 'react';
import { View } from 'react-native';
import { ListCard, formatDate } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Pin, CheckSquare, Users, Shield, BarChart2, Clock } from 'lucide-react-native';

export interface EngagementCardItem {
  id: string;
  type: 'NOTICE' | 'POLL';
  title: string;
  subtitle: string;
  description?: string;
  status: string;
  priority?: string;
  category?: string;
  isPinned?: boolean;
  requiresAcknowledgement?: boolean;
  targetAudience?: any;
  votingMode?: string;
  choiceType?: string;
  votesCount?: number;
  optionsCount?: number;
  createdAt: string;
  expiryDate?: string;
  route: string;
}

export interface EngagementCardProps {
  item: EngagementCardItem;
  onPress: () => void;
  className?: string;
}

const getStatusBadgeVariant = (status: string, priority?: string): StatusVariant => {
  if (priority === 'Critical' || priority === 'High') return 'danger';
  const s = (status || '').toUpperCase();
  if (s === 'PUBLISHED' || s === 'ACTIVE') return 'success';
  if (s === 'DRAFT') return 'warning';
  if (s === 'SCHEDULED') return 'info';
  return 'neutral';
};

const getAudienceLabel = (targetAudience?: any): string => {
  if (!targetAudience) return 'All Community';
  const type = (targetAudience.targetType || 'ALL').toUpperCase();
  if (type === 'OWNERS_ONLY') return 'Owners Only';
  if (type === 'STAFF_ONLY') return 'Staff & Security';
  if (type === 'SPECIFIC_ROLE' || type === 'ROLES') return 'Role Targeted';
  if (type === 'SPECIFIC_RESIDENT' || type === 'CUSTOM') return 'Direct Resident';
  if (type === 'BLOCKS') return 'Block Specific';
  if (type === 'RESIDENCY_TYPES') {
    const res = targetAudience.targetResidencyTypes || [];
    if (res.includes('Owner')) return 'Owners Only';
    if (res.includes('Tenant')) return 'Tenants Only';
  }
  return 'All Community';
};

const getExpiryTimeRemaining = (expiryDate?: string): string | null => {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return null;

  const diffMs = exp.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `Expires in ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Expires in ${diffDays}d`;
};

export const EngagementCard: React.FC<EngagementCardProps> = ({
  item,
  onPress,
  className = '',
}) => {
  const isNotice = item.type === 'NOTICE';
  const audienceLabel = getAudienceLabel(item.targetAudience);
  const expiryLabel = getExpiryTimeRemaining(item.expiryDate);

  return (
    <ListCard
      title={item.title}
      subtitle={item.subtitle}
      leftIcon={isNotice ? 'Megaphone' : 'BarChart3'}
      leftIconBgColor={isNotice ? 'bg-primary/10' : 'bg-sky-500/10'}
      leftIconColor={isNotice ? '#6366f1' : '#0ea5e9'}
      status={{
        label: item.status,
        variant: getStatusBadgeVariant(item.status, item.priority),
      }}
      secondaryBadge={{
        label: isNotice ? 'Notice' : 'Poll',
        variant: isNotice ? 'info' : 'gold',
      }}
      timestamp={formatDate(item.createdAt)}
      disableRelativeTime={true}
      showChevron={true}
      onPress={onPress}
      className={className}
    >
      {/* Enhanced Secondary Meta Row */}
      <View className="flex-row flex-wrap items-center gap-1.5 pt-2 mt-2 border-t border-border/40">
        {/* Pinned Pill */}
        {isNotice && item.isPinned ? (
          <View className="flex-row items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30">
            <Icon as={Pin} size={11} className="text-amber-600 dark:text-amber-400 me-1" />
            <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
              Pinned
            </Text>
          </View>
        ) : null}

        {/* Sign-off Required Pill */}
        {isNotice && item.requiresAcknowledgement ? (
          <View className="flex-row items-center px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30">
            <Icon as={CheckSquare} size={11} className="text-blue-500 me-1" />
            <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
              Sign-off Req
            </Text>
          </View>
        ) : null}

        {/* Target Audience Scope */}
        <View className="flex-row items-center px-2 py-0.5 rounded-md bg-muted/60 border border-border/70">
          <Icon as={Users} size={11} className="text-muted-foreground me-1" />
          <Text className="text-[10px] font-medium text-foreground/80">{audienceLabel}</Text>
        </View>

        {/* Poll Voting Mode */}
        {!isNotice ? (
          <View className="flex-row items-center px-2 py-0.5 rounded-md bg-muted/60 border border-border/70">
            <Icon
              as={item.votingMode === 'ANONYMOUS' ? Shield : BarChart2}
              size={11}
              className="text-muted-foreground me-1"
            />
            <Text className="text-[10px] font-medium text-foreground/80">
              {item.votingMode === 'ANONYMOUS' ? 'Anonymous' : 'Public'}
            </Text>
          </View>
        ) : null}

        {/* Expiry / Countdown Timer */}
        {expiryLabel ? (
          <View className="flex-row items-center px-2 py-0.5 rounded-md bg-muted/40 ms-auto">
            <Icon as={Clock} size={10} className="text-muted-foreground me-1" />
            <Text className="text-[10px] font-medium text-muted-foreground">{expiryLabel}</Text>
          </View>
        ) : null}
      </View>
    </ListCard>
  );
};

export default EngagementCard;
