import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface AuditEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
  actor?: string;
}

export interface AuditTrailTimelineProps {
  events: AuditEvent[];
  className?: string;
}

export const AuditTrailTimeline = ({
  events,
  className,
}: AuditTrailTimelineProps) => {
  const getStatusIcon = (status: AuditEvent['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-500 bg-white dark:bg-slate-900 rounded-full" />;
      case 'pending':
        return <Clock size={16} className="text-amber-500 bg-white dark:bg-slate-900 rounded-full" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500 bg-white dark:bg-slate-900 rounded-full" />;
    }
  };

  return (
    <View className={cn('pl-2', className)}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        
        return (
          <View key={event.id} className="flex-row">
            {/* Timeline Line & Icon */}
            <View className="items-center mr-4">
              <View className="z-10 mt-1 h-6 w-6 items-center justify-center rounded-full bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                {getStatusIcon(event.status)}
              </View>
              {!isLast && (
                <View className="w-[2px] flex-1 bg-slate-200 mt-1 mb-1 dark:bg-slate-800" />
              )}
            </View>
            
            {/* Content */}
            <View className={cn('flex-1 pb-6', isLast && 'pb-0')}>
              <Text className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {event.title}
              </Text>
              <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {event.description}
              </Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs text-slate-400 font-mono">
                  {event.timestamp}
                </Text>
                {event.actor && (
                  <Text className="text-xs font-medium text-slate-500">
                    By {event.actor}
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};
