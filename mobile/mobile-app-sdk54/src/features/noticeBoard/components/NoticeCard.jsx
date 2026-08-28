import React from 'react';
import { View, TouchableOpacity, Pressable } from 'react-native';
import { 
  Pin, 
  Globe, 
  Archive, 
  Edit3, 
  Trash2, 
  Heart, 
  ChevronRight, 
  ShieldAlert, 
  Wrench, 
  Calendar, 
  Building2, 
  Megaphone,
  Clock
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { formatRelativeTime } from '@/components/ui/ListCard';

const CATEGORY_CONFIG = {
  Emergency: { icon: ShieldAlert, bg: 'bg-rose-500/15', color: '#f43f5e' },
  Maintenance: { icon: Wrench, bg: 'bg-orange-500/15', color: '#ea580c' },
  Events: { icon: Calendar, bg: 'bg-blue-500/15', color: '#2563eb' },
  Meetings: { icon: Building2, bg: 'bg-purple-500/15', color: '#9333ea' },
  General: { icon: Megaphone, bg: 'bg-sky-500/15', color: '#0284c7' },
};

/**
 * NoticeCard Component
 * Modern, clean, and responsive Notice Card with perfect alignment for Resident & Admin workflows.
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
  const status = notice?.status || 'Published';
  const category = notice?.category || 'General';
  const priority = notice?.priority || 'Normal';

  const categoryMeta = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.General;
  const CategoryIcon = categoryMeta.icon;

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case 'Published': return 'success';
      case 'Draft': return 'secondary';
      case 'Archived': return 'outline';
      case 'Expired': return 'destructive';
      case 'Scheduled': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <Pressable
      onPress={() => onPress?.(notice)}
      className="bg-card rounded-2xl border border-border mb-3 p-3.5 shadow-xs active:bg-muted/60"
    >
      {/* Top Header Row: Category Icon, Title, Pin & Status */}
      <View className="flex-row items-start justify-between gap-3">
        {/* Left Category Icon */}
        <View
          className={`w-11 h-11 rounded-xl items-center justify-center shrink-0 border border-border/40 ${categoryMeta.bg}`}
        >
          <CategoryIcon size={20} color={categoryMeta.color} />
        </View>

        {/* Middle Title & Metadata */}
        <View className="flex-1 justify-center">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              {category}
            </Text>
            {priority && priority !== 'Normal' && priority !== 'Low' && (
              <View className="bg-rose-500/15 px-1.5 py-0.2 rounded">
                <Text className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase font-sans">
                  {priority}
                </Text>
              </View>
            )}
          </View>

          <Text
            className="text-[15px] font-bold text-foreground font-sans tracking-tight mt-0.5"
            numberOfLines={2}
          >
            {notice?.title || 'Notice Title'}
          </Text>
        </View>

        {/* Right Badges: Pinned & Status */}
        <View className="items-end gap-1 shrink-0">
          {isPinned && (
            <View className="flex-row items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Pin size={10} color="#d97706" />
              <Text className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 font-sans">
                PINNED
              </Text>
            </View>
          )}

          {isAdmin ? (
            <StatusBadge
              label={status}
              variant={getStatusBadgeVariant(status)}
              size="sm"
            />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground/60 mt-1" />
          )}
        </View>
      </View>

      {/* Description Snippet */}
      {notice?.description && (
        <Text
          className="text-[13px] text-muted-foreground font-sans font-medium mt-2 leading-relaxed"
          numberOfLines={2}
        >
          {notice.description}
        </Text>
      )}

      {/* Card Footer: Timestamp & Interactive Actions */}
      <View className="flex-row items-center justify-between pt-2.5 mt-2 border-t border-border/50">
        {/* Timestamp */}
        <View className="flex-row items-center gap-1.5">
          <Clock size={12} className="text-muted-foreground/70" />
          <Text className="text-[11.5px] font-medium text-muted-foreground font-sans">
            {formatRelativeTime(notice?.createdAt)}
          </Text>
        </View>

        {/* Resident Action: Heart Bookmark */}
        {!isAdmin && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onBookmarkToggle?.(notice?._id, !isBookmarked);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="flex-row items-center gap-1 bg-secondary/80 px-2.5 py-1 rounded-full border border-border"
          >
            <Heart
              size={13}
              color={isBookmarked ? '#ef4444' : '#64748b'}
              fill={isBookmarked ? '#ef4444' : 'transparent'}
            />
            <Text
              className={`text-[11px] font-semibold font-sans ${
                isBookmarked ? 'text-rose-500' : 'text-muted-foreground'
              }`}
            >
              {isBookmarked ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Admin Action Buttons Row */}
        {isAdmin && (
          <View className="flex-row items-center gap-1.5">
            {/* Toggle Pin */}
            {canPin && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onPinToggle?.(notice?._id, isPinned);
                }}
                className={`p-1.5 rounded-lg border ${
                  isPinned
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-600'
                    : 'bg-secondary border-border'
                }`}
                accessibilityLabel="Toggle Pin"
              >
                <Pin size={13} color={isPinned ? '#d97706' : '#64748b'} />
              </TouchableOpacity>
            )}

            {/* Status Change (Publish/Archive) */}
            {canUpdate && status === 'Published' && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onStatusChange?.(notice?._id, 'Archived');
                }}
                className="flex-row items-center gap-1 bg-secondary border border-border px-2 py-1 rounded-lg"
                accessibilityLabel="Archive Notice"
              >
                <Archive size={12} color="#64748b" />
                <Text className="text-[10.5px] font-semibold text-muted-foreground font-sans">
                  Archive
                </Text>
              </TouchableOpacity>
            )}

            {canUpdate && (status === 'Draft' || status === 'Archived') && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onStatusChange?.(notice?._id, 'Published');
                }}
                className="flex-row items-center gap-1 bg-primary/10 border border-primary/30 px-2 py-1 rounded-lg"
                accessibilityLabel="Publish Notice"
              >
                <Globe size={12} color="#0284c7" />
                <Text className="text-[10.5px] font-bold text-primary font-sans">
                  Publish
                </Text>
              </TouchableOpacity>
            )}

            {/* Edit */}
            {canUpdate && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onEditPress?.(notice?._id);
                }}
                className="p-1.5 rounded-lg bg-secondary border border-border"
                accessibilityLabel="Edit Notice"
              >
                <Edit3 size={13} color="#64748b" />
              </TouchableOpacity>
            )}

            {/* Delete */}
            {canDelete && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onDeletePress?.(notice?._id);
                }}
                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25"
                accessibilityLabel="Delete Notice"
              >
                <Trash2 size={13} color="#f43f5e" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default NoticeCard;
