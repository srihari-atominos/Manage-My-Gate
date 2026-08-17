import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from 'expo-router';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { FAB } from '@/components/ui/FAB';
import { Text } from '@/components/ui/text';
import { KPICard } from '@/components/ui/KPICard';
import { TabBar } from '@/components/ui/TabBar';
import { Archive, BarChart3, Edit3, CheckCircle, Plus } from 'lucide-react-native';

import { usePolls } from '@/src/features/noticeBoard/subFeatures/poll/hooks/usePolls';
import { usePollSocket } from '@/src/features/noticeBoard/subFeatures/poll/hooks/usePollSocket';
import { PollCard } from '@/src/features/noticeBoard/subFeatures/poll/components/PollCard';
import { CreatePollModal } from '@/src/features/noticeBoard/subFeatures/poll/components/CreatePollModal';
import { VoterListBottomSheet } from '@/src/features/noticeBoard/subFeatures/poll/components/VoterListBottomSheet';
import { RootState } from '@/src/store/store';

type TabType = 'Active' | 'Closed' | 'MyPolls';

export default function PollDashboardScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState<TabType>('Active');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Voter Accountability Modal State
  const [votersModalOpen, setVotersModalOpen] = useState(false);
  const [selectedPollForVoters, setSelectedPollForVoters] = useState<any>(null);

  const socketTab = activeTab === 'Active' ? 'active' : activeTab === 'Closed' ? 'closed' : 'my';
  // Real-time socket sync
  usePollSocket(socketTab);

  const {
    activePolls,
    closedPolls,
    myPolls,
    voters,
    votersLoading,
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    loadPollVoters,
    submitNewPoll,
    submitVote,
    publishPoll,
    closePoll,
    deletePoll,
  } = usePolls();

  // Load polls on mount and focus
  useFocusEffect(
    useCallback(() => {
      loadActivePolls();
      loadMyPolls();
      loadClosedPolls();
    }, [loadActivePolls, loadMyPolls, loadClosedPolls])
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === 'Active') loadActivePolls();
    if (activeTab === 'Closed') loadClosedPolls();
    if (activeTab === 'MyPolls') loadMyPolls();
  }, [activeTab, loadActivePolls, loadClosedPolls, loadMyPolls]);

  const handleVote = useCallback(async (pollId: string, optionIndex: number) => {
    try {
      await submitVote(pollId, optionIndex);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to vote');
    }
  }, [submitVote]);

  const handlePublish = useCallback(async (pollId: string) => {
    try {
      await publishPoll(pollId);
      Alert.alert('Success', 'Poll published successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to publish poll');
    }
  }, [publishPoll]);

  const handleClosePoll = useCallback(async (pollId: string) => {
    Alert.alert('Confirm Close', 'Are you sure you want to close this poll? Voting will be disabled.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close Poll', style: 'destructive', onPress: async () => {
          try {
            await closePoll(pollId);
            Alert.alert('Success', 'Poll closed successfully');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to close poll');
          }
      }},
    ]);
  }, [closePoll]);

  const handleDelete = useCallback(async (pollId: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this poll? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deletePoll(pollId);
            Alert.alert('Success', 'Poll deleted successfully');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete poll');
          }
      }},
    ]);
  }, [deletePoll]);

  const handleCreateSubmit = async (pollData: any) => {
    await submitNewPoll(pollData);
    setActiveTab('MyPolls');
    loadMyPolls();
    setTimeout(() => {
      Alert.alert('Success', 'Poll created successfully!');
    }, 500);
  };

  const handleViewVoters = useCallback((poll: any) => {
    setSelectedPollForVoters(poll);
    setVotersModalOpen(true);
    loadPollVoters(poll._id);
  }, [loadPollVoters]);

  const getListData = () => {
    if (activeTab === 'Active') return activePolls.data;
    if (activeTab === 'Closed') return closedPolls.data;
    return myPolls.data;
  };

  const getListLoading = () => {
    if (activeTab === 'Active') return activePolls.loading;
    if (activeTab === 'Closed') return closedPolls.loading;
    return myPolls.loading;
  };

  const isAdmin = user?.role === 'Community Admin' || user?.role === 'Super Admin' || user?.role === 'Platform Super Admin';

  const renderPollCard = useCallback((item: any) => (
    <PollCard
      poll={item}
      onVote={handleVote}
      onPublish={handlePublish}
      onClosePoll={handleClosePoll}
      onDelete={handleDelete}
      onViewVoters={handleViewVoters}
      currentUser={user}
      isAdmin={isAdmin}
    />
  ), [handleVote, handlePublish, handleClosePoll, handleDelete, handleViewVoters, user, isAdmin]);

  return (
    <ScreenShell 
      title="Community Polls" 
      subtitle="Voice your opinion & vote"
      headerRight={
        <TouchableOpacity
          onPress={() => setCreateModalOpen(true)}
          className="flex-row items-center gap-1 bg-primary px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="Create Poll"
        >
          <Plus size={14} color="#ffffff" />
          <Text className="text-xs font-bold text-primary-foreground">Create Poll</Text>
        </TouchableOpacity>
      }
    >
      <View className="flex-1 bg-background">
        {/* KPI Stats & Quick Actions Header */}
        <View className="p-4 pb-3 gap-3 bg-background border-b border-border/40 shadow-xs z-10">
          
          {/* KPI Statistics */}
          <View className="flex-row gap-3">
            <KPICard
              title="Active Polls"
              value={String(activePolls.total || 0)}
              iconName="BarChart3"
              iconColor="#2563eb"
            />
            <KPICard
              title="My Polls"
              value={String(myPolls.total || 0)}
              iconName="CheckCircle"
              iconColor="#16a34a"
            />
          </View>

          {/* Quick Action Navigation Grid (Tabs) */}
          <View className="bg-card border border-border rounded-2xl pt-2 pb-1">
            <TabBar
              tabs={[
                { key: 'Active', label: 'Active Polls' },
                { key: 'Closed', label: 'Closed Polls' },
                { key: 'MyPolls', label: 'My Polls' }
              ]}
              activeTab={activeTab}
              onTabChange={(key) => setActiveTab(key as TabType)}
              variant="pill"
            />
          </View>
        </View>

        {/* Paginated Polls List */}
        <View className="flex-1">
          <PaginatedList
            data={getListData()}
            renderItem={renderPollCard}
            keyExtractor={(item: any) => item._id}
            loading={getListLoading()}
            onRefresh={handleRefresh}
            pagination={{
              currentPage: 1,
              totalPages: 1,
              totalRecords: getListData().length,
              limit: 20,
            }}
            onLoadMore={() => {}}
            emptyTitle={`No ${activeTab} Polls`}
            emptyIcon="Archive"
            contentContainerClassName="pt-3 pb-8 px-4"
          />
        </View>

      </View>



      <CreatePollModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      <VoterListBottomSheet
        visible={votersModalOpen}
        onClose={() => setVotersModalOpen(false)}
        poll={selectedPollForVoters}
        votersGrouped={voters}
        loading={votersLoading}
      />
    </ScreenShell>
  );
}
