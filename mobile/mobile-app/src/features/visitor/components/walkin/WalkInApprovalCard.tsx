import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WalkInApprovalItem } from '../../mocks/visitorMocks';
import { ShieldAlert, Clock, Check, X, Car, User } from 'lucide-react-native';

export interface WalkInApprovalCardProps {
  item: WalkInApprovalItem;
  onApprove: (item: WalkInApprovalItem) => void;
  onReject: (item: WalkInApprovalItem) => void;
  onPressDetails: (item: WalkInApprovalItem) => void;
}

export const WalkInApprovalCard: React.FC<WalkInApprovalCardProps> = ({
  item,
  onApprove,
  onReject,
  onPressDetails,
}) => {
  return (
    <View className="bg-card border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 gap-3 shadow-sm">
      {/* Clickable Header Banner & Visitor Info */}
      <TouchableOpacity
        onPress={() => onPressDetails(item)}
        activeOpacity={0.8}
        className="gap-3"
      >
        {/* Header Banner */}
        <View className="flex-row items-center justify-between border-b border-border pb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center">
              <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400" />
            </View>
            <View>
              <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Gate Walk-In Request
              </Text>
              <Text variant="muted" className="text-[11px]">
                {item.gateName}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock size={12} className="text-amber-600 dark:text-amber-400" />
            <Text className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
              Waiting {item.waitingDurationMinutes}m
            </Text>
          </View>
        </View>

        {/* Visitor Info */}
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center border border-border">
            <User size={22} className="text-primary" />
          </View>

          <View className="flex-1 gap-0.5">
            <Text className="text-base font-extrabold text-foreground">
              {item.visitorName}
            </Text>
            <Text variant="muted" className="text-xs">
              {item.phone} • {item.purpose}
            </Text>
            {item.vehicleNo ? (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Car size={12} className="text-muted-foreground" />
                <Text className="text-xs font-mono font-bold text-foreground">
                  {item.vehicleNo}
                </Text>
              </View>
            ) : null}
          </View>

          <StatusBadge label={item.passType} variant="info" />
        </View>
      </TouchableOpacity>

      {/* Quick Action Buttons */}
      <View className="flex-row items-center gap-2.5 pt-1">
        <Button
          variant="destructive"
          onPress={() => onReject(item)}
          className="flex-1 h-10 rounded-xl flex-row items-center justify-center gap-1.5"
        >
          <X size={16} color="#fff" />
          <Text className="text-xs font-bold text-destructive-foreground">Deny Entry</Text>
        </Button>

        <Button
          variant="default"
          onPress={() => onApprove(item)}
          className="flex-1 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-700 flex-row items-center justify-center gap-1.5"
        >
          <Check size={16} color="#fff" />
          <Text className="text-xs font-bold text-white">Approve Entry</Text>
        </Button>
      </View>
    </View>
  );
};
