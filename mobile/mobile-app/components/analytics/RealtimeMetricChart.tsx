import React from 'react';
import { View } from 'react-native';
import { Activity } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export interface DataPoint {
  time: string;
  value: number;
}

export interface RealtimeMetricChartProps {
  title: string;
  data: DataPoint[];
  currentValOverride?: number;
  subtitle?: string;
  className?: string;
}

export const RealtimeMetricChart: React.FC<RealtimeMetricChartProps> = ({
  title,
  data = [],
  currentValOverride,
  subtitle,
  className,
}) => {
  // Compute max value to scale chart bars reliably
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const currentVal = currentValOverride !== undefined
    ? currentValOverride
    : data.length > 0
    ? data[data.length - 1].value
    : 0;

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4 shadow-xs', className)}>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </Text>
        <View className="size-7 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
          <Activity size={14} className="text-primary" />
        </View>
      </View>

      <View className="mb-4 flex-row items-baseline gap-2">
        <Text className="text-3xl font-extrabold text-foreground tracking-tight">
          {currentVal}
        </Text>
        {subtitle ? (
          <Text className="text-xs font-medium text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View className="h-32 flex-row items-end justify-between border-b border-border/60 pb-2 gap-x-1.5">
        {data.length === 0 ? (
          <View className="flex-1 items-center justify-center h-full">
            <Text className="text-xs text-muted-foreground">No telemetry data recorded</Text>
          </View>
        ) : (
          data.map((point, index) => {
            const heightPercent = Math.min(100, Math.max(8, (point.value / maxVal) * 100));
            return (
              <View key={`${point.time}-${index}`} className="items-center flex-1 h-full justify-end">
                <View
                  className="w-full bg-primary/20 rounded-t-sm justify-end overflow-hidden"
                  style={{ height: `${heightPercent}%` }}
                >
                  <View className="w-full bg-primary rounded-t-sm h-full" />
                </View>
                <Text className="mt-2 text-[10px] text-muted-foreground font-medium text-center" numberOfLines={1}>
                  {point.time}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

export default RealtimeMetricChart;
