import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileText,
  List,
  Receipt,
  Scan,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { DropdownSelect } from '@/components/forms/DropdownSelect';
import { DatePicker } from '@/components/common/DatePicker';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import expenseService from '../services/expenseService';
import { createOperationId } from '@/src/utils/idempotency';
import {
  buildGenericUpiUri,
  launchUpi,
} from '../services/upiService';
import {
  getReceiptOcrAmount,
  getReceiptOcrTransactionReference,
} from '../utils/receiptOcrMapping';
import ReceiptCameraCaptureModal, { ReceiptCaptureFile } from '../components/ReceiptCameraCaptureModal';

type Page = 'details' | 'receipt';

const typeOptions = [
  { label: 'Purchase for community', value: 'PURCHASE' },
  { label: 'Repairs & maintenance', value: 'REPAIRS_MAINTENANCE' },
  { label: 'Bills & utilities', value: 'BILLS_UTILITIES' },
  { label: 'Services & labour', value: 'SERVICES_LABOUR' },
  { label: 'Other expense', value: 'OTHER' },
];

const categoryMap: Record<string, string> = {
  PURCHASE: 'Purchase',
  REPAIRS_MAINTENANCE: 'Repairs & Maintenance',
  BILLS_UTILITIES: 'Bills & Utilities',
  SERVICES_LABOUR: 'Services & Labour',
  OTHER: 'Other',
};

const rupee = String.fromCharCode(0x20b9);
const formatCurrency = (value: number | string | null | undefined) =>
  rupee +
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ExtractedItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  lineTotal?: number;
}

