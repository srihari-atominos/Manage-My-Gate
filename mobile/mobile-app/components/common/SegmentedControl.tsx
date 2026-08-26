import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/utils';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

export interface SegmentItem {
  key: string;
  label: string;
}

export interface SegmentedControlProps {
  segments: SegmentItem[];
  activeSegment: string;
  onChange: (key: string) => void;
  className?: string;
}

export const SegmentedControl = ({
  segments,
  activeSegment,
  onChange,
  className,
}: SegmentedControlProps) => {
  const activeIndex = segments.findIndex((s) => s.key === activeSegment);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const segmentWidth = 100 / (segments.length || 1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      left: `${safeActiveIndex * segmentWidth}%`,
      width: `${segmentWidth}%`,
    };
  });

  return (
    <View
      className={cn(
        'flex-row items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800',
        className
      )}
    >
      <Animated.View
        className="absolute bottom-1 top-1 rounded-md bg-white shadow-sm dark:bg-slate-900"
        style={animatedStyle}
      />
      {segments.map((segment) => {
        const isActive = segment.key === activeSegment;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            className="flex-1 items-center justify-center py-2"
          >
            <Text
              className={cn(
                'text-sm font-medium',
                isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
