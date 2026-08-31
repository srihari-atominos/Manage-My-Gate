import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { BlacklistEntryCard, BlacklistEntry } from '@/src/features/visitor/components/admin/BlacklistEntryCard';
import { AdminBlacklistModal } from '@/src/features/visitor/components/admin/AdminBlacklistModal';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { Plus } from 'lucide-react-native';

export default function AdminBlacklistScreen() {
  const {
    blacklist,
    status,
    actionStatus,
    loadBlacklist,
    addToBlacklist,
    removeFromBlacklist,
  } = useAdminVisitor();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRemoveId, setSelectedRemoveId] = useState<string | null>(null);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const handleRefresh = useCallback(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const filteredBlacklist = useMemo(() => {
    if (!search.trim()) return blacklist;
    const q = search.toLowerCase();
    return blacklist.filter((item: any) =>
      (item.visitorName && item.visitorName.toLowerCase().includes(q)) ||
      (item.phone && item.phone.includes(q)) ||
      (item.reason && item.reason.toLowerCase().includes(q)) ||
      (item.idProofNumber && item.idProofNumber.toLowerCase().includes(q))
    );
  }, [blacklist, search]);

  const handleConfirmRemove = async () => {
    if (selectedRemoveId) {
      await removeFromBlacklist(selectedRemoveId);
      setSelectedRemoveId(null);
    }
  };

  const renderEntry = (item: BlacklistEntry) => (
    <BlacklistEntryCard
      key={item._id}
      entry={item}
      onRemovePress={setSelectedRemoveId}
    />
  );

  const renderHeader = () => (
    <View className="mb-3">
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search barred visitor name, phone, reason..."
        variant="default"
        className="px-0 py-0 border-0"
      />
    </View>
  );

  return (
    <ScreenShell
      title="Community Visitor Blacklist"
      subtitle="Restricted visitors & security breach registry"
      headerRight={
        <Button
          variant="destructive"
          size="sm"
          onPress={() => setModalOpen(true)}
          className="flex-row items-center gap-1 rounded-full"
        >
          <Plus size={14} className="text-destructive-foreground" />
          <Text className="text-xs font-bold text-destructive-foreground">Add Entry</Text>
        </Button>
      }
    >
      <View className="flex-1 bg-background">
        {/* High-Performance Paginated List */}
        <PaginatedList<BlacklistEntry>
          data={(filteredBlacklist || []) as BlacklistEntry[]}
          renderItem={(item) => item ? renderEntry(item) : null}
          keyExtractor={(item, index) => item?._id || `empty-${index}`}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            totalRecords: filteredBlacklist.length,
            limit: 50,
          }}
          onLoadMore={() => {}}
          loading={status === 'loading'}
          onRefresh={handleRefresh}
          ListHeaderComponent={renderHeader()}
          emptyIcon="ShieldAlert"
          emptyTitle="No Blacklisted Visitors"
          emptySubtitle="Add individuals to prevent gate entry across the community."
          contentContainerClassName="px-4 pt-3 pb-28"
        />
      </View>

      <AdminBlacklistModal
        visible={modalOpen}
        loading={actionStatus === 'loading'}
        onClose={() => setModalOpen(false)}
        onSubmit={async (data) => {
          await addToBlacklist(data);
        }}
      />

      <ConfirmationModal
        visible={Boolean(selectedRemoveId)}
        title="Remove Blacklist Entry?"
        message="Are you sure you want to remove this visitor from the community blacklist?"
        variant="danger"
        confirmLabel="Remove Entry"
        onConfirm={handleConfirmRemove}
        onCancel={() => setSelectedRemoveId(null)}
        loading={actionStatus === 'loading'}
      />
    </ScreenShell>
  );
}
