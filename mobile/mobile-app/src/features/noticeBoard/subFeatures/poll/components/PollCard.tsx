import React, { useState } from 'react';
import { View, TouchableOpacity, Pressable, Alert, Platform } from 'react-native';
import { CheckCircle, Globe, XCircle, Trash2, Users } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export interface PollCardProps {
  poll: any;
  onVote: (pollId: string, optionIndex: number) => void;
  onDelete: (pollId: string) => void;
  onPublish: (pollId: string) => void;
  onClosePoll: (pollId: string) => void;
  onReopenPoll?: (pollId: string) => void;
  onViewVoters?: (poll: any) => void;
  currentUser: any;
  isAdmin: boolean;
}

export function PollCard({
  poll,
  onVote,
  onDelete,
  onPublish,
  onClosePoll,
  onReopenPoll,
  onViewVoters,
  currentUser,
  isAdmin,
}: PollCardProps) {
  const hasVoted = poll.hasVoted || false;
  const votedOptionIndex = poll.votedOptionIndex;

  const userIdStr = String(currentUser?.id || currentUser?._id || '');
  const creatorIdStr = String(poll?.createdBy?._id || poll?.createdBy || '');
  const isCreator = userIdStr === creatorIdStr && userIdStr !== '';

  const canDelete = isAdmin || isCreator;
  const canManage = isAdmin || isCreator;

  const totalVotes = poll.options.reduce((sum: number, opt: any) => sum + opt.votesCount, 0);

  const handleVote = (optionIndex: number) => {
    if (poll.status !== 'Active') return;
    onVote(poll._id, optionIndex);
  };

  const creatorName = poll?.createdBy?.name || 'Unknown';

  const getVisibilityIcon = () => {
    if (poll.visibility === 'Community Admin Only') return '👨‍💼';
    if (poll.visibility === 'Residents Only') return '🏠';
    return '🌍';
  };

  const getStatusVariant = (status: string) => {
    if (status === 'Active') return 'success';
    if (status === 'Closed') return 'neutral';
    return 'warning';
  };

  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const getConfirmProps = () => {
    switch (confirmAction) {
      case 'publish': return { title: 'Publish Poll', message: 'Are you sure you want to publish this poll?', onConfirm: () => onPublish(poll._id) };
      case 'close': return { title: 'Close Poll', message: 'Are you sure you want to close this poll?', onConfirm: () => onClosePoll(poll._id) };
      case 'reopen': return { title: 'Reopen Poll', message: 'Are you sure you want to reopen this poll?', onConfirm: () => onReopenPoll && onReopenPoll(poll._id) };
      case 'delete': return { title: 'Delete Poll', message: 'Are you sure you want to delete this poll? This action cannot be undone.', onConfirm: () => onDelete(poll._id) };
      default: return { title: '', message: '', onConfirm: () => {} };
    }
  };

  const confirmProps = getConfirmProps();

  const handleConfirm = () => {
    confirmProps.onConfirm();
    setConfirmAction(null);
  };

  return (
    <View className="bg-card rounded-xl border border-border mb-3 overflow-hidden">
      <View className="p-4 flex-col gap-2">
        
        {/* Top Badges Row */}
        <View className="flex-row justify-between items-center flex-wrap gap-2">
          <View className="flex-row items-center gap-2 flex-wrap">
            <View className="flex-row items-center bg-muted/50 px-2 py-1 rounded border border-border/50">
              <Text className="text-[10px] text-muted-foreground mr-1">{getVisibilityIcon()}</Text>
              <Text className="text-[10px] text-muted-foreground font-semibold">
                {poll.visibility || 'Everyone'}
              </Text>
            </View>
            <StatusBadge label={poll.status} variant={getStatusVariant(poll.status) as any} size="sm" />
          </View>
          <StatusBadge label={`${totalVotes} vote${totalVotes !== 1 ? 's' : ''}`} variant="info" size="sm" />
        </View>

        {/* Poll Title & Description */}
        <View className="mt-1 mb-2">
          <Text className="text-foreground text-base font-bold leading-tight text-start">
            {poll.question}
          </Text>
          {poll.description ? (
            <Text className="text-muted-foreground text-xs mt-1 leading-snug text-start">
              {poll.description}
            </Text>
          ) : null}
        </View>

        {/* Poll Options */}
        <View className="gap-2 mb-2">
          {poll.options.map((option: any, index: number) => {
            const percentage = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
            const showResults = poll.status === 'Closed' || hasVoted;
            const isSelected = hasVoted && index === votedOptionIndex;
            const isActive = poll.status === 'Active';

            return (
              <Pressable
                key={index}
                onPress={() => isActive && handleVote(index)}
                className={`relative overflow-hidden rounded-lg border p-3 flex-row justify-between items-center ${
                  isSelected 
                    ? 'border-primary/50 bg-primary/5' 
                    : isActive && !hasVoted
                      ? 'border-border bg-background active:bg-muted'
                      : 'border-border/50 bg-background/50'
                }`}
              >
                {/* Progress Bar Background */}
                {showResults && (
                  <View 
                    className={`absolute top-0 bottom-0 left-0 ${isSelected ? 'bg-primary/20' : 'bg-muted/50'}`} 
                    style={{ width: `${percentage}%` }}
                  />
                )}
                
                {/* Option Text */}
                <View className="flex-row items-center gap-2 z-10 flex-1">
                  {isSelected && <Icon as={CheckCircle} size={16} className="text-primary" />}
                  <Text 
                    className={`text-sm ${isSelected ? 'font-bold text-primary' : 'text-foreground font-medium'} flex-1`}
                  >
                    {option.text}
                  </Text>
                </View>

                {/* Percentage */}
                {showResults && (
                  <Text className={`text-xs z-10 ${isSelected ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {percentage}%
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {hasVoted && poll.status === 'Active' && (
          <View className="flex-row items-center gap-1 mb-2">
            <Icon as={CheckCircle} size={12} color="#16a34a" />
            <Text className="text-[10px] text-green-600 font-medium">
              Vote recorded. Tap another option to change.
            </Text>
          </View>
        )}

        {/* Footer: Metadata & Actions */}
        <View className="flex-row justify-between items-center pt-3 border-t border-border mt-1 flex-wrap gap-3">
          
          {/* Metadata */}
          <View className="flex-col">
            <Text className="text-[10px] text-foreground font-semibold">
              By {creatorName}
            </Text>
            <Text className="text-[10px] text-muted-foreground">
              Ends {new Date(poll.endDate).toLocaleDateString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2">
            {canManage && poll.status === 'Draft' && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setConfirmAction('publish')}
                className="bg-green-50 border-green-200 h-8 px-2"
              >
                <Icon as={Globe} size={12} color="#16a34a" />
                <Text className="text-[10px] text-green-700 font-bold uppercase ml-1">Publish</Text>
              </Button>
            )}

            {canManage && poll.status === 'Active' && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setConfirmAction('close')}
                className="bg-amber-50 border-amber-200 h-8 px-2"
              >
                <Icon as={XCircle} size={12} color="#d97706" />
                <Text className="text-[10px] text-amber-700 font-bold uppercase ml-1">Close</Text>
              </Button>
            )}

            {canManage && poll.status === 'Closed' && onReopenPoll && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setConfirmAction('reopen')}
                className="bg-blue-50 border-blue-200 h-8 px-2"
              >
                <Icon as={CheckCircle} size={12} color="#2563eb" />
                <Text className="text-[10px] text-blue-700 font-bold uppercase ml-1">Reopen</Text>
              </Button>
            )}

            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => setConfirmAction('delete')}
                className="bg-red-50 border-red-200 h-8 px-2"
              >
                <Icon as={Trash2} size={12} color="#dc2626" />
                <Text className="text-[10px] text-red-700 font-bold uppercase ml-1">Delete</Text>
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onPress={() => onViewVoters?.(poll)}
                className="bg-primary/10 border-primary/20 h-8 px-2"
              >
                <Icon as={Users} size={12} className="text-primary" />
                <Text className="text-[10px] text-primary font-bold uppercase ml-1">Voters</Text>
              </Button>
            )}
          </View>
        </View>

      </View>
      
      <ConfirmationModal
        visible={!!confirmAction}
        title={confirmProps.title}
        message={confirmProps.message}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant={confirmAction === 'delete' ? 'danger' : 'primary'}
      />
    </View>
  );
}

export default PollCard;
