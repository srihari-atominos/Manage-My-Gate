import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';

/**
 * PollCard Component (Pure JSX)
 * Extends catalog ListCard and StatusBadge to represent a community poll in dashboard lists.
 */
export function PollCard({
  poll,
  onPress,
  onVotePress,
  currentUser,
}) {
  if (!poll) return null;

  const totalVotes = poll.totalVotes || (Array.isArray(poll.options) ? poll.options.reduce((sum, opt) => sum + (opt.votesCount || 0), 0) : 0);
  const eligibleVoters = poll.totalEligibleVoters || 0;
  const participationRate = eligibleVoters > 0 ? Math.round((totalVotes / eligibleVoters) * 100) : 0;
  const isClosed = poll.status === 'Closed';
  const hasVoted = Boolean(poll.hasVoted);

  // Status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Closed': return 'neutral';
      case 'Draft': return 'warning';
      default: return 'neutral';
    }
  };

  // Outcome badge variant for closed polls
  const getOutcomeVariant = (outcome) => {
    switch (outcome) {
      case 'PASSED': return 'success';
      case 'REJECTED': return 'destructive';
      case 'NO_QUORUM': return 'warning';
      case 'TIED': return 'neutral';
      default: return 'info';
    }
  };

  const choiceTypeLabel = poll.choiceType === 'MULTIPLE_CHOICE'
    ? `Multiple Choice (Max ${poll.maxChoices || 1})`
    : 'Single Choice';

  const votingModeLabel = poll.votingMode === 'ONE_PER_UNIT' ? 'Per Unit' : 'Per User';

  const secondaryBadge = isClosed && poll.outcome ? {
    label: poll.outcome,
    variant: getOutcomeVariant(poll.outcome),
  } : hasVoted ? {
    label: 'Voted',
    variant: 'info',
  } : undefined;

  const rightContent = (
    <View className="items-end gap-1 ms-2">
      <StatusBadge
        label={poll.status || 'Active'}
        variant={getStatusVariant(poll.status)}
        size="sm"
      />
      <View className="flex-row items-center gap-1 mt-1">
        <Text className="text-[11px] font-bold text-muted-foreground">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        </Text>
      </View>
    </View>
  );

  return (
    <View className="mb-2">
      <ListCard
        title={poll.question || 'Untitled Poll'}
        subtitle={poll.description || `${choiceTypeLabel} • ${votingModeLabel}`}
        leftIcon="BarChart2"
        leftIconBgColor="#e0f2fe"
        leftIconColor="#0284c7"
        status={{
          label: `${participationRate}% participation`,
          variant: participationRate >= (poll.quorumPercentage || 0) && (poll.quorumPercentage || 0) > 0 ? 'success' : 'neutral',
        }}
        secondaryBadge={secondaryBadge}
        timestamp={poll.createdAt}
        rightContent={rightContent}
        onPress={onPress}
      />
      {/* Footer metadata chips row */}
      <View className="flex-row flex-wrap items-center gap-1.5 px-3 py-1 -mt-2 mb-2">
        <View className="bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
          <Text className="text-[10px] text-muted-foreground font-medium">
            Quorum: {poll.quorumPercentage || 0}%
          </Text>
        </View>
        <View className="bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
          <Text className="text-[10px] text-muted-foreground font-medium">
            {choiceTypeLabel}
          </Text>
        </View>
        {poll.isAnonymous && (
          <View className="bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
            <Text className="text-[10px] text-indigo-500 font-semibold">
              Anonymous
            </Text>
          </View>
        )}
        {poll.votingMode === 'ONE_PER_UNIT' && (
          <View className="bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Text className="text-[10px] text-emerald-600 font-semibold">
              1 Vote/Unit
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default PollCard;
