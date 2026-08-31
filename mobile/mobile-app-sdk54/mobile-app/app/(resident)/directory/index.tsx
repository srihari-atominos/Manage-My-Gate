import React from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { DirectoryContactCard, DirectoryMember } from '@/src/features/directory/components/DirectoryContactCard';
import { useDirectory } from '@/src/features/directory/hooks/useDirectory';

export default function DirectoryScreen() {
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    refreshing,
    filteredMembers,
    totalCount,
    onRefresh,
    onCall,
    onIntercom,
  } = useDirectory();

  const renderHeader = (
    <View className="gap-3 pb-3">
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, villa unit, or role..."
      />

      <SegmentedControl
        segments={[
          { key: 'all', label: 'All' },
          { key: 'resident', label: 'Residents' },
          { key: 'guard', label: 'Security' },
          { key: 'staff', label: 'Staff' },
        ]}
        activeSegment={activeTab}
        onChange={setActiveTab}
      />
    </View>
  );

  return (
    <ScreenShell
      title="Community Directory"
      subtitle="Search residents, security staff & facility specialists"
      iconName="Users"
      showBackButton={true}
    >
      <View className="flex-1 bg-background">
        <PaginatedList<DirectoryMember>
          data={filteredMembers}
          renderItem={(member) => (
            <DirectoryContactCard
              key={member.id}
              member={member}
              onCall={onCall}
              onIntercom={onIntercom}
            />
          )}
          keyExtractor={(member) => member.id}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: totalCount,
            limit: 50,
          }}
          loading={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onLoadMore={() => {}}
          ListHeaderComponent={renderHeader}
          emptyIcon="Users"
          emptyTitle="No Directory Members Found"
          emptySubtitle="No community records match your current search or filter."
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>
    </ScreenShell>
  );
}
