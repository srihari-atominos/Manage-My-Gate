import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Receipt,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  CreditCard,
  Building,
  User,
  Calendar,
  Layers,
  Tag,
  ShieldCheck,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import { MarkExpensePaidSheet } from '../components/MarkExpensePaidSheet';
import expenseService from '../services/expenseService';
import { createOperationId } from '@/src/utils/idempotency';
import {
  UPI_APPS,
  buildUpiUri,
  launchUpi,
  parseUpiReturnResponse,
} from '../services/upiService';

const methods = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Cheque', value: 'CHEQUE' },
  { label: 'Card', value: 'CARD' },
  { label: 'Other', value: 'OTHER' },
];

const apps = [
  { label: 'Google Pay', value: 'GOOGLE_PAY' },
  { label: 'PhonePe', value: 'PHONEPE' },
  { label: 'BHIM', value: 'BHIM' },
  { label: 'Other UPI app', value: 'OTHER_UPI_APP' },
  { label: 'Not specified', value: 'NOT_SPECIFIED' },
];

const funds = [
  { label: 'Community bank account', value: 'COMMUNITY_BANK_ACCOUNT' },
  { label: 'Petty cash', value: 'PETTY_CASH' },
  { label: 'Personal account', value: 'PERSONAL_ACCOUNT' },
  { label: 'Other', value: 'OTHER' },
];

