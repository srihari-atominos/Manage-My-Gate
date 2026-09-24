import React from 'react';
import { View, TouchableOpacity, Share } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/src/utils/i18n';
import {
  BarChart3,
  Clock,
  Users,
  CheckCircle2,
  Lock,
  Globe,
  Share2,
  ArrowRight,
  CheckSquare,
} from 'lucide-react-native';

export interface PollPostCardProps {
  poll: any;
  onPress: (poll: any) => void;
}

export const PollPostCard: React.FC<PollPostCardProps> = ({ poll, onPress }) => {
  const { t, translateText } = useTranslation();
  if (!poll) return null;

  const id = poll._id || poll.id;
  const question = poll.question || poll.title || t('community_ballot', 'Community Ballot');
  const description = poll.description || '';
  const options = Array.isArray(poll.options) ? poll.options : [];
  const isAnonymous = Boolean(poll.isAnonymous);
  const totalVotes =
    typeof poll.totalVotes === 'number'
      ? poll.totalVotes
      : options.reduce((sum: number, opt: any) => sum + (Number(opt?.votes) || 0), 0);
  const hasVoted = Boolean(poll.hasVoted || poll.userVoted);
  const isClosed = poll.status === 'Closed';
  const isDraft = poll.status === 'Draft';
  const choiceType = poll.choiceType || 'SINGLE_CHOICE';
  const quorumMet = Boolean(poll.quorumMet);
  const quorumPercentage = Number(poll.quorumPercentage) || 0;

  // Relative Time & Expiry
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return t('recently', 'Recently');
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return t('minutes_ago', '{{count}}m ago', { count: diffMins });
    }
    if (diffHours < 24) {
      return t('hours_ago', '{{count}}h ago', { count: diffHours });
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return t('days_ago', '{{count}}d ago', { count: diffDays });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatClosingCountdown = (dateStr?: string) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return t('closed', 'Closed');
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return t('closes_in_hours', 'Closes in {{count}}h', { count: diffHours });
    }
    const diffDays = Math.ceil(diffHours / 24);
    return t('closes_in_days', 'Closes in {{count}}d', { count: diffDays });
  };

  const closingCountdown = formatClosingCountdown(poll.endDate);

  const handleShare = async () => {
    try {
      await Share.share({
        title: question,
        message: `Community Poll: ${question}\n\nCast your vote in the ManageMyGate app.`,
      });
    } catch {}
  };

  return (
    <View className="bg-card rounded-2xl border border-border/80 dark:border-border/60 overflow-hidden mb-3 shadow-2xs">
      {/* 1. Publisher & Category Header */}
      <TouchableOpacity
        onPress={() => onPress(poll)}
        activeOpacity={0.85}
        className="p-3.5 pb-2 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2.5 flex-1 me-2 min-w-0">
          <View className="w-10 h-10 rounded-xl bg-[#00A6A6]/10 items-center justify-center border border-[#00A6A6]/20 shrink-0">
            <BarChart3 size={18} color="#00A6A6" />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                {t('community_poll_survey', 'Community Poll & Survey')}
              </Text>
              <View className="bg-[#00A6A6]/10 px-1.5 py-0.5 rounded-md border border-[#00A6A6]/20">
                <Text className="text-[10px] font-bold text-[#00A6A6]">
                  {t('vote_action', 'VOTE')}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {formatRelativeTime(poll.createdAt)} • {t('official_ballot', 'Official Ballot')}
            </Text>
          </View>
        </View>

        <StatusBadge
          label={(isClosed ? t('status_closed', 'Closed') : poll.status === 'Draft' ? t('status_draft', 'Draft') : t('status_active', 'Active')).toUpperCase()}
          variant={isClosed ? 'neutral' : poll.status === 'Draft' ? 'warning' : 'success'}
          size="sm"
          dot={!isClosed}
        />
      </TouchableOpacity>

      {/* 2. Poll Question & Description */}
      <TouchableOpacity
        onPress={() => onPress(poll)}
        activeOpacity={0.85}
        className="px-4 pb-3"
      >
        <Text className="text-base font-bold text-foreground tracking-tight leading-snug mb-1.5">
          {translateText(question)}
        </Text>
        {description ? (
          <Text numberOfLines={2} className="text-xs text-muted-foreground/90 leading-relaxed">
            {translateText(description)}
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* 3. Live Ballot Options Preview */}
      <View className="px-4 pb-3 gap-2">
        {options.slice(0, 3).map((option: any, index: number) => {
          const optText = typeof option === 'string' ? option : option?.text || `Option ${index + 1}`;
          const optVotes = typeof option === 'object' ? Number(option?.votes) || 0 : 0;
          const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;

          return (
            <View
              key={index}
              className="bg-muted/50 rounded-xl p-2.5 border border-border/50 relative overflow-hidden"
            >
              {/* Live progress fill */}
              {totalVotes > 0 && (
                <View
                  style={{ width: `${percentage}%` }}
                  className="absolute inset-y-0 start-0 bg-[#00A6A6]/15"
                />
              )}

              <View className="flex-row items-center justify-between z-10">
                <View className="flex-row items-center gap-2 flex-1 me-2">
                  <View className="w-5 h-5 rounded-full bg-card items-center justify-center border border-border">
                    <Text className="text-[10px] font-bold text-muted-foreground">
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text className="text-xs font-semibold text-foreground flex-1" numberOfLines={1}>
                    {translateText(optText)}
                  </Text>
                </View>

                {totalVotes > 0 && (
                  <Text className="text-xs font-bold text-[#00A6A6]">
                    {percentage}%
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {options.length > 3 && (
          <Text className="text-[11px] text-muted-foreground font-medium text-center">
            {t('more_options_on_ballot', '+{{count}} more options on ballot', { count: options.length - 3 })}
          </Text>
        )}
      </View>

      {/* 4. Ballot Context Chips */}
      <View className="px-4 py-2 flex-row flex-wrap items-center gap-1.5 border-t border-border/40 bg-card">
        {isAnonymous ? (
          <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
            <Lock size={11} className="text-muted-foreground" />
            <Text className="text-[11px] font-medium text-foreground">{t('anonymous', 'Anonymous')}</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
            <Globe size={11} className="text-muted-foreground" />
            <Text className="text-[11px] font-medium text-foreground">{t('public_ballot', 'Public Ballot')}</Text>
          </View>
        )}

        <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
          <CheckSquare size={11} className="text-muted-foreground" />
          <Text className="text-[11px] font-medium text-foreground">
            {choiceType === 'MULTIPLE_CHOICE' ? t('multi_choice', 'Multi-Choice') : t('single_choice', 'Single Choice')}
          </Text>
        </View>

        {closingCountdown && (
          <View className="flex-row items-center gap-1 bg-secondary/80 px-2 py-0.5 rounded-md">
            <Clock size={11} className="text-muted-foreground" />
            <Text className="text-[11px] font-medium text-foreground">
              {closingCountdown}
            </Text>
          </View>
        )}

        {quorumPercentage > 0 && (
          <View
            className={`flex-row items-center gap-1 px-2 py-0.5 rounded-md border ${
              quorumMet
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-muted border-border'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                quorumMet
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
              }`}
            >
              {quorumMet ? t('quorum_met', 'Quorum Met') : `${quorumPercentage}% ${t('quorum', 'Quorum')}`}
            </Text>
          </View>
        )}
      </View>

      {/* 5. Votes Stats & Share */}
      <View className="px-4 py-2 flex-row items-center justify-between bg-card">
        <View className="flex-row items-center gap-1.5">
          <Users size={13} color="#00A6A6" />
          <Text className="text-xs font-semibold text-foreground">
            {t('votes_recorded', '{{count}} votes recorded', { count: totalVotes })}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          className="p-1.5 rounded-full bg-muted/60"
          accessibilityRole="button"
          accessibilityLabel="Share poll"
        >
          <Share2 size={14} className="text-muted-foreground" />
        </TouchableOpacity>
      </View>

      {/* 6. Action CTA Button */}
      <View className="px-4 pb-4 pt-1">
        <Button
          variant="default"
          size="default"
          onPress={() => onPress(poll)}
          className="w-full h-11 rounded-2xl flex-row items-center justify-center gap-2 bg-[#00A6A6] active:bg-[#008f8f]"
          style={{ backgroundColor: '#00A6A6' }}
          accessibilityRole="button"
          accessibilityLabel="Cast vote or view results"
        >
          <BarChart3 size={15} color="#ffffff" />
          <Text className="text-xs font-bold text-white">
            {hasVoted ? t('view_live_ballot_results', 'View Live Ballot Results') : t('cast_your_vote_now', 'Cast Your Vote Now')}
          </Text>
          <ArrowRight size={14} color="#ffffff" />
        </Button>
      </View>
    </View>
  );
};

export default PollPostCard;
