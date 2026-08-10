import React from 'react';
import { View, Text } from 'react-native';
import { Activity, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export type AgentState = 'idle' | 'running' | 'completed' | 'failed';

export interface AgenticStateTrackerProps {
  state: AgentState;
  agentName: string;
  lastActive?: string;
  logs?: string[];
  className?: string;
}

export const AgenticStateTracker = ({
  state,
  agentName,
  lastActive,
  logs = [],
  className,
}: AgenticStateTrackerProps) => {
  const getStateColor = () => {
    switch (state) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-emerald-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const StateIcon = () => {
    switch (state) {
      case 'running': return <Activity size={16} className="text-blue-500" />;
      case 'completed': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'failed': return <XCircle size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  return (
    <View className={cn('rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900', className)}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <View className="mr-3 p-2 bg-slate-50 rounded-lg dark:bg-slate-800">
            <StateIcon />
          </View>
          <View>
            <Text className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {agentName}
            </Text>
            {lastActive && (
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Last active: {lastActive}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
          <View className={cn('mr-1.5 h-2 w-2 rounded-full', getStateColor())} />
          <Text className="text-xs font-medium text-slate-700 capitalize dark:text-slate-300">
            {state}
          </Text>
        </View>
      </View>

      {logs.length > 0 && (
        <View className="rounded-lg bg-slate-950 p-3">
          {logs.map((log, index) => (
            <Text key={index} className="text-xs font-mono text-green-400 mb-1">
              &gt; {log}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};
