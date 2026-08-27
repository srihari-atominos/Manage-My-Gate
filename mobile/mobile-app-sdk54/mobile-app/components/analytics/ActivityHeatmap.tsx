import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface HeatmapData {
  day: string;
  hour: number;
  intensity: number; // 0 to 1
}

export interface ActivityHeatmapProps {
  data: HeatmapData[];
  title: string;
  className?: string;
}

export const ActivityHeatmap = ({
  data,
  title,
  className,
}: ActivityHeatmapProps) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [0, 4, 8, 12, 16, 20]; // Simplified axis

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'bg-secondary';
    if (intensity < 0.25) return 'bg-emerald-500/20';
    if (intensity < 0.5) return 'bg-emerald-500/40';
    if (intensity < 0.75) return 'bg-emerald-500/70';
    return 'bg-emerald-500';
  };

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4 shadow-xs', className)}>
      <Text className="mb-4 text-xs font-semibold font-sans text-muted-foreground uppercase tracking-wider">
        {title}
      </Text>
      
      <View className="flex-row">
        {/* Y Axis */}
        <View className="me-2 justify-between py-1">
          {days.map(day => (
            <Text key={day} className="text-[10px] text-muted-foreground font-mono h-4 leading-4">{day}</Text>
          ))}
        </View>
        
        {/* Grid */}
        <View className="flex-1">
          {days.map((day, dIdx) => (
            <View key={day} className="flex-row mb-1 h-4 gap-1">
              {Array.from({ length: 24 }).map((_, hIdx) => {
                const cellData = data.find(d => d.day === day && d.hour === hIdx);
                const intensity = cellData ? cellData.intensity : 0;
                return (
                  <View 
                    key={`${dIdx}-${hIdx}`}
                    className={cn('flex-1 rounded-sm', getColor(intensity))}
                  />
                );
              })}
            </View>
          ))}
          
          {/* X Axis labels */}
          <View className="flex-row justify-between mt-1">
            {hours.map(hour => (
              <Text key={hour} className="text-[10px] text-slate-400 font-mono">{hour}</Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};
