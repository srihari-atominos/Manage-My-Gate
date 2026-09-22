import React from 'react';
import { View, Pressable } from 'react-native';
import { ChevronRight, CheckCircle2 } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';

export interface SettingsNudgeRowProps {
  title?: string;
  percentage?: number;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
}

export const SettingsNudgeRow: React.FC<SettingsNudgeRowProps> = ({
  title,
  percentage = 85,
  description,
  actionLabel,
  onActionPress,
  className,
}) => {
  const { t } = useTranslation();

  const displayTitle = title || t('profile_nudge_title', 'Profile Completion');
  const displayDesc = description || t('profile_nudge_desc', 'Complete your emergency contacts and vehicle info.');
  const displayAction = actionLabel || t('update_details', 'Update');

  return (
    <Pressable
      onPress={onActionPress}
      className={cn(
        'mx-4 mt-3 bg-card border border-border/90 rounded-2xl p-3.5 shadow-2xs active:bg-muted/30',
        className
      )}
      accessibilityRole="button"
      accessibilityLabel={`${displayTitle}, ${percentage}%`}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3 flex-1 min-w-0">
          <View className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center shrink-0">
            <Icon as={CheckCircle2} size={18} className="text-emerald-600 dark:text-emerald-400" />
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-bold text-foreground font-sans" numberOfLines={1}>
                {displayTitle}
              </Text>
              <View className="bg-emerald-500/15 px-1.5 py-0.2 rounded-full border border-emerald-500/25">
                <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {percentage}%
                </Text>
              </View>
            </View>
            <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={1}>
              {displayDesc}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1 shrink-0">
          <Text className="text-xs font-bold text-primary font-sans">{displayAction}</Text>
          <Icon as={ChevronRight} size={14} className="text-primary" />
        </View>
      </View>
    </Pressable>
  );
};

export default SettingsNudgeRow;
