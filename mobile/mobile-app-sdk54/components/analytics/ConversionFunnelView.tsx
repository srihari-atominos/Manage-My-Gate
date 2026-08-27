import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface FunnelStep {
  label: string;
  value: number;
}

export interface ConversionFunnelViewProps {
  title: string;
  steps: FunnelStep[];
  className?: string;
}

export const ConversionFunnelView = ({
  title,
  steps,
  className,
}: ConversionFunnelViewProps) => {
  const maxVal = steps.length > 0 ? Math.max(...steps.map(s => s.value)) : 1;

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4 shadow-xs', className)}>
      <Text className="mb-6 text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wider">
        {title}
      </Text>
      
      <View className="items-center">
        {steps.map((step, index) => {
          const widthPercent = Math.max((step.value / maxVal) * 100, 10);
          return (
            <View key={index} className="w-full mb-3 items-center">
              <View 
                className="bg-emerald-500 rounded-md h-8 flex-row items-center justify-between px-3"
                style={{ width: `${widthPercent}%` }}
              >
                {widthPercent > 30 && (
                  <Text className="text-xs font-semibold text-white truncate max-w-[60%]">
                    {step.label}
                  </Text>
                )}
                <Text className="text-xs font-bold font-mono text-white">
                  {step.value}
                </Text>
              </View>
              {widthPercent <= 30 && (
                <Text className="mt-1 text-xs text-slate-500">
                  {step.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};
