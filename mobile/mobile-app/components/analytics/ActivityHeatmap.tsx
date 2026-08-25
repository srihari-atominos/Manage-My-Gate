import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

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

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data = [],
  title,
  className,
}) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [0, 4, 8, 12, 16, 20]; // Simplified axis markers

  const getColorClass = (intensity: number) => {
    if (intensity === 0) return 'bg-muted/30';
    if (intensity < 0.25) return 'bg-primary/20';
    if (intensity < 0.5) return 'bg-primary/40';
    if (intensity < 0.75) return 'bg-primary/70';
    return 'bg-primary';
  };

  return (
    <View className={cn('rounded-2xl border border-border bg-card p-4 shadow-xs', className)}>
      <Text className="mb-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {title}
      </Text>

      <View className="flex-row">
        {/* Y Axis (Days) */}
        <View className="me-2 justify-between py-0.5">
          {days.map((day) => (
            <Text key={day} className="text-[10px] text-muted-foreground font-semibold h-4 leading-4 text-start">
              {day}
            </Text>
          ))}
        </View>

        {/* Heatmap Grid */}
        <View className="flex-1">
          {days.map((day, dIdx) => (
            <View key={day} className="flex-row mb-1.5 h-4 gap-1">
              {Array.from({ length: 24 }).map((_, hIdx) => {
                const cellData = data.find((d) => d.day === day && d.hour === hIdx);
                const intensity = cellData ? cellData.intensity : 0;
                return (
                  <View
                    key={`${dIdx}-${hIdx}`}
                    className={cn('flex-1 rounded-xs', getColorClass(intensity))}
                  />
                );
              })}
            </View>
          ))}

          {/* X Axis (Hour Labels) */}
          <View className="flex-row justify-between mt-1">
            {hours.map((hour) => (
              <Text key={hour} className="text-[10px] text-muted-foreground font-medium">
                {hour === 0 ? '12AM' : hour === 12 ? '12PM' : `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default ActivityHeatmap;
