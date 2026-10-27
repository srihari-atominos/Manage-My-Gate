import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { Receipt, RotateCcw, Plus, CreditCard, ChevronRight, FileDown, FileSpreadsheet, FileText } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import expenseService from '../services/expenseService';
import { ExpenseFilterDrawer, ExpenseFilterValues } from '../components/ExpenseFilterDrawer';
import { ExpensePeriodAnalysisCard } from '../components/ExpensePeriodAnalysisCard';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { downloadCSVFile, downloadExcelFile, downloadPDFFile } from '@/src/utils/downloadHelper';

const statuses = [
  { label: 'All Statuses', value: '' },
  { label: 'Unpaid', value: 'UNPAID' },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID' },
  { label: 'Paid', value: 'PAID' },
];

const periodDisplayNames: Record<string, string> = {
  ALL_TIME: 'All Time',
  TODAY: 'Today',
  WEEKLY: 'This Week',
  MONTHLY: 'This Month',
  YEARLY: 'This Year',
};

const formatCurrency = (value: number | string | null | undefined) =>
  String.fromCharCode(0x20b9) + Number(value || 0).toLocaleString('en-IN');

const readable = (value: unknown) => String(value || '').replace(/_/g, ' ');

export default function ExpensesScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const pathname = usePathname();
  const { user } = useAuth();
  const activeOrgId = useSelector(
    (state: any) =>
      state.workspace?.activeOrganizationId ||
      state.auth?.activeOrganizationId ||
      state.auth?.user?.activeOrganizationId ||
      state.auth?.user?.orgId ||
      state.auth?.user?.communityId
  );
  const orgId = activeOrgId || user?.orgId;

  const canPayOnline = isFeatureAllowedForUser(
    { id: 'billing_pay_online_expense', permission: 'billing:pay_online_expense' },
    user
  );
  const [period, setPeriod] = useState('ALL_TIME');
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL_TIME');

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const periodSegments = useMemo(
    () => [
      { key: 'ALL_TIME', label: 'All Time' },
      { key: 'TODAY', label: 'Today' },
      { key: 'WEEKLY', label: 'This Week' },
      { key: 'MONTHLY', label: 'This Month' },
      { key: 'YEARLY', label: 'This Year' },
    ],
    []
  );

  const handlePeriodChange = useCallback((newPeriod: string) => {
    setPeriod(newPeriod);
    setStartDate('');
    setEndDate('');
    if (newPeriod === 'ALL_TIME') setDatePreset('ALL_TIME');
    else if (newPeriod === 'TODAY') setDatePreset('TODAY');
    else if (newPeriod === 'WEEKLY') setDatePreset('THIS_WEEK');
    else if (newPeriod === 'MONTHLY') setDatePreset('THIS_MONTH');
    else if (newPeriod === 'YEARLY') setDatePreset('THIS_YEAR');
  }, []);

  const buildExportQuery = useCallback(() => {
    const query: Record<string, string> = {};
    if (period && period !== 'ALL_TIME') query.period = period;
    if (status) query.settlementStatus = status;
    if (expenseType) query.expenseType = expenseType;
    if (category.trim()) query.category = category.trim();
    if (startDate) query.startDate = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate) query.endDate = new Date(`${endDate}T23:59:59.999`).toISOString();
    if (search.trim()) query.search = search.trim();
    return query;
  }, [period, status, expenseType, category, startDate, endDate, search]);

  const exportFileName = (ext: 'csv' | 'xlsx' | 'pdf') => {
    const today = new Date().toISOString().split('T')[0];
    const dateRange = startDate && endDate && startDate !== endDate
      ? `${startDate}_to_${endDate}`
      : startDate || today;
    const periodTag = period ? period.toLowerCase() : 'all_time';
    return `expenses_${periodTag}_${dateRange}.${ext}`;
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await expenseService.exportExpensesReport(buildExportQuery(), 'csv');
      const text = typeof (blob as any)?.text === 'function' ? await blob.text() : String(blob || '');
      await downloadCSVFile(text.startsWith('\uFEFF') ? text : `\uFEFF${text}`, exportFileName('csv'));
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || err?.message || 'Could not export expense records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const blob = await expenseService.exportExpensesReport(buildExportQuery(), 'xlsx');
      await downloadExcelFile(blob, exportFileName('xlsx'));
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || err?.message || 'Could not export expense records.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const blob = await expenseService.exportExpensesReport(buildExportQuery(), 'pdf');
      await downloadPDFFile(blob, exportFileName('pdf'));
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export expense PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const params = useCallback(
    () => ({
      page: 1,
      limit: 20,
      search: search.trim() || undefined,
      expenseType: expenseType || undefined,
      settlementStatus: status || undefined,
      category: category.trim() || undefined,
      period: period === 'ALL_TIME' ? undefined : period,
      startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
      endDate: endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined,
    }),
    [search, expenseType, status, category, period, startDate, endDate]
  );

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const summaryParams: any = {
        search: search.trim() || undefined,
        expenseType: expenseType || undefined,
        settlementStatus: status || undefined,
        category: category.trim() || undefined,
        period: period === 'ALL_TIME' ? undefined : period,
        startDate: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined,
      };
      const [list, totals] = await Promise.all([
        expenseService.list(params()),
        expenseService.summary(summaryParams),
      ]);
      setData(list.records || []);
      setSummary(totals || {});
    } catch (e: any) {
      setError(e?.message || 'Unable to load expenses');
    } finally {
      setLoading(false);
    }
  }, [params, period, search, expenseType, status, category, startDate, endDate]);

  // Force re-fetch when returning from create/pay flows via search params or path change
  useEffect(() => {
    if (refresh) {
      load();
    }
  }, [refresh, load]);

  useEffect(() => {
    if (pathname && pathname.includes('/expenses')) {
      load();
    }
  }, [pathname, load]);

  // Real-time update: Reload whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Web window focus listener (refreshes data when returning to browser tab)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.addEventListener) {
      const handleWindowFocus = () => {
        load();
      };
      window.addEventListener('focus', handleWindowFocus);
      return () => {
        window.removeEventListener('focus', handleWindowFocus);
      };
    }
  }, [load]);

  // Debounced auto-reload when search or any filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(timer);
  }, [period, search, expenseType, status, category, startDate, endDate]);

  // Real-time update: Listen for background socket events
  const { socket } = useAppSocket();

  // Join the organization's real-time broadcast room
  useEffect(() => {
    if (!socket || !orgId) return;
    socket.emit('join_room', `org:${orgId}`);
  }, [socket, orgId]);

  useEffect(() => {
    if (!socket) return;
    let timer: any = null;
    const onExpenseChanged = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        load();
      }, 150);
    };
    socket.on('expense_created', onExpenseChanged);
    socket.on('expense_updated', onExpenseChanged);
    socket.on('expense_payment_recorded', onExpenseChanged);
    socket.on('expense_payment_reconciled', onExpenseChanged);
    socket.on('EXPENSE_CREATED', onExpenseChanged);
    socket.on('EXPENSE_UPDATED', onExpenseChanged);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off('expense_created', onExpenseChanged);
      socket.off('expense_updated', onExpenseChanged);
      socket.off('expense_payment_recorded', onExpenseChanged);
      socket.off('expense_payment_reconciled', onExpenseChanged);
      socket.off('EXPENSE_CREATED', onExpenseChanged);
      socket.off('EXPENSE_UPDATED', onExpenseChanged);
    };
  }, [socket, load]);

  const clearFilters = () => {
    setSearch('');
    setExpenseType('');
    setStatus('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL_TIME');
    setPeriod('ALL_TIME');
  };

  const totalActiveFilterCount =
    (status ? 1 : 0) +
    (expenseType ? 1 : 0) +
    (category.trim() ? 1 : 0) +
    (period !== 'ALL_TIME' || datePreset !== 'ALL_TIME' || startDate || endDate ? 1 : 0);

  const periodKpiTitles: Record<string, string> = {
    ALL_TIME: 'Total Expenses',
    TODAY: "Today's Expenses",
    WEEKLY: "This Week's Expenses",
    MONTHLY: "This Month's Expenses",
    YEARLY: "This Year's Expenses",
  };
  const primaryKpiTitle = periodKpiTitles[period] || 'Total Expenses';

  const fourthKpiCard =
    period === 'ALL_TIME'
      ? {
          title: "Today's Expenses",
          value: formatCurrency(summary.todayExpenses),
          iconName: 'Calendar' as const,
        }
      : {
          title: 'Period Bills',
          value: `${summary.expenseCount ?? data.length ?? 0} bills`,
          iconName: 'Calendar' as const,
          subtitle:
            summary.comparison?.percentageChange != null
              ? `${summary.comparison.trendDirection === 'up' ? '▲ ' : summary.comparison.trendDirection === 'down' ? '▼ ' : ''}${Math.abs(summary.comparison.percentageChange)}% vs prior`
              : undefined,
        };

  const header = useMemo(
    () => (
      <View className="gap-3 pb-2">
        {/* Modern Horizontal Scrollable Period Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row -mx-4 px-4 py-0.5"
          contentContainerClassName="gap-2 items-center pe-4"
        >
          {periodSegments.map((seg) => {
            const isSelected = period === seg.key;
            return (
              <Pressable
                key={seg.key}
                onPress={() => handlePeriodChange(seg.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${seg.label}`}
                className={`rounded-full px-3.5 py-1.5 border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary shadow-xs'
                    : 'border-border/80 bg-card active:bg-muted/60'
                }`}
              >
                <Text
                  className={`text-xs ${
                    isSelected
                      ? 'font-bold text-primary-foreground'
                      : 'font-medium text-muted-foreground'
                  }`}
                >
                  {seg.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <KPIDashboardStrip
          layout="grid2x2"
          loading={loading && summary.totalExpenses == null}
          cards={[
            {
              title: primaryKpiTitle,
              value: formatCurrency(summary.totalExpenses),
              iconName: 'Receipt',
            },
            {
              title: 'Recorded as Paid',
              value: formatCurrency(summary.recordedPaid),
              iconName: 'CreditCard',
              variant: 'success',
            },
            {
              title: 'Unpaid Balance',
              value: formatCurrency(summary.unpaidBalance),
              iconName: 'AlertCircle',
              variant: 'warning',
            },
            fourthKpiCard,
          ]}
        />

        {/* Action Buttons Row */}
        <View className="flex-row gap-2.5">
          <View className="min-w-0 flex-1">
            <Button
              onPress={() =>
                router.push('/(resident)/admin/billing/expenses/record' as any)
              }
              className="w-full flex-row items-center justify-center gap-1.5"
            >
              <Plus size={16} color="#ffffff" />
              <Text className="text-center font-bold text-white text-xs">Record Expense</Text>
            </Button>
          </View>
          {canPayOnline ? (
            <View className="min-w-0 flex-1">
              <Button
                variant="outline"
                onPress={() =>
                  router.push('/(resident)/admin/billing/expenses/pay-online' as any)
                }
                className="w-full flex-row items-center justify-center gap-1.5"
              >
                <CreditCard size={15} className="text-foreground" />
                <Text className="text-center font-bold text-xs">Pay Online</Text>
              </Button>
            </View>
          ) : null}
        </View>

        {/* Visual Category & Period Spending Analysis Card */}
        <ExpensePeriodAnalysisCard
          period={period}
          summary={summary}
          loading={loading}
        />

        {/* Clean, perfectly aligned Search & Filter Bar from Component Catalog */}
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search expense, vendor, category..."
          onFilterPress={() => setShowFilterDrawer(true)}
          activeFilterCount={totalActiveFilterCount}
          className="px-0 pt-1 pb-0"
        />

        {/* Quick Status Filter Pills & Reset Action */}
        <View className="flex-row items-center justify-between px-0.5">
          <View className="flex-row gap-1.5 flex-wrap flex-1">
            {statuses.map((s) => {
              const isSelected = status === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setStatus(s.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${s.label}`}
                  className={`rounded-xl px-3 py-1.5 border transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary shadow-xs'
                      : 'border-border/80 bg-card'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-primary-foreground font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {(search || expenseType || status || category || startDate || endDate) ? (
            <Pressable
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Reset all filters"
              className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-xl bg-card border border-border/80 active:opacity-70 ms-2 shrink-0"
            >
              <RotateCcw size={12} className="text-muted-foreground" />
              <Text className="text-[11px] font-semibold text-muted-foreground">Reset</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <ErrorBanner message={error} onRetry={load} /> : null}

        <View className="flex-row items-center justify-between px-1 pt-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold text-foreground">
              Expense Records
            </Text>
            <Text className="text-xs font-medium text-muted-foreground">
              ({data.length})
            </Text>
          </View>

          {/* Export Action Button (Reference: Staff Attendance) */}
          <Pressable
            onPress={() => setShowExportSheet(true)}
            disabled={isExporting}
            accessibilityRole="button"
            accessibilityLabel="Export Expense Records"
            className="h-8 px-2.5 rounded-xl border border-border bg-card flex-row items-center justify-center gap-1.5 active:opacity-70"
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#5B5CE2" />
            ) : (
              <FileDown size={14} className="text-primary" />
            )}
            <Text className="text-xs font-semibold text-foreground">
              {isExporting ? 'Exporting…' : 'Export'}
            </Text>
          </Pressable>
        </View>
      </View>
    ),
    [
      period,
      periodSegments,
      handlePeriodChange,
      primaryKpiTitle,
      fourthKpiCard,
      loading,
      isExporting,
      summary,
      canPayOnline,
      router,
      search,
      totalActiveFilterCount,
      status,
      expenseType,
      category,
      startDate,
      endDate,
      error,
      load,
      data.length,
    ]
  );

  return (
    <ScreenShell
      title="Expenses"
      subtitle="Record and manage community expenses, purchases, and payments."
      iconName="Receipt"
      loading={loading && data.length === 0}
      showBackButton
    >
      <FlatList
        data={data}
        keyExtractor={(item: any) => String(item._id)}
        className="flex-1"
        contentContainerClassName="gap-3 px-4 pb-28 pt-3"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
            <Receipt size={32} className="text-muted-foreground mb-2 opacity-50" />
            <Text className="text-center font-bold text-foreground">No Expenses Found</Text>
            <Text className="mt-1 text-center text-xs text-muted-foreground">
              Try adjusting your filters or record a new community expense.
            </Text>
          </View>
        }
        renderItem={({ item }: any) => {
          const isPaid = item.settlementStatus === 'PAID';
          const isPartial = item.settlementStatus === 'PARTIALLY_PAID';
          const badgeVariant = isPaid ? 'success' : isPartial ? 'warning' : 'danger';
          const badgeLabel = isPaid ? 'Paid' : isPartial ? 'Partially Paid' : 'Unpaid';
          const formattedDate = item.expenseDate
            ? new Date(item.expenseDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : null;

          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(resident)/admin/billing/expenses/[id]',
                  params: { id: item._id },
                } as any)
              }
              accessibilityRole="button"
              accessibilityLabel={`View expense ${item.name}`}
              className="rounded-2xl border border-border/80 bg-card p-4 active:opacity-80 shadow-xs mb-1"
            >
              {/* Top Row: Status Badge, Category Tag & Date */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <StatusBadge label={badgeLabel} variant={badgeVariant} size="sm" dot />
                  {item.category ? (
                    <View className="rounded-md bg-muted px-2 py-0.5">
                      <Text className="text-[11px] font-medium text-muted-foreground">
                        {item.category}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {formattedDate && (
                  <Text className="text-[11px] text-muted-foreground">
                    {formattedDate}
                  </Text>
                )}
              </View>

              {/* Middle Row: Expense Name, Subtitle, and Amount */}
              <View className="flex-row items-start justify-between gap-3 mb-1.5">
                <View className="flex-1">
                  <Text className="font-bold text-foreground text-sm" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground capitalize" numberOfLines={1}>
                    {readable(item.expenseType)}
                    {item.vendor?.name ? ` · Vendor: ${item.vendor.name}` : ''}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-extrabold text-foreground text-base">
                    {formatCurrency(item.totalAmount)}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground font-mono">
                    {item.expenseNumber}
                  </Text>
                </View>
              </View>

              {/* Bottom Row: Settlement Breakdown & Details Affordance */}
              <View className="mt-2.5 flex-row items-center justify-between border-t border-border/60 pt-2.5">
                <View className="flex-row items-center gap-3">
                  <Text className="text-xs text-muted-foreground">
                    Paid: <Text className="font-semibold text-foreground">{formatCurrency(item.recordedPaidAmount)}</Text>
                  </Text>
                  {Number(item.outstandingAmount || 0) > 0 && (
                    <Text className="text-xs text-muted-foreground">
                      Due: <Text className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(item.outstandingAmount)}</Text>
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs font-semibold text-primary">Details</Text>
                  <ChevronRight size={14} className="text-primary" />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      {/* Two-Pane Filter Drawer (Identical to Billing & Invoice LedgerFilterDrawer) */}
      <ExpenseFilterDrawer
        visible={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        filters={{
          status,
          expenseType,
          category,
          startDate,
          endDate,
          datePreset,
        }}
        onApply={(newFilters: ExpenseFilterValues) => {
          setStatus(newFilters.status);
          setExpenseType(newFilters.expenseType);
          setCategory(newFilters.category);
          setStartDate(newFilters.startDate);
          setEndDate(newFilters.endDate);
          const preset = newFilters.datePreset || 'ALL_TIME';
          setDatePreset(preset);
          if (preset === 'TODAY') setPeriod('TODAY');
          else if (preset === 'THIS_WEEK') setPeriod('WEEKLY');
          else if (preset === 'THIS_MONTH') setPeriod('MONTHLY');
          else if (preset === 'THIS_YEAR') setPeriod('YEARLY');
          else if (preset === 'ALL_TIME') setPeriod('ALL_TIME');
          else setPeriod('ALL_TIME');
        }}
        onReset={clearFilters}
      />

      {/* Export Options BottomSheet (Reference: Staff Attendance) */}
      <BottomSheet
        visible={showExportSheet}
        onClose={() => setShowExportSheet(false)}
        title="Export Expenses"
      >
        <View className="p-4 gap-3">
          {/* Active Filter Parameters Summary Card */}
          <View className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-foreground">Active Filter Parameters</Text>
              <Text className="text-xs font-semibold text-primary">{data.length} records</Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                <Text className="text-[11px] font-medium text-muted-foreground">
                  Period: <Text className="font-bold text-foreground">{periodDisplayNames[period] || period}</Text>
                </Text>
              </View>
              {status ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Status: <Text className="font-bold text-foreground">{readable(status)}</Text>
                  </Text>
                </View>
              ) : null}
              {category ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Category: <Text className="font-bold text-foreground">{category}</Text>
                  </Text>
                </View>
              ) : null}
              {expenseType ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Type: <Text className="font-bold text-foreground">{readable(expenseType)}</Text>
                  </Text>
                </View>
              ) : null}
              {startDate || endDate ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Dates: <Text className="font-bold text-foreground">{startDate || 'Start'} to {endDate || 'End'}</Text>
                  </Text>
                </View>
              ) : null}
              {search ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Search: <Text className="font-bold text-foreground">"{search}"</Text>
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* CSV Spreadsheet Option */}
          <Pressable
            onPress={() => {
              setShowExportSheet(false);
              handleExportCSV();
            }}
            disabled={isExporting}
            className="p-3.5 rounded-2xl border border-border bg-card flex-row items-center gap-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Download CSV report"
          >
            <View className="size-10 rounded-xl bg-primary/10 items-center justify-center">
              <FileDown size={20} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">CSV Spreadsheet (.csv)</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Comma-separated file with filter metadata for Excel and data pipelines.
              </Text>
            </View>
          </Pressable>

          {/* Microsoft Excel Option */}
          <Pressable
            onPress={() => {
              setShowExportSheet(false);
              handleExportExcel();
            }}
            disabled={isExporting}
            className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex-row items-center gap-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Download Excel workbook"
          >
            <View className="size-10 rounded-xl bg-emerald-500/10 items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-600 dark:text-emerald-400" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">Microsoft Excel (.xlsx)</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Formatted workbook with filter summary sheet and styled expense table.
              </Text>
            </View>
          </Pressable>

          {/* PDF Document Option */}
          <Pressable
            onPress={() => {
              setShowExportSheet(false);
              handleExportPDF();
            }}
            disabled={isExporting}
            className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 flex-row items-center gap-3 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Download PDF report"
          >
            <View className="size-10 rounded-xl bg-rose-500/10 items-center justify-center">
              <FileText size={20} className="text-rose-600 dark:text-rose-400" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">PDF Document (.pdf)</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                Printable community expense report with active filter header and itemized totals.
              </Text>
            </View>
          </Pressable>

          <Button
            variant="outline"
            className="mt-2 w-full"
            onPress={() => setShowExportSheet(false)}
          >
            Cancel
          </Button>
        </View>
      </BottomSheet>
    </ScreenShell>
  );
}
