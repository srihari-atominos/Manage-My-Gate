import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenShell, ListCard, StatusBadge, Typography, ProgressLoader, ErrorBanner } from '@/components';
import { pollApi } from '../services/pollApi';
import { usePolls } from '../hooks/usePolls';
import { Poll } from '../store/pollSlice';
import PollOptionRow from '../components/PollOptionRow';

export default function PollDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activePolls, closedPolls, myPolls, submitVote } = usePolls();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voters, setVoters] = useState<{ [key: string]: any[] }>({});

  // Find poll from local state first to show it instantly
  const poll = 
    activePolls.data.find(p => p._id === id) ||
    closedPolls.data.find(p => p._id === id) ||
    myPolls.data.find(p => p._id === id);

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        setLoading(true);
        const response = await pollApi.getPollVoters(id);
        if (response?.data) {
          setVoters(response.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load voters. You may not have permission.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchVoters();
  }, [id]);

  if (!poll) {
    return (
      <ScreenShell title="Poll Details" iconName="BarChart2">
        <ErrorBanner message="Poll not found." />
      </ScreenShell>
    );
  }

  const isClosed = poll.status === 'Closed';
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votesCount, 0);

  const handleVote = async (optionIndex: number) => {
    try {
      await submitVote(poll._id, optionIndex);
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  return (
    <ScreenShell
      title="Poll Results"
      subtitle="View detailed poll results and voters"
      iconName="BarChart2"
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <ListCard
          title={poll.title}
          subtitle={poll.description || `Total Votes: ${totalVotes}`}
          statusBadge={
            <StatusBadge
              label={poll.status}
              variant={poll.status === 'Active' ? 'success' : poll.status === 'Draft' ? 'neutral' : 'warning'}
            />
          }
        >
          <View className="mt-4">
            {poll.options.map((option, index) => {
              const percentage = totalVotes > 0 ? Math.round((option.votesCount / totalVotes) * 100) : 0;
              const optionVoters = voters[index] || [];
              
              return (
                <View key={option._id || index} className="mb-4">
                  <PollOptionRow
                    text={option.text}
                    votesCount={option.votesCount}
                    percentage={percentage}
                    isSelected={poll.votedOptionIndex === index}
                    showResults={true} // Always show results on detail screen
                    onSelect={() => !isClosed && handleVote(index)}
                    disabled={isClosed}
                  />
                  
                  {/* Voters List for this option */}
                  {loading && <ProgressLoader message="Loading voters..." />}
                  
                  {!loading && !error && optionVoters.length > 0 && (
                    <View className="bg-muted/30 p-3 rounded-md mt-1 ml-4 border-l-2 border-muted">
                      <Typography variant="caption" className="text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
                        Voters ({optionVoters.length})
                      </Typography>
                      {optionVoters.map((voter, vIdx) => (
                        <View key={vIdx} className="flex-row justify-between mb-1">
                          <Typography variant="body2">{voter.name}</Typography>
                          {voter.unit ? (
                            <StatusBadge label={voter.unit} variant="info" size="sm" />
                          ) : (
                            <Typography variant="caption" className="text-muted-foreground">N/A</Typography>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {!loading && !error && optionVoters.length === 0 && (
                    <View className="mt-1 ml-4 border-l-2 border-muted pl-2">
                       <Typography variant="caption" className="text-muted-foreground">No votes yet.</Typography>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ListCard>
        
        {error && <ErrorBanner message={error} className="mt-4" />}
      </ScrollView>
    </ScreenShell>
  );
}
