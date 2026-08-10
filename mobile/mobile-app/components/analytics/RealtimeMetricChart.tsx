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
    <View className={cn('rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900', className)}>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
          {title}
        </Text>
        <Activity size={16} className="text-blue-500" />
      </View>
      
      <View className="mb-6 flex-row items-end">
        <Text className="text-3xl font-bold text-slate-900 font-mono dark:text-white">
          {currentVal}
        </Text>
      </View>
      
      <View className="h-32 flex-row items-end justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
        {data.map((point, index) => {
          const heightPercent = (point.value / maxVal) * 100;
          return (
            <View key={index} className="items-center flex-1">
              <View 
                className="w-full bg-blue-500 rounded-t-sm mx-0.5" 
                style={{ height: `${heightPercent}%` }} 
              />
              <Text className="mt-2 text-[10px] text-slate-400 font-mono" numberOfLines={1}>
                {point.time}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};
