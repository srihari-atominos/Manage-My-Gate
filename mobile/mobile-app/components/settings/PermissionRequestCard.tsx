import React from 'react';
import { View, Text } from 'react-native';
import { ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

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
  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900', className)}>
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-row flex-1 mr-4">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            {status === 'granted' ? (
              <CheckCircle2 size={20} className="text-emerald-500" />
            ) : (
              <ShieldAlert size={20} className="text-amber-500" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </Text>
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </Text>
          </View>
        </View>
      </View>
      
      {status !== 'granted' && (
        <Button 
          variant={status === 'denied' ? 'outline' : 'default'} 
          onPress={onRequest}
          className="w-full"
        >
          {status === 'denied' ? 'Open Settings' : 'Allow Permission'}
        </Button>
      )}
    </View>
  );
};
