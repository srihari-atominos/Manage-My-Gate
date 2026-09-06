import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Poll } from '../store/pollSlice';
import PollOptionRow from './PollOptionRow';

export interface PollCardProps {
  poll: Poll;
  onVote: (optionIndex: number) => void;
  onViewDetails?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onClose?: () => void;
  isCreator?: boolean;
}

/**
 * PollCard Component
 * Canonical ListCard implementation for interactive Community Poll items.
 * Embeds PollOptionRows and action triggers into ListCard's children slot.
 */
export function PollCard({
  poll,
  onVote,
  onViewDetails,
  onDelete,
  onPublish,
  onClose,
  isCreator,
}: PollCardProps) {
  const isClosed = poll.status === 'Closed';
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votesCount, 0);

  const getPollStatusVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'success' as const;
      case 'Draft': return 'neutral' as const;
      case 'Closed': return 'warning' as const;
      default: return 'neutral' as const;
    }
  };

  return (
    <ListCard
      title={poll.title}
      subtitle={poll.description || `Total Votes: ${totalVotes}`}
      leftIcon="BarChart2"
      leftIconBgColor="bg-primary/10"
      status={{
        label: poll.status,
        variant: getPollStatusVariant(poll.status),
      }}
      secondaryBadge={{
        label: `${totalVotes} ${totalVotes === 1 ? 'Vote' : 'Votes'}`,
        variant: 'neutral',
      }}
    >
      {/* Poll Options Voting & Progress List */}
      <View className="mt-1 gap-2">
        {poll.options.map((option, index) => {
          const percentage = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
          return (
            <PollOptionRow
              key={option._id || index}
              text={option.text}
              votesCount={option.votesCount}
              percentage={percentage}
              isSelected={poll.votedOptionIndex === index}
              showResults={isClosed || poll.hasVoted}
              onSelect={() => !isClosed && onVote(index)}
              disabled={isClosed}
            />
          );
        })}
      </View>

      {/* Action CTA Row */}
      <View className="mt-2.5 flex-row flex-wrap justify-end gap-2 pt-2 border-t border-border/30">
        {onViewDetails && (
          <Button variant="outline" size="sm" onPress={onViewDetails} className="h-8 px-3 rounded-lg">
            <Text className="text-xs font-semibold text-foreground">View Details</Text>
          </Button>
        )}
        {isCreator && poll.status === 'Draft' && onPublish && (
          <Button variant="default" size="sm" onPress={onPublish} className="h-8 px-3 rounded-lg">
            <Text className="text-xs font-semibold text-primary-foreground">Publish</Text>
          </Button>
        )}
        {isCreator && poll.status === 'Active' && onClose && (
          <Button variant="secondary" size="sm" onPress={onClose} className="h-8 px-3 rounded-lg">
            <Text className="text-xs font-semibold text-secondary-foreground">Close Poll</Text>
          </Button>
        )}
        {isCreator && onDelete && (
          <Button variant="destructive" size="sm" onPress={onDelete} className="h-8 px-3 rounded-lg">
            <Text className="text-xs font-semibold text-destructive-foreground">Delete</Text>
          </Button>
        )}
      </View>
    </ListCard>
  );
}

export default PollCard;
