import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Zap, ZapOff } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface FlashlightToggleProps {
  isOn: boolean;
  onToggle: () => void;
  className?: string;
}

export const FlashlightToggle = ({
  isOn,
  onToggle,
  className,
}: FlashlightToggleProps) => {
  return (
    <Pressable
      onPress={onToggle}
      className={cn(
        'flex-row items-center justify-center rounded-xl p-3 border',
        isOn 
          ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30' 
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      <View 
        className={cn(
          'mr-2 h-8 w-8 items-center justify-center rounded-full',
          isOn ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-slate-100 dark:bg-slate-800'
        )}
      >
        {isOn ? (
          <Zap size={16} className="text-amber-500 fill-amber-500" />
        ) : (
          <ZapOff size={16} className="text-slate-400" />
        )}
      </View>
      <Text 
        className={cn(
          'text-sm font-semibold',
          isOn ? 'text-amber-700 dark:text-amber-500' : 'text-slate-700 dark:text-slate-300'
        )}
      >
        {isOn ? 'Flashlight On' : 'Flashlight Off'}
      </Text>
    </Pressable>
  );
};
