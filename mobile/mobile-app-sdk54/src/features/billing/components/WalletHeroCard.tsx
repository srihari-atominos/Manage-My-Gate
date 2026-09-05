import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Plus } from 'lucide-react-native';

export interface WalletHeroCardProps {
  balance: number;
  onTopUpPress?: () => void;
  isVerified?: boolean;
  topUpLabel?: string;
  className?: string;
  loading?: boolean;
}

export function WalletHeroCard({
  balance = 0,
  onTopUpPress,
  isVerified = true,
  topUpLabel = 'Add Money to Wallet',
  className = '',
  loading = false,
}: WalletHeroCardProps) {
  const formattedBalance = `₹${balance.toLocaleString('en-IN')}`;

  return (
    <View
      className={`bg-card border border-border rounded-2xl p-5 shadow-xs mb-4 ${className}`}
    >
      {/* Header Row: Label & Verified Badge */}
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Available Wallet Balance
        </Text>

        {isVerified ? (
          <View className="flex-row items-center bg-status-success/15 px-2.5 py-1 rounded-full">
            <Icon as={ShieldCheck} size={12} className="text-status-success me-1 shrink-0" />
            <Text className="text-xs font-semibold text-status-success">Verified Ledger</Text>
          </View>
        ) : null}
      </View>

      {/* Main Balance Display */}
      <Text className="text-3xl font-extrabold text-foreground tracking-tight mb-4">
        {formattedBalance}
      </Text>

      {/* Instant Top-Up CTA */}
      {onTopUpPress ? (
        <Button
          size="lg"
          className="w-full flex-row items-center justify-center bg-emerald-600 active:bg-emerald-700"
          onPress={onTopUpPress}
          loading={loading}
          accessibilityRole="button"
          accessibilityLabel={topUpLabel}
        >
          <Icon as={Plus} size={18} color="#FFFFFF" className="me-2 shrink-0" />
          <Text className="font-bold text-base text-white">{topUpLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export default WalletHeroCard;
