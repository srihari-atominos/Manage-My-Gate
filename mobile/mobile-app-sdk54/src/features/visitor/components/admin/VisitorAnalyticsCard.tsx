import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { VisitorAnalyticsData } from '../../store/adminVisitorThunks';
import { ShieldCheck, Clock, Users, ShieldAlert, TrendingUp } from 'lucide-react-native';

interface VisitorAnalyticsCardProps {
  analytics: VisitorAnalyticsData | null;
}

export const VisitorAnalyticsCard: React.FC<VisitorAnalyticsCardProps> = ({ analytics }) => {
  const totalEntries = analytics?.totalEntriesToday ?? 0;
  const activeInside = analytics?.activeInsideCount ?? 0;
  const pending = analytics?.pendingApprovalsCount ?? 0;
  const blacklisted = analytics?.totalBlacklistedCount ?? 0;
  const peakHour = analytics?.peakHour || '5:00 PM - 6:00 PM';

  return (
    <View className="bg-card border border-border rounded-2xl p-4 gap-3">
      <View className="flex-row items-center justify-between border-b border-border/40 pb-2.5">
        <View className="flex-row items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <Text className="text-sm font-bold text-foreground">Gate Entry Traffic Summary</Text>
        </View>
        <Text className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          Today
        </Text>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 bg-muted/40 p-2.5 rounded-xl border border-border/40 items-center">
          <Text className="text-lg font-extrabold text-foreground">{totalEntries}</Text>
          <Text className="text-[10px] font-semibold text-muted-foreground">Total Entries</Text>
        </View>

        <View className="flex-1 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 items-center">
          <Text className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{activeInside}</Text>
          <Text className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Inside Now</Text>
        </View>

        <View className="flex-1 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 items-center">
          <Text className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{pending}</Text>
          <Text className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Pending</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between pt-1">
        <Text className="text-xs text-muted-foreground">
          Peak Traffic Hour: <Text className="font-bold text-foreground">{peakHour}</Text>
        </Text>
        <Text className="text-xs text-destructive font-semibold">
          {blacklisted} Blacklisted
        </Text>
      </View>
    </View>
  );
};

export default VisitorAnalyticsCard;
