import React from 'react';
import { Text, View as RNView, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { ListCard, StatusBadge, Button } from '@/components';
import { Poll } from '../store/pollSlice';
import PollOptionRow from './PollOptionRow';

interface PollCardProps {
  poll: Poll;
  onVote: (optionIndex: number) => void;
  onViewDetails?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onClose?: () => void;
  isCreator?: boolean;
}

export default function PollCard({
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

  return (
    <RNView className="bg-card rounded-lg border border-border p-4 mb-3">
      <RNView className="flex-row justify-between items-start mb-2">
        <RNView className="flex-1 mr-2">
          <Text className="text-foreground text-base font-bold">{poll.title}</Text>
          <Text className="text-muted-foreground text-sm">{poll.description || `Total Votes: ${totalVotes}`}</Text>
        </RNView>
        <StatusBadge
          label={poll.status}
          variant={poll.status === 'Active' ? 'success' : poll.status === 'Draft' ? 'neutral' : 'warning'}
        />
      </RNView>

      <RNView className="mt-2">
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
      </RNView>

      <RNView className="mt-4 flex-row justify-end space-x-2">
        {onViewDetails && (
          <Button variant="outline" size="sm" onPress={onViewDetails}>
            View Details
          </Button>
        )}
        {isCreator && poll.status === 'Draft' && onPublish && (
          <Button variant="default" size="sm" onPress={onPublish}>
            Publish
          </Button>
        )}
        {isCreator && poll.status === 'Active' && onClose && (
          <Button variant="secondary" size="sm" onPress={onClose}>
            Close Poll
          </Button>
        )}
        {isCreator && onDelete && (
          <Button variant="destructive" size="sm" onPress={onDelete}>
            Delete
          </Button>
        )}
      </RNView>
    </RNView>
  );
}
