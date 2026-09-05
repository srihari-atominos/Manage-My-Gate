import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Amenity, AmenitySlot } from '../store/amenitySlice';
import { cn } from '@/lib/utils';

export interface BookingCheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amenity: Amenity | null;
  slot: AmenitySlot | null;
  date: string;
  guestsCount: number;
  paymentMethod: 'WALLET' | 'ONLINE';
  onPaymentMethodChange: (method: 'WALLET' | 'ONLINE') => void;
  walletBalance: number;
  totalFee: number;
  isBalanceSufficient: boolean;
  loading?: boolean;
  error?: string | null;
  onTopUp?: () => void;
}

export function BookingCheckoutModal({
  visible,
  onClose,
  onConfirm,
  amenity,
  slot,
  date,
  guestsCount,
  paymentMethod,
  onPaymentMethodChange,
  walletBalance,
  totalFee,
  isBalanceSufficient,
  loading = false,
  error = null,
  onTopUp,
}: BookingCheckoutModalProps) {
  if (!visible || !amenity) return null;
  
  const isDaily = amenity.pricing?.pricingType === 'daily';
  if (!isDaily && !slot) return null;

  const unitRate = isDaily ? (amenity.pricing?.baseRate ?? amenity.bookingFee ?? 0) : (slot?.fee ?? slot?.price ?? 0);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Review Reservation">
      <View className="py-2">
        {/* Reservation Detail Rows */}
        <View className="bg-muted/20 p-3.5 rounded-2xl border border-border/40 mb-4">
          <DetailRow label="Facility" value={amenity.name} iconName="Building2" />
          <DetailRow label="Date" value={date} iconName="Calendar" />
          <DetailRow 
            label="Time Slot" 
            value={isDaily ? 'Full Day' : `${slot?.startTime || '00:00'} - ${slot?.endTime || '00:00'}`} 
            iconName="Clock" 
          />
          <DetailRow 
            label="Guests" 
            value={isDaily ? `${amenity.capacity || 1} Person(s) (Included)` : `${guestsCount} Person(s)`} 
            iconName="Users" 
          />
          <DetailRow 
            label="Unit Rate" 
            value={unitRate ? `₹${unitRate}` : 'Free'} 
            iconName="Tag" 
          />
          <DetailRow
            label="Security Deposit"
            value={amenity.pricing?.securityDeposit ? `₹${amenity.pricing.securityDeposit}` : 'None'}
            iconName="Shield"
          />
          <DetailRow
            label="Total Amount"
            value={`₹${totalFee.toFixed(2)}`}
            iconName="DollarSign"
            isLast={true}
          />
        </View>

        {/* Payment Method Selector */}
        <Text variant="small" className="font-semibold text-foreground mb-2">
          Select Payment Method
        </Text>
        <View className="flex-row gap-2.5 mb-4">
          <Pressable
            onPress={() => onPaymentMethodChange('WALLET')}
            className={cn(
              'flex-1 p-3 rounded-xl border flex-col justify-between active:opacity-80',
              paymentMethod === 'WALLET'
                ? 'bg-primary/10 border-primary dark:bg-primary/20'
                : 'bg-card border-border'
            )}
          >
            <View className="flex-row items-center justify-between">
              <Text className={cn('font-semibold text-sm', paymentMethod === 'WALLET' ? 'text-primary' : 'text-foreground')}>
                Digital Wallet
              </Text>
              <StatusBadge
                label={`₹${walletBalance.toFixed(2)}`}
                variant={isBalanceSufficient ? 'success' : 'danger'}
                size="sm"
              />
            </View>
            <Text variant="muted" className="text-xs mt-1 text-muted-foreground">
              Instant deduction
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onPaymentMethodChange('ONLINE')}
            className={cn(
              'flex-1 p-3 rounded-xl border flex-col justify-between active:opacity-80',
              paymentMethod === 'ONLINE'
                ? 'bg-primary/10 border-primary dark:bg-primary/20'
                : 'bg-card border-border'
            )}
          >
            <Text className={cn('font-semibold text-sm', paymentMethod === 'ONLINE' ? 'text-primary' : 'text-foreground')}>
              Razorpay Online
            </Text>
            <Text variant="muted" className="text-xs mt-1 text-muted-foreground">
              UPI / Card / Netbank
            </Text>
          </Pressable>
        </View>

        {/* Balance warning */}
        {paymentMethod === 'WALLET' && !isBalanceSufficient && (
          <View className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl mb-4">
            <Text className="text-xs text-red-600 dark:text-red-400 font-medium">
              Insufficient wallet balance (₹{(walletBalance || 0).toFixed(2)}). Please tap "Top Up Wallet" below to add funds.
            </Text>
          </View>
        )}

        {/* API Error warning */}
        {error && (
          <View className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl mb-4">
            <Text className="text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row gap-3 mt-2">
          <Button variant="outline" onPress={onClose} disabled={loading} className="flex-1">
            <Text>Cancel</Text>
          </Button>
          {paymentMethod === 'WALLET' && !isBalanceSufficient ? (
            <Button
              variant="default"
              onPress={onTopUp}
              disabled={loading}
              className="flex-1 bg-amber-500"
            >
              <Text className="text-white font-semibold">
                Top Up Wallet
              </Text>
            </Button>
          ) : (
            <Button
              variant="default"
              onPress={onConfirm}
              disabled={loading}
              className="flex-1 bg-primary"
            >
              <Text className="text-white font-semibold">
                {loading ? 'Reserving...' : 'Confirm & Book'}
              </Text>
            </Button>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

export default BookingCheckoutModal;
