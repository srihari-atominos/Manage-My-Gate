import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { DetailSection } from '@/components/ui/DetailSection';
import { DetailRow } from '@/components/ui/DetailRow';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SkeletonLoader } from '@/components/feedback/SkeletonLoader';
import {
  BarChart2,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Vote,
} from 'lucide-react-native';
import { pollApi } from '../services/pollApi';
import { usePolls } from '../hooks/usePolls';
import { usePollSocket } from '../hooks/usePollSocket';
import { Poll } from '../store/pollSlice';
import PollOptionRow from '../components/PollOptionRow';

export function PollDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pollId = id || '';

  const { activePolls, closedPolls, myPolls, submitVote } = usePolls();
  
  // Real-time socket sync for active ballots
  usePollSocket('active');

  const [fallbackPoll, setFallbackPoll] = useState<Poll | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voters, setVoters] = useState<{ [key: string]: any[] }>({});

  // 1. Find poll from Redux store
  const reduxPoll: Poll | undefined =
    activePolls.data.find((p: any) => p._id === pollId) ||
    closedPolls.data.find((p: any) => p._id === pollId) ||
    myPolls.data.find((p: any) => p._id === pollId);

  const poll: Poll | null = reduxPoll || fallbackPoll;

  // Direct fetch fallback if deep linked directly
  const fetchSinglePoll = useCallback(async () => {
    if (!pollId) return;
    try {
      setLoadingPoll(true);
      const response = await pollApi.getPollById(pollId);
      if (response?.data) {
        setFallbackPoll(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load poll details.');
    } finally {
      setLoadingPoll(false);
    }
  }, [pollId]);

  const fetchVoters = useCallback(async () => {
    if (!pollId) return;
    try {
      setLoadingVoters(true);
      const response = await pollApi.getPollVoters(pollId);
      if (response?.data) {
        setVoters(response.data);
      }
    } catch (err: any) {
      console.log('Voter details restricted or unavailable', err);
    } finally {
      setLoadingVoters(false);
    }
  }, [pollId]);

  useEffect(() => {
    if (!reduxPoll && pollId) {
      fetchSinglePoll();
    }
  }, [pollId, reduxPoll, fetchSinglePoll]);

  useEffect(() => {
    if (pollId) {
      fetchVoters();
    }
  }, [pollId, fetchVoters]);

  const handleRefresh = useCallback(() => {
    fetchSinglePoll();
    fetchVoters();
  }, [fetchSinglePoll, fetchVoters]);

  const handleVote = async (optionIndex: number) => {
    if (!poll || votingLoading) return;
    try {
      setVotingLoading(true);
      setError(null);
      await submitVote(poll._id, optionIndex);
      fetchVoters();
    } catch (err: any) {
      setError(err.response?.data?.message || err?.message || 'Failed to record vote. Please try again.');
    } finally {
      setVotingLoading(false);
    }
  };

  const isInitialLoading = loadingPoll && !poll;

  if (!poll && !isInitialLoading) {
    return (
      <ScreenShell title="Poll Details" iconName="BarChart2">
        <View className="flex-1 items-center justify-center p-6 bg-background">
          <EmptyState
            icon={AlertCircle}
            title="Poll Not Found"
            description="The requested community poll could not be located or has been archived."
            actionLabel="Back to Polls"
            onAction={() => router.back()}
          />
        </View>
      </ScreenShell>
    );
  }

  const isClosed = poll?.status === 'Closed';
  const totalVotes = (poll?.options || []).reduce(
    (sum: number, opt: any) => sum + (opt.votesCount || 0),
    0
  );
  const hasUserVoted = Boolean(poll?.hasVoted || poll?.votedOptionIndex !== undefined && poll?.votedOptionIndex !== null);

  const statusVariant: StatusVariant =
    poll?.status === 'Active' ? 'success' : poll?.status === 'Draft' ? 'neutral' : 'warning';

  const createdAtFormatted = poll?.createdAt
    ? new Date(poll.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const expiresAtFormatted = poll?.expiresAt
    ? new Date(poll.expiresAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <ScreenShell
      title="Community Poll"
      subtitle={poll?.title || 'Ballot & Live Results'}
      iconName="BarChart2"
      headerRight={
        poll ? (
          <StatusBadge label={poll.status} variant={statusVariant} dot />
        ) : null
      }
    >
      <View className="flex-1 bg-background">
        {/* Error Banner Container */}
        {error ? (
          <View className="mb-2 px-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </View>
        ) : null}

        {isInitialLoading ? (
          <View className="p-4">
            <SkeletonLoader count={3} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4 pt-2"
            contentContainerClassName="gap-4 pb-28"
            refreshControl={
              <RefreshControl
                refreshing={loadingPoll || loadingVoters}
                onRefresh={handleRefresh}
              />
            }
          >
            {/* Hero Poll Overview Card */}
            <View className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 me-2">
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center me-3">
                    <Icon as={Vote} size={20} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-extrabold text-lg leading-snug">
                      {poll?.title}
                    </Text>
                  </View>
                </View>
              </View>

              {poll?.description ? (
                <Text className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {poll.description}
                </Text>
              ) : null}

              {/* Poll Metrics Summary Bar */}
              <View className="flex-row items-center justify-between bg-muted/40 border border-border/60 rounded-xl p-3.5">
                <View className="flex-row items-center">
                  <Icon as={Users} size={15} className="text-primary me-1.5" />
                  <Text className="text-xs font-bold text-foreground">
                    {totalVotes} {totalVotes === 1 ? 'Total Vote' : 'Total Votes'}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Icon as={Calendar} size={13} className="text-muted-foreground me-1" />
                  <Text className="text-xs text-muted-foreground">
                    Posted: {createdAtFormatted}
                  </Text>
                </View>

                {expiresAtFormatted ? (
                  <View className="flex-row items-center">
                    <Icon as={Clock} size={13} className="text-muted-foreground me-1" />
                    <Text className="text-xs text-muted-foreground">
                      Ends: {expiresAtFormatted}
                    </Text>
                  </View>
                ) : null}
              </View>

              {hasUserVoted ? (
                <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mt-3">
                  <Icon as={CheckCircle2} size={16} className="text-emerald-600 me-2" />
                  <Text className="text-xs font-semibold text-foreground flex-1">
                    Your vote has been counted. Results update dynamically in real time.
                  </Text>
                </View>
              ) : isClosed ? (
                <View className="flex-row items-center bg-muted border border-border rounded-xl p-3 mt-3">
                  <Icon as={AlertCircle} size={16} className="text-muted-foreground me-2" />
                  <Text className="text-xs font-medium text-muted-foreground flex-1">
                    This poll has ended. Voting is now closed.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Interactive Ballot Options & Results Breakdown */}
            <DetailSection title={hasUserVoted || isClosed ? 'Live Election Results' : 'Cast Your Vote'}>
              <View className="mt-1">
                {(poll?.options || []).map((option: any, index: number) => {
                  const percentage =
                    totalVotes > 0
                      ? Math.round(((option.votesCount || 0) / totalVotes) * 100)
                      : 0;
                  const isSelected = poll?.votedOptionIndex === index;

                  return (
                    <PollOptionRow
                      key={option._id || `opt-${index}`}
                      text={option.text}
                      votesCount={option.votesCount || 0}
                      percentage={percentage}
                      isSelected={isSelected}
                      showResults={hasUserVoted || isClosed}
                      onSelect={() => handleVote(index)}
                      disabled={isClosed || votingLoading}
                    />
                  );
                })}
              </View>
            </DetailSection>

            {/* Voter Transparency Breakdown by Unit */}
            <DetailSection title="Voter Participation by Unit">
              {(poll?.options || []).map((option: any, index: number) => {
                const optionVoters = voters[index] || [];
                return (
                  <View key={`voters-${index}`} className="mb-4 bg-card border border-border rounded-xl p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xs font-bold text-primary uppercase tracking-wider">
                        {option.text}
                      </Text>
                      <StatusBadge
                        label={`${optionVoters.length} ${optionVoters.length === 1 ? 'voter' : 'voters'}`}
                        variant="neutral"
                        size="sm"
                      />
                    </View>

                    {loadingVoters ? (
                      <Text className="text-xs text-muted-foreground py-2">Loading voter list...</Text>
                    ) : optionVoters.length === 0 ? (
                      <Text className="text-xs text-muted-foreground italic py-1">No votes registered yet for this option.</Text>
                    ) : (
                      <View className="gap-1.5 pt-1">
                        {optionVoters.map((voter: any, vIdx: number) => (
                          <View
                            key={`voter-${index}-${vIdx}`}
                            className="flex-row items-center justify-between py-1.5 border-b border-border/40 last:border-b-0"
                          >
                            <Text className="text-sm font-medium text-foreground">
                              {voter.name || voter.username || 'Resident'}
                            </Text>
                            {voter.unit ? (
                              <StatusBadge label={`Villa ${voter.unit}`} variant="info" size="sm" />
                            ) : (
                              <Text className="text-xs text-muted-foreground">Unit N/A</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </DetailSection>

            {/* Metadata & Audit Information */}
            <DetailSection title="Poll Metadata">
              <DetailRow label="Poll Reference ID" value={pollId} copyable />
              <DetailRow label="Status" value={poll?.status || 'Active'} />
              <DetailRow label="Total Participating Votes" value={String(totalVotes)} />
              <DetailRow label="Created Date" value={createdAtFormatted} />
              {expiresAtFormatted ? (
                <DetailRow label="Closing Date" value={expiresAtFormatted} />
              ) : null}
            </DetailSection>
          </ScrollView>
        )}
      </View>
    </ScreenShell>
  );
}

export default PollDetailScreen;
