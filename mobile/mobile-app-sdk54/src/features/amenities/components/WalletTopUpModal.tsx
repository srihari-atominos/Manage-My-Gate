import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WalletTopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void;
  loading?: boolean;
}

export function WalletTopUpModal({
  visible,
  onClose,
  onSubmit,
  loading = false,
}: WalletTopUpModalProps) {
  const presetAmounts = [10, 25, 50, 100];
  const [selectedAmount, setSelectedAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>('25');

  if (!visible) return null;

  const handlePresetSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(String(amount));
  };

  const handleCustomChange = (text: string) => {
    setCustomAmount(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      setSelectedAmount(parsed);
    } else {
      setSelectedAmount(0);
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(customAmount);
    if (amount > 0) {
      onSubmit(amount);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Top-Up Digital Wallet">
      <View className="py-2">
        <Text variant="muted" className="text-xs mb-3 text-muted-foreground">
          Preload credits for instant one-tap amenity reservations.
        </Text>

        {/* Preset Amount Chips */}
        <Text variant="small" className="font-semibold text-foreground mb-2">
          Select Preset Amount
        </Text>
        <View className="flex-row gap-2 mb-4">
          {presetAmounts.map((amt) => {
            const isSelected = selectedAmount === amt;
            return (
              <Pressable
                key={amt}
                onPress={() => handlePresetSelect(amt)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border items-center justify-center active:opacity-80',
                  isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-card border-border hover:border-border/80'
                )}
              >
                <Text
                  className={cn(
                    'font-bold text-sm',
                    isSelected ? 'text-white' : 'text-foreground'
                  )}
                >
                  ₹{amt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom Amount Input */}
        <View className="mb-4">
          <TextInput
            label="Or Enter Amount (₹)"
            value={customAmount}
            onChangeText={handleCustomChange}
            keyboardType="numeric"
            placeholder="e.g. 50"
          />
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-2">
          <Button variant="outline" onPress={onClose} disabled={loading} className="flex-1">
            <Text>Cancel</Text>
          </Button>
          <Button
            variant="default"
            onPress={handleConfirm}
            disabled={loading || selectedAmount <= 0}
            className="flex-1 bg-primary"
          >
            <Text className="text-white font-semibold">
              {loading ? 'Processing...' : `Add ₹${selectedAmount || 0}`}
            </Text>
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

export default WalletTopUpModal;
