import React from 'react';
import { View } from 'react-native';
import { Trophy, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/common/ProgressBar';

/**
 * PollResultsView Component (Pure JSX)
 * Renders visual breakdown of poll options with progress bars, vote counts,
 * percentages, quorum tracker, and outcome banner.
 */
export function PollResultsView({ poll, results }) {
  if (!poll) return null;

  const totalVotes = poll.totalVotes || (Array.isArray(poll.options) ? poll.options.reduce((sum, opt) => sum + (opt.votesCount || 0), 0) : 0);
  const eligibleVoters = poll.totalEligibleVoters || 0;
  const quorumPercentage = poll.quorumPercentage || 0;
  const participationRate = eligibleVoters > 0 ? Math.round((totalVotes / eligibleVoters) * 100) : 0;
  const quorumMet = quorumPercentage === 0 || participationRate >= quorumPercentage;

  const isClosed = poll.status === 'Closed';
  const winningOption = poll.winningOption;

  return (
    <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-bold text-foreground">Results Breakdown</Text>
        <StatusBadge
          label={`${totalVotes} total ${totalVotes === 1 ? 'vote' : 'votes'}`}
          variant="info"
          size="sm"
        />
      </View>

      {/* Outcome Banner (if closed) */}
      {isClosed && poll.outcome && (
        <View className="flex-row items-center gap-2 p-3 rounded-xl mb-4 bg-muted/70 border border-border">
          {poll.outcome === 'PASSED' ? (
            <Trophy size={20} color="#16a34a" />
          ) : poll.outcome === 'NO_QUORUM' ? (
            <AlertCircle size={20} color="#ea580c" />
          ) : (
            <CheckCircle2 size={20} color="#2563eb" />
          )}
          <View className="flex-1">
            <Text className="text-xs font-bold text-foreground">
              Final Outcome: {poll.outcome}
            </Text>
            {winningOption?.text ? (
              <Text className="text-[11px] text-muted-foreground">
                Winning choice: {winningOption.text} ({winningOption.votesCount || 0} votes)
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Quorum Progress Meter */}
      {quorumPercentage > 0 && (
        <View className="mb-4 p-3 bg-muted/40 rounded-xl border border-border/50">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-xs font-semibold text-foreground">
              Quorum Requirement: {quorumPercentage}%
            </Text>
            <Text className="text-xs font-bold text-foreground">
              {participationRate}% ({totalVotes}/{eligibleVoters} eligible)
            </Text>
          </View>
          <View className="h-2 w-full bg-border rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${
                quorumMet ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(participationRate, 100)}%` }}
            />
          </View>
          <Text className="text-[10px] text-muted-foreground mt-1">
            {quorumMet
              ? '✓ Quorum requirement satisfied'
              : `Quorum not yet reached (${quorumPercentage - participationRate}% needed)`}
          </Text>
        </View>
      )}

      {/* Options Vote Bars */}
      <View className="gap-3">
        {poll.options?.map((opt, index) => {
          const count = opt.votesCount || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isWinner = winningOption && (winningOption.index === index || winningOption.text === opt.text);

          return (
            <View key={opt._id || index} className="gap-1">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5 flex-1 me-2">
                  {isWinner && <Trophy size={14} color="#eab308" />}
                  <Text
                    className={`text-sm ${
                      isWinner ? 'font-bold text-primary' : 'font-medium text-foreground'
                    }`}
                  >
                    {opt.text}
                  </Text>
                </View>
                <Text className="text-xs font-bold text-muted-foreground">
                  {count} ({percentage}%)
                </Text>
              </View>

              <View className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full transition-all ${
                    isWinner ? 'bg-primary' : 'bg-primary/60'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default PollResultsView;
