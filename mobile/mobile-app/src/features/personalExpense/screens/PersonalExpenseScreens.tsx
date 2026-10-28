import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { TextInput } from '@/components/forms/TextInput';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  PieChart,
  Plus,
  ReceiptText,
  Sparkles,
  Tag,
  Target,
  Trash2,
  UploadCloud,
  WalletCards,
} from 'lucide-react-native';
import type {
  Dashboard,
  PersonalExpenseCategory,
  PersonalExpenseTransaction,
  TransactionInput,
  TransactionType,
} from '../types';
import service, { type ReceiptUpload } from '../personalExpenseService';
import {
  formatINR,
  localDate,
  localPeriod,
  rupeesToNumber,
  shiftPeriod,
  validateTransaction,
} from '../personalExpense.utils';

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'WALLET', 'OTHER'] as const;
const CATEGORY_COLORS = ['#C2410C', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const formatCompactAmount = (amount: number) => formatINR(amount).replace('.00', '');

/**
 * Period selector header with Previous / Next navigation
 */
const MonthSelector = ({
  period,
  setPeriod,
}: {
  period: string;
  setPeriod: (v: string) => void;
}) => (
  <View className="mb-4 flex-row items-center justify-between px-1">
    <Pressable
      onPress={() => setPeriod(shiftPeriod(period, -1))}
      className="flex-row items-center gap-1 rounded-full bg-secondary px-3 py-1.5 active:opacity-75"
      accessibilityRole="button"
      accessibilityLabel="Previous month">
      <ChevronLeft size={16} className="text-secondary-foreground" />
      <Text className="font-bold text-xs text-secondary-foreground">Previous</Text>
    </Pressable>

    <View className="flex-row items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
      <Calendar size={14} className="text-primary" />
      <Text className="font-extrabold text-sm text-foreground">{period}</Text>
    </View>

    <Pressable
      onPress={() => setPeriod(shiftPeriod(period, 1))}
      className="flex-row items-center gap-1 rounded-full bg-secondary px-3 py-1.5 active:opacity-75"
      accessibilityRole="button"
      accessibilityLabel="Next month">
      <Text className="font-bold text-xs text-secondary-foreground">Next</Text>
      <ChevronRight size={16} className="text-secondary-foreground" />
    </Pressable>
  </View>
);

/**
 * Clean transaction list row
 */
const TransactionRow = ({
  item,
  onPress,
}: {
  item: PersonalExpenseTransaction;
  onPress: () => void;
}) => {
  const isIncome = item.type === 'INCOME';
  return (
    <Pressable
      onPress={onPress}
      className="mb-2.5 active:opacity-85"
      accessibilityRole="button"
      accessibilityLabel={`${item.categoryName}, ${item.amountMinor / 100} rupees`}>
      <View className="flex-row items-center justify-between rounded-2xl border border-border/70 bg-card p-3.5">
        <View className="flex-1 min-w-0 flex-row items-center gap-3 pe-2">
          <View
            className={`size-10 items-center justify-center rounded-xl shrink-0 ${
              isIncome ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`}>
            {isIncome ? (
              <ArrowUpRight size={18} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownLeft size={18} className="text-rose-600 dark:text-rose-400" />
            )}
          </View>

          <View className="flex-1 min-w-0">
            <Text className="font-bold text-sm text-foreground" numberOfLines={1}>
              {item.categoryName}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {item.transactionDate} • {item.paymentMethod.replace('_', ' ')}
              {item.merchantOrSource ? ` • ${item.merchantOrSource}` : ''}
            </Text>
          </View>
        </View>

        <View className="items-end shrink-0">
          <Text
            className={`font-extrabold text-sm ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
            {isIncome ? '+' : '-'}
            {formatINR(item.amountMinor)}
          </Text>
          {item.paymentSettlement === 'UNPAID' && (
            <View className="mt-0.5">
              <StatusBadge label="Unpaid" variant="warning" size="sm" />
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

/**
 * Action shortcut tile
 */
const QuickActionTile = ({
  icon: Icon,
  label,
  accentColor,
  bgColor,
  onPress,
}: {
  icon: any;
  label: string;
  accentColor: string;
  bgColor: string;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="flex-1 items-center py-1 active:opacity-80"
    accessibilityRole="button"
    accessibilityLabel={label}>
    <View
      style={{ backgroundColor: bgColor }}
      className="shadow-2xs mb-1.5 size-12 items-center justify-center rounded-2xl">
      <Icon size={20} color={accentColor} strokeWidth={2.4} />
    </View>
    <Text className="font-bold text-xs tracking-tight text-foreground">{label}</Text>
  </Pressable>
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. Personal Expense Dashboard Screen
// ─────────────────────────────────────────────────────────────────────────────
export function PersonalExpenseDashboardScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState(localPeriod());
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await service.dashboard(period));
    } catch (e: any) {
      setError(e?.message || 'Unable to load expense manager.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const categories = data?.categoryBreakdown.slice(0, 4) || [];
  const largest = categories[0]?.amountMinor || 0;
  const budget = data?.budgets.find((x) => !x.categoryId);
  const progress = budget
    ? Math.min(100, Math.round((data!.expenseMinor / budget.amountMinor) * 100))
    : 0;

  return (
    <ScreenShell
      title="Expense Manager"
      subtitle="Personal cashflow, budgets & receipts"
      iconName="WalletCards"
      showBackButton
      headerRight={
        <HeaderActionButton
          icon={Tag}
          label="Categories"
          onPress={() => router.push('/(resident)/expense-manager/categories' as any)}
          accessibilityLabel="Manage Categories"
        />
      }>
      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor="#C2410C" />
        }>
        <MonthSelector period={period} setPeriod={setPeriod} />

        {error && <ErrorBanner message={error} onRetry={load} className="mb-4" />}

        {loading && !data ? (
          <View className="items-center justify-center py-12">
            <ActivityIndicator size="large" color="#C2410C" />
            <Text className="mt-3 font-semibold text-xs text-muted-foreground">
              Calculating your monthly totals...
            </Text>
          </View>
        ) : null}

        {data ? (
          <>
            {/* Architectural Available to Spend Balance Card */}
            <View
              className="relative mb-4 overflow-hidden rounded-3xl border p-5"
              style={{
                backgroundColor: '#172B70',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}>
              {/* Subtle decorative architectural shape */}
              <View
                className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full opacity-20"
                style={{ backgroundColor: '#FF7A3D' }}
              />

              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="size-8 items-center justify-center rounded-xl bg-white/15">
                    <WalletCards size={16} color="#FFFFFF" />
                  </View>
                  <Text className="font-bold text-xs uppercase tracking-wider text-white/80">
                    Available to Spend
                  </Text>
                </View>
                <View className="rounded-full bg-white/15 px-2.5 py-0.5">
                  <Text className="font-semibold text-xs text-white/90">{period}</Text>
                </View>
              </View>

              <Text className="mb-5 text-3xl font-black tracking-tight text-white">
                {formatCompactAmount(data.balanceMinor)}
              </Text>

              <View className="mb-3 h-px bg-white/15" />

              <View className="flex-row items-center">
                <View className="flex-1 min-w-0 pe-3">
                  <View className="mb-1 flex-row items-center gap-1.5">
                    <ArrowUpRight size={14} color="#6EE7B7" />
                    <Text className="font-semibold text-xs text-white/70" numberOfLines={1}>Total Income</Text>
                  </View>
                  <Text className="font-extrabold text-base text-white" numberOfLines={1} adjustsFontSizeToFit>
                    {formatCompactAmount(data.incomeMinor)}
                  </Text>
                </View>

                <View className="flex-1 min-w-0 border-s border-white/20 ps-3">
                  <View className="mb-1 flex-row items-center gap-1.5">
                    <ArrowDownLeft size={14} color="#FDA4AF" />
                    <Text className="font-semibold text-xs text-white/70" numberOfLines={1}>Total Spent</Text>
                  </View>
                  <Text className="font-extrabold text-base text-white" numberOfLines={1} adjustsFontSizeToFit>
                    {formatCompactAmount(data.expenseMinor)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Action Shortcuts */}
            <Card className="mb-4 p-3">
              <View className="flex-row items-center justify-between px-1">
                <QuickActionTile
                  icon={ArrowDownLeft}
                  label="Expense"
                  accentColor="#DC2626"
                  bgColor="rgba(239, 68, 68, 0.12)"
                  onPress={() => router.push('/(resident)/expense-manager/add-expense' as any)}
                />
                <QuickActionTile
                  icon={ArrowUpRight}
                  label="Income"
                  accentColor="#059669"
                  bgColor="rgba(16, 185, 129, 0.12)"
                  onPress={() => router.push('/(resident)/expense-manager/add-income' as any)}
                />
                <QuickActionTile
                  icon={ReceiptText}
                  label="History"
                  accentColor="#2563EB"
                  bgColor="rgba(37, 99, 235, 0.12)"
                  onPress={() => router.push('/(resident)/expense-manager/transactions' as any)}
                />
                <QuickActionTile
                  icon={Target}
                  label="Budget"
                  accentColor="#C2410C"
                  bgColor="rgba(194, 65, 12, 0.12)"
                  onPress={() => router.push('/(resident)/expense-manager/budgets' as any)}
                />
              </View>
            </Card>

            {/* Spending Map Section */}
            <View className="mb-2.5 flex-row items-center justify-between px-1">
              <View>
                <Text className="font-extrabold text-base text-foreground">Spending Breakdown</Text>
                <Text className="text-xs text-muted-foreground">Top monthly expenditure</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(resident)/expense-manager/reports' as any)}
                className="flex-row items-center gap-1 rounded-full bg-secondary px-2.5 py-1 active:opacity-75">
                <Text className="font-bold text-xs text-primary">All Reports</Text>
                <ChevronRight size={14} className="text-primary" />
              </Pressable>
            </View>

            <Card className="mb-4 p-4">
              {categories.length ? (
                categories.map((c, i) => {
                  const p = largest ? Math.round((c.amountMinor / largest) * 100) : 0;
                  const barColor = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                  return (
                    <View key={c._id.categoryId} className={i ? 'mt-3.5' : ''}>
                      <View className="mb-1.5 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View
                            style={{ backgroundColor: barColor }}
                            className="size-2.5 rounded-full"
                          />
                          <Text className="font-bold text-sm text-foreground">
                            {c._id.categoryName}
                          </Text>
                        </View>
                        <Text className="font-extrabold text-sm text-foreground">
                          {formatCompactAmount(c.amountMinor)}
                        </Text>
                      </View>
                      <View className="h-2 overflow-hidden rounded-full bg-muted">
                        <View
                          style={{ width: `${p}%`, backgroundColor: barColor }}
                          className="h-full rounded-full"
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View className="items-center py-6">
                  <PieChart size={32} className="text-muted-foreground/60" />
                  <Text className="mt-2 font-bold text-sm text-foreground">
                    No expenses recorded yet
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    Tap Add Expense above to start tracking.
                  </Text>
                </View>
              )}
            </Card>

            {/* Monthly Budget Pulse */}
            <Card className="mb-5 border-amber-500/20 bg-amber-500/5 p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 flex-row items-start gap-3 pe-2">
                  <View className="size-9 items-center justify-center rounded-xl bg-amber-500/15">
                    <Target size={18} className="text-amber-600 dark:text-amber-400" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-extrabold text-sm text-foreground">
                      {budget ? 'Monthly Spending Target' : 'Set Monthly Budget'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      {budget
                        ? `${progress}% used • ${formatINR(
                            Math.max(0, budget.amountMinor - data.expenseMinor)
                          )} left`
                        : 'Establish a spending target to keep monthly goals on track.'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => router.push('/(resident)/expense-manager/budgets' as any)}
                  className="p-1">
                  <ChevronRight size={18} className="text-muted-foreground" />
                </Pressable>
              </View>

              {budget ? (
                <View className="mt-3 h-2 overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950/40">
                  <View
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 self-start"
                  onPress={() => router.push('/(resident)/expense-manager/budgets' as any)}>
                  Create Target
                </Button>
              )}
            </Card>

            {/* Recent Activity (Strict 3-Item Limit per Catalog Rule V.1) */}
            <View className="mb-2.5 flex-row items-center justify-between px-1">
              <Text className="font-extrabold text-base text-foreground">Recent Activity</Text>
              <Pressable
                onPress={() => router.push('/(resident)/expense-manager/transactions' as any)}
                className="flex-row items-center gap-1 rounded-full bg-secondary px-2.5 py-1 active:opacity-75">
                <Text className="font-bold text-xs text-primary">View All</Text>
                <ChevronRight size={14} className="text-primary" />
              </Pressable>
            </View>

            {data.recentTransactions.length ? (
              data.recentTransactions
                .slice(0, 3)
                .map((item) => (
                  <TransactionRow
                    key={item._id}
                    item={item}
                    onPress={() =>
                      router.push(`/(resident)/expense-manager/transactions/${item._id}` as any)
                    }
                  />
                ))
            ) : (
              <Card className="items-center justify-center p-6">
                <ReceiptText size={28} className="text-muted-foreground/60" />
                <Text className="mt-2 text-xs text-muted-foreground">
                  No transactions recorded for {period}.
                </Text>
              </Card>
            )}
          </>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Transaction Form (Add & Edit)
// ─────────────────────────────────────────────────────────────────────────────
function TransactionForm({
  type,
  id,
  onDone,
}: {
  type: TransactionType;
  id?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState<0 | 1>(id ? 1 : 0);
  const [categories, setCategories] = useState<PersonalExpenseCategory[]>([]);
  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    transactionDate: localDate(),
    paymentMethod: 'UPI',
    paymentSettlement: 'UNPAID' as 'PAID' | 'UNPAID',
    merchantOrSource: '',
    reference: '',
    notes: '',
  });
  const [receipt, setReceipt] = useState<ReceiptUpload | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<PersonalExpenseTransaction['receipt']>(null);
  const [removeSavedReceipt, setRemoveSavedReceipt] = useState(false);
  const [review, setReview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrFeedback, setOcrFeedback] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    service
      .categories()
      .then((cats) => {
        setCategories(cats);
        const defaults = cats.filter((category) => category.type === type);
        if (defaults.length > 0) {
          setForm((c) => ({
            ...c,
            categoryId: c.categoryId || defaults[0].id,
          }));
        }
      })
      .catch((reason) => setError(reason?.message || 'Unable to load categories.'));

    if (!id) return;
    service
      .transaction(id)
      .then((transaction) => {
        setForm({
          amount: String(transaction.amountMinor / 100),
          categoryId: transaction.categoryId,
          transactionDate: transaction.transactionDate,
          paymentMethod: transaction.paymentMethod,
          paymentSettlement: transaction.paymentSettlement || 'UNPAID',
          merchantOrSource: transaction.merchantOrSource || '',
          reference: transaction.reference || '',
          notes: transaction.notes || '',
        });
        setSavedReceipt(transaction.receipt || null);
        setReview(transaction.receipt?.ocr || null);
      })
      .catch((reason) => setError(reason?.message || 'Unable to load transaction.'));
  }, [id, type]);

  const choices = categories.filter((category) => category.type === type);

  const scanReceipt = async (targetReceipt?: ReceiptUpload) => {
    const fileToScan = targetReceipt || receipt;
    if (!fileToScan) return;
    setScanning(true);
    setOcrFeedback(null);
    setError(null);
    try {
      const outcome = await service.previewReceipt(fileToScan);
      if (outcome?.status === 'COMPLETED' && outcome.result) {
        const res = outcome.result;
        setReview(res);

        const confidenceFor = (field: 'total' | 'date' | 'merchant' | 'reference') => res.fieldConfidence?.[field]?.score;
        const canPrefill = (field: 'total' | 'date' | 'merchant' | 'reference') => {
          const score = confidenceFor(field);
          return score == null || score >= 80;
        };
        const newAmount =
          canPrefill('total') && res.totalAmount != null
            ? String(res.totalAmount)
            : canPrefill('total') && res.totalMinor != null
            ? String(res.totalMinor / 100)
            : form.amount;
        const newDate =
          canPrefill('date') && /^\d{4}-\d{2}-\d{2}$/.test(res.expenseDate || res.receiptDate || '')
            ? res.expenseDate || res.receiptDate
            : form.transactionDate;
        const newMerchant = canPrefill('merchant') ? (res.merchant || form.merchantOrSource) : form.merchantOrSource;
        const newRef = canPrefill('reference') ? (res.receiptNumber || res.transactionReference || form.reference) : form.reference;
        const matchedCategory = res.suggestedCategory
          ? categories.find(
              (c) =>
                c.name.toLowerCase() === res.suggestedCategory.toLowerCase() &&
                c.type === type
            )
          : null;
        const newMethod =
          res.isPaymentScreenshot || res.paymentMethod === 'UPI' ? 'UPI' : form.paymentMethod;

        setForm((current) => ({
          ...current,
          amount: newAmount,
          transactionDate: newDate,
          merchantOrSource: newMerchant,
          reference: newRef,
          paymentSettlement: 'PAID',
          ...(matchedCategory ? { categoryId: matchedCategory.id } : {}),
          ...(newMethod ? { paymentMethod: newMethod } : {}),
        }));

        const reviewMessage = res.warnings?.[0]?.message || 'Review highlighted fields before saving.';
        setOcrFeedback({
          tone: res.needsReview ? 'info' : 'success',
          message: res.needsReview
            ? `Receipt scanned. Only high-confidence fields were pre-filled. ${reviewMessage}`
            : `Successfully extracted: ${newMerchant ? `${newMerchant} • ` : ''}₹${newAmount || '0.00'}${newRef ? ` • #${newRef}` : ''}`,
        });
        // Automatically advance to Page 2 (Extracted Details)
        setTimeout(() => {
          setCurrentSlide(1);
        }, 500);
      } else {
        setOcrFeedback({
          tone: 'error',
          message: outcome?.error || 'Could not auto-extract details. Tap Next to enter details manually.',
        });
      }
    } catch (err: any) {
      setOcrFeedback({
        tone: 'error',
        message: err?.message || 'Unable to scan receipt. Please enter details manually.',
      });
    } finally {
      setScanning(false);
    }
  };

  const chooseReceipt = async () => {
    try {
      const selected = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (selected.canceled || !selected.assets?.[0]) return;
      const asset: any = selected.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        return setError('Receipt must be 10 MB or smaller.');
      }
      const newReceipt: ReceiptUpload = {
        uri: asset.uri,
        name: asset.name || 'receipt',
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size,
        file: asset.file,
      };
      setReceipt(newReceipt);
      setReview(null);
      setError(null);
      // Attaching receipt implies paid settlement
      setForm((current) => ({ ...current, paymentSettlement: 'PAID' }));
      // Auto-scan on upload
      scanReceipt(newReceipt);
    } catch {
      setError('Unable to select the receipt.');
    }
  };

  const chooseSettlement = (value: 'PAID' | 'UNPAID') => {
    if (value === 'PAID') {
      return setForm((current) => ({ ...current, paymentSettlement: value }));
    }
    if (!receipt && !savedReceipt) {
      return setForm((current) => ({ ...current, paymentSettlement: value }));
    }
    Alert.alert(
      'Remove receipt?',
      'Changing to Unpaid keeps the saved receipt only if you stay Paid. Confirm to remove the receipt.',
      [
        { text: 'Keep Paid', style: 'cancel' },
        {
          text: 'Remove receipt',
          style: 'destructive',
          onPress: () => {
            setReceipt(null);
            setRemoveSavedReceipt(Boolean(savedReceipt));
            setForm((current) => ({ ...current, paymentSettlement: value }));
          },
        },
      ]
    );
  };

  const submit = async () => {
    const invalid = validateTransaction(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input: TransactionInput = {
        type,
        amount: rupeesToNumber(form.amount),
        categoryId: form.categoryId,
        transactionDate: form.transactionDate,
        paymentMethod: form.paymentMethod as any,
        paymentSettlement: receipt ? 'PAID' : form.paymentSettlement,
        merchantOrSource: form.merchantOrSource.trim(),
        reference: form.reference ? form.reference.trim() : null,
        notes: form.notes,
      };

      const write = id
        ? await service.updateTransaction(id, input)
        : await service.createTransaction(input);
      let transaction = write.transaction;

      if (removeSavedReceipt) {
        transaction = await service.deleteReceipt(transaction._id);
      }

      if (receipt) {
        setProcessing(true);
        try {
          transaction = await service.uploadReceipt(transaction._id, receipt);
          setSavedReceipt(transaction.receipt || null);
          setReview(transaction.receipt?.ocr || null);
          setReceipt(null);
        } catch (uploadErr: any) {
          console.warn('Receipt upload warning:', uploadErr);
          Alert.alert(
            'Receipt Attachment Note',
            'Transaction recorded, but receipt attachment could not be uploaded: ' +
              (uploadErr?.message || 'Upload failed')
          );
        }
      }

      if (write.duplicateWarning) {
        Alert.alert(
          'Possible duplicate',
          'A similar transaction exists. Your transaction was saved.'
        );
      }
      if (onDone) {
        onDone();
      } else {
        router.back();
      }
    } catch (reason: any) {
      setError(reason?.message || 'Unable to save transaction.');
    } finally {
      setProcessing(false);
      setSaving(false);
    }
  };

  const retryOcr = async () => {
    if (!id) return;
    setProcessing(true);
    setError(null);
    try {
      const transaction = await service.retryReceiptOcr(id);
      setSavedReceipt(transaction.receipt || null);
      setReview(transaction.receipt?.ocr || null);
    } catch (reason: any) {
      setError(reason?.message || 'Unable to process this receipt.');
    } finally {
      setProcessing(false);
    }
  };

  const screenTitle = id
    ? `Edit ${type === 'EXPENSE' ? 'Expense' : 'Income'}`
    : `Add ${type === 'EXPENSE' ? 'Expense' : 'Income'}`;

  return (
    <ScreenShell title={screenTitle} showBackButton onBackPress={onDone} hideBottomNav>
      {/* =========================================================================
          TWO-SLIDE PAGE INDICATOR
         ========================================================================= */}
      <View className="px-4 pt-2.5 pb-2.5 bg-card border-b border-border shadow-2xs">
        <View className="flex-row items-center gap-2 mb-2">
          {[0, 1].map((idx) => {
            const isActive = idx === currentSlide;
            const isCompleted = idx < currentSlide;
            return (
              <Pressable
                key={idx}
                onPress={() => setCurrentSlide(idx as 0 | 1)}
                className={`h-2 flex-1 rounded-full ${
                  isCompleted || isActive ? 'bg-primary' : 'bg-muted'
                }`}
                accessibilityRole="button"
                accessibilityLabel={`Go to Slide ${idx + 1}`}
              />
            );
          })}
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-extrabold text-foreground">
            {currentSlide === 0 ? '1. Upload Receipt & Scan' : '2. Extracted Details & Save'}
          </Text>
          <Text className="text-[11px] font-bold text-muted-foreground">
            Step {currentSlide + 1} of 2
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 80, gap: 14, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* =========================================================================
            SLIDE 0 (PAGE 1): RECEIPT UPLOAD & SCAN
           ========================================================================= */}
        {currentSlide === 0 && (
          <>
            <Card className="p-4 gap-3.5">
              <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                  <FileText size={16} className="text-primary" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-foreground">Receipt / Proof Document</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    Upload a bill, invoice, or payment screenshot for auto-extraction
                  </Text>
                </View>
              </View>

              {receipt ? (
                <View className="gap-2.5 rounded-2xl border border-border/60 bg-muted/60 p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 me-2 font-bold text-xs text-foreground" numberOfLines={1}>
                      {receipt.name}
                    </Text>
                    <View className="flex-row gap-3">
                      <Pressable onPress={chooseReceipt} hitSlop={8}>
                        <Text className="text-xs font-bold text-primary">Replace</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setReceipt(null);
                          setReview(null);
                          setOcrFeedback(null);
                        }}
                        hitSlop={8}>
                        <Text className="text-xs font-bold text-destructive">Remove</Text>
                      </Pressable>
                    </View>
                  </View>

                  {receipt.type.startsWith('image/') && (
                    <Image
                      source={{ uri: receipt.uri }}
                      className="h-44 w-full rounded-xl bg-card border border-border/40"
                      resizeMode="contain"
                    />
                  )}

                  <Button
                    variant="default"
                    loading={scanning}
                    disabled={scanning}
                    onPress={() => scanReceipt()}
                    className="mt-1 bg-primary">
                    <Text className="text-xs font-bold text-primary-foreground">
                      {scanning ? 'Scanning & Extracting Text…' : 'Scan & Auto-Extract Details'}
                    </Text>
                  </Button>
                </View>
              ) : (
                <View className="gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 items-center justify-center">
                  <View className="h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-1">
                    <UploadCloud size={24} className="text-primary" />
                  </View>
                  <Text className="font-bold text-sm text-foreground text-center">
                    Upload Bill, Invoice, or Receipt
                  </Text>
                  <Text className="text-xs text-muted-foreground text-center px-4">
                    Supports JPG, PNG, WEBP, or PDF. We'll automatically extract vendor, bill #, date, and total amount.
                  </Text>
                  <Button variant="default" onPress={chooseReceipt} className="mt-2 w-full max-w-xs">
                    Select Receipt Document
                  </Button>
                </View>
              )}

              {/* Saved Receipt on Existing Transaction */}
              {savedReceipt && !removeSavedReceipt ? (
                <View className="rounded-2xl border border-border/60 bg-muted/60 p-3">
                  <Text className="font-bold text-xs text-foreground">
                    Saved Receipt: {savedReceipt.originalName}
                  </Text>
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {savedReceipt.ocrStatus === 'COMPLETED'
                      ? 'Receipt details extracted and ready.'
                      : savedReceipt.ocrError || 'Receipt stored for records.'}
                  </Text>
                  {id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2.5 self-start"
                      disabled={processing}
                      onPress={retryOcr}>
                      {processing ? 'Processing Receipt...' : 'Retry OCR Scan'}
                    </Button>
                  )}
                </View>
              ) : null}

              {/* OCR Feedback Message */}
              {ocrFeedback ? (
                <View
                  className={`rounded-xl border p-3 gap-2 ${
                    ocrFeedback.tone === 'error'
                      ? 'border-destructive/30 bg-destructive/5'
                      : ocrFeedback.tone === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-amber-500/30 bg-amber-500/10'
                  }`}>
                  <View className="flex-row items-start gap-2">
                    {ocrFeedback.tone === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle
                        size={16}
                        className={
                          ocrFeedback.tone === 'error'
                            ? 'text-destructive mt-0.5 shrink-0'
                            : 'text-amber-600 mt-0.5 shrink-0'
                        }
                      />
                    )}
                    <Text
                      className={`flex-1 text-xs font-medium leading-relaxed ${
                        ocrFeedback.tone === 'error'
                          ? 'text-destructive'
                          : ocrFeedback.tone === 'success'
                          ? 'text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'text-amber-800 dark:text-amber-300'
                      }`}>
                      {ocrFeedback.message}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {/* Slide 0 Action Row */}
            <View className="pt-2 pb-6 gap-2.5">
              <Button
                variant="default"
                onPress={() => setCurrentSlide(1)}
                className="w-full bg-primary h-12 shadow-sm">
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-white font-bold text-base">
                    Next: Review Extracted Details
                  </Text>
                  <ArrowRight size={18} className="text-white" />
                </View>
              </Button>

              {!receipt && (
                <Pressable
                  onPress={() => setCurrentSlide(1)}
                  className="py-2.5 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Skip receipt and enter details manually">
                  <Text className="text-xs font-bold text-muted-foreground hover:text-foreground">
                    Skip receipt & enter details manually →
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}

        {/* =========================================================================
            SLIDE 1 (PAGE 2): EXTRACTED DETAILS & SAVE
           ========================================================================= */}
        {currentSlide === 1 && (
          <>
            {/* OCR Confidence Header if available */}
            {review && (
              <View className="flex-row items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
                <View className="flex-row items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <Text className="font-extrabold text-xs text-foreground">
                    {review.isPaymentScreenshot ? 'Payment Proof Extracted' : 'Receipt Extracted'}
                  </Text>
                </View>
                {review.confidence != null && (
                  <StatusBadge
                    label={`${review.confidence}% Match`}
                    variant={review.confidence >= 80 ? 'success' : 'warning'}
                    size="sm"
                  />
                )}
              </View>
            )}

            {/* Section 1: The 4 Core Tracking Fields */}
            <Card className="p-4 gap-3.5">
              <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                  <ReceiptText size={16} className="text-primary" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-foreground">Extracted Bill Details</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    Auto-extracted from your receipt or entered manually
                  </Text>
                </View>
              </View>

              {/* 1. Vendor / Payee Name */}
              <TextInput
                label="Vendor / Payee Name"
                value={form.merchantOrSource}
                placeholder="Enter vendor, store, or payee name"
                onChangeText={(merchantOrSource) => setForm((c) => ({ ...c, merchantOrSource }))}
              />

              {/* 2. Invoice # / Bill # / Ref ID */}
              <TextInput
                label="Invoice # / Bill # / Ref ID"
                value={form.reference}
                placeholder="Enter invoice, bill number, or ref ID"
                onChangeText={(reference) => setForm((c) => ({ ...c, reference }))}
              />

              {/* 3. Expense Date */}
              <TextInput
                label="Expense Date (YYYY-MM-DD)"
                value={form.transactionDate}
                placeholder="YYYY-MM-DD"
                onChangeText={(transactionDate) => setForm((c) => ({ ...c, transactionDate }))}
              />

              {/* 4. Total Amount (Required) */}
              <TextInput
                label="Total Amount (₹)"
                required
                value={form.amount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                onChangeText={(amount) => setForm((c) => ({ ...c, amount }))}
              />
            </Card>

            {/* Section 2: Classification & Settlement */}
            <Card className="p-4 gap-3">
              <Text className="font-extrabold text-sm text-foreground">Classification & Payment</Text>

              <Text className="font-bold text-xs uppercase text-muted-foreground mt-1">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {choices.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setForm((c) => ({ ...c, categoryId: cat.id }))}
                    className={`rounded-xl border px-3 py-2 ${
                      form.categoryId === cat.id
                        ? 'border-primary bg-primary'
                        : 'border-border/60 bg-muted/70'
                    }`}>
                    <Text
                      className={`font-bold text-xs ${
                        form.categoryId === cat.id ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="font-bold text-xs uppercase text-muted-foreground mt-2">Payment Method</Text>
              <View className="flex-row flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method}
                    onPress={() => setForm((c) => ({ ...c, paymentMethod: method }))}
                    className={`rounded-xl border px-3 py-2 ${
                      form.paymentMethod === method
                        ? 'border-primary bg-primary'
                        : 'border-border/60 bg-muted/70'
                    }`}>
                    <Text
                      className={`font-bold text-xs ${
                        form.paymentMethod === method ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                      {method.replace('_', ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="font-bold text-xs uppercase text-muted-foreground mt-2">Settlement Status</Text>
              <View className="flex-row gap-2">
                {(['PAID', 'UNPAID'] as const).map((settlement) => (
                  <Pressable
                    key={settlement}
                    onPress={() => chooseSettlement(settlement)}
                    className={`flex-1 items-center rounded-xl border p-2.5 ${
                      form.paymentSettlement === settlement
                        ? 'border-primary bg-primary'
                        : 'border-border/60 bg-muted/70'
                    }`}>
                    <Text
                      className={`font-bold text-xs ${
                        form.paymentSettlement === settlement ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                      {settlement === 'PAID' ? 'Paid' : 'Unpaid'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* Slide 1 Navigation & Submit Row */}
            <View className="pt-2 pb-6 gap-3">
              {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  onPress={() => setCurrentSlide(0)}
                  className="flex-1 border-border h-12">
                  <View className="flex-row items-center justify-center gap-1.5">
                    <ArrowLeft size={16} className="text-foreground" />
                    <Text className="font-bold text-sm text-foreground">Back to Receipt</Text>
                  </View>
                </Button>

                <Button
                  variant="default"
                  loading={saving || processing}
                  disabled={saving || processing}
                  onPress={submit}
                  className="flex-1 bg-primary h-12 shadow-sm">
                  <Text className="font-bold text-base text-primary-foreground">
                    {saving ? 'Saving...' : 'Save Expense'}
                  </Text>
                </Button>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

export const AddExpenseScreen = () => <TransactionForm type="EXPENSE" />;
export const AddIncomeScreen = () => <TransactionForm type="INCOME" />;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Transaction History Screen
// ─────────────────────────────────────────────────────────────────────────────
export function TransactionHistoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PersonalExpenseTransaction[]>([]);
  const [categories, setCategories] = useState<PersonalExpenseCategory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<TransactionType | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (reset = false) => {
    setLoading(true);
    setError(null);
    try {
      const targetPage = reset ? 1 : page;
      const result = await service.transactions({
        page: targetPage,
        limit: 25,
        type,
        categoryId,
        startDate,
        endDate,
      });
      setItems(reset ? result.items : [...items, ...result.items]);
      setPage(targetPage + 1);
      setTotalPages(result.totalPages);
    } catch (e: any) {
      setError(e?.message || 'Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    service
      .categories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load(true);
  }, [type, categoryId, startDate, endDate]);

  const shown = items.filter((item) =>
    `${item.categoryName} ${item.merchantOrSource} ${item.notes}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <ScreenShell title="Transactions" subtitle="Full financial ledger" showBackButton>
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {error && <ErrorBanner message={error} onRetry={() => load(true)} className="mb-3" />}

        <TextInput
          placeholder="Search by category, merchant, note..."
          value={search}
          onChangeText={setSearch}
          containerClassName="mb-3"
        />

        {/* Type Filter Chips */}
        <View className="mb-3 flex-row gap-2">
          {([undefined, 'EXPENSE', 'INCOME'] as const).map((val) => (
            <Pressable
              key={val || 'all'}
              onPress={() => setType(val)}
              className={`rounded-full border px-3 py-1.5 ${
                type === val ? 'border-primary bg-primary' : 'border-border/60 bg-secondary'
              }`}>
              <Text
                className={`font-bold text-xs ${
                  type === val ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                {val === 'EXPENSE' ? 'Expenses' : val === 'INCOME' ? 'Income' : 'All Types'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Category Chips */}
        <Text className="mb-2 font-bold text-xs uppercase text-muted-foreground">Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3 -mx-4 px-4 py-0.5"
          contentContainerClassName="gap-2 items-center pe-6">
          <Pressable
            onPress={() => setCategoryId(undefined)}
            className={`rounded-full border px-3.5 py-1.5 ${
              !categoryId ? 'border-primary bg-primary shadow-xs' : 'border-border/60 bg-card'
            }`}>
            <Text
              className={`font-bold text-xs ${
                !categoryId ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}>
              All Categories
            </Text>
          </Pressable>
          {categories
            .filter((c) => !type || c.type === type)
            .map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={`rounded-full border px-3.5 py-1.5 ${
                  categoryId === c.id
                    ? 'border-primary bg-primary shadow-xs'
                    : 'border-border/60 bg-card'
                }`}>
                <Text
                  className={`font-bold text-xs ${
                    categoryId === c.id ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
        </ScrollView>

        <View className="mb-4 flex-row gap-2">
          <TextInput
            placeholder="From YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
            containerClassName="flex-1"
          />
          <TextInput
            placeholder="To YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            containerClassName="flex-1"
          />
        </View>

        {shown.map((item) => (
          <TransactionRow
            key={item._id}
            item={item}
            onPress={() =>
              router.push(`/(resident)/expense-manager/transactions/${item._id}` as any)
            }
          />
        ))}

        {!loading && !shown.length && (
          <EmptyState
            title="No transactions found"
            description="Try selecting a different filter or date range."
            className="py-12"
          />
        )}

        {loading ? (
          <ActivityIndicator className="my-4" color="#C2410C" />
        ) : page <= totalPages ? (
          <Button variant="outline" onPress={() => load()} className="my-4">
            Load More Records
          </Button>
        ) : null}
      </ScrollView>
    </ScreenShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Transaction Details Screen
// ─────────────────────────────────────────────────────────────────────────────
export function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<PersonalExpenseTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    service
      .transaction(id)
      .then(setItem)
      .catch((e) => setError(e?.message || 'Unable to load transaction.'));

  useEffect(() => {
    void load();
  }, [id]);

  const remove = () =>
    Alert.alert('Delete transaction?', 'This will permanently remove it from your records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await service.deleteTransaction(id);
            router.back();
          } catch (e: any) {
            setError(e?.message || 'Unable to delete transaction.');
          }
        },
      },
    ]);

  return (
    <ScreenShell title="Transaction Details" showBackButton>
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 80 }}>
        {error && <ErrorBanner message={error} onRetry={load} className="mb-3" />}

        {item ? (
          <>
            <Card className="mb-4 p-5">
              <View className="mb-3 flex-row items-center justify-between">
                <StatusBadge
                  label={item.type}
                  variant={item.type === 'INCOME' ? 'success' : 'danger'}
                />
                <Text className="text-xs text-muted-foreground">{item.transactionDate}</Text>
              </View>

              <Text className="mb-1 text-3xl font-black text-foreground">
                {formatINR(item.amountMinor)}
              </Text>
              <Text className="mb-4 font-bold text-sm text-muted-foreground">
                {item.categoryName}
              </Text>

              <View className="mb-3 h-px bg-border/70" />

              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">Payment Method</Text>
                  <Text className="font-bold text-xs text-foreground">
                    {item.paymentMethod.replace('_', ' ')}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-xs text-muted-foreground">Settlement</Text>
                  <Text className="font-bold text-xs text-foreground">
                    {item.paymentSettlement || 'PAID'}
                  </Text>
                </View>

                {item.merchantOrSource ? (
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted-foreground">Merchant / Payee</Text>
                    <Text className="font-bold text-xs text-foreground">
                      {item.merchantOrSource}
                    </Text>
                  </View>
                ) : null}

                {item.notes ? (
                  <View className="mt-2 border-t border-border/60 pt-2">
                    <Text className="mb-1 text-xs text-muted-foreground">Notes</Text>
                    <Text className="text-sm text-foreground">{item.notes}</Text>
                  </View>
                ) : null}
              </View>
            </Card>

            <Button
              variant="default"
              onPress={() => router.setParams({ edit: '1' })}
              className="mb-2.5">
              Edit Transaction
            </Button>

            <Button variant="destructive" onPress={remove}>
              Delete Record
            </Button>
          </>
        ) : (
          <ActivityIndicator className="mt-12" color="#C2410C" />
        )}
      </ScrollView>
    </ScreenShell>
  );
}

export function TransactionEditScreen({ onDone }: { onDone?: () => void } = {}) {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [type, setType] = useState<TransactionType>('EXPENSE');

  useEffect(() => {
    service.transaction(id).then((x) => setType(x.type));
  }, [id]);

  const handleDone = () => {
    if (onDone) {
      onDone();
    } else {
      router.setParams({ edit: '' });
    }
  };

  return <TransactionForm type={type} id={id} onDone={handleDone} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Categories Screen
// ─────────────────────────────────────────────────────────────────────────────
export function CategoriesScreen() {
  const [items, setItems] = useState<PersonalExpenseCategory[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    service
      .categories()
      .then(setItems)
      .catch((e) => setError(e?.message || 'Unable to load categories.'));

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const add = async () => {
    if (!name.trim()) return;
    try {
      await service.createCategory(name.trim(), type);
      setName('');
      load();
    } catch (e: any) {
      setError(e?.message || 'Unable to create category.');
    }
  };

  return (
    <ScreenShell title="Categories" subtitle="Manage expense and income tags" showBackButton>
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 80 }}>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-3" />}

        <Card className="mb-4 p-4">
          <Text className="mb-2 font-extrabold text-sm text-foreground">New Category</Text>
          <TextInput
            placeholder="e.g. Groceries, Gym, Streaming"
            value={name}
            onChangeText={setName}
            containerClassName="mb-3"
          />

          <View className="mb-3 flex-row gap-2">
            {(['EXPENSE', 'INCOME'] as TransactionType[]).map((x) => (
              <Pressable
                key={x}
                onPress={() => setType(x)}
                className={`flex-1 items-center rounded-xl border p-2.5 ${
                  type === x ? 'border-primary bg-primary' : 'border-border/60 bg-muted'
                }`}>
                <Text
                  className={`font-bold text-xs ${
                    type === x ? 'text-primary-foreground' : 'text-foreground'
                  }`}>
                  {x === 'EXPENSE' ? 'Expense' : 'Income'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button variant="default" size="sm" onPress={add}>
            Add Custom Category
          </Button>
        </Card>

        <Text className="mb-2 px-1 font-bold text-xs uppercase text-muted-foreground">
          Registered Categories ({items.length})
        </Text>

        {items.map((item) => (
          <Card key={item.id} className="mb-2 p-3.5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-bold text-sm text-foreground">{item.name}</Text>
                <Text className="text-xs text-muted-foreground">{item.type}</Text>
              </View>

              {!item.isDefault ? (
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'Delete category?',
                      'Existing transactions will keep this category name.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await service.deleteCategory(item.id);
                              load();
                            } catch (e: any) {
                              setError(e?.message || 'Unable to delete category.');
                            }
                          },
                        },
                      ]
                    )
                  }
                  className="p-1.5">
                  <Trash2 size={16} className="text-destructive" />
                </Pressable>
              ) : (
                <StatusBadge label="Default" variant="neutral" size="sm" />
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </ScreenShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Budgets Screen
// ─────────────────────────────────────────────────────────────────────────────
export function BudgetsScreen() {
  const [period, setPeriod] = useState(localPeriod());
  const [categories, setCategories] = useState<PersonalExpenseCategory[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, b, d] = await Promise.all([
        service.categories(),
        service.budgets(period),
        service.dashboard(period),
      ]);
      setCategories(c.filter((x) => x.type === 'EXPENSE'));
      setBudgets(b);
      setDashboard(d);
    } catch (e: any) {
      setError(e?.message || 'Unable to load budgets.');
    }
  };

  useEffect(() => {
    void load();
  }, [period]);

  const save = async () => {
    if (!amount.trim()) return;
    try {
      await service.saveBudget({ period, categoryId, amount: rupeesToNumber(amount) });
      setAmount('');
      setCategoryId(null);
      load();
    } catch (e: any) {
      setError(e?.message || 'Unable to save budget.');
    }
  };

  return (
    <ScreenShell title="Monthly Budgets" subtitle="Target limits per category" showBackButton>
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <MonthSelector period={period} setPeriod={setPeriod} />

        {error && <ErrorBanner message={error} onRetry={load} className="mb-3" />}

        <Card className="mb-4 p-4">
          <Text className="mb-2 font-extrabold text-sm text-foreground">Set Budget Target</Text>

          <TextInput
            label="Target Amount (INR)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            containerClassName="mb-3"
          />

          <Text className="mb-2 font-bold text-xs uppercase text-muted-foreground">Scope</Text>
          <View className="mb-3 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setCategoryId(null)}
              className={`rounded-full border px-3 py-1.5 ${
                !categoryId ? 'border-primary bg-primary' : 'border-border/60 bg-secondary'
              }`}>
              <Text
                className={`font-bold text-xs ${
                  !categoryId ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                Overall Total
              </Text>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                className={`rounded-full border px-3 py-1.5 ${
                  categoryId === c.id
                    ? 'border-primary bg-primary'
                    : 'border-border/60 bg-secondary'
                }`}>
                <Text
                  className={`font-bold text-xs ${
                    categoryId === c.id ? 'text-primary-foreground' : 'text-foreground'
                  }`}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button variant="default" size="sm" onPress={save}>
            Save Target
          </Button>
        </Card>

        <Text className="mb-2 px-1 font-bold text-xs uppercase text-muted-foreground">
          Active Targets ({budgets.length})
        </Text>

        {budgets.map((b) => {
          const spent = b.categoryId
            ? dashboard?.categoryBreakdown.find((entry) => entry._id.categoryId === b.categoryId)
                ?.amountMinor || 0
            : dashboard?.expenseMinor || 0;
          const pct = Math.min(100, Math.round((spent / b.amountMinor) * 100));

          return (
            <Card key={b._id} className="mb-3 p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pe-2">
                  <Text className="font-extrabold text-sm text-foreground">
                    {b.categoryId || 'Overall Community Budget'}
                  </Text>
                  <Text className="mt-0.5 text-lg font-black text-foreground">
                    {formatINR(b.amountMinor)}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    {formatINR(spent)} spent • {formatINR(Math.max(0, b.amountMinor - spent))} left
                    ({pct}%)
                  </Text>
                </View>

                <Pressable
                  onPress={async () => {
                    try {
                      await service.deleteBudget(period, b.categoryId);
                      load();
                    } catch (e: any) {
                      setError(e?.message || 'Unable to delete budget.');
                    }
                  }}
                  className="p-1.5">
                  <Trash2 size={16} className="text-destructive" />
                </Pressable>
              </View>

              <View className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <View
                  className={`h-full rounded-full ${
                    pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </View>
            </Card>
          );
        })}

        {!budgets.length && (
          <EmptyState
            title="No budgets configured"
            description="Set a target above to monitor monthly limits."
            className="py-8"
          />
        )}
      </ScrollView>
    </ScreenShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Monthly Reports Screen
// ─────────────────────────────────────────────────────────────────────────────
export function ReportsScreen() {
  const [period, setPeriod] = useState(localPeriod());
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    service
      .dashboard(period)
      .then(setData)
      .catch((e) => setError(e?.message || 'Unable to load report.'));

  useEffect(() => {
    void load();
  }, [period]);

  return (
    <ScreenShell title="Monthly Report" subtitle="Financial synthesis & totals" showBackButton>
      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <MonthSelector period={period} setPeriod={setPeriod} />

        {error && <ErrorBanner message={error} onRetry={load} className="mb-3" />}

        {data ? (
          <>
            <Card className="mb-4 p-5">
              <Text className="mb-2 font-bold text-xs uppercase text-muted-foreground">
                Monthly Net Cashflow
              </Text>
              <Text className="mb-4 text-3xl font-black text-foreground">
                {formatINR(data.balanceMinor)}
              </Text>

              <View className="flex-row border-t border-border/70 pt-3">
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground">Total Income</Text>
                  <Text className="mt-0.5 font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatINR(data.incomeMinor)}
                  </Text>
                </View>
                <View className="flex-1 border-s border-border/70 ps-3">
                  <Text className="text-xs text-muted-foreground">Total Expenses</Text>
                  <Text className="mt-0.5 font-extrabold text-sm text-rose-600 dark:text-rose-400">
                    {formatINR(data.expenseMinor)}
                  </Text>
                </View>
              </View>
            </Card>

            <Card className="mb-4 p-4">
              <Text className="mb-3 font-extrabold text-sm text-foreground">
                Expense by Category
              </Text>
              {data.categoryBreakdown.length ? (
                data.categoryBreakdown.map((x) => (
                  <View
                    key={x._id.categoryId}
                    className="flex-row items-center justify-between border-b border-border/40 py-2">
                    <Text className="font-bold text-xs text-foreground">{x._id.categoryName}</Text>
                    <Text className="font-extrabold text-xs text-foreground">
                      {formatINR(x.amountMinor)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-muted-foreground">No expenses this month.</Text>
              )}
            </Card>

            <Card className="mb-4 p-4">
              <Text className="mb-3 font-extrabold text-sm text-foreground">
                Budget Utilization
              </Text>
              {data.budgets.length ? (
                data.budgets.map((b) => {
                  const spent = b.categoryId
                    ? data.categoryBreakdown.find((x) => x._id.categoryId === b.categoryId)
                        ?.amountMinor || 0
                    : data.expenseMinor;
                  const pct = Math.round((spent / b.amountMinor) * 100);

                  return (
                    <View
                      key={b._id}
                      className="flex-row items-center justify-between border-b border-border/40 py-2">
                      <Text className="font-bold text-xs text-foreground">
                        {b.categoryId || 'Overall Community'}
                      </Text>
                      <Text className="font-extrabold text-xs text-foreground">{pct}% Used</Text>
                    </View>
                  );
                })
              ) : (
                <Text className="text-xs text-muted-foreground">
                  No budgets set for this month.
                </Text>
              )}
            </Card>
          </>
        ) : (
          <ActivityIndicator className="mt-12" color="#C2410C" />
        )}
      </ScrollView>
    </ScreenShell>
  );
}
