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
    <View className="bg-card border border-amber-500/30 rounded-2xl p-4 gap-3 shadow-sm shadow-black/5">
      {/* Clickable Header Banner & Visitor Info */}
      <TouchableOpacity
        onPress={() => onPressDetails(item)}
        activeOpacity={0.8}
        className="gap-3"
      >
        {/* Header Banner */}
        <View className="flex-row items-center justify-between border-b border-border/60 pb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-amber-500/15 items-center justify-center">
              <ShieldAlert size={16} className="text-amber-600" />
            </View>
            <View>
              <Text className="text-[11px] font-bold font-sans text-amber-600 uppercase tracking-wider">
                Gate Walk-In Request
              </Text>
              <Text variant="muted" className="text-[12px] font-sans">
                {item.gateName}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Clock size={12} className="text-amber-600" />
            <Text className="text-[11px] font-bold font-sans text-amber-600">
              Waiting {item.waitingDurationMinutes}m
            </Text>
          </View>
        </View>

        {/* Visitor Info */}
        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center border border-primary/10">
            <User size={22} className="text-primary" />
          </View>

          <View className="flex-1 gap-1">
            <Text className="text-[16px] font-bold font-sans text-foreground">
              {item.visitorName}
            </Text>
            <Text variant="muted" className="text-[13px] font-sans">
              {item.phone} • {item.purpose}
            </Text>
            {item.vehicleNo ? (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Car size={14} className="text-muted-foreground" />
                <Text className="text-[12px] font-medium font-sans text-foreground">
                  {item.vehicleNo}
                </Text>
              </View>
            ) : null}
          </View>

          <StatusBadge label={item.passType} variant="info" />
        </View>
      </TouchableOpacity>

      {/* Quick Action Buttons */}
      <View className="flex-row items-center gap-2.5 pt-2">
        <Button
          variant="destructive"
          onPress={() => onReject(item)}
          className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5"
        >
          <X size={18} color="#fff" />
          <Text>Deny</Text>
        </Button>

        <Button
          variant="success"
          onPress={() => onApprove(item)}
          className="flex-1 h-11 rounded-xl flex-row items-center justify-center gap-1.5"
        >
          <Check size={18} color="#fff" />
          <Text>Approve</Text>
        </Button>
      </View>
    </View>
  );
};

export default WalkInApprovalCard;
