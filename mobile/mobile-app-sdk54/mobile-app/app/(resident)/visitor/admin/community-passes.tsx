import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { VisitorPassCard } from '@/src/features/visitor/components/VisitorPassCard';
import { VisitorPassDetailsModal } from '@/src/features/visitor/components/VisitorPassDetailsModal';
import { AdminVillaFilterSheet } from '@/src/features/visitor/components/admin/AdminVillaFilterSheet';
import { useAdminVisitor } from '@/src/features/visitor/hooks/useAdminVisitor';
import { VisitorPass } from '@/src/features/visitor/store/visitorPassSlice';
import { Building2, UserPlus, Filter } from 'lucide-react-native';

export default function AdminCommunityPassesScreen() {
  const router = useRouter();
  const {
    communityPasses,
    pagination,
    status,
    actionStatus,
    loadCommunityPasses,
    forceRevoke,
  } = useAdminVisitor();

  const [search, setSearch] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');
  const [selectedVillaId, setSelectedVillaId] = useState<string | undefined>(undefined);
  const [selectedVillaName, setSelectedVillaName] = useState<string>('All Villas');
  const [villaSheetOpen, setVillaSheetOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<VisitorPass | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  const fetchPassesList = useCallback(
    (page = 1, append = false) => {
      loadCommunityPasses({
        page,
        append,
        search,
        status: activeStatusFilter === 'ALL' ? undefined : activeStatusFilter,
        villaId: selectedVillaId,
      });
    },
    [loadCommunityPasses, search, activeStatusFilter, selectedVillaId]
  );

  useEffect(() => {
    fetchPassesList(1);
  }, [fetchPassesList]);

  const handleRefresh = useCallback(() => {
    fetchPassesList(1);
  }, [fetchPassesList]);

  const handleLoadMore = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages) {
      fetchPassesList(pagination.currentPage + 1, true);
    }
  }, [pagination, fetchPassesList]);

  const handleConfirmForceRevoke = async () => {
    if (selectedPass) {
      await forceRevoke(selectedPass._id, 'Admin Force Revocation');
      setRevokeModalOpen(false);
      setSelectedPass(null);
      fetchPassesList(1);
    }
  };

  return (
    <ScreenShell
      title="All Community Passes"
      subtitle="Master pass registry & villa-level security filters"
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(resident)/visitor/admin/create-pass' as any)}
          activeOpacity={0.8}
          className="flex-row items-center gap-1 bg-primary px-3 py-1.5 rounded-full"
        >
          <UserPlus size={14} color="#fff" />
          <Text className="text-xs font-bold text-primary-foreground">New Pass</Text>
        </TouchableOpacity>
      }
    >
      <View className="flex-1 bg-background">
        {/* Search & Filter Bar */}
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search visitor name, phone or pass code..."
          sortOptions={[
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Pending', value: 'PENDING' },
            { label: 'Revoked', value: 'REVOKED' },
            { label: 'Expired', value: 'EXPIRED' },
          ]}
          currentSort={activeStatusFilter}
          onSortChange={setActiveStatusFilter}
          variant="bordered"
        />

        {/* Villa Filter Trigger Pill */}
        <View className="px-4 pb-2 flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => setVillaSheetOpen(true)}
            activeOpacity={0.8}
            className="flex-row items-center gap-2 bg-card border border-primary/30 px-3 py-2 rounded-xl"
          >
            <Building2 size={16} className="text-primary" />
            <Text className="text-xs font-bold text-primary">{selectedVillaName}</Text>
            <Filter size={14} className="text-primary ml-1" />
          </TouchableOpacity>
        </View>

        {/* Paginated List using Reusable VisitorPassCard */}
        <PaginatedList<VisitorPass>
          data={communityPasses}
          pagination={pagination}
          loading={status === 'loading'}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          emptyIcon="QrCode"
          emptyTitle="No Community Passes Found"
          emptySubtitle="No passes matched your search or villa filter parameters."
          contentContainerClassName="p-4 pt-1"
          renderItem={(pass) => (
            <VisitorPassCard
              key={pass._id}
              pass={pass}
              villaBadge={(pass as any).villaName || (pass as any).villaNumber || 'Community'}
              onPress={(p) => {
                setSelectedPass(p);
                setDetailsModalOpen(true);
              }}
              onShowQR={(p) => {
                setSelectedPass(p);
                setDetailsModalOpen(true);
              }}
            />
          )}
        />

        {/* Admin Villa Filter Bottom Sheet */}
        <AdminVillaFilterSheet
          visible={villaSheetOpen}
          selectedVillaId={selectedVillaId}
          onClose={() => setVillaSheetOpen(false)}
          onSelectVilla={(vId, vName) => {
            setSelectedVillaId(vId);
            setSelectedVillaName(vName || 'All Villas');
          }}
        />

        {/* Pass Details Modal */}
        <VisitorPassDetailsModal
          visible={detailsModalOpen}
          pass={selectedPass}
          onClose={() => setDetailsModalOpen(false)}
          onRevokePress={(p) => {
            setSelectedPass(p);
            setRevokeModalOpen(true);
          }}
        />

        {/* Force Revoke Confirmation Modal */}
        <ConfirmationModal
          visible={revokeModalOpen}
          title="Force Revoke Pass?"
          message={`Are you sure you want to revoke pass for ${selectedPass?.visitorName}?`}
          variant="danger"
          confirmLabel="Force Revoke"
          onConfirm={handleConfirmForceRevoke}
          onCancel={() => setRevokeModalOpen(false)}
          loading={actionStatus === 'loading'}
        />
      </View>
    </ScreenShell>
  );
}
