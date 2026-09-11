import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, BarChart3, CheckCircle } from 'lucide-react-native';

import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/common/Button';
import { Text } from '@/components/ui/text';

import { usePolls } from '../hooks/usePolls';
import { usePollSocket } from '../hooks/usePollSocket';
import { PollCard } from '../components/PollCard';
import { CreatePollModal } from '../components/CreatePollModal';

/**
 * PollDashboardScreen Component (Pure JSX)
 * Displays community polls divided into Active, Closed, and My Polls.
 * Includes KPI metrics header, tab navigation, real-time sync, and poll creation for authorized users.
 */
export default function PollDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('active');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const {
    activePolls,
    activeTotal,
    activeLoading,
    closedPolls,
    closedTotal,
    closedLoading,
    myPolls,
    myTotal,
    myLoading,
    submitting,
    user,
    canCreate,
    loadActivePolls,
    loadClosedPolls,
    loadMyPolls,
    createNewPoll,
    selectCurrentPoll,
  } = usePolls();

  // Socket listener synchronization
  usePollSocket(activeTab);

  const loadData = useCallback(
    (tab) => {
      const params = { page: 1, limit: 20 };
      if (tab === 'active') loadActivePolls(params);
      else if (tab === 'closed') loadClosedPolls(params);
      else if (tab === 'my') loadMyPolls(params);
    },
    [loadActivePolls, loadClosedPolls, loadMyPolls]
  );

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  const handleRefresh = () => {
    loadData(activeTab);
  };

  const handleCreateSubmit = async (pollPayload) => {
    try {
      await createNewPoll(pollPayload);
      setActiveTab('active');
      loadActivePolls();
      if (Platform.OS === 'web') {
        window.alert('Poll created successfully!');
      } else {
        Alert.alert('Success', 'Poll created successfully!');
      }
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Error creating poll: ' + (err?.message || 'Unknown error'));
      } else {
        Alert.alert('Error', err?.message || 'Failed to create poll');
      }
      throw err;
    }
  };

  const handleCardPress = (poll) => {
    selectCurrentPoll(poll);
    router.push(`/(resident)/polls/${poll._id}`);
  };

  // Get current list data and loading status
  const getCurrentData = () => {
    if (activeTab === 'active') return activePolls;
    if (activeTab === 'closed') return closedPolls;
    return myPolls;
  };

  const getCurrentLoading = () => {
    if (activeTab === 'active') return activeLoading;
    if (activeTab === 'closed') return closedLoading;
    return myLoading;
  };

  const getCurrentTotal = () => {
    if (activeTab === 'active') return activeTotal;
    if (activeTab === 'closed') return closedTotal;
    return myTotal;
  };

  const currentList = getCurrentData();
  const isLoading = getCurrentLoading();
  const totalCount = getCurrentTotal();

  const tabs = [
    { key: 'active', label: 'Active Polls' },
    { key: 'closed', label: 'Closed Polls' },
    { key: 'my', label: 'My Polls' },
  ];

  return (
    <ScreenShell
      title="Community Polls"
      subtitle="Voice your opinion on community decisions"
      iconName="BarChart2"
      headerRight={
        canCreate ? (
          <TouchableOpacity
            onPress={() => setCreateModalOpen(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-1.5 bg-primary px-3 py-1.5 rounded-full"
            accessibilityRole="button"
            accessibilityLabel="New Poll"
          >
            <Plus size={14} color="#ffffff" />
            <Text className="text-xs font-bold text-white">New Poll</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <View className="flex-1 bg-background">
        {/* KPI Stats Header */}
        <View className="p-4 pb-2 bg-background border-b border-border/40">
          <View className="flex-row gap-3 mb-3">
            <KPICard
              title="Active Polls"
              value={String(activeTotal || 0)}
              iconName="BarChart3"
              iconColor="#2563eb"
            />
            <KPICard
              title="My Created Polls"
              value={String(myTotal || 0)}
              iconName="CheckCircle"
              iconColor="#16a34a"
            />
          </View>

          {/* Tab Navigation */}
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="pill"
          />
        </View>

        {/* Paginated Polls List */}
        <View className="flex-1 px-4 pt-3">
          <PaginatedList
            data={currentList}
            renderItem={(item) => (
              <PollCard
                poll={item}
                currentUser={user}
                onPress={() => handleCardPress(item)}
              />
            )}
            keyExtractor={(item) => item._id}
            loading={isLoading && currentList.length === 0}
            onRefresh={handleRefresh}
            refreshing={isLoading}
            emptyIcon="BarChart2"
            emptyTitle={`No ${activeTab === 'my' ? 'Polls Created' : activeTab === 'closed' ? 'Closed Polls' : 'Active Polls'}`}
            emptySubtitle={
              activeTab === 'active'
                ? 'There are no active polls requiring your vote right now.'
                : activeTab === 'closed'
                ? 'There are no closed community polls to display.'
                : 'You have not created any polls yet.'
            }
            pagination={{
              currentPage: 1,
              totalPages: Math.ceil(totalCount / 20) || 1,
              totalRecords: totalCount,
              limit: 20,
            }}
          />
        </View>
      </View>

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={submitting}
      />
    </ScreenShell>
  );
}
