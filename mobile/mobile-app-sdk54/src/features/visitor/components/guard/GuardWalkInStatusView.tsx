import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ShieldAlert, Clock, User, Phone, Car, CheckCircle2, XCircle, RefreshCw, Building2 } from 'lucide-react-native';
import { useVisitorPass } from '../../hooks/useVisitorPass';
import { useVisitorSocket } from '../../hooks/useVisitorSocket';
import { WalkInApprovalItem } from '../../mocks/visitorMocks';

export const GuardWalkInStatusView: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Activate real-time socket listener
  useVisitorSocket();

  const { walkIns, loadPendingWalkIns } = useVisitorPass();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPendingWalkIns();
    setRefreshing(false);
  }, [loadPendingWalkIns]);

  useEffect(() => {
    loadPendingWalkIns();
  }, [loadPendingWalkIns]);

  const items: WalkInApprovalItem[] = walkIns?.pendingList || [];

  const filteredItems = React.useMemo(() => {
    if (filter === 'ALL') return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  const getStatusBadge = (status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    switch (status) {
      case 'APPROVED':
        return (
          <View className="flex-row items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">APPROVED</Text>
          </View>
        );
      case 'REJECTED':
        return (
          <View className="flex-row items-center gap-1 bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full">
            <XCircle size={13} className="text-destructive" />
            <Text className="text-xs font-bold text-destructive">DENIED BY HOST</Text>
          </View>
        );
      case 'PENDING':
      default:
        return (
          <View className="flex-row items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <Clock size={13} className="text-amber-600 dark:text-amber-400" />
            <Text className="text-xs font-bold text-amber-600 dark:text-amber-400">PENDING APPROVAL</Text>
          </View>
        );
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Top Filter Chips & Sync Status Header */}
      <View className="px-4 py-3 border-b border-border bg-card/50 flex-row items-center justify-between gap-2">
        <View className="flex-row gap-1.5 flex-1">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full border ${
                filter === f
                  ? 'bg-primary border-primary'
                  : 'bg-card border-border'
              }`}
            >
              <Text className={`text-xs font-bold ${filter === f ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleRefresh} className="p-2 bg-muted rounded-full">
          <RefreshCw size={14} className="text-muted-foreground" />
        </TouchableOpacity>
      </View>

      {/* Paginated Requests List */}
      <PaginatedList<WalkInApprovalItem>
        data={filteredItems}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          totalRecords: filteredItems.length,
          limit: 20,
        }}
        onLoadMore={() => {}}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        loading={walkIns?.status === 'loading' && !refreshing && items.length === 0}
        emptyIcon="ShieldAlert"
        emptyTitle="No Walk-In Requests Found"
        emptySubtitle="Walk-in entry requests initiated at the gate will appear here with live status updates."
        contentContainerClassName="p-4 gap-3"
        renderItem={(item) => (
          <View key={item.id} className="bg-card border border-border rounded-2xl p-4 gap-3">
            {/* Header: Visitor Name & Status Badge */}
            <View className="flex-row items-start justify-between border-b border-border/40 pb-2.5">
              <View className="flex-1 pr-2">
                <Text className="text-base font-bold text-foreground">{item.visitorName}</Text>
                <View className="flex-row items-center gap-1.5 mt-0.5">
                  <Phone size={12} className="text-muted-foreground" />
                  <Text className="text-xs text-muted-foreground">{item.phone}</Text>
                </View>
              </View>
              {getStatusBadge(item.status)}
            </View>

            {/* Target Host Details */}
            <View className="bg-muted/40 p-2.5 rounded-xl gap-1">
              <View className="flex-row items-center gap-2">
                <Building2 size={14} className="text-primary" />
                <Text className="text-xs font-semibold text-foreground flex-1">
                  {item.purpose || 'Target Resident Host'}
                </Text>
              </View>
              {item.gateName && (
                <Text className="text-[11px] text-muted-foreground ms-5">
                  Gate: {item.gateName}
                </Text>
              )}
            </View>

            {/* Additional Metadata */}
            <View className="flex-row items-center justify-between text-xs text-muted-foreground pt-1">
              {item.vehicleNo ? (
                <View className="flex-row items-center gap-1">
                  <Car size={13} className="text-muted-foreground" />
                  <Text className="text-xs font-mono font-medium text-foreground">{item.vehicleNo}</Text>
                </View>
              ) : (
                <View />
              )}

              <View className="flex-row items-center gap-1">
                <Clock size={12} className="text-muted-foreground" />
                <Text className="text-xs text-muted-foreground">
                  {item.waitingDurationMinutes ? `Waiting ${item.waitingDurationMinutes} mins` : 'Just now'}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
};

export default GuardWalkInStatusView;