const formatCurrency = (value: number | string | null | undefined) =>
  String.fromCharCode(0x20b9) + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ExpenseDetailsScreen() {
  const router = useRouter();
  const { id, openPayOnline } = useLocalSearchParams<{
    id: string;
    openPayOnline?: string;
  }>();

  const [expense, setExpense] = useState<any>(null);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showMarkPaidSheet, setShowMarkPaidSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState<string | null>(null);

  // Reconciliation state for ConfirmationModal
  const [reconcileTargetId, setReconcileTargetId] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  // Online UPI attempt states
  const [onlineApp, setOnlineApp] = useState<any>(UPI_APPS[0]);
  const [attempt, setAttempt] = useState<any>(null);
  const [outcomeRef, setOutcomeRef] = useState('');
  const [returnedResponse, setReturnedResponse] = useState<any>(null);
  const [suggestedOutcome, setSuggestedOutcome] = useState<string | null>(null);
  const [outcomeSaving, setOutcomeSaving] = useState(false);
  const [showOnline, setShowOnline] = useState(false);

  const [payment, setPayment] = useState<any>({
    amount: '',
    paymentMethod: 'UPI',
    paymentApplication: 'NOT_SPECIFIED',
    fundingSource: 'COMMUNITY_BANK_ACCOUNT',
    paymentDate: new Date(),
    transactionReference: '',
  });

  const load = useCallback(() => {
    if (id) {
      expenseService
        .get(id)
        .then(setExpense)
        .catch((e: any) => setError(e?.message || 'Unable to load expense'));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (expense && openPayOnline === '1' && Number(expense.outstandingAmount) > 0) {
      setShowOnline(true);
    }
  }, [expense, openPayOnline]);

  useEffect(() => {
    if (!attempt) return;
    const handleReturn = ({ url }: { url: string }) => {
      const response = parseUpiReturnResponse(url);
      if (!response) return;
      setReturnedResponse(response);
      setOutcomeRef(
        response.referenceId ||
          response.approvalRefNo ||
          response.transactionId ||
          ''
      );
      setSuggestedOutcome(
        response.status === 'SUCCESS'
          ? 'COMPLETED'
          : response.status === 'FAILED' || response.status === 'CANCELLED'
          ? 'NOT_COMPLETED'
          : 'UNKNOWN'
      );
    };
    const subscription = Linking.addEventListener('url', handleReturn);
    return () => subscription.remove();
  }, [attempt]);

  const set = (key: string, value: any) =>
    setPayment((current: any) => ({ ...current, [key]: value }));

  const savePayment = async () => {
    try {
      setSaving(true);
      const amount = Number(payment.amount);
      if (
        !amount ||
        amount <= 0 ||
        amount > Number(expense.outstandingAmount)
      ) {
        throw new Error(
          'Payment amount must be positive and no greater than the outstanding balance.'
        );
      }
      await expenseService.recordPayment(String(id), {
        idempotencyKey: createOperationId(),
        amount,
        paymentMethod: payment.paymentMethod,
        paymentApplication:
          payment.paymentMethod === 'UPI'
            ? payment.paymentApplication
            : 'NOT_SPECIFIED',
        fundingSource: payment.fundingSource,
        paymentDate: payment.paymentDate.toISOString(),
        transactionReference: payment.transactionReference || undefined,
      });
      setShowPayment(false);
      set('amount', '');
      load();
    } catch (e: any) {
      Alert.alert(
        'Cannot record payment',
        e?.message || 'Please check the payment.'
      );
    } finally {
      setSaving(false);
    }
  };

  const payOnline = async () => {
    let createdAttempt: any = null;
    try {
      if (!expense.vendor?.upiId) {
        throw new Error(
          'This expense has no vendor UPI ID. Add the vendor payment address before paying online.'
        );
      }
      setSaving(true);
      const amount = Number(payment.amount || expense.outstandingAmount);
      const operationKey = createOperationId();
      const uri = buildUpiUri({
        vpa: expense.vendor?.upiId || '',
        name: expense.vendor?.name || 'Community vendor',
        amount,
        reference: 'NAHOM-' + operationKey,
        note: expense.name,
      });
      // Release any prior abandoned attempt on this expense before creating a new one
      const existingPending = expense.payments?.find(
        (p: any) =>
          p.recordType === 'ATTEMPT' &&
          ['CREATED', 'LAUNCHED'].includes(p.attemptStatus)
      );
      if (existingPending?._id) {
        try {
          await expenseService.updatePaymentAttemptOutcome(
            String(id),
            existingPending._id,
            { outcome: 'NOT_COMPLETED' }
          );
        } catch {}
      }

      try {
        createdAttempt = await expenseService.createPaymentAttempt(String(id), {
          idempotencyKey: operationKey,
          amount,
          paymentApplication: onlineApp.value,
          paymentMethod: 'UPI',
          fundingSource: payment.fundingSource,
        });
      } catch (attemptErr: any) {
        if (
          attemptErr?.message?.includes('reserved') ||
          attemptErr?.status === 409
        ) {
          const fresh: any = await expenseService.get(String(id));
          const stale = fresh.payments?.find(
            (p: any) =>
              p.recordType === 'ATTEMPT' &&
              ['CREATED', 'LAUNCHED'].includes(p.attemptStatus)
          );
          if (stale?._id) {
            await expenseService.updatePaymentAttemptOutcome(
              String(id),
              stale._id,
              { outcome: 'NOT_COMPLETED' }
            );
            createdAttempt = await expenseService.createPaymentAttempt(
              String(id),
              {
                idempotencyKey: createOperationId(),
                amount,
                paymentApplication: onlineApp.value,
                paymentMethod: 'UPI',
                fundingSource: payment.fundingSource,
              }
            );
          } else {
            throw attemptErr;
          }
        } else {
          throw attemptErr;
        }
      }
      setAttempt(createdAttempt);
      const nativeResult = await launchUpi(
        uri,
        onlineApp.scheme,
        String(createdAttempt._id),
        onlineApp.packageName
      );
      if (
        nativeResult?.raw &&
        (!nativeResult.attemptId ||
          nativeResult.attemptId === String(createdAttempt._id))
      ) {
        const response = parseUpiReturnResponse(nativeResult.raw);
        if (response) {
          setReturnedResponse(response);
          setOutcomeRef(
            response.referenceId ||
              response.approvalRefNo ||
              response.transactionId ||
              ''
          );
          setSuggestedOutcome(
            response.status === 'SUCCESS'
              ? 'COMPLETED'
              : response.status === 'FAILED' || response.status === 'CANCELLED'
              ? 'NOT_COMPLETED'
              : 'UNKNOWN'
          );
        }
      }
      setShowOnline(false);
    } catch (e: any) {
      if (createdAttempt?._id) {
        try {
          await expenseService.updatePaymentAttemptOutcome(
            String(id),
            createdAttempt._id,
            { outcome: 'NOT_COMPLETED' }
          );
          setAttempt(null);
        } catch {}
      }
      Alert.alert(
        'Unable to start payment',
        e?.message || 'Check the vendor UPI ID and selected app.'
      );
    } finally {
      setSaving(false);
    }
  };

  const saveOutcome = async (outcome: string) => {
    if (!attempt || outcomeSaving) return;
    try {
      setOutcomeSaving(true);
      if (outcome === 'COMPLETED') {
        await expenseService.recordPayment(String(id), {
          idempotencyKey: createOperationId(),
          amount: Number(attempt.amount),
          paymentMethod: 'UPI',
          paymentApplication: onlineApp?.value || 'OTHER_UPI_APP',
          fundingSource: payment.fundingSource || 'COMMUNITY_BANK_ACCOUNT',
          paymentDate: new Date().toISOString(),
          transactionReference: outcomeRef.trim() || undefined,
        });
      }
      await expenseService.updatePaymentAttemptOutcome(
        String(id),
        attempt._id,
        {
          outcome,
          transactionReference: outcomeRef.trim() || undefined,
          amount: Number(attempt.amount),
          response: returnedResponse || undefined,
        }
      );
      setAttempt(null);
      setOutcomeRef('');
      setReturnedResponse(null);
      setSuggestedOutcome(null);
      load();
    } catch (e: any) {
      Alert.alert('Could not save outcome', e?.message || 'Try again.');
    } finally {
      setOutcomeSaving(false);
    }
  };

  const executeReconcile = async () => {
    if (!reconcileTargetId) return;
    try {
      setReconciling(true);
      await expenseService.reconcilePayment(String(id), reconcileTargetId, {
        reconciliationResult: 'CONFIRMED',
        note: 'Confirmed by authorized financial reviewer.',
      });
      setReconcileTargetId(null);
      load();
    } catch (e: any) {
      Alert.alert(
        'Cannot reconcile payment',
        e?.message || 'The payment could not be reconciled.'
      );
    } finally {
      setReconciling(false);
    }
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      setAttachmentLoading(attachment._id);
      await expenseService.downloadAttachment(String(id), attachment);
    } catch (e: any) {
      Alert.alert(
        'Cannot open attachment',
        e?.message || 'The document could not be opened.'
      );
    } finally {
      setAttachmentLoading(null);
    }
  };

  const statusVariant =
    expense?.settlementStatus === 'PAID'
      ? 'success'
      : expense?.settlementStatus === 'PARTIALLY_PAID'
      ? 'warning'
      : 'danger';

  return (
    <ScreenShell
      title="Expense Details"
      subtitle="Community expense breakdown, attachments, and reconciliation."
      iconName="Receipt"
      loading={!expense && !error}
      showBackButton
    >
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {expense ? (
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-3.5 pb-24 pt-2"
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1: Header / Identity */}
          <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <Receipt size={16} className="text-primary" />
                <Text className="text-xs font-bold text-primary font-mono">
                  {expense.expenseNumber}
                </Text>
              </View>
              <StatusBadge
                label={String(expense.settlementStatus || 'UNPAID').replace(/_/g, ' ')}
                variant={statusVariant}
                size="sm"
              />
            </View>

            <Text className="text-lg font-extrabold text-foreground">
              {expense.name}
            </Text>

            {expense.description ? (
              <Text className="text-xs text-muted-foreground">
                {expense.description}
              </Text>
            ) : null}

            <View className="flex-row flex-wrap items-center gap-2 pt-1 border-t border-border/60">
              <View className="flex-row items-center gap-1 rounded-md bg-muted/60 px-2 py-1">
                <Tag size={11} className="text-muted-foreground" />
                <Text className="text-[11px] font-semibold text-muted-foreground">
                  {expense.category || 'General'}
                </Text>
              </View>

              <View className="flex-row items-center gap-1 rounded-md bg-muted/60 px-2 py-1">
                <Layers size={11} className="text-muted-foreground" />
                <Text className="text-[11px] font-semibold text-muted-foreground capitalize">
                  {String(expense.expenseType || '').replace(/_/g, ' ').toLowerCase()}
                </Text>
              </View>

              {expense.expenseDate ? (
                <View className="flex-row items-center gap-1 rounded-md bg-muted/60 px-2 py-1">
                  <Calendar size={11} className="text-muted-foreground" />
                  <Text className="text-[11px] font-semibold text-muted-foreground">
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>

            {expense.vendor?.name || expense.vendor?.upiId ? (
              <View className="rounded-xl border border-border/70 bg-muted/20 p-2.5 gap-1 mt-1">
                <View className="flex-row items-center gap-1.5">
                  <Building size={13} className="text-muted-foreground" />
                  <Text className="text-xs font-bold text-foreground">
                    Vendor: {expense.vendor?.name || 'Not specified'}
                  </Text>
                </View>
                {expense.vendor?.upiId ? (
                  <Text className="text-xs text-primary font-mono ps-4">
                    UPI: {expense.vendor.upiId}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Card 2: Financial Summary */}
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Financial Overview
            </Text>

            <View className="flex-row items-baseline justify-between">
              <Text className="text-sm font-medium text-muted-foreground">
                Total Amount:
              </Text>
              <Text className="text-2xl font-black text-foreground">
                {formatCurrency(expense.totalAmount)}
              </Text>
            </View>

            {(expense.cgst > 0 || expense.sgst > 0 || (expense.taxAmount > 0)) && (
              <View className="rounded-xl border border-border/70 bg-muted/20 p-2.5 gap-1.5">
                <Text className="text-[11px] font-bold text-muted-foreground uppercase">
                  Tax Breakdown
                </Text>
                {expense.subtotal != null && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Net Subtotal</Text>
                    <Text className="text-xs font-semibold text-foreground">{formatCurrency(expense.subtotal)}</Text>
                  </View>
                )}
                {expense.cgst > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">CGST</Text>
                    <Text className="text-xs font-semibold text-foreground">{formatCurrency(expense.cgst)}</Text>
                  </View>
                )}
                {expense.sgst > 0 && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">SGST</Text>
                    <Text className="text-xs font-semibold text-foreground">{formatCurrency(expense.sgst)}</Text>
                  </View>
                )}
                {expense.taxAmount > 0 && !(expense.cgst > 0 && expense.sgst > 0) && (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Tax Amount</Text>
                    <Text className="text-xs font-semibold text-foreground">{formatCurrency(expense.taxAmount)}</Text>
                  </View>
                )}
              </View>
            )}

            <View className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
              <View className="rounded-xl bg-muted/30 p-2.5">
                <Text className="text-[11px] text-muted-foreground font-medium">
                  Recorded Paid
                </Text>
                <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(expense.recordedPaidAmount)}
                </Text>
              </View>

              <View className="rounded-xl bg-muted/30 p-2.5">
                <Text className="text-[11px] text-muted-foreground font-medium">
                  Confirmed Reconciled
                </Text>
                <Text className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {formatCurrency(expense.confirmedPaidAmount)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between rounded-xl bg-muted/40 p-3">
              <Text className="text-xs font-bold text-foreground">
                Outstanding Balance
              </Text>
              <Text
                className={`text-base font-black ${
                  Number(expense.outstandingAmount) > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCurrency(expense.outstandingAmount)}
              </Text>
            </View>

            {/* Quick CTAs if balance remains */}
            {Number(expense.outstandingAmount) > 0 ? (
              <View className="flex-row gap-2 pt-1">
                {expense.vendor?.upiId ? (
                  <Button
                    onPress={() => setShowOnline(true)}
                    className="flex-1"
                  >
                    <Text className="text-white font-bold text-sm">Pay Online</Text>
                  </Button>
                ) : null}
                <Button
                  onPress={() => setShowMarkPaidSheet(true)}
                  leftIcon={CheckCircle2}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs"
                >
                  <Text className="text-white font-bold text-sm">Mark as Paid</Text>
                </Button>
              </View>
            ) : null}
          </View>

          {/* Card 3: Items / Itemized Purchases */}
          <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground">
                Purchased Items ({expense.items?.length || 0})
              </Text>
            </View>

            {expense.items?.length ? (
              <View className="gap-2">
                {expense.items.map((item: any, i: number) => (
                  <View
                    key={item._id || i}
                    className="flex-row items-center justify-between rounded-xl bg-muted/20 border border-border/60 p-2.5"
                  >
                    <View className="flex-1 pe-2">
                      <Text className="text-xs font-bold text-foreground">
                        {item.itemName}
                      </Text>
                      <Text className="text-[11px] text-muted-foreground">
                        {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                      </Text>
                    </View>
                    <Text className="text-xs font-extrabold text-foreground">
                      {formatCurrency(item.lineTotal)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="rounded-xl border border-dashed border-border py-3 items-center">
                <Text className="text-xs text-muted-foreground">
                  Non-itemized expense (Recorded as single amount).
                </Text>
              </View>
            )}
          </View>

          {/* Card 4: Attachments */}
          <View className="gap-2.5 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-2">
              <FileText size={16} className="text-primary" />
              <Text className="text-sm font-bold text-foreground">
                Receipts & Invoices ({expense.attachments?.length || 0})
              </Text>
            </View>

            {expense.attachments?.length ? (
              <View className="gap-2">
                {expense.attachments.map((attachment: any) => (
                  <View
                    key={attachment._id}
                    className="flex-row items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3"
                  >
                    <View className="flex-row items-center gap-2.5 flex-1 min-w-0 pe-2">
                      <View className="size-9 rounded-lg bg-primary/10 items-center justify-center shrink-0">
                        <FileText size={18} className="text-primary" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text
                          className="text-xs font-bold text-foreground"
                          numberOfLines={1}
                        >
                          {attachment.filename || 'Receipt or Invoice'}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground uppercase">
                          {attachment.mimeType?.split('/')[1] || 'Document'}
                        </Text>
                      </View>
                    </View>

                    <Button
                      size="sm"
                      variant="outline"
                      loading={attachmentLoading === attachment._id}
                      onPress={() => downloadAttachment(attachment)}
                      leftIcon={ExternalLink}
                    >
                      <Text className="text-xs font-bold">Open</Text>
                    </Button>
                  </View>
                ))}
              </View>
            ) : (
              <View className="rounded-xl border border-dashed border-border py-3 items-center">
                <Text className="text-xs text-muted-foreground">
                  No receipts or invoices attached.
                </Text>
              </View>
            )}
          </View>

          {/* Card 5: Payment History & Reconciliation */}
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <View className="flex-row items-center gap-2">
              <CreditCard size={16} className="text-primary" />
              <Text className="text-sm font-bold text-foreground">
                Payment History ({expense.payments?.length || 0})
              </Text>
            </View>

            {expense.payments?.length ? (
              <View className="gap-2.5">
                {expense.payments.map((p: any) => {
                  const isReconciled = p.verificationStatus === 'RECONCILED';
                  return (
                    <View
                      key={p._id}
                      className="gap-2 rounded-xl border border-border/80 bg-muted/20 p-3"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pe-2">
                          <Text className="text-sm font-extrabold text-foreground">
                            {formatCurrency(p.amount)}
                          </Text>
                          <Text className="text-xs font-medium text-muted-foreground mt-0.5">
                            {p.paymentMethod}
                            {p.paymentApplication && p.paymentApplication !== 'NOT_SPECIFIED'
                              ? ` · ${p.paymentApplication}`
                              : ''}
                            {p.fundingSource
                              ? ` · ${String(p.fundingSource).replace(/_/g, ' ')}`
                              : ''}
                          </Text>
                        </View>

                        <StatusBadge
                          label={isReconciled ? 'Reconciled' : 'Recorded'}
                          variant={isReconciled ? 'success' : 'info'}
                          size="sm"
                        />
                      </View>

                      {p.transactionReference ? (
                        <Text className="text-[11px] font-mono text-muted-foreground">
                          Ref: {p.transactionReference}
                        </Text>
                      ) : null}

                      <View className="flex-row items-center justify-between border-t border-border/60 pt-2 mt-0.5">
                        <Text className="text-[11px] text-muted-foreground">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </Text>

                        {!isReconciled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onPress={() => setReconcileTargetId(p._id)}
                            leftIcon={CheckCircle2}
                            className="bg-primary/5 border-primary/30"
                          >
                            <Text className="text-xs font-bold text-primary">
                              Reconcile Payment
                            </Text>
                          </Button>
                        ) : (
                          <View className="flex-row items-center gap-1">
                            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
                            <Text className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Verified {p.reconciledAt ? new Date(p.reconciledAt).toLocaleDateString() : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="rounded-xl border border-dashed border-border py-3 items-center">
                <Text className="text-xs text-muted-foreground">
                  No payment records found.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}

      {/* Confirmation Modal for Reconciliation */}
      <ConfirmationModal
        visible={Boolean(reconcileTargetId)}
        title="Reconcile Payment"
        message="Confirm that this payment has been verified against an authoritative bank statement, cash ledger, or UPI transaction record."
        confirmLabel="Confirm & Reconcile"
        cancelLabel="Cancel"
        variant="info"
        loading={reconciling}
        onConfirm={executeReconcile}
        onCancel={() => setReconcileTargetId(null)}
      />

      {/* Modal: Record Manual Payment */}
      <Modal
        visible={showPayment}
        animationType="slide"
        onRequestClose={() => setShowPayment(false)}
      >
        <ScreenShell
          title="Record Payment"
          subtitle={`Outstanding balance: ${formatCurrency(expense?.outstandingAmount)}`}
          iconName="CreditCard"
          showBackButton
          onBackPress={() => setShowPayment(false)}
        >
          <ScrollView
            className="flex-1 px-4"
            contentContainerClassName="gap-3.5 pb-20 pt-2"
          >
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <TextInput
                label="Payment Amount (₹)"
                required
                value={payment.amount}
                placeholder={expense?.outstandingAmount ? String(expense.outstandingAmount) : '0.00'}
                keyboardType="decimal-pad"
                onChangeText={(v) => set('amount', v)}
              />

              <DropdownSelect
                label="Payment Method"
                required
                options={methods}
                value={payment.paymentMethod}
                onValueChange={(v) => set('paymentMethod', v)}
              />

              {payment.paymentMethod === 'UPI' ? (
                <DropdownSelect
                  label="UPI Application"
                  options={apps}
                  value={payment.paymentApplication}
                  onValueChange={(v) => set('paymentApplication', v)}
                />
              ) : null}

              <DropdownSelect
                label="Funding Source"
                required
                options={funds}
                value={payment.fundingSource}
                onValueChange={(v) => set('fundingSource', v)}
              />

              <DatePicker
                label="Payment Date"
                value={payment.paymentDate}
                onChange={(v) => set('paymentDate', v)}
              />

              <TextInput
                label="Transaction Reference / UTR"
                value={payment.transactionReference}
                placeholder="e.g. UTR-429512345678"
                onChangeText={(v) => set('transactionReference', v)}
              />

              <View className="pt-2 gap-2">
                <Button loading={saving} onPress={savePayment} className="w-full">
                  <Text className="text-white font-bold text-base">Save Payment</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setShowPayment(false)}
                  className="w-full"
                >
                  <Text className="font-semibold text-sm">Cancel</Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </ScreenShell>
      </Modal>

      {/* Modal: Pay Online via UPI */}
      <Modal
        visible={showOnline}
        animationType="slide"
        onRequestClose={() => setShowOnline(false)}
      >
        <ScreenShell
          title="Online UPI Payment"
          subtitle="Pay vendor directly from mobile UPI app"
          iconName="CreditCard"
          showBackButton
          onBackPress={() => setShowOnline(false)}
        >
          <ScrollView
            className="flex-1 px-4"
            contentContainerClassName="gap-3.5 pb-20 pt-2"
          >
            <View className="gap-3 rounded-2xl border border-border bg-card p-4">
              <View className="rounded-xl bg-muted/40 p-3 gap-1">
                <Text className="text-xs font-bold text-foreground">
                  Vendor: {expense?.vendor?.name || 'Not specified'}
                </Text>
                <Text className="text-xs font-mono text-primary">
                  UPI ID: {expense?.vendor?.upiId || 'Missing'}
                </Text>
                <Text className="text-xs font-semibold text-foreground mt-1">
                  Amount: {formatCurrency(payment.amount || expense?.outstandingAmount)}
                </Text>
              </View>

              <Text className="text-xs font-bold text-foreground mt-1">
                Choose UPI Payment App
              </Text>
              <View className="gap-2">
                {UPI_APPS.map((app: any) => {
                  const isSelected = onlineApp.value === app.value;
                  return (
                    <Pressable
                      key={app.value}
                      onPress={() => setOnlineApp(app)}
                      className={`rounded-xl border p-3 flex-row items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card'
                      }`}
                    >
                      <View>
                        <Text className="font-bold text-foreground text-sm">
                          {app.label}
                        </Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          Tap to pay with this app
                        </Text>
                      </View>
                      {isSelected ? (
                        <CheckCircle2 size={18} className="text-primary" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                label="Payment Amount (₹)"
                value={payment.amount}
                placeholder={expense?.outstandingAmount ? String(expense.outstandingAmount) : '0.00'}
                keyboardType="decimal-pad"
                onChangeText={(v) => set('amount', v)}
              />

              <View className="pt-2 gap-2">
                <Button loading={saving} onPress={payOnline} className="w-full">
                  <Text className="text-white font-bold text-base">
                    Continue to {onlineApp.label}
                  </Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setShowOnline(false)}
                  className="w-full"
                >
                  <Text className="font-semibold text-sm">Cancel</Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </ScreenShell>
      </Modal>

      {/* Modal: Outcome Feedback */}
      <Modal visible={Boolean(attempt)} transparent animationType="fade">
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-background p-5 rounded-t-3xl gap-3.5 border-t border-border">
            <Text className="text-lg font-extrabold text-foreground">
              Verify UPI Payment Outcome
            </Text>
            <Text className="text-xs text-muted-foreground">
              External UPI apps do not automatically return execution confirmation to NAHOM.
            </Text>

            {returnedResponse ? (
              <View className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
                <Text className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  UPI status: {returnedResponse.status}. Suggested: {suggestedOutcome || 'UNKNOWN'}
                </Text>
              </View>
            ) : null}

            <TextInput
              label="Bank / UPI Reference (Optional)"
              value={outcomeRef}
              placeholder="e.g. 429512345678"
              onChangeText={setOutcomeRef}
            />

            <View className="gap-2 pt-1">
              <Button loading={outcomeSaving} onPress={() => saveOutcome('COMPLETED')}>
                <Text className="text-white font-bold text-sm">Payment Succeeded</Text>
              </Button>
              <Button
                variant="outline"
                disabled={outcomeSaving}
                onPress={() => saveOutcome('NOT_COMPLETED')}
              >
                <Text className="font-semibold text-sm text-destructive">Payment Failed / Cancelled</Text>
              </Button>
              <Button
                variant="outline"
                disabled={outcomeSaving}
                onPress={() => saveOutcome('UNKNOWN')}
              >
                <Text className="font-semibold text-sm">Status Unknown (Verify Later)</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern Standardized Mark Expense Paid Sheet */}
      <MarkExpensePaidSheet
        visible={showMarkPaidSheet}
        onClose={() => setShowMarkPaidSheet(false)}
        expense={expense}
        onSuccess={load}
      />
    </ScreenShell>
  );
}
