import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { cn } from '../../lib/utils';

export interface TabItem {
  key: string;
  label: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
  tabClassName?: string;
}

export const Tabs = ({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
}: TabsProps) => {
  return (
    <View className={cn('border-b border-slate-200 dark:border-slate-800', className)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              className={cn(
                'mr-6 py-4 border-b-2',
                isActive ? 'border-primary' : 'border-transparent',
                tabClassName
              )}
            >
              <Text
                className={cn(
                  'text-sm font-semibold',
                  isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};
