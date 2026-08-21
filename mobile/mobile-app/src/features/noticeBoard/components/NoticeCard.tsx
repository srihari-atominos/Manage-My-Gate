import React from 'react';
import { View } from 'react-native';
import { Heart, Pin, Globe, Archive, Edit, Trash2 } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { IconButton } from '@/components/common/IconButton';

export interface NoticeItem {
  _id: string;
  title: string;
  description?: string;
  category?: 'Emergency' | 'Maintenance' | 'Events' | 'Meetings' | 'General' | string;
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low' | 'Normal' | string;
  status?: 'Draft' | 'Published' | 'Archived' | 'Expired' | string;
  isPinned?: boolean;
  isBookmarkedByUser?: boolean;
  isReadByUser?: boolean;
  createdAt?: string;
}

export interface NoticeCardProps {
  notice: NoticeItem;
  onPress?: (notice: NoticeItem) => void;
  onBookmarkToggle?: (id: string, isBookmarked: boolean) => void;
  onPinToggle?: (id: string, isPinned: boolean) => void;
  onStatusChange?: (id: string, status: string) => void;
  onEditPress?: (id: string) => void;
  onDeletePress?: (id: string) => void;
  isAdmin?: boolean;
  canPin?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

/**
 * NoticeCard Component
 * Canonical ListCard wrapper handling both Resident and Admin notice rendering.
 * Fully tokenized with theme colors, status badges, and accessory actions.
 */
export function NoticeCard({
  notice,
  onPress,
  onBookmarkToggle,
  onPinToggle,
  onStatusChange,
  onEditPress,
  onDeletePress,
  isAdmin = false,
  canPin = false,
  canUpdate = false,
  canDelete = false,
}: NoticeCardProps) {
  const isBookmarked = notice?.isBookmarkedByUser;
  const isPinned = notice?.isPinned;
  const status = notice?.status;

  // Map category to Lucide Icon string names for ListCard leftIcon mapping
  const getCategoryIconName = (category?: string) => {
    switch (category) {
      case 'Emergency': return 'ShieldAlert';
      case 'Maintenance': return 'Wrench';
      case 'Events': return 'Calendar';
      case 'Meetings': return 'Building2';
      default: return 'Megaphone';
    }
  };

  const getCategoryBgClass = (category?: string) => {
    switch (category) {
      case 'Emergency': return 'bg-destructive/15';
      case 'Maintenance': return 'bg-status-warning/15';
      case 'Events': return 'bg-primary/10';
      case 'Meetings': return 'bg-status-info/15';
      default: return 'bg-muted';
    }
  };

  const rightContent = (
    <View className="flex-row items-center gap-2">
      {/* If Admin and canPin, show pin status button */}
      {isAdmin && (canPin || isPinned) ? (
        <IconButton
          icon={Pin}
          size="sm"
          variant={isPinned ? 'default' : 'ghost'}
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onPinToggle?.(notice?._id, !!isPinned);
          }}
          accessibilityLabel="Toggle Pin Notice"
        />
      ) : null}

      {/* Admin Publish/Unarchive Action */}
      {isAdmin && canUpdate && (status === 'Draft' || status === 'Archived' || status === 'Expired') ? (
        <IconButton
          icon={Globe}
          size="sm"
          variant="secondary"
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onStatusChange?.(notice?._id, 'Published');
          }}
          accessibilityLabel="Publish Notice"
        />
      ) : null}

      {/* Admin Archive Action */}
      {isAdmin && canUpdate && status === 'Published' ? (
        <IconButton
          icon={Archive}
          size="sm"
          variant="secondary"
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onStatusChange?.(notice?._id, 'Archived');
          }}
          accessibilityLabel="Archive Notice"
        />
      ) : null}

      {/* Admin Edit Action */}
      {isAdmin && canUpdate ? (
        <IconButton
          icon={Edit}
          size="sm"
          variant="secondary"
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onEditPress?.(notice?._id);
          }}
          accessibilityLabel="Edit Notice"
        />
      ) : null}

      {/* Admin Delete Action */}
      {isAdmin && canDelete ? (
        <IconButton
          icon={Trash2}
          size="sm"
          variant="destructive"
          onPress={(e: any) => {
            e?.stopPropagation?.();
            onDeletePress?.(notice?._id);
          }}
          accessibilityLabel="Delete Notice"
        />
      ) : null}

      {/* Action buttons for residents */}
      {!isAdmin && (
        <View className="flex-row items-center gap-2">
          {onBookmarkToggle && (
            <IconButton
              icon={Heart}
              size="md"
              variant="ghost"
              onPress={(e: any) => {
                e?.stopPropagation?.();
                onBookmarkToggle(notice?._id, !isBookmarked);
              }}
              iconClassName={isBookmarked ? 'text-destructive fill-destructive' : ''}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isBookmarked }}
              accessibilityLabel="Bookmark notice"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            onPress={() => onPress?.(notice)}
          >
            <Text className="text-xs font-semibold">View</Text>
          </Button>
        </View>
      )}
    </View>
  );

  const formatSubtitle = () => {
    if (isAdmin) {
      return `Status: ${status || 'Unknown'} | Priority: ${notice?.priority || 'Unknown'}`;
    }
    const parts = [];
    if (notice?.category) parts.push(notice.category);
    if (notice?.priority && notice.priority !== 'Normal') parts.push(notice.priority);
    return parts.length > 0 ? parts.join(' • ') : (notice?.description || '');
  };

  return (
    <ListCard
      title={notice?.title || ''}
      subtitle={formatSubtitle()}
      timestamp={notice?.createdAt}
      leftIcon={getCategoryIconName(notice?.category)}
      leftIconBgColor={getCategoryBgClass(notice?.category)}
      status={
        isAdmin
          ? { label: notice?.category || '', variant: 'neutral' }
          : notice?.priority ? { label: notice.priority, variant: getStatusVariant(notice.priority) } : undefined
      }
      rightContent={rightContent}
      onPress={() => onPress?.(notice)}
    />
  );
}

export default NoticeCard;
