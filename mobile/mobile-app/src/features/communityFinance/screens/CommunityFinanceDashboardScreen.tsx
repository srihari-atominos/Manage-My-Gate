import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ShieldAlert, Receipt, FileDown } from 'lucide-react-native';

import { useCommunityFinance } from '../hooks/useCommunityFinance';
import { PeriodFilterChips } from '../components/PeriodFilterChips';
import { FinancialSummaryCards } from '../components/FinancialSummaryCards';
import { IncomeExpenseChart } from '../components/IncomeExpenseChart';
import { CategoryBreakdownCard } from '../components/CategoryBreakdownCard';
import { RecentTransactionsCard } from '../components/RecentTransactionsCard';
import { FinanceRunwaySheet } from '../components/FinanceRunwaySheet';
import { FinanceExportSheet } from '../components/FinanceExportSheet';
import { FinancePeriodFilterSheet } from '../components/FinancePeriodFilterSheet';
import { type ExportFormat } from '../types';
import { getPeriodDateRange } from '../utils/financeFormatters';
import { communityFinanceService } from '../services/communityFinanceService';
import { downloadExportFile } from '../utils/exportTransactionsHelper';

export const CommunityFinanceDashboardScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRunwaySheetOpen, setIsRunwaySheetOpen] = useState(false);
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [isPeriodFilterOpen, setIsPeriodFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const {
    dashboard,
    recentTransactions,
    recentTransactionsTotal,
    selectedPeriod,
    loading,
    refreshing,
    error,
    hasPermission,
    changePeriod,
    refreshDashboard,
    clearFinanceError,
  } = useCommunityFinance();

  const handleGenerateExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      const { startDate, endDate } = getPeriodDateRange(selectedPeriod);

      const result = await communityFinanceService.exportReport({
        format,
        filters: {
          period: selectedPeriod,
          startDate,
          endDate,
          type: 'all',
          domain: 'ALL',
          status: 'ALL',
          timezone: 'Asia/Kolkata',
        },
      });

      await downloadExportFile(format, result.data, result.fileName);
      setIsExportSheetOpen(false);
      Alert.alert(
        'Export Successful',
        `Exported ${result.rowCount ?? 'financial'} records (${format.toUpperCase()}).`
      );
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || `Could not export financial report (${format.toUpperCase()}).`);
    } finally {
      setIsExporting(false);
    }
  };

  // Navigation handlers
  const handleViewAllTransactions = () => {
    router.push({
      pathname: '/(resident)/admin/billing/community-finance-transactions',
      params: { period: selectedPeriod },
    } as any);
  };

  const handleViewInflows = () => {
    router.push({
      pathname: '/(resident)/admin/billing/community-finance-transactions',
      params: { period: selectedPeriod, type: 'income' },
    } as any);
  };

  const handleViewOutflows = () => {
    router.push({
      pathname: '/(resident)/admin/billing/community-finance-transactions',
      params: { period: selectedPeriod, type: 'expense' },
    } as any);
  };

  return (
    <ScreenShell
      title="Community Finance"
      subtitle={
        !hasPermission
          ? 'Access Restricted'
          : `Overview · ${selectedPeriod}`
      }
      iconName="LineChart"
      domainName="Financial Operations"
      showBackButton
      loading={hasPermission && loading && !dashboard}
      headerRight={
        hasPermission ? (
          <View className="flex-row items-center gap-1.5">
            <HeaderActionButton
              onPress={handleViewAllTransactions}
              icon={Receipt}
              accessibilityRole="button"
              accessibilityLabel="View All Transactions"
            />
            <HeaderActionButton
              onPress={() => setIsExportSheetOpen(true)}
              icon={FileDown}
              accessibilityRole="button"
              accessibilityLabel="Export Financial Report"
            />
          </View>
        ) : undefined
      }>
      {!hasPermission ? (
        <View className="flex-1 items-center justify-center bg-background p-6">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Icon as={ShieldAlert} size={32} className="text-destructive" />
          </View>
          <Text className="mb-2 text-center font-bold text-xl text-foreground">
            Access Denied
          </Text>
          <Text className="mb-6 px-4 text-center text-sm text-muted-foreground">
            You do not have administrative permission to view community financial reports.
          </Text>
          <Button
            variant="default"
            size="lg"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(resident)/dashboard' as any))}
            accessibilityRole="button"
            accessibilityLabel="Return to Dashboard">
            Return to Dashboard
          </Button>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="px-5 pt-2"
            contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshDashboard}
                tintColor="#EA580C"
              />
            }>
            {/* Error Banner */}
            {error && (
              <View className="mb-4">
                <ErrorBanner
                  message={error}
                  onDismiss={clearFinanceError}
                  onRetry={refreshDashboard}
                />
              </View>
            )}

            {/* 1. Date Range Filter Toolbar (Pill Tabs) */}
            <PeriodFilterChips
              selectedPeriod={selectedPeriod}
              onSelectPeriod={changePeriod}
              disabled={loading || refreshing}
              onOpenFilter={() => setIsPeriodFilterOpen(true)}
            />

            {/* 2. Primary Financial Overview (Net Balance, Collections, Expenses, Dues) */}
            <FinancialSummaryCards
              overview={dashboard?.overview}
              runway={dashboard?.runway || dashboard?.overview?.runway}
              onViewInflows={handleViewInflows}
              onViewOutflows={handleViewOutflows}
              onOpenSimulator={() => setIsRunwaySheetOpen(true)}
            />

            {/* 3. Cash Flow Movement (Collections vs Expenses Trend with Daily, Monthly, Yearly, All) */}
            <IncomeExpenseChart
              data={dashboard?.timeSeries || []}
              dailyData={dashboard?.dailyTimeSeries || dashboard?.timeSeries || []}
              monthlyData={dashboard?.monthlyTimeSeries || []}
              yearlyData={dashboard?.yearlyTimeSeries || []}
              allData={dashboard?.allTimeSeries || dashboard?.monthlyTimeSeries || []}
            />

            {/* 5. Categorized Breakdown (Expenses & Collections) */}
            <CategoryBreakdownCard
              incomeBreakdown={dashboard?.breakdowns?.income || []}
              expenseBreakdown={dashboard?.breakdowns?.expense || []}
              totalIncome={
                dashboard?.overview?.netCollectionsAfterRefunds ??
                dashboard?.overview?.grossSuccessfulCollections ??
                0
              }
              totalExpenses={
                (dashboard?.overview?.totalExpensesIncurred ?? 0) > 0
                  ? (dashboard?.overview?.totalExpensesIncurred ?? 0)
                  : (dashboard?.overview?.recordedExpensePayments ?? 0) > 0
                  ? (dashboard?.overview?.recordedExpensePayments ?? 0)
                  : (dashboard?.overview?.reconciledExpensePayments ?? 0)
              }
            />

            {/* 6. Recent Financial Activity (Strict 3-Item Statement Preview) */}
            <RecentTransactionsCard
              transactions={recentTransactions}
              onViewAllPress={handleViewAllTransactions}
            />
          </ScrollView>

        </>
      )}

      {/* ── Operating Runway & Balance Simulator Sheet ── */}
      <FinanceRunwaySheet
        visible={isRunwaySheetOpen}
        onClose={() => setIsRunwaySheetOpen(false)}
        overview={dashboard?.overview}
        initialRunway={dashboard?.runway || dashboard?.overview?.runway}
      />

      {/* ── Reporting Period Filter Sheet ── */}
      <FinancePeriodFilterSheet
        visible={isPeriodFilterOpen}
        onClose={() => setIsPeriodFilterOpen(false)}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={changePeriod}
      />

      {/* ── Financial Export Sheet (CSV, Excel, PDF) ── */}
      <FinanceExportSheet
        visible={isExportSheetOpen}
        onClose={() => setIsExportSheetOpen(false)}
        filters={{
          period: selectedPeriod,
          type: 'all',
          domain: 'ALL',
          status: 'ALL',
          search: '',
        }}
        totalRecords={recentTransactionsTotal}
        onGenerateExport={handleGenerateExport}
        isExporting={isExporting}
      />
    </ScreenShell>
  );
};

export default CommunityFinanceDashboardScreen;
