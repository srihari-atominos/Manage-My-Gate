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
        'flex-row items-center rounded-xl bg-secondary border border-border p-1',
        className
      )}
    >
      <Animated.View
        className="absolute bottom-1 top-1 rounded-lg bg-card border border-border shadow-xs"
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
                'text-[13px] font-semibold font-sans',
                isActive ? 'text-foreground' : 'text-muted-foreground'
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
