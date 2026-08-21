import React from 'react';
import { View } from 'react-native';
import { ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PermissionRequestCardProps {
  title: string;
  description: string;
  status: 'granted' | 'denied' | 'undetermined';
  onRequest: () => void;
  className?: string;
}

export const PermissionRequestCard = ({
  title,
  description,
  status,
  onRequest,
  className,
}: PermissionRequestCardProps) => {
  const isGranted = status === 'granted';

  return (
    <View
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-xs',
        className
      )}
    >
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-row flex-1 me-3">
          <View
            className={cn(
              'me-3 h-10 w-10 items-center justify-center rounded-full border',
              isGranted
                ? 'bg-status-success/15 border-status-success/30'
                : 'bg-status-warning/15 border-status-warning/30'
            )}
          >
            {isGranted ? (
              <CheckCircle2 size={20} className="text-status-success" />
            ) : (
              <ShieldAlert size={20} className="text-status-warning" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">
              {title}
            </Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </Text>
          </View>
        </View>
      </View>

      {!isGranted && (
        <Button
          variant={status === 'denied' ? 'outline' : 'default'}
          size="sm"
          onPress={onRequest}
          className="w-full"
        >
          {status === 'denied' ? 'Open System Settings' : 'Grant Permission'}
        </Button>
      )}
    </View>
  );
};

