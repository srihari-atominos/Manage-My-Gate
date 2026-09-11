import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { Text } from '@/components/ui/text';

export const NOTICE_REACTIONS = [
  {
    type: 'HELPFUL',
    emoji: '👍',
    label: 'Helpful',
    activeBg: 'bg-blue-500/15 border-blue-500/40',
    activeText: 'text-blue-600 dark:text-blue-400',
  },
  {
    type: 'IMPORTANT',
    emoji: '❤️',
    label: 'Important',
    activeBg: 'bg-rose-500/15 border-rose-500/40',
    activeText: 'text-rose-600 dark:text-rose-400',
  },
  {
    type: 'THANKS',
    emoji: '🙏',
    label: 'Thanks',
    activeBg: 'bg-amber-500/15 border-amber-500/40',
    activeText: 'text-amber-600 dark:text-amber-400',
  },
];

/**
 * NoticeEngagementBar
 * Renders lightweight, purposeful reactions (👍 Helpful, ❤️ Important, 🙏 Thanks)
 * alongside comments trigger using theme tokens and logical spacing.
 */
export function NoticeEngagementBar({
  commentCount = 0,
  reactions = {},
  userReaction = null,
  likeCount = 0,
  isLiked = false,
  allowComments = true,
  allowReactions = true,
  onReactionPress,
  onLikePress,
  onCommentPress,
  loading = false,
  className = '',
}) {
  if (!allowComments && !allowReactions) {
    return null;
  }

  // Normalize user reaction
  let currentReaction = userReaction;
  if (!currentReaction && isLiked) {
    currentReaction = 'HELPFUL';
  } else if (currentReaction === 'LIKE') {
    currentReaction = 'HELPFUL';
  } else if (currentReaction === 'LOVE') {
    currentReaction = 'IMPORTANT';
  } else if (currentReaction === 'APPLAUD') {
    currentReaction = 'THANKS';
  }

  // Normalize counts
  const counts = {
    HELPFUL: (reactions?.HELPFUL || 0) + (reactions?.LIKE || 0) || (isLiked && likeCount > 0 ? likeCount : 0),
    IMPORTANT: (reactions?.IMPORTANT || 0) + (reactions?.LOVE || 0),
    THANKS: (reactions?.THANKS || 0) + (reactions?.APPLAUD || 0),
  };

  const handleReaction = (type) => {
    if (loading) return;
    if (onReactionPress) {
      onReactionPress(type);
    } else if (onLikePress) {
      onLikePress();
    }
  };

  return (
    <View className={`py-3 border-t border-b border-border my-4 gap-2.5 ${className}`}>
      {/* Top Row: Comments Count & Header */}
      <View className="flex-row items-center justify-between">
        {allowComments ? (
          <TouchableOpacity
            onPress={onCommentPress}
            activeOpacity={0.7}
            className="flex-row items-center py-1 px-1 rounded-lg"
            accessibilityRole="button"
            accessibilityLabel={`${commentCount} comments`}
          >
            <MessageSquare size={17} color="#737373" className="me-2" />
            <Text className="text-foreground text-sm font-semibold">
              {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center py-1 px-1 opacity-50">
            <MessageSquare size={17} color="#a3a3a3" className="me-2" />
            <Text className="text-muted-foreground text-xs font-medium">
              Comments disabled
            </Text>
          </View>
        )}

        <Text className="text-xs font-semibold text-muted-foreground">
          Community Reactions
        </Text>
      </View>

      {/* 3-Reaction Bar: 👍 Helpful  ❤️ Important  🙏 Thanks */}
      {allowReactions ? (
        <View className="flex-row flex-wrap items-center gap-2">
          {NOTICE_REACTIONS.map((item) => {
            const isActive = currentReaction === item.type;
            const count = counts[item.type] || 0;

            return (
              <TouchableOpacity
                key={item.type}
                onPress={() => handleReaction(item.type)}
                disabled={loading}
                activeOpacity={0.7}
                className={`flex-row items-center py-1.5 px-3 rounded-full border transition-all ${
                  isActive
                    ? `${item.activeBg} shadow-xs`
                    : 'bg-muted/70 border-border/70 hover:bg-muted'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} reaction, count ${count}`}
              >
                <Text className="text-sm me-1.5">{item.emoji}</Text>
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? item.activeText : 'text-foreground'
                  }`}
                >
                  {item.label}
                </Text>
                {count > 0 && (
                  <Text
                    className={`text-xs font-bold ms-1.5 ${
                      isActive ? item.activeText : 'text-muted-foreground'
                    }`}
                  >
                    {count}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View className="py-1">
          <Text className="text-xs text-muted-foreground font-medium">
            Reactions disabled for this notice
          </Text>
        </View>
      )}
    </View>
  );
}

export default NoticeEngagementBar;
