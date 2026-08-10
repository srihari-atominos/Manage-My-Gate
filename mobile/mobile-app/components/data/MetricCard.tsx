import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  title: string;
  value: number | string; // Strict raw data constraint
  trend?: number; // percentage change
  trendDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  trend,
  trendDirection,
  className,
}: MetricCardProps) => {
  
  // Auto-determine direction if not provided
  const direction = trendDirection || 
    (trend !== undefined 
      ? (trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral') 
      : 'neutral');

  const getTrendColor = () => {
    switch (direction) {
      case 'up': return 'text-emerald-500';
      case 'down': return 'text-red-500';
      case 'neutral': return 'text-slate-400';
    }
  };

  const getTrendIcon = () => {
    switch (direction) {
      case 'up': return <TrendingUp size={16} className="text-emerald-500 mr-1" />;
      case 'down': return <TrendingDown size={16} className="text-red-500 mr-1" />;
      case 'neutral': return <Minus size={16} className="text-slate-400 mr-1" />;
    }
  };

  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400 mb-2">
        {title}
      </Text>
      
      <View className="flex-row items-end justify-between">
        <Text className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
          {value}
        </Text>
        
        {trend !== undefined && (
          <View className="flex-row items-center mb-1">
            {getTrendIcon()}
            <Text className={cn('text-sm font-bold', getTrendColor())}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
