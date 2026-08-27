import React from 'react';
import { View, Text } from 'react-native';
import { Activity } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface DataPoint {
  time: string;
  value: number;
}

export interface RealtimeMetricChartProps {
  title: string;
  data: DataPoint[];
  className?: string;
}

export const RealtimeMetricChart = ({
  title,
  data,
  className,
}: RealtimeMetricChartProps) => {
  // Finds max to scale the mock bars
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const currentVal = data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4 shadow-xs', className)}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wider">
          {title}
        </Text>
        <Activity size={16} className="text-primary" />
      </View>
      
      <View className="mb-6 flex-row items-end">
        <Text className="text-3xl font-bold text-foreground font-mono">
          {currentVal}
        </Text>
      </View>
      
      <View className="h-32 flex-row items-end justify-between border-b border-border pb-2">
        {data.map((point, index) => {
          const heightPercent = (point.value / maxVal) * 100;
          return (
            <View key={index} className="items-center flex-1">
              <View 
                className="w-full bg-primary rounded-t-sm mx-0.5" 
                style={{ height: `${heightPercent}%` }} 
              />
              <Text className="mt-2 text-[10px] text-muted-foreground font-mono" numberOfLines={1}>
                {point.time}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
