import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Users, Lock, BarChart2, ShieldCheck, Calendar, CheckSquare } from 'lucide-react-native';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { Button } from '@/components/common/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Text } from '@/components/ui/text';

import { usePolls } from '../hooks/usePolls.js';
import { PollVotingSection } from '../components/PollVotingSection';
import { PollResultsView } from '../components/PollResultsView';
import { PollVotersModal } from '../components/PollVotersModal';
import { PollEngagementBar } from '../components/PollEngagementBar';
import { checkIsAdmin } from '@/src/utils/rbac';

/**
 * PollDetailScreen Component (Pure JSX)
 * Detailed view of a single community poll.
 * Features:
 * - Poll header & status badge
 * - Audience and governance configuration detail section
 * - Interactive voting card (single/multiple choice + unit input)
 * - Live results breakdown with quorum progress meter
 * - Administrative controls (Close Poll, View Voters Turnout modal)
 */
export default function PollDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const {
    selectedPoll,
    results,
    voters,
    loading,
    voting,
    user,
    canClose,
    canViewVoters,
    loadPollById,
    loadResults,
    loadVoters,
    castVote,
    closeExistingPoll,
    reactToPoll,
  } = usePolls();

  const [votersModalOpen, setVotersModalOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [closeLoading, setCloseLoading] = useState(false);

  const isCommunityAdmin = checkIsAdmin(user);

  useEffect(() => {
    if (user && !isCommunityAdmin) {
      router.replace('/(resident)/polls');
    }
  }, [user, isCommunityAdmin, router]);

  useEffect(() => {
    if (id && isCommunityAdmin) {
      loadPollById(id);
      loadResults(id);
    }
  }, [id, isCommunityAdmin, loadPollById, loadResults]);

  const poll = selectedPoll?._id === id ? selectedPoll : null;

  const handleVote = async (votePayload) => {
    try {
      await castVote(id, votePayload);
      loadResults(id);
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Failed to cast vote: ' + (err?.message || 'Unknown error'));
      } else {
        Alert.alert('Voting Error', err?.message || 'Failed to submit vote.');
      }
    }
  };

  const handleOpenVoters = () => {
    loadVoters(id);
    setVotersModalOpen(true);
  };

  const handleConfirmClose = async () => {
    try {
      setCloseLoading(true);
      await closeExistingPoll(id);
      setCloseConfirmOpen(false);
      loadPollById(id);
      loadResults(id);
      if (Platform.OS === 'web') {
        window.alert('Poll has been closed.');
      } else {
        Alert.alert('Poll Closed', 'The poll has been closed to further voting.');
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Failed to close poll: ' + (err?.message || 'Unknown error'));
      } else {
        Alert.alert('Error', err?.message || 'Failed to close poll');
      }
    } finally {
      setCloseLoading(false);
    }
  };

  if (!poll && loading) {
    return (
      <ScreenShell title="Poll Details" iconName="BarChart2">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-muted-foreground text-sm">Loading poll details...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (!poll) {
    return (
      <ScreenShell title="Poll Details" iconName="BarChart2">
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-destructive font-bold text-base mb-2">Poll Not Found</Text>
          <Text className="text-muted-foreground text-sm text-center mb-4">
            The requested community poll could not be loaded or you do not have permission to view it.
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            Go Back
          </Button>
        </View>
      </ScreenShell>
    );
  }

  const isClosed = poll.status === 'Closed';
  const hasVoted = Boolean(poll.hasVoted);
  const isCreator = poll.createdBy?._id === user?.id || poll.createdBy === user?.id;

  // Decide whether to show results based on resultsVisibility policy
  const canSeeResults =
    poll.resultsVisibility === 'ALWAYS' ||
    (poll.resultsVisibility === 'AFTER_VOTE' && (hasVoted || isClosed)) ||
    (poll.resultsVisibility === 'AFTER_EXPIRY' && isClosed) ||
    (poll.resultsVisibility === 'ADMIN_ONLY' && (canClose || isCreator));

  return (
    <ScreenShell
      title="Poll Details"
      subtitle={poll.question}
      iconName="BarChart2"
    >
      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Top Poll Card Header */}
        <View className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1 me-3">
              <Text className="text-lg font-bold text-foreground">
                {poll.question}
              </Text>
              {Boolean(poll.description) && (
                <Text className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {poll.description}
                </Text>
              )}
            </View>
            <StatusBadge
              label={poll.status}
              variant={poll.status === 'Active' ? 'success' : 'neutral'}
            />
          </View>

          {/* Target Audience / Metadata pill row */}
          <View className="flex-row flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/40">
            <View className="bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
              <Text className="text-[10px] text-muted-foreground font-medium">
                Audience: {poll.targetAudience?.targetType || 'ALL RESIDENTS'}
              </Text>
            </View>
            <View className="bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
              <Text className="text-[10px] text-muted-foreground font-medium">
                Ends: {new Date(poll.endDate).toLocaleDateString()}
              </Text>
            </View>
            {hasVoted && (
              <View className="bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                <Text className="text-[10px] text-primary font-bold">
                  ✓ You Voted
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Social Engagement & Reactions Bar: 👍 Helpful  ❤️ Important  🙏 Thanks */}
        <PollEngagementBar
          reactions={poll.reactionCounts || poll.reactions}
          userReaction={poll.userReaction}
          likeCount={poll.likeCount || 0}
          isLiked={Boolean(poll.isLiked)}
          onReactionPress={(type) => reactToPoll(poll._id, type)}
          onLikePress={() => reactToPoll(poll._id, 'HELPFUL')}
        />

        {/* Voting Section (Shown only if Active and not yet voted, or if editing ballot is supported) */}
        {!isClosed && !hasVoted && (
          <PollVotingSection
            poll={poll}
            onVote={handleVote}
            submitting={voting}
            userUnit={user?.unitNumber || user?.unit || ''}
          />
        )}

        {/* Already Voted Notice */}
        {!isClosed && hasVoted && (
          <View className="bg-primary/10 rounded-2xl border border-primary/20 p-4 mb-4 flex-row items-center gap-3">
            <ShieldCheck size={24} color="#2563eb" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">Your Vote Has Been Recorded</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Thank you for participating in this community decision.
              </Text>
            </View>
          </View>
        )}

        {/* Closed Poll Notice */}
        {isClosed && (
          <View className="bg-muted/60 rounded-2xl border border-border p-4 mb-4 flex-row items-center gap-3">
            <Lock size={20} color="#64748b" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">Poll Closed</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Voting has concluded for this poll. Final results are displayed below.
              </Text>
            </View>
          </View>
        )}

        {/* Results View */}
        {canSeeResults ? (
          <PollResultsView poll={poll} results={results} />
        ) : (
          <View className="bg-card rounded-2xl border border-border p-4 mb-4 items-center justify-center py-8">
            <Lock size={28} color="#94a3b8" />
            <Text className="text-sm font-bold text-foreground mt-2">Results are Hidden</Text>
            <Text className="text-xs text-muted-foreground text-center mt-1 px-4">
              {poll.resultsVisibility === 'AFTER_VOTE'
                ? 'Cast your ballot to unlock real-time results.'
                : poll.resultsVisibility === 'AFTER_EXPIRY'
                ? 'Results will be published once the poll has concluded.'
                : 'Results are restricted to community administrators.'}
            </Text>
          </View>
        )}

        {/* Governance & Rules DetailSection */}
        <DetailSection title="Poll Governance Rules" iconName="Shield">
          <DetailRow
            label="Ballot Selection"
            value={
              poll.choiceType === 'MULTIPLE_CHOICE'
                ? `Multiple Choice (Max ${poll.maxChoices || 1})`
                : 'Single Choice'
            }
          />
          <DetailRow
            label="Voting Policy"
            value={poll.votingMode === 'ONE_PER_UNIT' ? 'One Vote Per Villa / Unit' : 'One Vote Per Registered Resident'}
          />
          <DetailRow
            label="Results Visibility"
            value={poll.resultsVisibility}
          />
          <DetailRow
            label="Quorum Required"
            value={`${poll.quorumPercentage || 0}%`}
          />
          <DetailRow
            label="Anonymous Ballot"
            value={poll.isAnonymous ? 'Yes (Encrypted)' : 'No (Public Turnout)'}
            isLast
          />
        </DetailSection>

        {/* Administrative & Accountability Actions */}
        {(canClose || canViewVoters || isCreator) && (
          <View className="gap-2.5 mt-2">
            {canViewVoters && (
              <Button
                variant="outline"
                size="md"
                onPress={handleOpenVoters}
                accessibilityRole="button"
                accessibilityLabel="View Voter Turnout"
              >
                View Voter Turnout
              </Button>
            )}

            {!isClosed && (canClose || isCreator) && (
              <Button
                variant="destructive"
                size="md"
                onPress={() => setCloseConfirmOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Close Poll"
              >
                Close Poll Now
              </Button>
            )}
          </View>
        )}
      </ScrollView>

      {/* Voter Turnout Modal */}
      <PollVotersModal
        visible={votersModalOpen}
        onClose={() => setVotersModalOpen(false)}
        poll={poll}
        voters={voters?.voters || voters || []}
        loading={loading}
      />

      {/* Confirmation Modal for closing poll */}
      <ConfirmationModal
        visible={closeConfirmOpen}
        title="Close Poll"
        message="Are you sure you want to close this poll? No further votes can be submitted once closed."
        confirmLabel="Close Poll"
        variant="danger"
        loading={closeLoading}
        onConfirm={handleConfirmClose}
        onCancel={() => setCloseConfirmOpen(false)}
      />
    </ScreenShell>
  );
}