export default function PayOnlineExpenseScreen() {
  const router = useRouter();
  const { width: viewportWidth } = useWindowDimensions();
  const [page, setPage] = useState<Page>('details');
  const shouldStackReceiptActions = viewportWidth < 430;

  // Page 1: Intake (Name & Type only)
  const [form, setForm] = useState({
    name: '',
    expenseType: 'PURCHASE',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Page 2: Receipt Photo/Screenshot & OCR Auto-Extraction
  const [receiptFile, setReceiptFile] = useState<{ uri: string; name?: string; type?: string; file?: any } | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [payee, setPayee] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [detectedApp, setDetectedApp] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [ocrDescription, setOcrDescription] = useState('');
  const [ocrFeedback, setOcrFeedback] = useState<{ tone: 'info' | 'success' | 'warning' | 'error'; message: string } | null>(null);

  const operationId = useRef(createOperationId());

  const setField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  /**
   * Page 1 CTA: Opens external payment platform and navigates to the receipt screenshot page.
   * On Web: navigates to https://payments.google.com/gp/w/u/0/home/signup
   * On Mobile: opens the native UPI external app chooser (Google Pay, PhonePe, Paytm, etc.)
   */
  const handleReadyToPay = async () => {
    if (!form.name.trim()) {
      setErrors({ name: 'Please enter an expense name.' });
      return;
    }
    setBusy(true);

    try {
      const uri = buildGenericUpiUri({
        note: form.name.trim() || 'Expense Payment',
      });
      await launchUpi(uri, 'upi', operationId.current);
    } catch (err: any) {
      console.warn('Could not launch external payment app:', err);
    } finally {
      setBusy(false);
      // Advance to Page 2 (Receipt & Confirm)
      setPage('receipt');
    }
  };

  // Upload file from device storage/gallery
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset: any = res.assets[0];
        handleProcessReceipt({
          uri: asset.uri,
          name: asset.name || 'payment_screenshot.jpg',
          type: asset.mimeType || 'image/jpeg',
          file: asset.file,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not pick image.');
    }
  };

  // Capture live photo with camera
  const handleCameraPhoto = (file: ReceiptCaptureFile) => {
    setCameraVisible(false);
    handleProcessReceipt(file);
  };

  // Run OCR on the selected screenshot or live camera capture
  const handleProcessReceipt = async (file: { uri: string; name?: string; type?: string; file?: any }) => {
    setReceiptFile(file);
    setOcrFeedback(null);
    try {
      setScanning(true);
      const response: any = await expenseService.previewReceiptOcr({
        uri: file.uri,
        name: file.name || 'payment_receipt.jpg',
        type: file.type || 'image/jpeg',
        file: file.file,
      });

      if (response?.status !== 'COMPLETED' || !response.result) {
        setOcrFeedback({
          tone: 'warning',
          message: response?.error || 'Receipt scanned. Please check or enter the amount and reference below.',
        });
        return;
      }

      const data = response.result;
      const extracted: string[] = [];

      // Prefer the canonical minor-unit total and never treat OCR zero as a paid amount.
      const ocrAmount = getReceiptOcrAmount(data);
      if (ocrAmount) {
        const parsedAmount = ocrAmount;
        setAmount(parsedAmount);
        extracted.push(`Amount: ${rupee}${parsedAmount}`);
      }

      // Extract Invoice / Bill Number from OCR
      if (data.receiptNumber) {
        setInvoiceNumber(data.receiptNumber);
        extracted.push(`Invoice: ${data.receiptNumber}`);
      }

      // OCR providers use different explicit names for the same transaction ID.
      const transactionReference = getReceiptOcrTransactionReference(data);
      if (transactionReference) {
        setReference(transactionReference);
        extracted.push(`UTR: ${transactionReference}`);
      }

      // Extract Date from OCR
      const effectiveDateStr = data.expenseDate || data.receiptDate;
      if (effectiveDateStr) {
        const d = new Date(`${effectiveDateStr}T00:00:00`);
        if (!isNaN(d.getTime())) setPaymentDate(d);
        extracted.push(`Date: ${effectiveDateStr}`);
      }

      // Extract Merchant / Payee from OCR
      if (data.merchant || data.payeeUpiId) {
        const vendorName = data.merchant || data.payeeUpiId;
        setPayee(vendorName);
        extracted.push(`Payee: ${vendorName}`);
      }

      // Extract Description / Notes
      const notesVal = data.notes || data.suggestedNotes || data.description || '';
      if (notesVal) {
        setOcrDescription(notesVal);
      }

      // If suggested name is available and current name is empty or placeholder
      if (data.suggestedExpenseName && (!form.name.trim() || form.name === 'Online Expense')) {
        setField('name', data.suggestedExpenseName);
      }

      if (data.paymentMethod === 'BANK_TRANSFER') {
        setPaymentMethod('BANK_TRANSFER');
      } else {
        setPaymentMethod('UPI');
      }

      if (data.paymentApplication) {
        setDetectedApp(data.paymentApplication);
      }

      // Extract Line Items
      if (Array.isArray(data.items) && data.items.length > 0) {
        const parsedItems: ExtractedItem[] = data.items.map((it: any) => ({
          itemName: it.itemName || 'Item',
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPriceMinor != null ? (it.unitPriceMinor / 100).toFixed(2) : 0),
          unit: 'Unit',
          lineTotal: Number(it.amountMinor != null ? (it.amountMinor / 100).toFixed(2) : 0),
        }));
        setItems(parsedItems);
        extracted.push(`${parsedItems.length} items`);
      }

      setOcrFeedback({
        tone: 'success',
        message: extracted.length > 0
          ? `OCR auto-extracted: ${extracted.join(' · ')}`
          : 'Receipt scanned. Please verify amount and details below.',
      });
    } catch (error: any) {
      setOcrFeedback({
        tone: 'warning',
        message: error?.message || 'Unable to scan automatically. You can enter details manually below.',
      });
    } finally {
      setScanning(false);
    }
  };

  const numAmount = Number(amount);


  const saveExpenseAsPaid = async () => {
    if (saving) return;
    if (scanning) {
      Alert.alert('Receipt is still being scanned', 'Wait for receipt processing to finish, then review and save the expense.');
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Expense name required', 'Enter what this payment was for before saving.');
      return;
    }
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      Alert.alert('Valid amount required', 'Enter the amount paid before saving.');
      return;
    }
    try {
      setSaving(true);
      setSaveError(null);
      const finalAmount = numAmount;
      const effectiveCategory = categoryMap[form.expenseType] || 'Other';
      const finalName = form.name.trim() || 'Online Expense';
      const isoDate = paymentDate instanceof Date && !isNaN(paymentDate.getTime())
        ? paymentDate.toISOString()
        : new Date().toISOString();

      // Check if line items total matches the final amount
      const itemsSum = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
      const itemsMatch = items.length > 0 && Math.abs(itemsSum - finalAmount) < 0.05;

      const notesToSave = ocrDescription || (items.length > 0 ? items.map((it) => `${it.quantity}x ${it.itemName}`).join(', ') : undefined);

      const newExpense: any = await expenseService.create({
        idempotencyKey: operationId.current,
        name: finalName,
        expenseType: form.expenseType,
        category: effectiveCategory,
        description: notesToSave,
        expenseDate: isoDate,
        subtotal: finalAmount,
        taxAmount: 0,
        additionalCharges: 0,
        invoiceNumber: invoiceNumber.trim() || undefined,
        vendor: payee.trim() ? { name: payee.trim() } : undefined,
        items: itemsMatch
          ? items.map((it) => ({
              itemName: it.itemName,
              quantity: it.quantity,
              unit: it.unit || 'Unit',
              unitPrice: it.unitPrice,
            }))
          : undefined,
        initialPayment: {
          idempotencyKey: operationId.current + ':PAYMENT',
          amount: finalAmount,
          paymentMethod: paymentMethod,
          paymentApplication: detectedApp || (paymentMethod === 'BANK_TRANSFER' ? 'NETBANKING' : 'NOT_SPECIFIED'),
          fundingSource: 'COMMUNITY_BANK_ACCOUNT',
          paymentDate: isoDate,
          transactionReference: reference.trim() || undefined,
        },
      });

      if (receiptFile && newExpense?._id) {
        try {
          await expenseService.uploadAttachment(String(newExpense._id), receiptFile);
        } catch (uploadErr) {
          console.warn('Receipt attachment upload error:', uploadErr);
        }
      }

      // Immediately navigate back to Expenses screen with recency refresh
      router.replace({
        pathname: '/(resident)/admin/billing/expenses',
        params: { refresh: String(Date.now()) },
      } as any);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'Could not save expense. Please verify details.';
      setSaveError(errMsg);
      Alert.alert('Could not save expense', errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell
      title={page === 'details' ? 'Pay Online' : 'Receipt & Confirm'}
      subtitle={form.name.trim() ? form.name.trim() : 'New Online Expense'}
      iconName="CreditCard"
      showBackButton
      hideBottomNav
      onBackPress={() => {
        if (page === 'receipt') setPage('details');
        else router.back();
      }}
    >
      {/* 2-Step Flow Indicator */}
      <View className="px-4 py-2.5 bg-card/90 border-b border-border shadow-2xs">
        <View className="flex-row items-center gap-2 mb-1.5">
          <View className="h-1.5 flex-1 rounded-full bg-primary" />
          <View className={`h-1.5 flex-1 rounded-full ${page === 'receipt' ? 'bg-primary' : 'bg-muted'}`} />
        </View>
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-bold text-foreground">
            {page === 'details' ? '1. Expense Details' : '2. Receipt Proof & Confirm'}
          </Text>
          <Text className="text-[11px] font-medium text-muted-foreground">
            Step {page === 'details' ? '1' : '2'} of 2
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-4 pb-32 pt-3"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* PAGE 1: Details (Expense Name & Type only) */}
          {page === 'details' && (
            <>
              <View className="gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <View className="flex-row items-center gap-2 border-b border-border/60 pb-2.5">
                  <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                    <CreditCard size={15} className="text-primary" />
                  </View>
                  <Text className="text-sm font-bold text-foreground">Expense Details</Text>
                </View>

                <TextInput
                  label="Expense Name"
                  required
                  value={form.name}
                  placeholder="e.g. Generator Diesel, Garden Maintenance"
                  error={errors.name}
                  onChangeText={(v) => setField('name', v)}
                />

                <DropdownSelect
                  label="Expense Type"
                  options={typeOptions}
                  value={form.expenseType}
                  onValueChange={(v) => setField('expenseType', v)}
                />
              </View>

              <View className="flex-row items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                <Sparkles size={18} className="text-primary mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-primary">Open External Payment Platform</Text>
                  <Text className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Tapping &quot;Ready to Pay&quot; opens your external payment app directly. Then on the next page, upload your screenshot or take a live photo to auto-extract the payment details via OCR!
                  </Text>
                </View>
              </View>

              <View className="gap-2.5 pt-2">
                <Button loading={busy} onPress={handleReadyToPay} className="w-full">
                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-base font-bold text-white">Ready to Pay</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </View>
                </Button>
                <Button variant="outline" onPress={() => router.back()} className="w-full">
                  <Text className="font-semibold">Cancel</Text>
                </Button>
              </View>
            </>
          )}

          {/* PAGE 2: Receipt & Confirm (Live Camera Capture & Image Upload with OCR Auto-Extraction) */}
          {page === 'receipt' && (
            <>
              {/* Summary Card with Expense Name & Category */}
              <View className="gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <View className="flex-row items-center justify-between pb-2.5 border-b border-border/60">
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                      <CreditCard size={15} className="text-primary" />
                    </View>
                    <Text className="text-sm font-bold text-foreground">Expense Details</Text>
                  </View>
                  <View className="rounded-full bg-primary/10 px-2.5 py-0.5 shrink-0">
                    <Text className="text-[11px] font-bold text-primary">
                      {categoryMap[form.expenseType] || 'Other'}
                    </Text>
                  </View>
                </View>

                <TextInput
                  label="Paying For"
                  value={form.name}
                  placeholder="Expense name"
                  onChangeText={(v) => setField('name', v)}
                />
              </View>

              {/* Receipt Upload & Live Photo Capture Card */}
              <View className="gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <View className="flex-row items-center justify-between pb-2.5 border-b border-border/60">
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                      <Scan size={15} className="text-primary" />
                    </View>
                    <Text
                      className="flex-1 min-w-0 text-sm font-bold text-foreground"
                      numberOfLines={1}
                      minimumFontScale={0.8}
                    >
                      Payment Proof / Receipt
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1 rounded bg-primary/10 px-2 py-0.5 shrink-0">
                    <Sparkles size={11} className="text-primary" />
                    <Text className="text-[10px] font-bold text-primary">OCR AUTO-EXTRACT</Text>
                  </View>
                </View>

                {/* Selected File Preview or Action Buttons */}
                {receiptFile ? (
                  <View className="gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <View className="flex-row items-center gap-3">
                      {receiptFile.uri ? (
                        <Image source={{ uri: receiptFile.uri }} className="h-16 w-16 rounded-lg bg-card" resizeMode="cover" />
                      ) : (
                        <View className="h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                          <Receipt size={24} className="text-primary" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-sm font-bold text-foreground">
                          {receiptFile.name || 'Payment Receipt'}
                        </Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">Receipt attached</Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setReceiptFile(null);
                          setOcrFeedback(null);
                        }}
                        className="rounded-full p-2 hover:bg-destructive/10 active:opacity-70"
                      >
                        <Trash2 size={18} className="text-destructive" />
                      </Pressable>
                    </View>

                    {/* Change options */}
                    <View className="flex-row gap-2 pt-1 border-t border-border">
                      <Button
                        variant="outline"
                        leftIcon={UploadCloud}
                        onPress={handlePickDocument}
                        className="flex-1 py-2"
                        textClassName="text-xs font-semibold"
                      >
                        Change File
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={Camera}
                        onPress={() => setCameraVisible(true)}
                        className="flex-1 py-2"
                        textClassName="text-xs font-semibold"
                      >
                        Take New Photo
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View className="gap-2.5">
                    <Text className="text-xs text-muted-foreground leading-relaxed">
                      Capture a live photo of your receipt/payment screen or upload a screenshot to auto-fill the transaction details:
                    </Text>

                    <View className={shouldStackReceiptActions ? 'flex-col gap-2.5' : 'flex-row gap-2.5'}>
                      <Button
                        variant="outline"
                        leftIcon={UploadCloud}
                        onPress={handlePickDocument}
                        className={`${shouldStackReceiptActions ? 'w-full' : 'flex-1'} border-primary/30 bg-primary/5 py-3`}
                        textClassName="text-xs font-bold text-primary"
                      >
                        Upload Receipt
                      </Button>

                      <Button
                        variant="outline"
                        leftIcon={Camera}
                        onPress={() => setCameraVisible(true)}
                        className={`${shouldStackReceiptActions ? 'w-full' : 'flex-1'} border-primary/30 bg-primary/5 py-3`}
                        textClassName="text-xs font-bold text-primary"
                      >
                        Take Live Photo
                      </Button>
                    </View>
                  </View>
                )}

                {scanning && (
                  <View className="flex-row items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 p-3">
                    <ActivityIndicator size="small" />
                    <Text className="text-xs font-semibold text-primary">Extracting payment details from receipt with OCR…</Text>
                  </View>
                )}

                {ocrFeedback && (
                  <View
                    className={`flex-row items-start gap-2 rounded-xl border p-3 ${
                      ocrFeedback.tone === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : ocrFeedback.tone === 'warning'
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-destructive/30 bg-destructive/5'
                    }`}
                  >
                    {ocrFeedback.tone === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertTriangle size={16} className={ocrFeedback.tone === 'warning' ? 'text-amber-600 mt-0.5' : 'text-destructive mt-0.5'} />
                    )}
                    <Text className="flex-1 text-xs text-foreground font-medium leading-relaxed">
                      {ocrFeedback.message}
                    </Text>
                  </View>
                )}
              </View>

              {/* Extracted Line Items Preview if available */}
              {items.length > 0 && (
                <View className="gap-2 rounded-2xl border border-border bg-card p-4">
                  <View className="flex-row items-center gap-2 mb-1">
                    <List size={16} className="text-primary" />
                    <Text className="text-sm font-bold text-foreground">Extracted Line Items ({items.length})</Text>
                  </View>
                  {items.map((it, idx) => (
                    <View key={idx} className="flex-row items-center justify-between py-1.5 border-b border-border/40 last:border-b-0">
                      <View className="flex-1 pe-2">
                        <Text className="text-xs font-semibold text-foreground">{it.itemName}</Text>
                        <Text className="text-[11px] text-muted-foreground">Qty: {it.quantity} × {formatCurrency(it.unitPrice)}</Text>
                      </View>
                      <Text className="text-xs font-bold text-foreground">{formatCurrency(it.quantity * it.unitPrice)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Extracted Details Review (Auto-filled by OCR, fully editable) */}
              {saveError && (
                <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />
              )}

              <View className="gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <View className="flex-row items-center justify-between pb-2.5 border-b border-border/60">
                  <View className="flex-row items-center gap-2 flex-1 min-w-0">
                    <View className="h-7 w-7 rounded-lg bg-primary/10 items-center justify-center">
                      <FileText size={15} className="text-primary" />
                    </View>
                    <Text
                      className="flex-1 min-w-0 text-sm font-bold text-foreground"
                      numberOfLines={1}
                      minimumFontScale={0.8}
                    >
                      Extracted Details
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5 shrink-0">
                    <View className="rounded-full bg-primary/10 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-primary">
                        {paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'UPI'}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
                      <Check size={11} className="text-emerald-700 dark:text-emerald-300" />
                      <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Status: PAID</Text>
                    </View>
                  </View>
                </View>

                <TextInput
                  label="Paid To / Payee"
                  value={payee}
                  placeholder="Merchant or beneficiary name"
                  autoCapitalize="words"
                  helperText={payee ? 'Beneficiary or vendor extracted from proof' : 'Auto-filled from screenshot or enter manually'}
                  onChangeText={setPayee}
                />

                <TextInput
                  label="Amount Paid (₹)"
                  required
                  value={amount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  helperText={amount ? `Recorded as ${formatCurrency(amount)}` : 'Auto-filled from screenshot or enter manually'}
                  onChangeText={setAmount}
                />

                <DatePicker
                  label="Payment Date"
                  value={paymentDate}
                  onChange={(d) => d && setPaymentDate(d)}
                />

                <TextInput
                  label="Transaction Reference / UTR"
                  value={reference}
                  placeholder="12-digit UTR, IMPS ref, or UPI ID"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  helperText="Extracted from bank transfer advice or UPI screenshot"
                  onChangeText={setReference}
                />

                <TextInput
                  label="Invoice / Bill Number"
                  value={invoiceNumber}
                  placeholder="e.g. INV-001"
                  autoCapitalize="characters"
                  helperText="Extracted invoice number from receipt"
                  onChangeText={setInvoiceNumber}
                />
              </View>

              {/* Final Confirm CTA */}
              <View className="gap-2.5 pt-2">
                <Button
                  loading={saving}
                  disabled={saving}
                  onPress={saveExpenseAsPaid}
                  className="w-full bg-emerald-600"
                  leftIcon={FileCheck2}
                >
                  Confirm & Save as Paid
                </Button>

                <Button variant="outline" onPress={() => setPage('details')} className="w-full">
                  <Text className="font-semibold">Back to Details</Text>
                </Button>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Live Camera Modal for taking in-app receipt photos */}
      <ReceiptCameraCaptureModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCaptured={handleCameraPhoto}
      />
    </ScreenShell>
  );
}
