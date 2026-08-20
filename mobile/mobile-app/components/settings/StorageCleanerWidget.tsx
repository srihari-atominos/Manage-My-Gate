import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { HardDrive, Trash2 } from 'lucide-react-native';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface StorageCleanerWidgetProps {
  usedSpace: string;
  totalSpace: string;
  onClearCache: () => void;
  className?: string;
}

export const StorageCleanerWidget = ({
  usedSpace,
  totalSpace,
  onClearCache,
  className,
}: StorageCleanerWidgetProps) => {
  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900', className)}>
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <HardDrive size={20} className="text-blue-500" />
          </View>
          <View>
            <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Storage Usage
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {usedSpace} of {totalSpace} used
            </Text>
          </View>
        </View>
      </View>
      
      <Button 
        variant="outline" 
        className="w-full"
        onPress={onClearCache}
        leftIcon={Trash2}
      >
        Clear App Cache
      </Button>
    </View>
  );
};
