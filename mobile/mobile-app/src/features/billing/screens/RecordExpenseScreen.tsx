import React, { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
  Receipt,
  FileText,
  FileEdit,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Camera,
  Check,
  CreditCard,
  DollarSign,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import expenseService from '../services/expenseService';
import { createOperationId } from '@/src/utils/idempotency';
import ReceiptCameraCaptureModal, { ReceiptCaptureFile } from '../components/ReceiptCameraCaptureModal';

const types = [
  { label: 'Purchase', value: 'PURCHASE' },
  { label: 'Repairs & maintenance', value: 'REPAIRS_MAINTENANCE' },
  { label: 'Bills & utilities', value: 'BILLS_UTILITIES' },
  { label: 'Services & labour', value: 'SERVICES_LABOUR' },
  { label: 'Other expense', value: 'OTHER' },
];

const methods = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'Cheque', value: 'CHEQUE' },
  { label: 'Card', value: 'CARD' },
  { label: 'Other', value: 'OTHER' },
];

const categoryMap: Record<string, string> = {
  PURCHASE: 'Purchase',
  REPAIRS_MAINTENANCE: 'Repairs & Maintenance',
  BILLS_UTILITIES: 'Bills & Utilities',
  SERVICES_LABOUR: 'Services & Labour',
  OTHER: 'Other',
};

