import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BottomSheet } from '@/components/ui';
import { Button } from '@/components/common';
import { Wallet, CreditCard, Building2, ChevronRight } from 'lucide-react-native';

interface PaymentMethodBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  invoice: any | null;
  onSelectMethod: (method: 'WALLET' | 'RAZORPAY' | 'OFFLINE') => void;
  loading?: boolean;
}

export const PaymentMethodBottomSheet: React.FC<PaymentMethodBottomSheetProps> = ({
  visible,
  onClose,
  invoice,
  onSelectMethod,
  loading = false,
}) => {
  if (!invoice) return null;

  const currencySymbol = '₹';
  const amount = invoice.amount || invoice.totalDue || 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Select Payment Method">
      <View className="space-y-4 pb-6">
        <View className="bg-muted/40 p-3 rounded-xl flex-row items-center justify-between my-1">
          <Text className="text-sm text-muted-foreground text-start">Amount to Pay:</Text>
          <Text className="text-xl font-bold text-foreground text-start">
            {currencySymbol}{amount.toLocaleString()}
          </Text>
        </View>

        {/* Option 1: Wallet Balance */}
        <TouchableOpacity
          activeOpacity={0.7}
          className="bg-card border border-border p-4 rounded-xl flex-row items-center justify-between mb-2"
          onPress={() => {
            onClose();
            onSelectMethod('WALLET');
          }}
          disabled={loading}
        >
          <View className="flex-row items-center space-x-3">
            <View className="bg-emerald-500/10 p-2.5 rounded-full me-3">
              <Wallet size={22} className="text-emerald-600 dark:text-emerald-400" />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground text-start">
                Community Resident Wallet
              </Text>
              <Text className="text-xs text-muted-foreground text-start">
                Instant zero-fee wallet deduction
              </Text>
            </View>
          </View>
          <ChevronRight size={20} className="text-muted-foreground me-1" />
        </TouchableOpacity>

        {/* Option 2: Razorpay Online Gateway */}
        <TouchableOpacity
          activeOpacity={0.7}
          className="bg-card border border-border p-4 rounded-xl flex-row items-center justify-between mb-2"
          onPress={() => {
            onClose();
            onSelectMethod('RAZORPAY');
          }}
          disabled={loading}
        >
          <View className="flex-row items-center space-x-3">
            <View className="bg-sky-500/10 p-2.5 rounded-full me-3">
              <CreditCard size={22} className="text-sky-600 dark:text-sky-400" />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground text-start">
                Credit / Debit Card / UPI / NetBanking
              </Text>
              <Text className="text-xs text-muted-foreground text-start">
                Secure online payment via Razorpay
              </Text>
            </View>
          </View>
          <ChevronRight size={20} className="text-muted-foreground me-1" />
        </TouchableOpacity>

        {/* Option 3: Bank Transfer / Cash Offline */}
        <TouchableOpacity
          activeOpacity={0.7}
          className="bg-card border border-border p-4 rounded-xl flex-row items-center justify-between mb-2"
          onPress={() => {
            onClose();
            onSelectMethod('OFFLINE');
          }}
          disabled={loading}
        >
          <View className="flex-row items-center space-x-3">
            <View className="bg-amber-500/10 p-2.5 rounded-full me-3">
              <Building2 size={22} className="text-amber-600 dark:text-amber-400" />
            </View>
            <View>
              <Text className="text-base font-semibold text-foreground text-start">
                Bank Transfer / Cash / Cheque
              </Text>
              <Text className="text-xs text-muted-foreground text-start">
                Submit offline payment proof reference
              </Text>
            </View>
          </View>
          <ChevronRight size={20} className="text-muted-foreground me-1" />
        </TouchableOpacity>

        <Button variant="ghost" size="default" onPress={onClose} className="mt-2">
          Cancel
        </Button>
      </View>
    </BottomSheet>
  );
};

export default PaymentMethodBottomSheet;
