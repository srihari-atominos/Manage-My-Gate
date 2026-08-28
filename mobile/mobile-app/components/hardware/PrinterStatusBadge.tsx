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
    <View className={cn('flex-row items-center rounded-lg border border-border bg-card p-2 px-3', className)}>
      <Printer size={16} className="me-2 text-muted-foreground" />
      <View className="flex-1 me-4">
        <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
          {printerName}
        </Text>
      </View>
      <View className="flex-row items-center">
        <View className={cn('me-1.5 h-2 w-2 rounded-full animate-pulse', config.color)} />
        <Text className="text-xs font-semibold text-muted-foreground">
          {config.text}
        </Text>
      </View>
    </View>
  );
};
