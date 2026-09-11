import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Heart, Pin, Globe, Archive, Edit, Trash2, ShieldAlert, AlertTriangle, ChevronRight, Eye, Users } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/src/utils/i18n';

/**
 * NoticeCard Component
 * Structured card layout matching Visitor Management standards (VisitorPassCard pattern).
 * Displays Category Icon, Notice Title, Subtitle, StatusBadge, and dedicated right CTA Button.
 * Bottom details contain urgency banner, description preview, acknowledgement status, and action controls.
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
  const { t } = useTranslation();
  const isBookmarked = notice?.isBookmarkedByUser;
  const isPinned = notice?.isPinned;
  const status = notice?.status;
  const reactionCounts = notice?.reactionCounts || notice?.reactions || {};
  const helpfulCount = (reactionCounts.HELPFUL || 0) + (reactionCounts.LIKE || 0);
  const importantCount = (reactionCounts.IMPORTANT || 0) + (reactionCounts.LOVE || 0);
  const thanksCount = (reactionCounts.THANKS || 0) + (reactionCounts.APPLAUD || 0);

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
    if (notice?.scheduleDate && status === 'Scheduled') {
      details.push(`Scheduled: ${new Date(notice.scheduleDate).toLocaleDateString()}`);
    } else if (notice?.expiryDate) {
      details.push(`Expires: ${new Date(notice.expiryDate).toLocaleDateString()}`);
    }
    return details.join(' • ');
  };

  const isHighNotice = notice?.priority === 'High';
  const isMediumNotice = notice?.priority === 'Medium';
  const isLowNotice = notice?.priority === 'Low';

  // Primary badge priority
  const computeStatusBadge = () => {
    if (isHighNotice) {
      return { label: 'HIGH PRIORITY', variant: 'warning' };
    }
    if (isAdmin && status && status !== 'Published') {
      return { label: status, variant: getNoticeStatusVariant(status) };
    }
    if (isMediumNotice) {
      return { label: 'MEDIUM', variant: 'info' };
    }
    if (isLowNotice) {
      return { label: 'LOW', variant: 'neutral' };
    }
    return status ? { label: status, variant: getNoticeStatusVariant(status) } : undefined;
  };

  // Secondary badge: for admins or when status adds extra context
  const computeSecondaryBadge = () => {
    if (isAdmin && isHighNotice && status) {
      return { label: status, variant: getNoticeStatusVariant(status) };
    }
    return undefined;
  };

  // Border & background urgency styling
  const cardBorderClass = isHighNotice
    ? 'border-s-4 border-s-amber-500 border-amber-500/30 dark:border-amber-500/40 bg-amber-500/[0.02]'
    : 'border-border/80';

  return (
    <ListCard
      title={notice?.title || ''}
      subtitle={formatSubtitle()}
      timestamp={notice?.createdAt}
      leftIcon={getCategoryIconName(notice?.category)}
      leftIconBgColor={isHighNotice ? '#fef3c7' : getCategoryColor(notice?.category)}
      leftIconColor={isHighNotice ? '#d97706' : getCategoryIconColor(notice?.category)}
      status={computeStatusBadge()}
      secondaryBadge={computeSecondaryBadge()}
      onPress={() => onPress?.(notice)}
      rightContent={
        !isAdmin ? (
          <Button
            variant="info"
            size="sm"
            onPress={(e) => {
              e?.stopPropagation?.();
              onPress?.(notice);
            }}
            className="flex-row items-center gap-1 h-8 px-2.5 rounded-lg shrink-0"
            accessibilityRole="button"
            accessibilityLabel={t('read_notice', 'Read Notice')}
          >
            <ChevronRight size={13} color="#245fa8" />
            <Text className="text-xs font-bold text-blue-700 dark:text-blue-400">
              {t('read_notice', 'Read')}
            </Text>
          </Button>
        ) : undefined
      }
      className={`mb-3 ${cardBorderClass}`}
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

        {/* Status Pills / Badges (Pinned, Target Audience) */}
        {(isPinned || (isAdmin && notice?.targetAudience?.targetType)) && (
          <View className="flex-row flex-wrap items-center gap-1.5 pt-0.5">
            {isPinned && (
              <View className="flex-row items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                <Pin size={11} color="#d97706" />
                <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Pinned to Top
                </Text>
              </View>
            )}
            {isAdmin && notice?.targetAudience?.targetType && (
              <View className="flex-row items-center gap-1 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md">
                <Users size={11} color="#9333ea" />
                <Text className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  {notice.targetAudience.targetType === 'ALL'
                    ? 'Everyone'
                    : notice.targetAudience.targetType === 'ROLES'
                    ? 'Staff / Roles'
                    : notice.targetAudience.targetType === 'RESIDENCY_TYPES'
                    ? `${(notice.targetAudience.targetResidencyTypes || []).join(', ') || 'Residency'}`
                    : notice.targetAudience.targetType === 'CUSTOM'
                    ? 'Specific Resident'
                    : notice.targetAudience.targetType}
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
          <View className="flex-row items-center justify-between pt-1.5 mt-0.5 border-t border-border/30">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <Text className="text-[11px] text-muted-foreground font-medium me-1">
                {notice?.readerCount || notice?.readBy?.length || 0} read{(notice?.readerCount || notice?.readBy?.length) === 1 ? '' : 's'}
              </Text>
              {helpfulCount > 0 && (
                <View className="flex-row items-center px-1.5 py-0.5 rounded border bg-blue-500/10 border-blue-500/20">
                  <Text className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    👍 {helpfulCount}
                  </Text>
                </View>
              )}
              {importantCount > 0 && (
                <View className="flex-row items-center px-1.5 py-0.5 rounded border bg-rose-500/10 border-rose-500/20">
                  <Text className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                    ❤️ {importantCount}
                  </Text>
                </View>
              )}
              {thanksCount > 0 && (
                <View className="flex-row items-center px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20">
                  <Text className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    🙏 {thanksCount}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-2">
              {onBookmarkToggle && (
                <TouchableOpacity
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onBookmarkToggle?.(notice?._id, !isBookmarked);
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1 px-2 py-1 rounded-md bg-muted/40 border border-border/40"
                  accessibilityRole="button"
                  accessibilityLabel="Bookmark notice"
                >
                  <Heart
                    size={13}
                    color={isBookmarked ? '#ef4444' : '#94a3b8'}
                    fill={isBookmarked ? '#ef4444' : 'none'}
                  />
                  <Text className={`text-[11px] font-semibold ${isBookmarked ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                    {isBookmarked ? t('saved', 'Saved') : t('save', 'Save')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </ListCard>
  );
}

export default NoticeCard;
