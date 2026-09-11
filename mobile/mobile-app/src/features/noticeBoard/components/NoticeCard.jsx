import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Heart, Pin, Globe, Archive, Edit, Trash2, ShieldAlert } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { getStatusVariant } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';

/**
 * NoticeCard Component
 * Structured card layout matching Visitor Management standards.
 * Card header displays Category Icon, Notice Title, Subtitle, and StatusBadge with full width.
 * Description preview and Admin Action Buttons are positioned in a dedicated bottom row.
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
  canDelete,
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

  const getNoticeStatusVariant = (st) => {
    switch (st) {
      case 'Published': return 'success';
      case 'Scheduled': return 'info';
      case 'Draft': return 'secondary';
      case 'Expired': return 'warning';
      case 'Archived': return 'muted';
      default: return 'neutral';
    }
  };

  const formatSubtitle = () => {
    const details = [];
    if (notice?.category) details.push(notice.category);
    if (notice?.priority && notice.priority !== 'Normal') {
      details.push(`Priority: ${notice.priority}`);
    }
    if (notice?.scheduleDate && status === 'Scheduled') {
      details.push(`Scheduled: ${new Date(notice.scheduleDate).toLocaleDateString()}`);
    } else if (notice?.expiryDate) {
      details.push(`Expires: ${new Date(notice.expiryDate).toLocaleDateString()}`);
    }
    return details.join(' • ');
  };

  const computeStatusBadge = () => {
    if (notice?.isCritical) {
      return { label: 'Critical', variant: 'danger' };
    }
    if (status) {
      return { label: status, variant: getNoticeStatusVariant(status) };
    }
    return notice?.priority ? { label: notice.priority, variant: getStatusVariant(notice.priority) } : undefined;
  };

  return (
    <ListCard
      title={notice?.title || ''}
      subtitle={formatSubtitle()}
      timestamp={notice?.createdAt}
      leftIcon={getCategoryIconName(notice?.category)}
      leftIconBgColor={notice?.isCritical ? '#fee2e2' : getCategoryColor(notice?.category)}
      leftIconColor={notice?.isCritical ? '#dc2626' : getCategoryIconColor(notice?.category)}
      status={computeStatusBadge()}
      onPress={() => onPress?.(notice)}
      className="mb-3"
    >
      <View className="pt-2 border-t border-border/40 gap-2 mt-2">
        {/* Notice Description Snippet */}
        {notice?.description ? (
          <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => onPress?.(notice)}
          >
            <Text
              variant="muted"
              numberOfLines={2}
              className="text-xs text-muted-foreground/90 font-sans leading-relaxed"
            >
              {notice.description}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Status Pills / Badges (Pinned, Critical, Acknowledgement) */}
        {(isPinned || notice?.isCritical || notice?.requiresAcknowledgement) && (
          <View className="flex-row flex-wrap items-center gap-1.5 pt-0.5">
            {isPinned && (
              <View className="flex-row items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                <Pin size={11} color="#d97706" />
                <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Pinned to Top
                </Text>
              </View>
            )}
            {notice?.isCritical && (
              <View className="flex-row items-center gap-1 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md">
                <ShieldAlert size={11} color="#dc2626" />
                <Text className="text-[10px] font-bold text-red-600 dark:text-red-400">
                  Critical Alert
                </Text>
              </View>
            )}
            {notice?.requiresAcknowledgement && (
              <View className="flex-row items-center gap-1 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-md">
                <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  {notice.hasAcknowledged ? '✓ Confirmed' : 'Ack Required'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Admin Dedicated Action Button Row */}
        {isAdmin ? (
          <View className="flex-row items-center justify-end pt-2 border-t border-border/30 mt-0.5">
            {/* Quick Action Icons */}
            <View className="flex-row items-center gap-1.5">
              {/* Pin Action */}
              {canPin && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onPinToggle?.(notice?._id, isPinned);
                  }}
                  activeOpacity={0.7}
                  className={`w-8 h-8 rounded-lg items-center justify-center border ${
                    isPinned
                      ? 'bg-amber-500/20 border-amber-500/40'
                      : 'bg-muted/40 border-border/60'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Pin Notice"
                >
                  <Pin size={15} color={isPinned ? '#d97706' : '#64748b'} />
                </TouchableOpacity>
              )}

              {/* Publish / Unarchive Action */}
              {canUpdate && (status === 'Draft' || status === 'Archived' || status === 'Expired') && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onStatusChange?.(notice?._id, 'Published');
                  }}
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-lg items-center justify-center border bg-emerald-500/15 border-emerald-500/30"
                  accessibilityRole="button"
                  accessibilityLabel="Publish Notice"
                >
                  <Globe size={15} color="#059669" />
                </TouchableOpacity>
              )}

              {/* Archive Action */}
              {canUpdate && status === 'Published' && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onStatusChange?.(notice?._id, 'Archived');
                  }}
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-lg items-center justify-center border bg-muted/40 border-border/60"
                  accessibilityRole="button"
                  accessibilityLabel="Archive Notice"
                >
                  <Archive size={15} color="#64748b" />
                </TouchableOpacity>
              )}

              {/* Edit Action */}
              {canUpdate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onEditPress?.(notice?._id);
                  }}
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-lg items-center justify-center border bg-blue-500/15 border-blue-500/30"
                  accessibilityRole="button"
                  accessibilityLabel="Edit Notice"
                >
                  <Edit size={15} color="#2563eb" />
                </TouchableOpacity>
              )}

              {/* Delete Action */}
              {canDelete && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onDeletePress?.(notice?._id);
                  }}
                  activeOpacity={0.7}
                  className="w-8 h-8 rounded-lg items-center justify-center border bg-destructive/15 border-destructive/30"
                  accessibilityRole="button"
                  accessibilityLabel="Delete Notice"
                >
                  <Trash2 size={15} color="#dc2626" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Resident Action Row */
          <View className="flex-row items-center justify-between pt-1 mt-0.5">
            <Text className="text-[11px] text-muted-foreground font-medium">
              {notice?.readerCount || notice?.readBy?.length || 0} read{(notice?.readerCount || notice?.readBy?.length) === 1 ? '' : 's'}
            </Text>
            <View className="flex-row items-center gap-3">
              {onBookmarkToggle && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onBookmarkToggle?.(notice?._id, !isBookmarked);
                  }}
                  activeOpacity={0.7}
                  className="p-1"
                  accessibilityRole="button"
                  accessibilityLabel="Bookmark notice"
                >
                  <Heart
                    size={16}
                    color={isBookmarked ? '#ef4444' : '#94a3b8'}
                    fill={isBookmarked ? '#ef4444' : 'none'}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onPress?.(notice)}
                accessibilityRole="button"
                accessibilityLabel="Read full notice"
              >
                <Text className="text-xs font-bold text-primary">Read More →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ListCard>
  );
}

export default NoticeCard;
