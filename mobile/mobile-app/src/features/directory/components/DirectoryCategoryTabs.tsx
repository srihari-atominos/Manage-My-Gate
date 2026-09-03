import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from '@/src/utils/i18n';

export interface DirectoryCategoryTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DirectoryCategoryTabs = ({
  activeTab = 'all',
  onTabChange,
}: DirectoryCategoryTabsProps) => {
  const { t } = useTranslation();

  const categories = [
    { key: 'all', label: t('cat_all', 'All') },
    { key: 'resident', label: t('cat_resident', 'Residents') },
    { key: 'staff', label: t('cat_staff', 'Staff') },
    { key: 'security', label: t('cat_security', 'Security') },
    { key: 'maintenance', label: t('cat_maintenance', 'Maintenance') },
    { key: 'management', label: t('cat_management', 'Management') },
  ];

  return (
    <View className="w-full">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-0.5 gap-2"
        className="flex-row"
      >
        {categories.map((cat) => {
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
