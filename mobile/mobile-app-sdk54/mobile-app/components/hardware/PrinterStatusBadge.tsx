import React from 'react';
import { View, Text } from 'react-native';
import { Printer } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface PrinterStatusBadgeProps {
  status: 'connected' | 'disconnected' | 'printing' | 'error';
  printerName?: string;
  className?: string;
}

export const PrinterStatusBadge = ({
  status,
  printerName = 'Thermal Printer',
  className,
}: PrinterStatusBadgeProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return { color: 'bg-emerald-500', text: 'Connected' };
      case 'printing':
        return { color: 'bg-blue-500', text: 'Printing...' };
      case 'error':
        return { color: 'bg-red-500', text: 'Paper Out / Error' };
      case 'disconnected':
      default:
        return { color: 'bg-slate-400', text: 'Disconnected' };
    }
  };

  const config = getStatusConfig();

  return (
    <View className={cn('flex-row items-center rounded-lg border border-slate-200 bg-white p-2 px-3 dark:border-slate-800 dark:bg-slate-900', className)}>
      <Printer size={16} className="mr-2 text-slate-500 dark:text-slate-400" />
      <View className="flex-1 mr-4">
        <Text className="text-sm font-medium text-slate-900 dark:text-slate-100" numberOfLines={1}>
          {printerName}
        </Text>
      </View>
      <View className="flex-row items-center">
        <View className={cn('mr-1.5 h-2 w-2 rounded-full animate-pulse', config.color)} />
        <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {config.text}
        </Text>
      </View>
    </View>
  );
};
