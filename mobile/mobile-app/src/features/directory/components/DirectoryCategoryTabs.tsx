import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';

export interface DirectoryCategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'resident', label: 'Residents' },
  { key: 'staff', label: 'Staff' },
  { key: 'security', label: 'Security' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'management', label: 'Management' },
];

export const DirectoryCategoryTabs = ({
  activeTab = 'all',
  onTabChange,
}: DirectoryCategoryTabsProps) => {
  return (
    <View className="w-full">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-0.5 gap-2"
        className="flex-row"
      >
        {CATEGORIES.map((cat) => {
          const isActive = (activeTab || 'all').toLowerCase() === cat.key.toLowerCase();
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => onTabChange(cat.key)}
              activeOpacity={0.7}
              className={`px-3.5 h-9 rounded-xl border flex-row items-center justify-center ${
                isActive
                  ? 'bg-primary border-primary shadow-xs'
                  : 'bg-card border-border active:bg-muted/40'
              }`}
            >
              <Text
                className={`text-xs ${
                  isActive ? 'font-bold text-primary-foreground' : 'font-semibold text-muted-foreground'
                }`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default DirectoryCategoryTabs;
