import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Trash2 } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  className?: string;
}

export const SwipeableRow = ({
  children,
  onDelete,
  className,
}: SwipeableRowProps) => {
  const renderRightActions = () => {
    if (!onDelete) return null;
    return (
      <Pressable
        className="w-20 items-center justify-center bg-red-500"
        onPress={onDelete}
      >
        <Trash2 size={24} color="#ffffff" />
      </Pressable>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View className={cn('bg-white dark:bg-slate-900', className)}>
        {children}
      </View>
    </Swipeable>
  );
};
