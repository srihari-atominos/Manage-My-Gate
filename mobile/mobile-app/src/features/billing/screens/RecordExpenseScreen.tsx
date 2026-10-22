import React, { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Plus, Receipt, Trash2, FileText } from 'lucide-react-native';
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

const createEmptyItem = () => ({ name: '', qty: '1', price: '' });

export default function RecordExpenseScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [ocr, setOcr] = useState<any>(null);
  const [ocrFeedback, setOcrFeedback] = useState<{ tone: 'info' | 'success' | 'error'; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; amount?: string; category?: string }>({});
  const [cameraVisible, setCameraVisible] = useState(false);
  const [replacingReceipt, setReplacingReceipt] = useState(false);
  const [items, setItems] = useState<Array<{ name: string; qty: string; price: string }>>([]);
  const [f, setF] = useState({
    name: '',
    type: 'PURCHASE',
    category: categoryMap.PURCHASE,
    method: 'UPI',
    settlement: 'UNPAID' as 'PAID' | 'UNPAID',
    date: new Date(),
    amount: '',
    notes: '',
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
      setReplacingReceipt(false);
    }
  };

  const useCameraPhoto = (file: ReceiptCaptureFile) => {
    setReceipt(file);
    setOcr(null);
    setOcrFeedback(null);
    setReplacingReceipt(false);
    setCameraVisible(false);
  };

  const scan = async () => {
    if (!receipt || scanning) return;
    try {
      setScanning(true);
      setOcr(null);
      setOcrFeedback({ tone: 'info', message: 'Scanning receipt…' });
      const result = await expenseService.previewReceiptOcr(receipt);
      if (result.status !== 'COMPLETED') {
        setOcrFeedback({ tone: 'error', message: result.error || 'Receipt data could not be extracted. Enter the details manually.' });
        return;
      }

      const data = result.result;
      setOcr(data);

      // Automatically populate respective form fields with extracted OCR data
      const updates: Partial<typeof f> = {};
      const newItems: Array<{ name: string; qty: string; price: string }> = [];

      // 1. Expense Name: Preserve user-entered name if already typed
      if (!f.name.trim() && (data?.suggestedExpenseName || data?.merchant)) {
        updates.name = data.suggestedExpenseName || data.merchant;
      }
      // 2. Receipt / Expense Date
      if (data?.expenseDate || data?.receiptDate) {
        const dStr = data.expenseDate || data.receiptDate;
        updates.date = new Date(`${dStr}T00:00:00`);
      }
      // 3. Accurate Total Amount
      if (data?.totalAmount != null) {
        updates.amount = String(data.totalAmount);
      } else if (data?.totalMinor != null) {
        updates.amount = String(data.totalMinor / 100);
      }
      if (data?.suggestedExpenseType && types.some((t) => t.value === data.suggestedExpenseType)) {
        updates.type = data.suggestedExpenseType;
        updates.category = data.suggestedCategory || categoryMap[data.suggestedExpenseType] || 'Other';
      } else if (data?.suggestedCategory) {
        updates.category = data.suggestedCategory;
      }

      // If a payment screenshot (GPay, PhonePe, Paytm, etc.) was detected, set method to UPI and settlement to PAID
      if (data?.paymentMethod && methods.some((m) => m.value === data.paymentMethod)) {
        updates.method = data.paymentMethod;
      } else if (data?.isPaymentScreenshot) {
        updates.method = 'UPI';
      }

      // Only a screenshot that shows a completed payment may mark the expense as paid.
      if (data?.settlement === 'PAID') {
        updates.settlement = 'PAID';
      }

      // 4. Description / Notes: Extract & autofill Description / Notes
      const extractedNotes = data?.notes || data?.suggestedNotes || data?.description || '';
      if (extractedNotes) {
        updates.notes = f.notes.trim() ? `${f.notes}\n\n${extractedNotes}` : extractedNotes;
      } else if (data?.transactionReference) {
        const upiNote = `UPI Ref: ${data.transactionReference}${data.merchant ? ` | Paid to ${data.merchant}` : ''}`;
        updates.notes = f.notes ? `${f.notes}\n${upiNote}` : upiNote;
      } else if (data?.receiptNumber) {
        const billNote = `Invoice/Bill #${data.receiptNumber}${data.merchant ? ` from ${data.merchant}` : ''}`;
        updates.notes = f.notes ? `${f.notes}\n${billNote}` : billNote;
      }

      // Populate item rows ONLY if legitimate itemized rows exist (e.g. supermarket/grocery receipt)
      // Payment app screenshots (GPay, PhonePe, Paytm) and non-itemized repair bills have 0 items
      if (data?.items?.length) {
        data.items.forEach((x: any) => {
          const unitPriceVal =
            x.unitPrice != null
              ? x.unitPrice
              : (x.unitPriceMinor || x.amountMinor || 0) / 100;
          newItems.push({
            name: x.description || x.itemName || '',
            qty: String(x.quantity != null ? x.quantity : 1),
            price: String(unitPriceVal),
          });
        });
        setItems(newItems);
        if (data.totalAmount == null && data.totalMinor == null) {
          const itemSum = newItems.reduce(
            (acc, curr) => acc + (Number(curr.qty) || 1) * (Number(curr.price) || 0),
            0
          );
          if (itemSum > 0) {
            updates.amount = String(itemSum);
          }
        }
      } else {
        setItems([]);
      }

      setF((prev) => ({ ...prev, ...updates }));
      setFieldErrors({});

      const entered: string[] = [];
      if (updates.name) entered.push('Expense Name');
      if (updates.date) entered.push('Date');
      if (updates.amount) entered.push('Amount');
      if (newItems.length) entered.push(`${newItems.length} Items`);
      if (updates.notes) entered.push('Description / Notes');
      if (updates.type) entered.push('Expense Type');
      if (updates.method === 'UPI') entered.push('Payment (UPI - Paid)');

      const isUPI = data?.isPaymentScreenshot || data?.paymentMethod === 'UPI';
      const warnings: Array<{ code: string; message: string }> = Array.isArray(data?.warnings) ? data.warnings : [];
      if (warnings.length) {
        setOcrFeedback({
          tone: 'info',
          message: `Scanned, but please check these before saving:\n• ${warnings.map((w) => w.message).join('\n• ')}`,
        });
        return;
      }
      setOcrFeedback({
        tone: 'success',
        message: isUPI
          ? `UPI Payment screenshot detected! Automatically entered: ${entered.join(', ')}. Review the details below before saving.`
          : entered.length
          ? `Receipt scanned! Automatically entered ${entered.join(', ')}. Review the details below before saving.`
          : 'Receipt scanned, but specific fields could not be recognized. Please enter details manually.',
      });
    } catch (error: any) {
      setOcrFeedback({ tone: 'error', message: error?.message || 'Unable to scan this receipt. Enter the details manually.' });
    } finally {
      setScanning(false);
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const updateItem = (index: number, field: 'name' | 'qty' | 'price', value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const itemsTotal = items.reduce(
    (sum, x) => sum + (Number(x.qty) || 0) * (Number(x.price) || 0),
    0
  );

  const save = async () => {
    const errors: { name?: string; amount?: string; category?: string } = {};

    if (!f.name.trim()) {
      errors.name = 'Please enter an Expense Name.';
    }

    const validItems = items.filter(
      (x) => x.name.trim() && Number(x.price) > 0
    );
    const computedItemsTotal = validItems.reduce(
      (sum, x) => sum + (Number(x.qty) || 1) * (Number(x.price) || 0),
      0
    );

    // If itemized rows are provided with valid prices, use their calculated total; otherwise fallback to typed amount
    const finalAmount = validItems.length > 0 ? computedItemsTotal : (Number(f.amount) || 0);

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
      const subtotal = finalAmount;
      const effectiveCategory =
        f.type === 'OTHER' ? f.category.trim() : categoryMap[f.type] || 'Other';

      const r: any = await expenseService.create({
        idempotencyKey: id,
        name: f.name.trim(),
        expenseType: f.type,
        category: effectiveCategory,
        description: f.notes.trim() || undefined,
        expenseDate: f.date.toISOString(),
        subtotal,
        taxAmount: 0,
        additionalCharges: 0,
        invoiceNumber: ocr?.receiptNumber || undefined,
        vendor: ocr?.merchant ? { name: ocr.merchant } : undefined,
        items: validItems.map((x) => ({
          itemName: x.name.trim(),
          quantity: Number(x.qty) || 1,
          unit: 'Unit',
          unitPrice: Number(x.price) || 0,
        })),
        initialPayment:
          f.settlement === 'PAID'
            ? {
                idempotencyKey: id + ':PAYMENT',
                amount: finalAmount,
                paymentMethod: f.method,
                paymentApplication: 'NOT_SPECIFIED',
                fundingSource: funding(f.method),
                paymentDate: f.date.toISOString(),
                transactionReference: ocr?.transactionReference || undefined,
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
          'Expense was recorded successfully, but the receipt attachment could not be uploaded. You can re-upload it later from the expense details.',
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

  return (
    <ScreenShell
      title="Expense"
      subtitle="Record a community expense"
      iconName="Receipt"
      showBackButton
      hideBottomNav={true}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        contentContainerClassName="gap-3.5 pb-20 pt-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card 1: Expense Details & Payment */}
        <View className="gap-3 rounded-2xl border border-border bg-card p-3.5">
          <View>
            <Text className="text-base font-bold text-foreground">Expense Details</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Enter the basic information for this expense.
            </Text>
          </View>

          <TextInput
            label="Expense Name"
            required
            value={f.name}
            error={fieldErrors.name}
            placeholder="e.g. Generator Diesel Refill"
            onChangeText={(v) => {
              set('name', v);
              if (fieldErrors.name) setFieldErrors((e) => ({ ...e, name: undefined }));
            }}
          />

          <DropdownSelect
            label="Expense Type"
            required
            options={types}
            value={f.type}
            onValueChange={handleTypeChange}
          />

          {f.type === 'OTHER' ? (
            <TextInput
              label="Category"
              required
              value={f.category}
              error={fieldErrors.category}
              placeholder="e.g. Landscaping, Legal, Community Event"
              helperText="Specify the custom category for this expense"
              onChangeText={(v) => {
                set('category', v);
                if (fieldErrors.category) setFieldErrors((e) => ({ ...e, category: undefined }));
              }}
            />
          ) : null}

          <View className="border-t border-border/60 pt-3 gap-2.5">
            <Text className="text-base font-bold text-foreground">Payment</Text>

            <DropdownSelect
              label="Payment Method"
              required
              options={methods}
              value={f.method}
              onValueChange={(v) => set('method', v)}
            />

            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Payment Settlement</Text>
              <View className="flex-row gap-2">
                {(['PAID', 'UNPAID'] as const).map((v) => {
                  const isSelected = f.settlement === v;
                  return (
                    <Pressable
                      key={v}
                      onPress={() => set('settlement', v)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set payment settlement to ${v}`}
                      className={`flex-1 rounded-xl py-2.5 px-3 items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary shadow-xs'
                          : 'bg-muted/60 border-border/70'
                      }`}
                    >
                      <Text
                        className={`text-sm font-bold ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {v === 'PAID' ? 'Paid' : 'Unpaid'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <TextInput
            label="Description / Notes"
            value={f.notes}
            placeholder="Optional notes or reference information"
            multiline
            numberOfLines={3}
            inputClassName="min-h-[64px] py-2"
            onChangeText={(v) => set('notes', v)}
          />
        </View>

        {/* Optional Receipt Card */}
        <View className="gap-2.5 rounded-2xl border border-border bg-card p-3.5">
          <View className="flex-row items-center gap-2">
            <FileText size={16} className="text-primary" />
            <Text className="font-bold text-foreground">Receipt / Payment Screenshot</Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            Upload a store receipt, utility bill, or UPI payment screenshot (GPay, PhonePe, Paytm, etc.).
          </Text>

          {receipt ? (
            <View className="gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
              <View className="flex-row items-center justify-between">
                <Text className="me-2 flex-1 text-xs font-semibold text-foreground" numberOfLines={1}>{receipt.name}</Text>
                <View className="flex-row gap-3">
                  <Pressable onPress={() => setReplacingReceipt((value) => !value)} hitSlop={8}><Text className="text-xs font-bold text-primary">Replace</Text></Pressable>
                  <Pressable onPress={() => { setReceipt(null); setOcr(null); setOcrFeedback(null); setReplacingReceipt(false); }} hitSlop={8}><Text className="text-xs font-bold text-destructive">Remove</Text></Pressable>
                </View>
              </View>

              {replacingReceipt ? (
                <View className="flex-row gap-2">
                  <Button variant="outline" onPress={pick} className="flex-1"><Text className="text-xs font-bold">Upload File</Text></Button>
                  <Button variant="outline" onPress={() => setCameraVisible(true)} className="flex-1"><Text className="text-xs font-bold">Take Photo</Text></Button>
                </View>
              ) : null}

              <Button loading={scanning} onPress={scan} variant="outline" className="mt-1">
                <Text className="text-xs font-bold">{scanning ? 'Scanning Receipt…' : 'Scan & Extract Receipt Data'}</Text>
              </Button>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <Button variant="outline" onPress={pick} className="flex-1"><Text className="text-sm font-semibold">Upload Receipt</Text></Button>
              <Button variant="outline" onPress={() => setCameraVisible(true)} className="flex-1"><Text className="text-sm font-semibold">Take Photo</Text></Button>
            </View>
          )}

          {ocrFeedback ? (
            <View className={`rounded-xl border p-3 ${ocrFeedback.tone === 'error' ? 'border-destructive/30 bg-destructive/5' : ocrFeedback.tone === 'success' ? 'border-primary/25 bg-primary/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              <Text className={`text-xs font-medium ${ocrFeedback.tone === 'error' ? 'text-destructive' : ocrFeedback.tone === 'success' ? 'text-primary' : 'text-amber-700 dark:text-amber-400'}`}>{ocrFeedback.message}</Text>
            </View>
          ) : null}
        </View>
        {/* Card 2: Amount & Items */}
        <View className="gap-3 rounded-2xl border border-border bg-card p-3.5">
          <View>
            <Text className="text-base font-bold text-foreground">Amount & Items</Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              Add the date, total amount, and item details if available.
            </Text>
          </View>

          <DatePicker
            label="Expense Date"
            value={f.date}
            onChange={(v) => set('date', v)}
          />

          <TextInput
            label="Amount (₹)"
            required
            keyboardType="decimal-pad"
            value={f.amount}
            error={fieldErrors.amount}
            placeholder={itemsTotal > 0 ? itemsTotal.toFixed(2) : '0.00'}
            helperText={
              itemsTotal > 0 && !f.amount
                ? `Calculated from itemized total: ₹${itemsTotal.toFixed(2)}`
                : undefined
            }
            onChangeText={(v) => {
              set('amount', v);
              if (fieldErrors.amount) setFieldErrors((e) => ({ ...e, amount: undefined }));
            }}
          />

          {/* Items Header */}
          <View className="border-t border-border/60 pt-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 pe-2">
                <Text className="text-sm font-bold text-foreground">Items (Optional)</Text>
                <Text className="text-xs text-muted-foreground">
                  Add only when you want an itemized record.
                </Text>
              </View>
              <Pressable
                onPress={addItem}
                hitSlop={8}
                className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 active:opacity-70 shrink-0"
                accessibilityRole="button"
                accessibilityLabel="Add item"
              >
                <Plus size={14} className="text-primary" />
                <Text className="text-xs font-bold text-primary">Add Item</Text>
              </Pressable>
            </View>

            {items.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border py-2.5 items-center">
                <Text className="text-xs text-muted-foreground">No itemized entries added</Text>
              </View>
            ) : null}

            {/* Responsive Item Cards */}
            <View className="gap-2.5">
              {items.map((x, i) => {
                const lineTotal = (Number(x.qty) || 0) * (Number(x.price) || 0);
                return (
                  <View
                    key={i}
                    className="rounded-xl border border-border/80 bg-muted/20 p-2.5 gap-2"
                  >
                    {/* Header Row: Item Number, Line Total Preview, and Accessible Remove Button */}
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5 min-w-0 flex-1">
                        <View className="h-5 w-5 rounded-full bg-primary/10 items-center justify-center shrink-0">
                          <Text className="text-[10px] font-bold text-primary">{i + 1}</Text>
                        </View>
                        <Text className="text-xs font-bold text-foreground">Item #{i + 1}</Text>
                        {lineTotal > 0 && (
                          <Text className="text-xs text-muted-foreground font-semibold">
                            · ₹{lineTotal.toFixed(2)}
                          </Text>
                        )}
                      </View>

                      <Pressable
                        onPress={() => removeItem(i)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        className="flex-row items-center gap-1 rounded-md px-2 py-1 bg-rose-500/10 active:opacity-60 shrink-0"
                        accessibilityRole="button"
                        accessibilityLabel={`Remove item ${i + 1}`}
                      >
                        <Trash2 size={13} className="text-rose-600 dark:text-rose-400" />
                        <Text className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          Remove
                        </Text>
                      </Pressable>
                    </View>

                    {/* Full-width Item Description */}
                    <TextInput
                      label="Item Description"
                      placeholder="e.g. LED bulb 10W, cement bag"
                      value={x.name}
                      labelClassName="text-xs mb-0.5"
                      onChangeText={(v) => updateItem(i, 'name', v)}
                    />

                    {/* Responsive 50/50 Grid for Qty & Unit Price */}
                    <View className="flex-row gap-2">
                      <View className="min-w-0 flex-1">
                        <TextInput
                          label="Quantity"
                          keyboardType="decimal-pad"
                          value={x.qty}
                          placeholder="1"
                          labelClassName="text-xs mb-0.5"
                          onChangeText={(v) => updateItem(i, 'qty', v)}
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <TextInput
                          label="Unit Price (₹)"
                          keyboardType="decimal-pad"
                          value={x.price}
                          placeholder="0.00"
                          labelClassName="text-xs mb-0.5"
                          onChangeText={(v) => updateItem(i, 'price', v)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {items.length > 0 && itemsTotal > 0 ? (
              <View className="flex-row justify-between items-center rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 mt-2">
                <Text className="text-xs font-medium text-muted-foreground">
                  Itemized Total ({items.length} item{items.length === 1 ? '' : 's'}):
                </Text>
                <Text className="text-xs font-bold text-primary">₹{itemsTotal.toFixed(2)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Save Button */}
        <View className="pt-2 pb-6">
          <Button
            loading={saving}
            onPress={save}
            leftIcon={Receipt}
            className="w-full"
          >
            <Text className="text-white font-bold text-base">Save Expense</Text>
          </Button>
          {Object.keys(fieldErrors).length > 0 ? (
            <Text className="text-destructive text-xs font-semibold text-center mt-2">
              Please fix the highlighted fields above to save this expense.
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <ReceiptCameraCaptureModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onCaptured={useCameraPhoto}
      />
    </ScreenShell>
  );
}
