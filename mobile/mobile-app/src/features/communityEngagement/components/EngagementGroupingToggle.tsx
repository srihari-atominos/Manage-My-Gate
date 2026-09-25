import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Megaphone, BarChart3, Layers } from 'lucide-react-native';
import { useTranslation } from '@/src/utils/i18n';
import { cn } from '@/lib/utils';

export type EngagementPerspectiveMode = 'ALL' | 'NOTICES' | 'POLLS';

interface EngagementGroupingToggleProps {
  mode: EngagementPerspectiveMode;
  onModeChange: (newMode: EngagementPerspectiveMode) => void;
  noticeCount?: number;
  pollCount?: number;
}

export const EngagementGroupingToggle: React.FC<EngagementGroupingToggleProps> = ({
  mode,
  onModeChange,
  noticeCount,
  pollCount,
}) => {
  const { t } = useTranslation();

  const totalCount = (noticeCount || 0) + (pollCount || 0);

  const modes: { id: EngagementPerspectiveMode; label: string; count: number; icon: any }[] = [
    { id: 'ALL', label: t('all_engagements', 'All Engagements'), count: totalCount, icon: Layers },
    {
      id: 'NOTICES',
      label: t('notices_tab', 'Notices'),
      count: noticeCount || 0,
      icon: Megaphone,
    },
    {
      id: 'POLLS',
      label: t('polls_tab', 'Polls'),
      count: pollCount || 0,
      icon: BarChart3,
    },
  ];

  return (
    <View className="px-4 py-2 bg-transparent">
      <View className="flex-row items-center gap-2">
        {modes.map((item) => {
          const isSelected = mode === item.id;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => onModeChange(item.id)}
              className={cn(
                'flex-1 flex-col items-center justify-center py-2 px-1.5 rounded-xl border min-h-[58px] shadow-2xs active:opacity-85',
                isSelected
                  ? 'border-primary bg-primary'
                  : 'border-border/80 bg-card active:bg-secondary/60'
              )}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${item.count}`}
            >
              <View className="flex-row items-center justify-center gap-1.5 mb-1">
                <Icon
                  size={14}
                  className={isSelected ? 'text-white' : 'text-primary'}
                />
                <View
                  className={cn(
                    'px-1.5 py-0.2 rounded-full items-center justify-center',
                    isSelected ? 'bg-white/25' : 'bg-primary/10'
                  )}
                >
                  <Text
                    className={cn(
                      'text-[10.5px] font-bold font-sans',
                      isSelected ? 'text-white' : 'text-primary'
                    )}
                  >
                    {item.count}
                  </Text>
                </View>
              </View>
              <Text
                numberOfLines={1}
                className={cn(
                  'text-[11.5px] font-semibold text-center leading-tight',
                  isSelected ? 'text-white font-bold' : 'text-foreground'
                )}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default EngagementGroupingToggle;
