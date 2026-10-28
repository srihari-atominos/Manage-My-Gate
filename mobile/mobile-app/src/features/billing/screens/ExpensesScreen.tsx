import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { Receipt, RotateCcw, Plus, CreditCard, ChevronRight, FileDown, FileSpreadsheet, FileText, X, CheckCircle2 } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { EmptyState } from '@/components/feedback/EmptyState';
import expenseService from '../services/expenseService';
import { ExpenseFilterDrawer, ExpenseFilterValues } from '../components/ExpenseFilterDrawer';
import { ExpensePeriodAnalysisCard } from '../components/ExpensePeriodAnalysisCard';
import { MarkExpensePaidSheet } from '../components/MarkExpensePaidSheet';
import { useAuth } from '@/src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';
import { useAppSocket } from '../../../hooks/useAppSocket';
import { downloadCSVFile, downloadExcelFile, downloadPDFFile } from '@/src/utils/downloadHelper';

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
  const { refresh, period: routePeriod } = useLocalSearchParams<{ refresh?: string; period?: string }>();
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
  const initialPeriod = routePeriod || 'MONTHLY';
  const [period, setPeriod] = useState(initialPeriod);
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
  const [datePreset, setDatePreset] = useState(
    initialPeriod === 'ALL_TIME'
      ? 'ALL_TIME'
      : initialPeriod === 'TODAY'
      ? 'TODAY'
      : initialPeriod === 'WEEKLY'
      ? 'THIS_WEEK'
      : initialPeriod === 'YEARLY'
      ? 'THIS_YEAR'
      : 'THIS_MONTH'
  );

  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [selectedExpenseForMarkPaid, setSelectedExpenseForMarkPaid] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportScope, setExportScope] = useState<'CURRENT_FILTER' | 'ALL_TIME'>('ALL_TIME');

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

  useEffect(() => {
    if (routePeriod && routePeriod !== period) {
      handlePeriodChange(routePeriod);
    }
  }, [routePeriod, handlePeriodChange, period]);

  const buildExportQuery = useCallback(() => {
    if (exportScope === 'ALL_TIME') {
      return { period: 'ALL_TIME' };
    }
    const query: Record<string, string> = {};
    if (period && period !== 'ALL_TIME') query.period = period;
    if (status) query.settlementStatus = status;
    if (expenseType) query.expenseType = expenseType;
    if (category.trim()) query.category = category.trim();
    if (startDate) query.startDate = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate) query.endDate = new Date(`${endDate}T23:59:59.999`).toISOString();
    if (search.trim()) query.search = search.trim();
    return query;
  }, [exportScope, period, status, expenseType, category, startDate, endDate, search]);

  const exportFileName = (ext: 'csv' | 'xlsx' | 'pdf') => {
    const today = new Date().toISOString().split('T')[0];
    if (exportScope === 'ALL_TIME') {
      return `community_expenses_all_time_${today}.${ext}`;
    }
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
      const records = list?.records || [];
      const totalsData = totals || {};
      setData(records);
      setSummary(totalsData);
    } catch (e: any) {
      setData([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [params, period, search, expenseType, status, category, startDate, endDate]);

  // Stable ref for load to prevent effect loops across render cycles
  const loadRef = React.useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  // Force re-fetch when returning from create/pay flows via search params
  useEffect(() => {
    if (refresh) {
      loadRef.current();
    }
  }, [refresh]);

  // Real-time update: Reload once whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadRef.current();
    }, [])
  );

  // Debounced auto-reload when search or any filter changes (skips initial mount)
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadRef.current();
    }, 300);
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
    setDatePreset('THIS_MONTH');
    setPeriod('MONTHLY');
  };

  const totalActiveFilterCount =
    (status ? 1 : 0) +
    (expenseType ? 1 : 0) +
    (category.trim() ? 1 : 0) +
    (period !== 'MONTHLY' || datePreset !== 'THIS_MONTH' || startDate || endDate ? 1 : 0);

  const periodKpiTitles: Record<string, string> = {
    ALL_TIME: 'Total Expenses',
    TODAY: "Today's Expenses",
    WEEKLY: "This Week's Expenses",
    MONTHLY: "This Month's Expenses",
    YEARLY: "This Year's Expenses",
  };
  const primaryKpiTitle = periodKpiTitles[period] || 'Total Expenses';

  const fourthKpiCard = {
    title: 'Total Expense',
    value: formatCurrency(summary?.allTimeExpenses ?? summary?.totalExpenses),
    iconName: 'Receipt' as const,
  };

  const header = useMemo(
    () => (
      <View className="gap-3 pb-2">
        <KPIDashboardStrip
          layout="grid2x2"
          loading={loading && summary?.totalExpenses == null}
          cards={[
            {
              title: primaryKpiTitle,
              value: formatCurrency(summary?.totalExpenses),
              iconName: 'Receipt',
            },
            {
              title: 'Recorded as Paid',
              value: formatCurrency(summary?.recordedPaid),
              iconName: 'CreditCard',
              variant: 'success',
            },
            {
              title: 'Unpaid Balance',
              value: formatCurrency(summary?.unpaidBalance),
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
              leftIcon={Plus}
              onPress={() =>
                router.push('/(resident)/admin/billing/expenses/record' as any)
              }
              className="w-full shadow-xs"
            >
              Record Expense
            </Button>
          </View>
          {canPayOnline ? (
            <View className="min-w-0 flex-1">
              <Button
                variant="outline"
                leftIcon={CreditCard}
                onPress={() =>
                  router.push('/(resident)/admin/billing/expenses/pay-online' as any)
                }
                className="w-full shadow-xs"
              >
                Pay Online
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
          className="px-0 pt-0 pb-0"
        />

        {/* Active Filter Chips with One-Tap Clear Action */}
        {(search || expenseType || category || (startDate && endDate)) ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row -mx-4 px-4 py-0.5"
            contentContainerClassName="gap-1.5 items-center pe-6"
          >
            {search ? (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityRole="button"
                accessibilityLabel={`Clear search ${search}`}
                className="flex-row items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 active:opacity-75"
              >
                <Text className="text-[11px] font-medium text-primary">Search: "{search}"</Text>
                <X size={12} className="text-primary" />
              </Pressable>
            ) : null}
            {category ? (
              <Pressable
                onPress={() => setCategory('')}
                accessibilityRole="button"
                accessibilityLabel={`Clear category ${category}`}
                className="flex-row items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 active:opacity-75"
              >
                <Text className="text-[11px] font-medium text-primary">Category: {category}</Text>
                <X size={12} className="text-primary" />
              </Pressable>
            ) : null}
            {expenseType ? (
              <Pressable
                onPress={() => setExpenseType('')}
                accessibilityRole="button"
                accessibilityLabel={`Clear type ${readable(expenseType)}`}
                className="flex-row items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 active:opacity-75"
              >
                <Text className="text-[11px] font-medium text-primary">Type: {readable(expenseType)}</Text>
                <X size={12} className="text-primary" />
              </Pressable>
            ) : null}
            {startDate && endDate ? (
              <Pressable
                onPress={() => {
                  setStartDate('');
                  setEndDate('');
                  setDatePreset('ALL_TIME');
                  setPeriod('ALL_TIME');
                }}
                accessibilityRole="button"
                accessibilityLabel="Clear custom date filter"
                className="flex-row items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 active:opacity-75"
              >
                <Text className="text-[11px] font-medium text-primary">{startDate} to {endDate}</Text>
                <X size={12} className="text-primary" />
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        {error ? <ErrorBanner message={error} onRetry={load} /> : null}

        <View className="flex-row items-center justify-between px-0.5 pt-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm font-bold text-foreground">
              Expense Records
            </Text>
            <View className="rounded-full bg-muted px-2 py-0.5">
              <Text className="text-[11px] font-bold text-muted-foreground">
                {data.length}
              </Text>
            </View>
          </View>

          {/* Export Action Button */}
          <Pressable
            onPress={() => setShowExportSheet(true)}
            disabled={isExporting}
            accessibilityRole="button"
            accessibilityLabel="Export Expense Records"
            className="h-8 px-2.5 rounded-xl border border-border bg-card flex-row items-center justify-center gap-1.5 active:opacity-70 shadow-2xs"
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
          <EmptyState
            icon={Receipt}
            title={totalActiveFilterCount > 0 ? 'No Matching Expenses' : 'No Expenses Found'}
            description={
              totalActiveFilterCount > 0
                ? 'Try adjusting your filters or search query to find expense records.'
                : 'No community expenses recorded for this period. Tap Record Expense to track a new expense.'
            }
            actionLabel={totalActiveFilterCount > 0 ? 'Reset All Filters' : 'Record Expense'}
            onAction={
              totalActiveFilterCount > 0
                ? clearFilters
                : () => router.push('/(resident)/admin/billing/expenses/record' as any)
            }
          />
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

          const goToDetails = () =>
            router.push({
              pathname: '/(resident)/admin/billing/expenses/[id]',
              params: { id: item._id },
            } as any);

          return (
            <View className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs mb-1">
              {/* Clickable Card Body leading to Details */}
              <Pressable
                onPress={goToDetails}
                accessibilityRole="button"
                accessibilityLabel={`View expense ${item.name}`}
                className="active:opacity-80"
              >
                {/* Top Row: Status Badge, Category Tag & Date */}
                <View className="flex-row items-center justify-between gap-2 mb-2">
                  <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
                    <StatusBadge label={badgeLabel} variant={badgeVariant} size="sm" dot />
                    {item.category ? (
                      <View className="rounded-md bg-muted px-2 py-0.5 shrink min-w-0">
                        <Text className="text-[11px] font-medium text-muted-foreground" numberOfLines={1}>
                          {item.category}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {formattedDate && (
                    <Text className="text-[11px] text-muted-foreground shrink-0 font-medium">
                      {formattedDate}
                    </Text>
                  )}
                </View>

                {/* Middle Row: Expense Name, Subtitle, and Amount */}
                <View className="flex-row items-start justify-between gap-3 mb-1.5">
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-foreground text-sm leading-snug" numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground capitalize" numberOfLines={1}>
                      {readable(item.expenseType)}
                      {item.vendor?.name ? ` · Vendor: ${item.vendor.name}` : ''}
                    </Text>
                  </View>
                  <View className="items-end shrink-0">
                    <Text className="font-extrabold text-foreground text-base tracking-tight">
                      {formatCurrency(item.totalAmount)}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground font-mono">
                      {item.expenseNumber}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Bottom Row: Settlement Breakdown & Details Affordance (Sibling View, NOT nested in button) */}
              <View className="mt-2.5 flex-row items-center justify-between border-t border-border/60 pt-2.5">
                <View className="flex-row items-center gap-3 flex-wrap flex-1 min-w-0 pe-2">
                  <Text className="text-xs text-muted-foreground">
                    Paid: <Text className="font-semibold text-foreground">{formatCurrency(item.recordedPaidAmount)}</Text>
                  </Text>
                  {Number(item.outstandingAmount || 0) > 0 && (
                    <Text className="text-xs text-muted-foreground">
                      Due: <Text className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(item.outstandingAmount)}</Text>
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-2 shrink-0">
                  {Number(item.outstandingAmount || 0) > 0 ? (
                    <Pressable
                      onPress={() => setSelectedExpenseForMarkPaid(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark expense ${item.name} as paid`}
                      className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/10 border border-emerald-600/25 active:opacity-75"
                    >
                      <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Mark Paid
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={goToDetails}
                    accessibilityRole="button"
                    accessibilityLabel="View Details"
                    className="flex-row items-center gap-1 active:opacity-70"
                  >
                    <Text className="text-xs font-semibold text-primary">Details</Text>
                    <ChevronRight size={14} className="text-primary" />
                  </Pressable>
                </View>
              </View>
            </View>
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
          {/* Export Scope Selector (All Time vs Current Filter) */}
          <View className="flex-row rounded-xl bg-muted/60 p-1">
            <Pressable
              onPress={() => setExportScope('ALL_TIME')}
              className={`flex-1 py-2 items-center justify-center rounded-lg ${
                exportScope === 'ALL_TIME' ? 'bg-card shadow-sm border border-border' : ''
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  exportScope === 'ALL_TIME' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                All Expenses (All Time)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setExportScope('CURRENT_FILTER')}
              className={`flex-1 py-2 items-center justify-center rounded-lg ${
                exportScope === 'CURRENT_FILTER' ? 'bg-card shadow-sm border border-border' : ''
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  exportScope === 'CURRENT_FILTER' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Current View Filter
              </Text>
            </Pressable>
          </View>

          {/* Active Filter Parameters Summary Card */}
          <View className="rounded-2xl border border-border/80 bg-muted/40 p-3.5 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-bold text-foreground">
                {exportScope === 'ALL_TIME' ? 'Export Scope' : 'Active Filter Parameters'}
              </Text>
              <Text className="text-xs font-semibold text-primary">
                {exportScope === 'ALL_TIME' ? 'All Community Records' : `${data.length} records in view`}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                <Text className="text-[11px] font-medium text-muted-foreground">
                  Scope: <Text className="font-bold text-foreground">{exportScope === 'ALL_TIME' ? 'All Time (Every Expense)' : periodDisplayNames[period] || period}</Text>
                </Text>
              </View>
              {exportScope === 'CURRENT_FILTER' && status ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Status: <Text className="font-bold text-foreground">{readable(status)}</Text>
                  </Text>
                </View>
              ) : null}
              {exportScope === 'CURRENT_FILTER' && category ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Category: <Text className="font-bold text-foreground">{category}</Text>
                  </Text>
                </View>
              ) : null}
              {exportScope === 'CURRENT_FILTER' && expenseType ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Type: <Text className="font-bold text-foreground">{readable(expenseType)}</Text>
                  </Text>
                </View>
              ) : null}
              {exportScope === 'CURRENT_FILTER' && (startDate || endDate) ? (
                <View className="rounded-md bg-card px-2 py-1 border border-border/60">
                  <Text className="text-[11px] font-medium text-muted-foreground">
                    Dates: <Text className="font-bold text-foreground">{startDate || 'Start'} to {endDate || 'End'}</Text>
                  </Text>
                </View>
              ) : null}
              {exportScope === 'CURRENT_FILTER' && search ? (
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

      {/* Modern Mark Expense Paid Sheet */}
      <MarkExpensePaidSheet
        visible={Boolean(selectedExpenseForMarkPaid)}
        onClose={() => setSelectedExpenseForMarkPaid(null)}
        expense={selectedExpenseForMarkPaid}
        onSuccess={() => {
          setSelectedExpenseForMarkPaid(null);
          load();
        }}
      />
    </ScreenShell>
  );
}
