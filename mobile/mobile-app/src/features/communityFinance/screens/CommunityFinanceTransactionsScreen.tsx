import React, { useState, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ShieldAlert, Receipt, RotateCcw, FileDown, FileSpreadsheet } from 'lucide-react-native';

import { useCommunityFinanceTransactions } from '../hooks/useCommunityFinanceTransactions';
import { TransactionFilterSheet } from '../components/TransactionFilterSheet';
import { TransactionItemCard } from '../components/TransactionItemCard';
import { TransactionDetailSheet } from '../components/TransactionDetailSheet';
import { FinanceExportSheet, type ExportFormat } from '../components/FinanceExportSheet';
import { communityFinanceService } from '../services/communityFinanceService';
import {
  type ReportingPeriod,
  type NormalizedTransaction,
  type TransactionTypeFilter,
  type TransactionDomainFilter,
  type TransactionStatusFilter,
} from '../types';
import { formatINR, getPeriodDateRange } from '../utils/financeFormatters';
import {
  downloadExportFile,
} from '../utils/exportTransactionsHelper';

const VALID_PERIODS: Set<string> = new Set([
  'Today',
  'This Week',
  'This Month',
  'Last Month',
  'This Year',
  'Previous Year',
  'All Time',
]);

const TYPE_TABS: { id: TransactionTypeFilter; label: string }[] = [
  { id: 'all', label: 'All Transactions' },
  { id: 'income', label: 'Inflows' },
  { id: 'expense', label: 'Outflows' },
];

export const CommunityFinanceTransactionsScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{ period?: string; type?: string }>();

  // Parse incoming period safely per Section 8
  const initialPeriod: ReportingPeriod | undefined =
    searchParams?.period && VALID_PERIODS.has(searchParams.period)
      ? (searchParams.period as ReportingPeriod)
      : undefined;

  const initialType =
    searchParams?.type === 'income' || searchParams?.type === 'expense'
      ? (searchParams.type as TransactionTypeFilter)
      : undefined;

  const {
    transactions,
    pagination,
    filters,
    loading,
    loadingMore,
    refreshing,
    error,
    hasPermission,
    selectedTransaction,
    changePeriod,
    changeType,
    changeDomain,
    changeStatus,
    changeSearch,
    clearFilters,
    loadMore,
    refreshTransactions,
    selectTransaction,
    clearError,
  } = useCommunityFinanceTransactions({ initialPeriod, initialType });

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.period !== 'This Month') count++;
    if (filters.type !== 'all') count++;
    if (filters.domain !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    return count;
  }, [filters]);

  const handleApplyFilterSheet = (newFilters: {
    period: ReportingPeriod;
    type: TransactionTypeFilter;
    domain: TransactionDomainFilter;
    status: TransactionStatusFilter;
  }) => {
    if (newFilters.period !== filters.period) changePeriod(newFilters.period);
    if (newFilters.type !== filters.type) changeType(newFilters.type);
    if (newFilters.domain !== filters.domain) changeDomain(newFilters.domain);
    if (newFilters.status !== filters.status) changeStatus(newFilters.status);
  };

  /**
   * Unified export generator supporting CSV, Excel (.xlsx), and PDF reports
   */
  const handleGenerateExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      const { startDate, endDate } = getPeriodDateRange(filters.period);
      const effectiveStartDate = filters.startDate ?? startDate;
      const effectiveEndDate = filters.endDate ?? endDate;

      // The backend re-runs the authoritative filtered query, so the file always matches the list
      const result = await communityFinanceService.exportReport({
        format,
        filters: {
          type: filters.type,
          domain: filters.domain,
          status: filters.status,
          search: filters.search,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          period: filters.period,
          timezone: 'Asia/Kolkata',
        },
      });

      await downloadExportFile(format, result.data, result.fileName);
      setShowExportSheet(false);
      Alert.alert(
        result.truncated ? 'Export Limited' : 'Export Successful',
        result.truncated
          ? `Only the first ${result.rowCount} of ${result.totalMatching} matching transactions were included (export limit). Narrow the filters to export the rest.`
          : `Exported ${result.rowCount} transaction records (${format.toUpperCase()}).`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || `Could not export financial report (${format.toUpperCase()}).`);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Fetch all records matching active filter criteria and download as CSV
   */
  const handleExportCSV = async () => {
    await handleGenerateExport('csv');
  };

  /**
   * Fetch all records matching active filter criteria and download as Excel (.xlsx)
   */
  const handleExportExcel = async () => {
    await handleGenerateExport('xlsx');
  };

  const filteredInflow = transactions
    .filter((t) => t.type === 'income' && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredOutflow = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <ScreenShell
      title="Transaction Records"
      subtitle={
        !hasPermission
          ? 'Access Restricted'
          : `${pagination.totalRecords} Transactions • ${filters.period}`
      }
      iconName="Receipt"
      domainName="Financial Operations"
      showBackButton
      loading={hasPermission && loading && transactions.length === 0}>
      {!hasPermission ? (
        <View className="flex-1 items-center justify-center bg-background p-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Icon as={ShieldAlert} size={32} className="text-destructive" />
          </View>
          <Text className="mb-2 text-center font-bold text-xl text-foreground">
            Access Denied
          </Text>
          <Text className="mb-6 text-center text-sm text-muted-foreground max-w-xs">
            You do not have the required permissions to view community financial transaction records.
          </Text>
          <Button
            variant="outline"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(resident)/dashboard' as any))}
            className="px-6 rounded-xl">
            <Text className="font-semibold text-foreground">Return to Dashboard</Text>
          </Button>
        </View>
      ) : (
        <View className="flex-1 bg-background">
          {/* 1. Standard SearchFilterBar (Matching User Management & Villa Management) */}
          <SearchFilterBar
            searchValue={filters.search || ''}
            onSearchChange={changeSearch}
            searchPlaceholder="Search transactions, receipts..."
            onFilterPress={() => setShowFilterSheet(true)}
            activeFilterCount={activeFilterCount}
          />

          {/* 2. Premium Pill Tabs (Matching users.tsx & villas.tsx) */}
          <View className="pb-3 border-b border-border/30">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="px-4 gap-2.5">
              {TYPE_TABS.map((tab) => {
                const isActive = filters.type === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => changeType(tab.id)}
                    activeOpacity={0.7}
                    className={`py-2 px-5 rounded-full border transition-all flex-row items-center justify-center ${
                      isActive
                        ? 'bg-primary border-primary shadow-sm'
                        : 'bg-card border-border/60'
                    }`}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}>
                    <Text
                      className={`text-[13px] font-bold tracking-wide ${
                        isActive ? 'text-white' : 'text-muted-foreground'
                      }`}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. Export Toolbar & Active Filter Status (Matching staff.tsx) */}
          <View className="px-4 py-2.5 flex-row items-center justify-between border-b border-border/40 bg-muted/20">
            <View className="flex-row items-center flex-1 me-2 flex-wrap gap-1.5">
              <Text className="text-xs text-muted-foreground font-medium">
                {pagination.totalRecords} {pagination.totalRecords === 1 ? 'record' : 'records'}
              </Text>
              <View className="mx-1 h-3 w-px bg-border/60" />
              <View className="px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                <Text className="text-[10px] font-bold text-foreground uppercase tracking-wide">
                  {filters.period}
                </Text>
              </View>

              {filters.domain !== 'ALL' && (
                <View className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {filters.domain}
                  </Text>
                </View>
              )}

              {filters.status !== 'ALL' && (
                <View className="px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-foreground">
                    {filters.status}
                  </Text>
                </View>
              )}

              {(activeFilterCount > 0 || Boolean(filters.search)) && (
                <TouchableOpacity
                  onPress={clearFilters}
                  activeOpacity={0.7}
                  className="flex-row items-center px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 ms-0.5">
                  <Icon as={RotateCcw} size={10} className="text-rose-600 dark:text-rose-400 me-1" />
                  <Text className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                    Reset
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Single Export Button that opens Download Options Sheet (Matching Staff Attendance) */}
            <TouchableOpacity
              onPress={() => setShowExportSheet(true)}
              disabled={isExporting || pagination.totalRecords === 0}
              className="h-8 px-3 rounded-xl border border-border bg-card flex-row items-center justify-center gap-1.5 active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Export Transaction Records">
              {isExporting ? (
                <ActivityIndicator size="small" className="text-primary" />
              ) : (
                <Icon as={FileDown} size={15} className="text-primary" />
              )}
              <Text className="text-xs font-semibold text-foreground">Export</Text>
            </TouchableOpacity>
          </View>

          {/* Active Error Banner */}
          {error && (
            <View className="p-4 pb-0">
              <ErrorBanner
                message={error}
                onDismiss={clearError}
              />
            </View>
          )}

          {/* Paginated Transactions FlatList */}
          <FlatList<NormalizedTransaction>
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TransactionItemCard
                transaction={item}
                onPress={() => selectTransaction(item)}
              />
            )}
            contentContainerClassName="p-4 pb-20"
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            ListHeaderComponent={
              transactions.length > 0 ? (
                <View className="mb-4 p-3.5 rounded-2xl bg-card border border-border/40 shadow-xs flex-row items-center justify-between">
                  {/* Inflow */}
                  <View className="items-center flex-1">
                    <Text className="text-xs font-medium text-muted-foreground mb-0.5">
                      Inflow
                    </Text>
                    <Text className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      +{formatINR(filteredInflow)}
                    </Text>
                  </View>

                  <View className="h-6 w-px bg-border/40" />

                  {/* Outflow */}
                  <View className="items-center flex-1">
                    <Text className="text-xs font-medium text-muted-foreground mb-0.5">
                      Outflow
                    </Text>
                    <Text className="text-sm font-bold text-foreground">
                      -{formatINR(filteredOutflow)}
                    </Text>
                  </View>

                  <View className="h-6 w-px bg-border/40" />

                  {/* Transactions */}
                  <View className="items-center flex-1">
                    <Text className="text-xs font-medium text-muted-foreground mb-0.5">
                      Transactions
                    </Text>
                    <Text className="text-sm font-bold text-foreground">
                      {pagination.totalRecords}
                    </Text>
                  </View>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshTransactions}
                tintColor="#EA580C"
                colors={['#EA580C']}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              !loading ? (
                <EmptyState
                  icon={Receipt}
                  title="No Transactions Found"
                  description="No financial transactions match your current reporting filters or search terms."
                  actionLabel="Reset Filters"
                  onAction={clearFilters}
                />
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4 items-center justify-center">
                  <ActivityIndicator size="small" color="#EA580C" />
                  <Text className="text-xs text-muted-foreground mt-2">
                    Loading more records...
                  </Text>
                </View>
              ) : pagination.totalPages > 0 &&
                pagination.currentPage >= pagination.totalPages &&
                transactions.length > 0 ? (
                <View className="py-4 items-center justify-center">
                  <Text className="text-xs text-muted-foreground font-medium">
                    End of transactions list ({pagination.totalRecords} total)
                  </Text>
                </View>
              ) : null
            }
          />

          {/* Feature Filter Sheet (Matching UserFilterSheet / VillaFilterSheet) */}
          <TransactionFilterSheet
            visible={showFilterSheet}
            onClose={() => setShowFilterSheet(false)}
            filters={filters}
            onApplyFilters={handleApplyFilterSheet}
            onClearAll={clearFilters}
          />

          {/* Read-only Transaction Inspection Bottom Sheet */}
          <TransactionDetailSheet
            transaction={selectedTransaction}
            visible={Boolean(selectedTransaction)}
            onClose={() => selectTransaction(null)}
          />

          {/* Export Options Sheet (CSV, Excel with Charts, PDF) */}
          <FinanceExportSheet
            visible={showExportSheet}
            onClose={() => setShowExportSheet(false)}
            filters={filters}
            totalRecords={pagination.totalRecords}
            onGenerateExport={handleGenerateExport}
            isExporting={isExporting}
          />
        </View>
      )}
    </ScreenShell>
  );
};

export default CommunityFinanceTransactionsScreen;
