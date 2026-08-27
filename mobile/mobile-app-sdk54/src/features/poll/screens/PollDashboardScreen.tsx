import React, { useState, useEffect } from 'react';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell, TabBar, PaginatedList, Button } from '@/components';
import { usePolls } from '../hooks/usePolls';
import { usePollSocket } from '../hooks/usePollSocket';
import PollCard from '../components/PollCard';
import PollEmptyState from '../components/PollEmptyState';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { Poll } from '../store/pollSlice';

export default function PollDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'closed' | 'my'>('active');

  const {
    activePolls,
    closedPolls,
    myPolls,
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    submitVote,
    publishPoll,
    closePoll,
    deletePoll,
  } = usePolls();

  // Initialize socket listeners
  usePollSocket(activeTab);

  const loadData = (tab: typeof activeTab) => {
    const params = { page: 1, limit: 20 };
    if (tab === 'active') loadActivePolls(params);
    if (tab === 'closed') loadClosedPolls(params);
    if (tab === 'my') loadMyPolls(params);
  };

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const getCurrentState = () => {
    if (activeTab === 'active') return activePolls;
    if (activeTab === 'closed') return closedPolls;
    return myPolls;
  };

  const currentState = getCurrentState();

  const handleVote = async (pollId: string, optionIndex: number) => {
    try {
      await submitVote(pollId, optionIndex);
    } catch (error) {
      console.error('Vote failed', error);
    }
  };

  const handlePublish = async (pollId: string) => {
    try {
      await publishPoll(pollId);
    } catch (error) {
      console.error('Publish failed', error);
    }
  };

  const handleClose = async (pollId: string) => {
    try {
      await closePoll(pollId);
    } catch (error) {
      console.error('Close failed', error);
    }
  };

  const handleDelete = async (pollId: string) => {
    try {
      await deletePoll(pollId);
    } catch (error) {
      console.error('Delete failed', error);
    }
  };

  const renderPoll = ({ item }: { item: Poll }) => {
    const isCreator = item.createdBy?._id === user?.id || item.createdBy === user?.id;

    return (
      <PollCard
        poll={item}
        onVote={(index) => handleVote(item._id, index)}
        onPublish={isCreator ? () => handlePublish(item._id) : undefined}
        onClose={isCreator ? () => handleClose(item._id) : undefined}
        onDelete={isCreator ? () => handleDelete(item._id) : undefined}
        onViewDetails={() => router.push(`/(resident)/polls/${item._id}`)}
        isCreator={isCreator}
      />
    );
  };

  return (
    <ScreenShell
      title="Community Polls"
      subtitle="Voice your opinion on community matters"
      iconName="BarChart2"
      headerRight={
        <Button variant="default" size="sm" onPress={() => router.push('/(resident)/polls/create')}>
          New Poll
        </Button>
      }
    >
      <TabBar
        tabs={[
          { key: 'active', label: 'Active' },
          { key: 'closed', label: 'Closed' },
          { key: 'my', label: 'My Polls' },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as typeof activeTab)}
        variant="underline"
      />

      <PaginatedList
        data={currentState.data}
        renderItem={(item) => renderPoll({ item })}
        keyExtractor={(item: any) => item._id}
        pagination={{
          currentPage: (currentState as any).page || 1,
          totalPages: (currentState as any).totalPages || 1,
          totalRecords: (currentState as any).total || currentState.data.length,
          limit: 10,
        }}
        onLoadMore={() => {}}
        onRefresh={() => loadData(activeTab)}
        loading={currentState.loading && currentState.data.length === 0}
        refreshing={currentState.loading}
        emptyTitle="No Polls Found"
        emptySubtitle="There are currently no community polls in this category."
      />
    </ScreenShell>
  );
}
