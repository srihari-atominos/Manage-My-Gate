import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Zap, ArrowRight } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface WorkflowTriggerEvent {
  id: string;
  timestamp: string;
  triggerSource: string;
  targetNode: string;
  payloadSize: number;
  status: 'success' | 'dropped' | 'pending';
}

export interface WorkflowTriggerLogProps {
  events: WorkflowTriggerEvent[];
  className?: string;
}

export const WorkflowTriggerLog = ({ events, className }: WorkflowTriggerLogProps) => {
  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900', className)}>
      <View className="flex-row items-center border-b border-slate-100 p-4 dark:border-slate-800">
        <Zap size={18} className="mr-2 text-primary" />
        <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
          Trigger Logs
        </Text>
      </View>
      
      <ScrollView className="max-h-64">
        {events.map((event, index) => (
          <View 
            key={event.id}
            className={cn(
              'flex-row items-center p-3',
              index !== events.length - 1 && 'border-b border-slate-50 dark:border-slate-800/50'
            )}
          >
            <View className="mr-3 flex-1">
              <View className="flex-row items-center mb-1">
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {event.triggerSource}
                </Text>
                <ArrowRight size={12} className="mx-2 text-slate-400" />
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {event.targetNode}
                </Text>
              </View>
              <Text className="text-[10px] text-slate-400 font-mono">
                {event.timestamp} • {event.payloadSize} bytes
              </Text>
            </View>
            <View className={cn(
              'rounded px-2 py-1',
              event.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
              event.status === 'dropped' ? 'bg-red-100 dark:bg-red-900/30' :
              'bg-amber-100 dark:bg-amber-900/30'
            )}>
              <Text className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                event.status === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                event.status === 'dropped' ? 'text-red-700 dark:text-red-400' :
                'text-amber-700 dark:text-amber-400'
              )}>
                {event.status}
              </Text>
            </View>
          </View>
        ))}
        
        {events.length === 0 && (
          <View className="p-6 items-center">
            <Text className="text-sm text-slate-500">No triggers recorded yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
