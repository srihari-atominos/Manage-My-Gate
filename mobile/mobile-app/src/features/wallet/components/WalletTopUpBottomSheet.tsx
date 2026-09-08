import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/forms/TextInput';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChevronRight } from 'lucide-react-native';

export interface WalletTopUpBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  isGatewayReady: boolean;
  selectedPreset: number | 'CUSTOM';
  onSelectPreset: (preset: number | 'CUSTOM') => void;
  customAmountStr: string;
  onChangeCustomAmount: (val: string) => void;
  topUpAmount: number;
  expectedBalance: number;
  isTopUpInvalid: boolean;
  isProcessingTopUp: boolean;
  onProceedTopUp: () => void;
}

export function WalletTopUpBottomSheet({
  visible,
  onClose,
  isGatewayReady,
  selectedPreset,
  onSelectPreset,
  customAmountStr,
  onChangeCustomAmount,
  topUpAmount,
  expectedBalance,
  isTopUpInvalid,
  isProcessingTopUp,
  onProceedTopUp,
}: WalletTopUpBottomSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Add Money to Digital Wallet"
    >
      <View className="py-2 gap-4">
        {!isGatewayReady ? (
          <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <Text className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
              Online Top-Up Unavailable: Community management has not configured an online merchant account.
            </Text>
          </View>
        ) : null}

        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Select Top-Up Amount
        </Text>

        {/* Quick Denomination Presets */}
        <View className="flex-row gap-2.5">
          {[500, 1000, 2000].map((preset) => {
            const isSelected = selectedPreset === preset;
            return (
              <Button
                key={preset}
                variant={isSelected ? 'default' : 'outline'}
                onPress={() => onSelectPreset(preset)}
                className="flex-1 h-12 rounded-xl"
              >
                <Text
                  className={`font-extrabold text-sm ${
                    isSelected ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  + ₹{preset.toLocaleString('en-IN')}
                </Text>
              </Button>
            );
          })}
        </View>

        {/* Custom Top-Up Preset Option */}
        <View className="gap-2">
          <Button
            variant={selectedPreset === 'CUSTOM' ? 'default' : 'outline'}
            onPress={() => onSelectPreset('CUSTOM')}
            className="w-full h-11 rounded-xl"
          >
            <Text
              className={`font-bold text-xs ${
                selectedPreset === 'CUSTOM' ? 'text-primary-foreground' : 'text-foreground'
              }`}
            >
              Enter Custom Top-Up Amount
            </Text>
          </Button>

          {selectedPreset === 'CUSTOM' ? (
            <TextInput
              label="Custom Amount (₹)"
              value={customAmountStr}
              onChangeText={onChangeCustomAmount}
              placeholder="Enter amount (e.g. 1500)"
              keyboardType="numeric"
              inputClassName="font-bold text-base"
            />
          ) : null}
        </View>

        {/* Expected Balance Preview */}
        <View className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-muted-foreground">Top-Up Amount</Text>
            <Text className="text-base font-extrabold text-status-success">
              + ₹{topUpAmount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted-foreground">Balance After Top-Up</Text>
            <Text className="text-base font-bold text-foreground">
              ₹{expectedBalance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Submit Top-Up Button */}
        <Button
          variant="default"
          size="lg"
          className="w-full flex-row items-center justify-center bg-status-success active:bg-status-success/90 mt-2"
          disabled={isTopUpInvalid || isProcessingTopUp || !isGatewayReady}
          loading={isProcessingTopUp}
          onPress={onProceedTopUp}
          accessibilityRole="button"
          accessibilityLabel={`Proceed to Top-Up ₹${topUpAmount.toLocaleString('en-IN')} via Razorpay`}
        >
          <Text className="font-bold text-base text-primary-foreground me-1">
            {isGatewayReady
              ? `Proceed to Top-Up • ₹${topUpAmount.toLocaleString('en-IN')}`
              : 'Gateway Not Configured'}
          </Text>
          {isGatewayReady ? (
            <Icon as={ChevronRight} size={18} className="text-primary-foreground" />
          ) : null}
        </Button>
      </View>
    </BottomSheet>
  );
}

export default WalletTopUpBottomSheet;
