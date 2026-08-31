import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { cn } from '../../lib/utils';

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
  return (
    <View
      className={cn(
        'flex-row items-center rounded-2xl bg-muted/60 p-1 border border-border/80 w-full',
        className
      )}
    >
      {segments.map((segment) => {
        const isActive = segment.key === activeSegment;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            className={cn(
              'flex-1 items-center justify-center py-2.5 px-2 rounded-xl transition-all',
              isActive
                ? 'bg-card border border-border shadow-xs'
                : 'bg-transparent'
            )}
          >
            <Text
              className={cn(
                'text-xs font-sans text-center',
                isActive ? 'font-bold text-primary' : 'font-semibold text-muted-foreground'
              )}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default SegmentedControl;
