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
    <View className="mb-3 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between p-4"
      >
        <View className="flex-1 pe-4">
          <Text className="text-[15px] font-semibold font-sans text-foreground">
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text className="mt-0.5 text-xs font-sans text-muted-foreground">
              {subtitle}
            </Text>
          )}
        </View>
        <View className="ms-2 rounded-full bg-secondary p-2 border border-border">
          {expanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </View>
      </Pressable>
      
      {expanded && (
        <Animated.View style={animatedStyle} className="border-t border-border/60 p-4 pt-3">
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
