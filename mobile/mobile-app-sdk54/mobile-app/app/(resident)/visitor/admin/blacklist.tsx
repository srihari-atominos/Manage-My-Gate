import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/ListCard';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { AdminBlacklistModal } from '@/src/features/visitor/components/admin/AdminBlacklistModal';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { ShieldX, Plus, Trash2 } from 'lucide-react-native';

export default function AdminBlacklistScreen() {
  const {
    blacklist,
    status,
    actionStatus,
    loadBlacklist,
    addToBlacklist,
    removeFromBlacklist,
  } = useAdminVisitor();

  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRemoveId, setSelectedRemoveId] = useState<string | null>(null);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBlacklist();
    setRefreshing(false);
  }, [loadBlacklist]);

  const handleConfirmRemove = async () => {
    if (selectedRemoveId) {
      await removeFromBlacklist(selectedRemoveId);
      setSelectedRemoveId(null);
    }
  };

  return (
    <ScreenShell
      title="Community Visitor Blacklist"
      subtitle="Restricted visitors & security breach registry"
      headerRight={
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-destructive px-3 py-1.5 rounded-full"
        >
          <Plus size={14} color="#fff" />
          <Text className="text-xs font-bold text-white">Add Entry</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 gap-3 pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {blacklist.length === 0 ? (
          <View className="p-8 bg-card border border-border rounded-2xl items-center justify-center gap-2">
            <ShieldX size={36} className="text-muted-foreground opacity-50" />
            <Text className="text-sm font-semibold text-foreground text-center">No Blacklisted Visitors</Text>
            <Text className="text-xs text-muted-foreground text-center">
              Add individuals to prevent gate entry across the community.
            </Text>
          </View>
        ) : (
          blacklist.map((item: any) => (
            <ListCard
              key={item._id}
              title={item.visitorName}
              subtitle={`Reason: ${item.reason}${item.phone ? ` • Ph: ${item.phone}` : ''}`}
              leftIcon="ShieldAlert"
              leftIconBgColor="rgba(239, 68, 68, 0.1)"
              leftIconColor="#ef4444"
              status={{ label: 'RESTRICTED', variant: 'danger' }}
              rightContent={
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setSelectedRemoveId(item._id)}
                  className="h-8 w-8 p-0 items-center justify-center rounded-lg border-destructive/30"
                >
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              }
            />
          ))
        )}
      </ScrollView>

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
