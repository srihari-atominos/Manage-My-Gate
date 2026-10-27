import React from 'react';
import { View, ScrollView } from 'react-native';
import { Card } from '@/components/common/Card';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { TrendingUp } from 'lucide-react-native';
import { type TimeSeriesPoint } from '../types';
import { formatINR } from '../utils/financeFormatters';

interface SurplusTrendChartProps {
  data: TimeSeriesPoint[];
}

export const SurplusTrendChart: React.FC<SurplusTrendChartProps> = ({ data }) => {
  const maxAbs = Math.max(...data.map((d) => Math.abs(Number(d.netSurplus || 0))), 1);

  return (
    <Card className="p-4 mb-5 rounded-3xl border border-border/80 bg-card shadow-2xs">
      <View className="flex-row items-center justify-between flex-wrap gap-2 mb-3">
        <View className="flex-row items-center gap-2.5">
          <View className="size-8 rounded-2xl bg-emerald-500/10 items-center justify-center shrink-0">
            <Icon as={TrendingUp} size={17} className="text-emerald-600 dark:text-emerald-400" />
          </View>
          <View>
            <Text className="text-sm font-bold text-foreground">Surplus & Deficit Trajectory</Text>
            <Text className="text-[11px] text-muted-foreground">Net Period Cash Variance</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3 shrink-0 bg-muted/40 px-2.5 py-1 rounded-full border border-border/40">
          <View className="flex-row items-center gap-1.5">
            <View className="size-2 rounded-full bg-emerald-500" />
            <Text className="text-[11px] text-foreground font-semibold">Surplus</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="size-2 rounded-full bg-rose-500" />
            <Text className="text-[11px] text-foreground font-semibold">Deficit</Text>
          </View>
        </View>
      </View>

      {data.length === 0 ? (
        <View className="py-10 items-center justify-center bg-muted/20 rounded-2xl">
          <Text className="text-xs text-muted-foreground font-medium">
            No net cash movement recorded for this period.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          className="flex-row">
          <View className="flex-row items-end gap-3 min-w-full justify-around pt-2 pb-1">
            {data.map((point) => {
              const isNegative = point.netSurplus < 0;
              const barHeight = Math.min(100, Math.max(8, (Math.abs(point.netSurplus) / maxAbs) * 100));

              return (
                <View key={point.periodKey} className="items-center px-2 min-w-[58px]">
                  {/* Floating Metric on Top */}
                  <Text
                    className={`text-[9px] font-bold font-mono mb-1 ${
                      isNegative ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                    numberOfLines={1}>
                    {formatINR(point.netSurplus)}
                  </Text>

                  {/* Vertical Container */}
                  <View className="h-28 w-5 justify-end items-center bg-muted/30 rounded-full overflow-hidden p-0.5">
                    <View
                      className={`w-full rounded-full ${
                        isNegative ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ height: `${barHeight}%` }}
                      accessibilityLabel={`${point.label}: ${formatINR(point.netSurplus)}`}
                    />
                  </View>

                  {/* Divider line */}
                  <View className="w-full h-px bg-border/80 my-1.5" />

                  {/* Period Label */}
                  <Text
                    className="text-[10px] text-muted-foreground font-semibold text-center"
                    numberOfLines={1}>
                    {point.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Card>
  );
};

export default SurplusTrendChart;
