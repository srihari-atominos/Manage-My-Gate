import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { KPICard } from '@/components/ui/KPICard';
import { FAB } from '@/components/ui/FAB';
import { usePolls } from '../hooks/usePolls';
import { usePollSocket } from '../hooks/usePollSocket';
import { PollCard } from '../components/PollCard';
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

  // Initialize socket listeners for active tab
  usePollSocket(activeTab);

  const loadData = useCallback((tab: typeof activeTab) => {
    const params = { page: 1, limit: 20 };
    if (tab === 'active') loadActivePolls(params);
    if (tab === 'closed') loadClosedPolls(params);
    if (tab === 'my') loadMyPolls(params);
  }, [loadActivePolls, loadClosedPolls, loadMyPolls]);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

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

  const renderPoll = (item: Poll) => {
    const isCreator = item.createdBy?._id === user?.id || item.createdBy === user?.id;

    return (
      <View key={item._id} className="mb-3">
        <PollCard
          poll={item}
          onVote={(index) => handleVote(item._id, index)}
          onPublish={isCreator ? () => handlePublish(item._id) : undefined}
          onClose={isCreator ? () => handleClose(item._id) : undefined}
          onDelete={isCreator ? () => handleDelete(item._id) : undefined}
          onViewDetails={() => router.push(`/(resident)/polls/${item._id}`)}
          isCreator={isCreator}
        />
      </View>
    );
  };

  const activeCount = activePolls.total || activePolls.data.length || 0;
  const myCount = myPolls.total || myPolls.data.length || 0;

  const renderHeader = () => (
    <View className="gap-3 mb-3">
      {/* KPI Summary Row */}
      <View className="flex-row gap-3">
        <KPICard
          title="Active Polls"
          value={String(activeCount)}
          iconName="BarChart3"
          iconColor="#2563eb"
        />
        <KPICard
          title="My Created Polls"
          value={String(myCount)}
          iconName="CheckCircle"
          iconColor="#16a34a"
        />
      </View>

      {/* Segmented TabBar Filter */}
      <View className="bg-card border border-border rounded-2xl p-1 shadow-xs">
        <TabBar
          tabs={[
            { key: 'active', label: 'Active Polls' },
            { key: 'closed', label: 'Closed Polls' },
            { key: 'my', label: 'My Polls' },
          ]}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as typeof activeTab)}
          variant="pill"
        />
      </View>
    </View>
  );

  return (
    <ScreenShell
      title="Community Polls"
      subtitle="Voice your opinion on community matters"
      iconName="BarChart2"
    >
      <View className="flex-1 bg-background">
        {/* Paginated List */}
        <PaginatedList
          data={currentState.data}
          renderItem={renderPoll}
          keyExtractor={(item: any) => item._id}
          pagination={{
            currentPage: (currentState as any).page || 1,
            totalPages: (currentState as any).totalPages || 1,
            totalRecords: (currentState as any).total || currentState.data.length,
            limit: 20,
          }}
          onLoadMore={() => {}}
          onRefresh={() => loadData(activeTab)}
          loading={currentState.loading && currentState.data.length === 0}
          ListHeaderComponent={renderHeader()}
          emptyIcon="BarChart2"
          emptyTitle={`No ${activeTab === 'active' ? 'Active' : activeTab === 'closed' ? 'Closed' : 'Personal'} Polls`}
          emptySubtitle="There are currently no community polls in this category."
          contentContainerClassName="px-4 pt-3 pb-28"
        />

        {/* Resident Action Trigger: FAB */}
        <FAB
          iconName="Plus"
          label="New Poll"
          onPress={() => router.push('/(resident)/polls/create')}
        />
      </View>
    </ScreenShell>
  );
}