const funding = (m: string) =>
  m === 'CASH'
    ? 'PETTY_CASH'
    : ['UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].includes(m)
    ? 'COMMUNITY_BANK_ACCOUNT'
    : 'OTHER';

export default function RecordExpenseScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState<0 | 1>(0);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [ocr, setOcr] = useState<any>(null);
  const [ocrFeedback, setOcrFeedback] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; amount?: string; category?: string }>({});
  const [cameraVisible, setCameraVisible] = useState(false);
  const [replacingReceipt, setReplacingReceipt] = useState(false);
  const [reviewFields, setReviewFields] = useState<Record<string, boolean>>({});

  const [f, setF] = useState({
    name: '',
    vendor: '',
    invoiceNumber: '',
    transactionReference: '',
    type: 'PURCHASE',
    category: categoryMap.PURCHASE,
    method: 'UPI',
    settlement: 'UNPAID' as 'PAID' | 'UNPAID',
    date: new Date(),
    amount: '',
  });

  const set = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  const handleTypeChange = (newType: string) => {
    setF((x) => ({
      ...x,
      type: newType,
      category:
        newType === 'OTHER'
          ? x.type === 'OTHER'
            ? x.category
            : ''
          : categoryMap[newType] || 'Other',
    }));
    if (fieldErrors.category) {
      setFieldErrors((prev) => ({ ...prev, category: undefined }));
    }
  };

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!r.canceled && r.assets && r.assets.length > 0) {
      const a: any = r.assets[0];
      if (a.size && a.size > 10 * 1024 * 1024) {
        return Alert.alert('Receipt too large', 'Maximum allowed file size is 10 MB.');
      }
      setReceipt({ uri: a.uri, name: a.name, type: a.mimeType, file: a.file });
      setOcr(null);
      setOcrFeedback(null);
      setReviewFields({});
      setReplacingReceipt(false);
    }
  };

  const useCameraPhoto = (file: ReceiptCaptureFile) => {
    setReceipt(file);
    setOcr(null);
    setOcrFeedback(null);
    setReviewFields({});
    setReplacingReceipt(false);
    setCameraVisible(false);
  };

  const scan = async () => {
    if (!receipt || scanning) return;
    try {
      setScanning(true);
      setOcr(null);
      setOcrFeedback({ tone: 'info', message: 'Scanning receipt with OCR…' });
      const result = await expenseService.previewReceiptOcr(receipt);
      if (result.status !== 'COMPLETED') {
        setOcrFeedback({ tone: 'error', message: result.error || 'Receipt data could not be extracted. Enter details manually.' });
        return;
      }

      const data = result.result;
      setOcr(data);

      const updates: Partial<typeof f> = {};
      const confidenceFor = (field: string, aliases: string[] = []) => {
        const names = [field, ...aliases];
        for (const name of names) {
          const details = data?.fieldProvenance?.[name] || data?.fieldConfidence?.[name];
          const score = details?.confidence ?? details?.score;
          if (score != null) return score;
        }
        return null;
      };
      const needsReview = (field: string, aliases: string[] = []) => {
        const confidence = confidenceFor(field, aliases);
        const hasConflict = data?.warnings?.some((warning: any) => warning?.code === 'OCR_FIELD_CONFLICT');
        return (confidence != null && confidence < 80) || Boolean(hasConflict);
      };

      // 1. Expense Name: Populate if genuine purpose is known
      const genericFallbacks = [
        'Receipt Expense',
        'UPI Payment',
        'Bank Transfer',
        'Other Expense',
        'Payment Screenshot',
      ];
      const rawName =
        data?.expenseName ||
        data?.explicitNotes ||
        data?.suggestedExpenseName;
      const isGeneric =
        !rawName ||
        genericFallbacks.some((g) => rawName.toLowerCase().includes(g.toLowerCase())) ||
        rawName.toLowerCase().startsWith('expense -') ||
        rawName.toLowerCase().startsWith('expense_');
      const isJustVendor =
        rawName && data?.merchant && rawName.trim().toLowerCase() === data.merchant.trim().toLowerCase();

      if (!f.name.trim() && rawName && !isGeneric && !isJustVendor) {
        updates.name = rawName;
      }

      // 2. Vendor / Payee Name (Header, Signature block or Payee)
      if (data?.merchant || data?.payeeUpiId) {
        updates.vendor = data.merchant || data.payeeUpiId;
      }

      // 3. Keep document and payment identifiers separate.
      if (data?.receiptNumber || data?.invoiceNumber || data?.billNumber || data?.orderId) {
        updates.invoiceNumber = data.receiptNumber || data.invoiceNumber || data.billNumber || data.orderId;
      }
      if (data?.transactionReference || data?.transactionId) {
        updates.transactionReference = data.transactionReference || data.transactionId;
      }

      // 4. Receipt / Expense Date
      if ((data?.expenseDate || data?.receiptDate) && /^\d{4}-\d{2}-\d{2}$/.test(data.expenseDate || data.receiptDate || '')) {
        const dStr = data.expenseDate || data.receiptDate;
        updates.date = new Date(`${dStr}T00:00:00`);
      }

      // 5. Total Amount
      if (data?.totalAmount != null) {
        updates.amount = String(data.totalAmount);
      } else if (data?.totalMinor != null) {
        updates.amount = String(data.totalMinor / 100);
      }

      // 6. Category & Type
      if (data?.suggestedExpenseType && types.some((t) => t.value === data.suggestedExpenseType)) {
        updates.type = data.suggestedExpenseType;
        updates.category = data.suggestedCategory || categoryMap[data.suggestedExpenseType] || 'Other';
      } else if (data?.suggestedCategory) {
        updates.category = data.suggestedCategory;
      }

      // 7. Payment Method
      if (data?.paymentMethod && methods.some((m) => m.value === data.paymentMethod)) {
        updates.method = data.paymentMethod;
      } else if (data?.isPaymentScreenshot) {
        updates.method = 'UPI';
      }

      // 8. Payment Settlement Status
      if (data?.settlement === 'PAID') {
        updates.settlement = 'PAID';
      }

      setF((prev) => ({ ...prev, ...updates }));
      setReviewFields({
        vendor: needsReview('merchant'),
        invoiceNumber: needsReview('receiptNumber', ['reference']),
        transactionReference: needsReview('transactionReference', ['reference']),
        date: needsReview('receiptDate', ['date']),
        amount: needsReview('totalMinor', ['total']),
      });
      setFieldErrors({});

      const entered: string[] = [];
      if (updates.vendor) entered.push(`Vendor (${updates.vendor})`);
      if (updates.invoiceNumber) entered.push(`Bill #${updates.invoiceNumber}`);
      if (updates.transactionReference) entered.push(`Transaction #${updates.transactionReference}`);
      if (updates.amount) entered.push(`Amount (₹${updates.amount})`);
      if (updates.date) entered.push('Date');
      if (updates.name) entered.push(`Name (${updates.name})`);

      // Successful scans advance directly to the review step. OCR warnings remain attached to the
      // extraction for audit purposes, but must not interrupt users with an upload-time banner.
      setOcrFeedback(null);

      if (entered.length > 0) {
        if (data.merchant) {
          setF((prev) => ({ ...prev, name: prev.name || data.merchant }));
        }
        setTimeout(() => {
          setCurrentSlide(1);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 500);
      }
    } catch (error: any) {
      setOcrFeedback({ tone: 'error', message: error?.message || 'Unable to scan this receipt. Enter details manually.' });
    } finally {
      setScanning(false);
    }
  };

  const handleNextSlide = () => {
    setCurrentSlide(1);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const save = async () => {
    const errors: { name?: string; amount?: string; category?: string } = {};

    const resolvedName = f.name.trim() || f.vendor.trim() || categoryMap[f.type] || 'Expense';

    const finalAmount = Number(f.amount) || 0;

    if (finalAmount <= 0) {
      errors.amount = 'Total amount must be greater than zero.';
    }

    if (f.type === 'OTHER' && !f.category.trim()) {
      errors.category = 'Please specify a category when "Other expense" is selected.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      Alert.alert('Incomplete form', Object.values(errors)[0]);
      return;
    }

    try {
      setSaving(true);
      const id = createOperationId();
      const effectiveCategory =
        f.type === 'OTHER' ? f.category.trim() : categoryMap[f.type] || 'Other';

      const r: any = await expenseService.create({
        idempotencyKey: id,
        name: resolvedName,
        expenseType: f.type,
        category: effectiveCategory,
        expenseDate: f.date.toISOString(),
        subtotal: finalAmount,
        cgst: 0,
        sgst: 0,
        taxAmount: 0,
        additionalCharges: 0,
        invoiceNumber: f.invoiceNumber.trim() || undefined,
        vendor: (f.vendor.trim() || ocr?.merchant) ? { name: f.vendor.trim() || ocr?.merchant } : undefined,
        items: [],
        initialPayment:
          f.settlement === 'PAID'
            ? {
                idempotencyKey: id + ':PAYMENT',
                amount: finalAmount,
                paymentMethod: f.method,
                paymentApplication: ocr?.paymentApplication || (f.method === 'BANK_TRANSFER' ? 'NETBANKING' : 'NOT_SPECIFIED'),
                fundingSource: funding(f.method),
                paymentDate: f.date.toISOString(),
                transactionReference: f.transactionReference.trim() || undefined,
              }
            : undefined,
      });

      let uploadFailed = false;
      if (receipt) {
        try {
          await expenseService.uploadAttachment(r._id, receipt);
        } catch (attErr: any) {
          uploadFailed = true;
          console.warn('Expense attachment upload failed:', attErr);
        }
      }

      if (uploadFailed) {
        Alert.alert(
          'Expense Saved',
          'Expense was recorded successfully, but the receipt attachment could not be uploaded. You can re-upload it later from expense details.',
          [{ text: 'OK', onPress: () => router.replace({ pathname: '/(resident)/admin/billing/expenses', params: { refresh: String(Date.now()) } } as any) }]
        );
      } else {
        router.replace({ pathname: '/(resident)/admin/billing/expenses', params: { refresh: String(Date.now()) } } as any);
      }
    } catch (e: any) {
      Alert.alert('Cannot save expense', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasReviewFields = Object.values(reviewFields).some(Boolean);

  return (
    <ScreenShell
      title="Record Expense"
      subtitle="Record a community bill, invoice, or purchase"
      iconName="Receipt"
      showBackButton
      hideBottomNav={true}
    >
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
                onPress={() => {
                  setCurrentSlide(idx as 0 | 1);
                }}
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
        ref={scrollViewRef}
        className="flex-1 px-4"
        contentContainerClassName="gap-4 pb-28 pt-3"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================================
            SLIDE 1: RECEIPT UPLOAD ONLY (PAGE 1)
           ========================================================================= */}
        {currentSlide === 0 && (
          <>
            {/* RECEIPT PROOF & OCR SCAN */}
            <View className="rounded-2xl border border-border bg-card p-4 gap-4 shadow-2xs">
              <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                  <FileText size={16} className="text-primary" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-foreground">Receipt / Proof (Optional)</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    Upload or capture a bill to auto-fill details via OCR
                  </Text>
                </View>
              </View>

              {receipt ? (
                <View className="gap-2.5 rounded-xl border border-border/60 bg-muted/40 p-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="me-2 flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>
                      {receipt.name}
                    </Text>
                    <View className="flex-row gap-3">
                      <Pressable onPress={() => setReplacingReceipt((value) => !value)} hitSlop={8}>
                        <Text className="text-xs font-bold text-primary">Replace</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setReceipt(null);
                          setOcr(null);
                          setOcrFeedback(null);
                          setReplacingReceipt(false);
                        }}
                        hitSlop={8}
                      >
                        <Text className="text-xs font-bold text-destructive">Remove</Text>
                      </Pressable>
                    </View>
                  </View>

                  {replacingReceipt ? (
                    <View className="flex-row gap-2 pt-1">
                      <Button variant="outline" onPress={pick} className="flex-1 py-2.5">
                        <View className="flex-row items-center justify-center gap-1.5">
                          <UploadCloud size={14} className="text-foreground" />
                          <Text className="text-xs font-bold text-foreground">Upload File</Text>
                        </View>
                      </Button>
                      <Button variant="outline" onPress={() => setCameraVisible(true)} className="flex-1 py-2.5">
                        <View className="flex-row items-center justify-center gap-1.5">
                          <Camera size={14} className="text-foreground" />
                          <Text className="text-xs font-bold text-foreground">Take Photo</Text>
                        </View>
                      </Button>
                    </View>
                  ) : null}

                  <Button
                    loading={scanning}
                    disabled={scanning}
                    onPress={scan}
                    className="mt-1 bg-primary"
                  >
                    <Text className="text-xs font-bold text-primary-foreground">
                      {scanning ? 'Scanning & Extracting Data…' : 'Scan & Auto-Extract Details'}
                    </Text>
                  </Button>
                </View>
              ) : (
                <View className="flex-row gap-2.5">
                  <Button variant="outline" onPress={pick} className="flex-1 border-primary/30 bg-primary/5 py-3">
                    <View className="flex-row items-center justify-center gap-2">
                      <UploadCloud size={16} className="text-primary" />
                      <Text className="text-xs font-bold text-primary">Upload Receipt</Text>
                    </View>
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => setCameraVisible(true)}
                    className="flex-1 border-primary/30 bg-primary/5 py-3"
                  >
                    <View className="flex-row items-center justify-center gap-2">
                      <Camera size={16} className="text-primary" />
                      <Text className="text-xs font-bold text-primary">Take Photo</Text>
                    </View>
                  </Button>
                </View>
              )}

              {/* OCR Feedback Message */}
              {ocrFeedback ? (
                <View
                  className={`rounded-xl border p-3 gap-2 ${
                    ocrFeedback.tone === 'error'
                      ? 'border-destructive/30 bg-destructive/5'
                      : ocrFeedback.tone === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-amber-500/30 bg-amber-500/10'
                  }`}
                >
                  <View className="flex-row items-start gap-2">
                    {ocrFeedback.tone === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle
                        size={16}
                        className={
                          ocrFeedback.tone === 'error' ? 'text-destructive mt-0.5 shrink-0' : 'text-amber-600 mt-0.5 shrink-0'
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
                      }`}
                    >
                      {ocrFeedback.message}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* SLIDE 1 ACTION: NEXT STEP */}
            <View className="pt-2 pb-6">
              <Button
                variant="default"
                onPress={handleNextSlide}
                className="w-full bg-primary h-12 shadow-sm"
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-white font-bold text-base">
                    {receipt ? 'Next: Review Extracted Details' : 'Skip Receipt & Enter Manually'}
                  </Text>
                  <ArrowRight size={18} className="text-white" />
                </View>
              </Button>
            </View>
          </>
        )}

        {/* =========================================================================
            SLIDE 2: ALL EXTRACTED & NECESSARY DETAILS (PAGE 2)
           ========================================================================= */}
        {currentSlide === 1 && (
          <>
            {/* SECTION 1: EXTRACTED BILL SPECIFICATIONS */}
            <View className="rounded-2xl border border-border bg-card p-4 gap-4 shadow-2xs">
              <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                  <DollarSign size={16} className="text-primary" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-foreground">Bill Specifications</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    Vendor, document number, payment reference, date, and total
                  </Text>
                </View>
              </View>

              {hasReviewFields && (
                <View className="flex-row items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <Text className="flex-1 text-[11px] leading-4 text-amber-800 dark:text-amber-300">
                    OCR values are pre-filled. Please confirm fields highlighted in amber before saving.
                  </Text>
                </View>
              )}

              {/* Vendor / Payee */}
              <TextInput
                label="Vendor / Payee Name"
                value={f.vendor}
                placeholder="Enter vendor or payee name"
                status={reviewFields.vendor ? 'incomplete' : 'idle'}
                helperText={reviewFields.vendor ? 'OCR detected this value. Please verify it.' : undefined}
                onChangeText={(v) => set('vendor', v)}
              />

              <TextInput
                label="Invoice # / Bill # / Order ID"
                value={f.invoiceNumber}
                placeholder="Enter invoice or bill number"
                status={reviewFields.invoiceNumber ? 'incomplete' : 'idle'}
                helperText={reviewFields.invoiceNumber ? 'OCR detected this document number. Please verify it.' : undefined}
                onChangeText={(v) => set('invoiceNumber', v)}
              />

              {(Boolean(f.transactionReference) || Boolean(ocr?.isPaymentScreenshot) || Boolean(ocr?.transactionReference)) && (
                <TextInput
                  label="Transaction ID / UTR / RRN"
                  value={f.transactionReference}
                  placeholder="Enter UPI, bank, or payment reference"
                  status={reviewFields.transactionReference ? 'incomplete' : 'idle'}
                  helperText={reviewFields.transactionReference ? 'OCR detected this payment reference. Please verify it.' : undefined}
                  onChangeText={(v) => set('transactionReference', v)}
                />
              )}

              {/* Expense Date */}
              <View className="gap-1.5">
                <DatePicker
                  label="Bill / Expense Date"
                  value={f.date}
                  onChange={(v) => v && set('date', v)}
                />
                {reviewFields.date && <Text className="text-[11px] leading-4 text-amber-700 dark:text-amber-300">OCR date detected — please verify.</Text>}
              </View>
              {/* Total Amount (Required) */}
              <TextInput
                label="Total Amount (₹)"
                required
                keyboardType="decimal-pad"
                value={f.amount}
                error={fieldErrors.amount}
                status={reviewFields.amount ? 'incomplete' : 'idle'}
                placeholder="0.00"
                helperText={
                  reviewFields.amount
                    ? 'OCR detected this total. Please verify it.'
                    : f.amount
                    ? `Recorded as ₹${Number(f.amount || 0).toFixed(2)}`
                    : undefined
                }
                onChangeText={(v) => {
                  set('amount', v);
                  if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
                }}
              />
            </View>

            {/* SECTION 2: CLASSIFICATION & PURPOSE */}
            <View className="rounded-2xl border border-border bg-card p-4 gap-4 shadow-2xs">
              <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                  <FileEdit size={16} className="text-primary" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-foreground">Classification</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    Name and category for community accounting
                  </Text>
                </View>
              </View>

              {/* Expense Name (Required) */}
              <TextInput
                label="Expense Name"
                required
                value={f.name}
                error={fieldErrors.name}
                placeholder="Enter expense name or purpose"
                onChangeText={(v) => {
                  set('name', v);
                  if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
                }}
              />

              {/* Expense Type */}
              <DropdownSelect
                label="Expense Type"
                required
                options={types}
                value={f.type}
                onValueChange={handleTypeChange}
              />

              {/* Custom Category if OTHER */}
              {f.type === 'OTHER' ? (
                <TextInput
                  label="Custom Category"
                  required
                  value={f.category}
                  error={fieldErrors.category}
                  placeholder="Enter custom category"
                  onChangeText={(v) => {
                    set('category', v);
                    if (fieldErrors.category) setFieldErrors((e) => ({ ...e, category: undefined }));
                  }}
                />
              ) : null}
            </View>

            {/* SECTION 3: PAYMENT & SETTLEMENT */}
            <View className="rounded-2xl border border-border bg-card p-4 gap-4 shadow-2xs">
              <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                  <CreditCard size={16} className="text-primary" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-bold text-foreground">Payment & Settlement</Text>
                  <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                    Method of transaction and payment status
                  </Text>
                </View>
              </View>

              {/* Responsive 50/50 Grid: Payment Method & Settlement */}
              <View className="flex-row gap-2.5 items-start">
                <View className="flex-1 min-w-0">
                  <DropdownSelect
                    label="Payment Method"
                    required
                    options={methods}
                    value={f.method}
                    onValueChange={(v) => set('method', v)}
                  />
                </View>

                <View className="flex-1 min-w-0">
                  <Text className="text-xs font-bold text-foreground mb-1.5">Payment Status</Text>
                  <View className="flex-row rounded-xl border border-border/80 bg-muted/40 p-1">
                    <Pressable
                      onPress={() => set('settlement', 'PAID')}
                      className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2.5 transition-colors ${
                        f.settlement === 'PAID'
                          ? 'bg-emerald-600 shadow-2xs'
                          : 'bg-transparent'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Mark as Paid"
                    >
                      <Check size={12} className={f.settlement === 'PAID' ? 'text-white' : 'text-muted-foreground'} />
                      <Text
                        className={`text-xs font-bold ${
                          f.settlement === 'PAID' ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        Paid
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => set('settlement', 'UNPAID')}
                      className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2.5 transition-colors ${
                        f.settlement === 'UNPAID'
                          ? 'bg-amber-600 shadow-2xs'
                          : 'bg-transparent'
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Mark as Unpaid"
                    >
                      <Text
                        className={`text-xs font-bold ${
                          f.settlement === 'UNPAID' ? 'text-white' : 'text-muted-foreground'
                        }`}
                      >
                        Unpaid
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            {/* SLIDE 2 ACTIONS: BACK & SAVE */}
            <View className="pt-2 pb-6 gap-2">
              {Object.keys(fieldErrors).length > 0 ? (
                <View className="flex-row items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 mb-1">
                  <AlertTriangle size={16} className="text-destructive shrink-0" />
                  <Text className="text-xs font-semibold text-destructive flex-1">
                    {Object.values(fieldErrors)[0]}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  onPress={() => setCurrentSlide(0)}
                  className="flex-1 border-border h-12"
                >
                  <View className="flex-row items-center justify-center gap-1.5">
                    <ArrowLeft size={16} className="text-foreground" />
                    <Text className="text-foreground font-bold text-sm">Back</Text>
                  </View>
                </Button>

                <Button
                  loading={saving}
                  disabled={saving}
                  onPress={save}
                  leftIcon={Receipt}
                  className="flex-[2] bg-emerald-600 h-12 shadow-sm"
                >
                  <Text className="text-white font-bold text-sm">
                    Save Expense {Number(f.amount) > 0 ? `(₹${Number(f.amount).toFixed(2)})` : ''}
                  </Text>
                </Button>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Live Camera Modal */}
      <ReceiptCameraCaptureModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCaptured={useCameraPhoto}
      />
    </ScreenShell>
  );
}
