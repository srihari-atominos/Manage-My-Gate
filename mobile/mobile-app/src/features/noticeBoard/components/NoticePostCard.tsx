import React from 'react';
import { View, Image, TouchableOpacity, Share } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Megaphone,
  Wrench,
  ShieldAlert,
  Calendar,
  Building2,
  Pin,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Heart,
  MessageSquare,
  Share2,
  Bookmark,
  Camera,
  ArrowRight,
  Shield,
  FileText,
} from 'lucide-react-native';

export interface NoticePostCardProps {
  notice: any;
  onPress: (notice: any) => void;
  onBookmarkToggle?: (id: string, isBookmarked: boolean) => void;
  onAcknowledge?: (id: string) => void;
  isAdmin?: boolean;
}

export const NoticePostCard: React.FC<NoticePostCardProps> = ({
  notice,
  onPress,
  onBookmarkToggle,
  onAcknowledge,
  isAdmin = false,
}) => {
  if (!notice) return null;

  const id = notice._id || notice.id;
  const title = notice.title || 'Untitled Announcement';
  const description = notice.description || '';
  const category = notice.category || 'General';
  const priority = notice.priority || 'Medium';
  const isPinned = Boolean(notice.isPinned);
  const isCritical = Boolean(notice.isCritical || priority === 'Critical');
  const isHighPriority = priority === 'High' || isCritical;
  const isBookmarked = Boolean(notice.isBookmarkedByUser);
  const requiresAck = Boolean(notice.requiresAcknowledgement);
  const hasAcknowledged = Boolean(notice.hasAcknowledged);

  // Author details
  const authorName =
    notice.author?.name ||
    notice.author?.fullName ||
    notice.createdBy?.name ||
    notice.createdByName ||
    'Estate Management';
  const authorRole = notice.author?.role || 'Office';

  // Images
  const rawImages = Array.isArray(notice.images) ? notice.images : [];
  const imageUrl =
    rawImages[0]?.url ||
    rawImages[0]?.uri ||
    (typeof rawImages[0] === 'string' ? rawImages[0] : null);
  const totalImages = rawImages.length;

  // Relative Time & Expiry
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatExpiryCountdown = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `Expires in ${diffHours}h`;
    }
    const diffDays = Math.ceil(diffHours / 24);
    return `Expires in ${diffDays}d`;
  };

  const formatAudienceScope = (ta?: any) => {
    if (!ta) return 'All Residents';
    if (ta.targetType === 'ALL' || !ta.targetType) return 'All Residents';
    if (ta.targetType === 'RESIDENCY_TYPES') {
      const types = ta.targetResidencyTypes || [];
      if (types.some((t: string) => t.toLowerCase().includes('owner'))) return 'Owners Only';
      if (types.some((t: string) => t.toLowerCase().includes('staff'))) return 'Staff Only';
    }
    if (ta.targetType === 'BLOCKS' && ta.blocks?.length) {
      return `Blocks: ${ta.blocks.join(', ')}`;
    }
    if (ta.targetType === 'UNITS' && ta.units?.length) {
      return `${ta.units.length} Units`;
    }
    if (ta.targetType === 'ROLES' && ta.targetRoles?.length) {
      return 'Specific Roles';
    }
    return 'Targeted';
  };

  const expiryCountdown = formatExpiryCountdown(notice.expiryDate);
  const audienceLabel = formatAudienceScope(notice.targetAudience);

  // Reaction counts
  const reactionCounts = notice.reactionCounts || notice.reactions || {};
  const totalReactions = Object.values(reactionCounts).reduce(
    (acc: number, val: any) => acc + (typeof val === 'number' ? val : 0),
    0
  );
  const commentsCount = notice.commentCount || notice.commentsCount || 0;

  // Category Icon & Color
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'Emergency':
        return {
          icon: ShieldAlert,
          bg: 'bg-red-500/15',
          text: 'text-red-600 dark:text-red-400',
          border: 'border-red-500/30',
        };
      case 'Maintenance':
        return {
          icon: Wrench,
          bg: 'bg-amber-500/15',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-500/30',
        };
      case 'Events':
        return {
          icon: Calendar,
          bg: 'bg-blue-500/15',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-500/30',
        };
      case 'Meetings':
        return {
          icon: Building2,
          bg: 'bg-purple-500/15',
          text: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-500/30',
        };
      default:
        return {
          icon: Megaphone,
          bg: 'bg-primary/10',
          text: 'text-primary',
          border: 'border-primary/20',
        };
    }
  };

  const catMeta = getCategoryMeta(category);
  const CategoryIcon = catMeta.icon;

  const handleShare = async () => {
    try {
      await Share.share({
        title,
        message: `${title}\n\n${description}`,
      });
    } catch {}
  };

  return (
    <View className="bg-card rounded-3xl border border-border/80 overflow-hidden mb-4 shadow-sm">
      {/* 1. Author & Publisher Header */}
      <TouchableOpacity
        onPress={() => onPress(notice)}
        activeOpacity={0.85}
        className="p-4 pb-2 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2.5 flex-1 me-2">
          {/* Publisher Avatar Badge */}
          <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
            <CategoryIcon size={18} className="text-primary" />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                {authorName}
              </Text>
              <View className="bg-muted px-1.5 py-0.5 rounded-md">
                <Text className="text-[10px] font-semibold text-muted-foreground">
                  {authorRole}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {formatRelativeTime(notice.createdAt)} • {audienceLabel}
            </Text>
          </View>
        </View>

        {/* Priority & Pinned Badges */}
        <View className="flex-row items-center gap-1.5 shrink-0">
          {isPinned && (
            <View className="bg-amber-500/15 px-2 py-1 rounded-full flex-row items-center gap-1 border border-amber-500/30">
              <Pin size={11} className="text-amber-600 dark:text-amber-400" />
              <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                Pinned
              </Text>
            </View>
          )}

          {isCritical ? (
            <StatusBadge label="CRITICAL" variant="danger" size="sm" dot />
          ) : isHighPriority ? (
            <StatusBadge label="HIGH" variant="warning" size="sm" />
          ) : (
            <View
              className={`px-2 py-0.5 rounded-full flex-row items-center gap-1 border ${catMeta.bg} ${catMeta.border}`}
            >
              <Text className={`text-[10px] font-bold uppercase ${catMeta.text}`}>
                {category}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* 2. Headline & Text Body Preview */}
      <TouchableOpacity
        onPress={() => onPress(notice)}
        activeOpacity={0.85}
        className="px-4 pb-3"
      >
        <Text className="text-base font-bold text-foreground tracking-tight leading-snug mb-1.5">
          {title}
        </Text>
        {description ? (
          <Text
            numberOfLines={3}
            className="text-xs text-muted-foreground/90 leading-relaxed"
          >
            {description}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* 3. High-Impact Media Canvas (Photo Cover or Themed Watermark) */}
      <TouchableOpacity
        onPress={() => onPress(notice)}
        activeOpacity={0.9}
        className="w-full relative overflow-hidden"
      >
        {imageUrl ? (
          <View className="h-52 w-full relative bg-muted">
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {totalImages > 1 && (
              <View className="absolute bottom-2.5 end-2.5 bg-black/70 px-2.5 py-1 rounded-full flex-row items-center gap-1 border border-white/20 shadow-xs">
                <Camera size={11} color="#ffffff" />
                <Text className="text-[10px] font-bold text-white">
                  1 of {totalImages} photos
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View className="h-32 w-full bg-muted/40 border-y border-border/40 px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 pe-3">
              <View
                className={`self-start px-2 py-0.5 rounded-full mb-1.5 flex-row items-center gap-1 border ${catMeta.bg} ${catMeta.border}`}
              >
                <CategoryIcon size={11} className={catMeta.text} />
                <Text className={`text-[10px] font-bold uppercase ${catMeta.text}`}>
                  Official {category} Update
                </Text>
              </View>
              <Text className="text-xs font-medium text-muted-foreground" numberOfLines={2}>
                Official estate notice issued to residents of {audienceLabel}.
              </Text>
            </View>
            <View className="w-16 h-16 rounded-2xl bg-card border border-border/60 items-center justify-center shadow-xs">
              <CategoryIcon size={30} className={catMeta.text} />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* 4. Context Specifications Row */}
      <View className="px-4 py-2.5 flex-row flex-wrap items-center gap-1.5 border-b border-border/40 bg-card">
        {/* Audience Pill */}
        <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
          <Users size={11} className="text-muted-foreground" />
          <Text className="text-[11px] font-medium text-foreground">{audienceLabel}</Text>
        </View>

        {/* Expiry Pill */}
        {expiryCountdown && (
          <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
            <Clock size={11} className="text-muted-foreground" />
            <Text className="text-[11px] font-medium text-foreground">
              {expiryCountdown}
            </Text>
          </View>
        )}

        {/* Sign-off Compliance Pill */}
        {requiresAck && (
          <View
            className={`flex-row items-center gap-1 px-2 py-0.5 rounded-md border ${
              hasAcknowledged
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/15 border-amber-500/30'
            }`}
          >
            {hasAcknowledged ? (
              <>
                <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Signed
                </Text>
              </>
            ) : (
              <>
                <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Sign-off Required
                </Text>
              </>
            )}
          </View>
        )}

        {/* Documents Pill */}
        {notice.attachments?.length > 0 && (
          <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
            <FileText size={11} className="text-muted-foreground" />
            <Text className="text-[11px] font-medium text-foreground">
              {notice.attachments.length} Doc
            </Text>
          </View>
        )}
      </View>

      {/* 5. Social Reactions & Share Bar */}
      <View className="px-4 py-2 flex-row items-center justify-between bg-card">
        {/* Reaction & Comments stats */}
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Heart size={14} className="text-red-500" fill={totalReactions > 0 ? '#ef4444' : 'none'} />
            <Text className="text-xs font-semibold text-foreground">
              {totalReactions > 0 ? totalReactions : 'Like'}
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <MessageSquare size={14} className="text-muted-foreground" />
            <Text className="text-xs font-semibold text-foreground">
              {commentsCount > 0 ? `${commentsCount} comments` : 'Discuss'}
            </Text>
          </View>
        </View>

        {/* Bookmark & Share Actions */}
        <View className="flex-row items-center gap-2">
          {onBookmarkToggle && (
            <TouchableOpacity
              onPress={() => onBookmarkToggle(id, !isBookmarked)}
              className="p-1.5 rounded-full bg-muted/60"
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark notice'}
            >
              <Bookmark
                size={14}
                className={isBookmarked ? 'text-amber-500' : 'text-muted-foreground'}
                fill={isBookmarked ? '#f59e0b' : 'none'}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleShare}
            className="p-1.5 rounded-full bg-muted/60"
            accessibilityRole="button"
            accessibilityLabel="Share notice"
          >
            <Share2 size={14} className="text-muted-foreground" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. Primary Action CTA Button */}
      <View className="px-4 pb-4 pt-1">
        {requiresAck && !hasAcknowledged ? (
          <Button
            variant="default"
            size="default"
            onPress={() => {
              if (onAcknowledge) {
                onAcknowledge(id);
              } else {
                onPress(notice);
              }
            }}
            className="w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 bg-amber-600 active:bg-amber-700"
            accessibilityRole="button"
            accessibilityLabel="Acknowledge notice"
          >
            <AlertTriangle size={15} color="#ffffff" />
            <Text className="text-xs font-bold text-white">
              Acknowledge Notice & Open Discussion
            </Text>
          </Button>
        ) : (
          <Button
            variant="default"
            size="default"
            onPress={() => onPress(notice)}
            className="w-full h-11 rounded-2xl flex-row items-center justify-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="View full announcement"
          >
            <Text className="text-xs font-bold text-primary-foreground">
              View Full Announcement & Discussion
            </Text>
            <ArrowRight size={14} className="text-primary-foreground" />
          </Button>
        )}
      </View>
    </View>
  );
};

export default NoticePostCard;
