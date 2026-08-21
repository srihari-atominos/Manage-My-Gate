import React from 'react';
import { View } from 'react-native';
import { HardDrive, Trash2 } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <View
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-xs',
        className
      )}
    >
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="me-3 h-10 w-10 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
            <HardDrive size={20} className="text-primary" />
          </View>
          <View>
            <Text className="text-base font-semibold text-foreground">
              Storage & Cache
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {usedSpace} of {totalSpace} utilized
            </Text>
          </View>
        </View>
      </View>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onPress={onClearCache}
        leftIcon={Trash2}
      >
        Clear Application Cache
      </Button>
    </View>
  );
};

