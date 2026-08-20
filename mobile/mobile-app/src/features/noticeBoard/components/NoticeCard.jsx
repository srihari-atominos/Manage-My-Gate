import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Heart, Pin, Globe, Archive, Edit, Trash2 } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/common/IconButton';

/**
 * NoticeCard Component
 * Unified wrapper for global ListCard handling both Resident and Admin notice rendering.
 */
export function NoticeCard({
  notice,
  onPress,
  onBookmarkToggle,
  onPinToggle,
  onStatusChange,
  onEditPress,
  onDeletePress,
  isAdmin,
  canPin,
  canUpdate,
  canDelete
}) {
  const isBookmarked = notice?.isBookmarkedByUser;
  const isPinned = notice?.isPinned;
  const status = notice?.status;

  // Map category to Lucide Icon string names for ListCard leftIcon mapping
  const getCategoryIconName = (category) => {
    switch (category) {
      case 'Emergency': return 'ShieldAlert';
      case 'Maintenance': return 'Wrench';
      case 'Events': return 'Calendar';
      case 'Meetings': return 'Building2';
      default: return 'Megaphone';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Emergency': return '#fee2e2'; // Light destructive
      case 'Maintenance': return '#ffedd5'; // Light orange
      case 'Events': return '#dbeafe'; // Light blue
      case 'Meetings': return '#f3e8ff'; // Light purple
      default: return '#f5f5f5'; // Light neutral
    }
  };

  const getCategoryIconColor = (category) => {
    switch (category) {
      case 'Emergency': return '#dc2626'; // Destructive
      case 'Maintenance': return '#ea580c'; // Orange
      case 'Events': return '#2563eb'; // Blue
      case 'Meetings': return '#9333ea'; // Purple
      default: return '#737373'; // Neutral
    }
  };
  const rightContent = (
    <View className="flex-row items-center gap-2">
      {/* If Admin and canPin, show pin status button */}
      {isAdmin && (canPin || isPinned) ? (
        <IconButton
          icon={Pin}
          size="sm"
          variant={isPinned ? 'primary' : 'ghost'}
          onPress={(e) => { e.stopPropagation(); onPinToggle?.(notice?._id, isPinned); }}
          accessibilityLabel="Toggle Pin Notice"
        />
      ) : null}

      {/* Admin Publish/Unarchive Action */}
      {isAdmin && canUpdate && (status === 'Draft' || status === 'Archived' || status === 'Expired') ? (
        <IconButton
          icon={Globe}
          size="sm"
          variant="secondary"
          onPress={(e) => { e.stopPropagation(); onStatusChange?.(notice?._id, 'Published'); }}
          accessibilityLabel="Publish Notice"
        />
      ) : null}

      {/* Admin Archive Action */}
      {isAdmin && canUpdate && status === 'Published' ? (
        <IconButton
          icon={Archive}
          size="sm"
          variant="secondary"
          onPress={(e) => { e.stopPropagation(); onStatusChange?.(notice?._id, 'Archived'); }}
          accessibilityLabel="Archive Notice"
        />
      ) : null}

      {/* Admin Edit Action */}
      {isAdmin && canUpdate ? (
        <IconButton
          icon={Edit}
          size="sm"
          variant="secondary"
          onPress={(e) => { e.stopPropagation(); onEditPress?.(notice?._id); }}
          accessibilityLabel="Edit Notice"
        />
      ) : null}

      {/* Admin Delete Action */}
      {isAdmin && canDelete ? (
        <IconButton
          icon={Trash2}
          size="sm"
          variant="destructive"
          onPress={(e) => { e.stopPropagation(); onDeletePress?.(notice?._id); }}
          accessibilityLabel="Delete Notice"
        />
      ) : null}

      {/* Action button for residents (matches VisitorPassCard) */}
      {!isAdmin && (
        <View className="flex-row items-center gap-2">
          {onBookmarkToggle && (
            <IconButton
              icon={Heart}
              size="md"
              variant="ghost"
              onPress={(e) => { e.stopPropagation(); onBookmarkToggle?.(notice?._id, !isBookmarked); }}
              iconClassName={isBookmarked ? 'text-red-500 fill-red-500' : ''}
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
            View
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
      leftIconBgColor={getCategoryColor(notice?.category)}
      leftIconColor={getCategoryIconColor(notice?.category)}
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
