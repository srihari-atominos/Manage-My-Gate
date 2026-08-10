import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

export interface ExpandableItemProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const ExpandableItem = ({
  title,
  subtitle,
  children,
  defaultExpanded = false,
}: ExpandableItemProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // In a real app, you'd use a measurement technique for exact height animation
  // Here we use a simpler opacity/display toggle structure with Reanimated
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(expanded ? 1 : 0, { duration: 200 }),
    };
  });

  return (
    <View className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1 pr-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </Text>
          {subtitle && (
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </Text>
          )}
        </View>
        <View className="ml-2 rounded-full bg-slate-50 p-2 dark:bg-slate-800">
          {expanded ? (
            <ChevronUp size={20} className="text-slate-500" />
          ) : (
            <ChevronDown size={20} className="text-slate-500" />
          )}
        </View>
      </Pressable>
      
      {expanded && (
        <Animated.View style={animatedStyle} className="border-t border-slate-100 p-4 pt-3 dark:border-slate-800">
          {children}
        </Animated.View>
      )}
    </View>
  );
};

export interface ExpandableCardListProps {
  items: {
    id: string;
    title: string;
    subtitle?: string;
    content: React.ReactNode;
  }[];
  className?: string;
}

export const ExpandableCardList = ({
  items,
  className,
}: ExpandableCardListProps) => {
  return (
    <View className={cn('w-full', className)}>
      {items.map((item) => (
        <ExpandableItem key={item.id} title={item.title} subtitle={item.subtitle}>
          {item.content}
        </ExpandableItem>
      ))}
    </View>
  );
};
