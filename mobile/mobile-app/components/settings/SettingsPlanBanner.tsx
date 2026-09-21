import React from 'react';
import { View, Pressable } from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';

export interface SettingsPlanBannerProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
}

export const SettingsPlanBanner: React.FC<SettingsPlanBannerProps> = ({
  title,
  description,
  actionLabel,
  onActionPress,
  className,
}) => {
  const { t } = useTranslation();

  const displayTitle = title || t('plan_status_active', 'Active Community Membership');
  const displayDesc =
    description ||
    t('plan_banner_desc', 'All premium gate & community features are fully unlocked for your residence.');
  const displayAction = actionLabel || t('learn_more', 'Learn more');

  return (
    <View
      className={cn(
        'mx-4 mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/25 shadow-2xs',
        className
      )}
    >
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 items-center justify-center shrink-0 mt-0.5">
          <Icon as={Sparkles} size={18} className="text-primary" />
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-sm font-bold text-foreground font-sans" numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text className="text-xs text-muted-foreground mt-0.5 leading-4" numberOfLines={2}>
            {displayDesc}
          </Text>

          {onActionPress ? (
            <Pressable
              onPress={onActionPress}
              className="flex-row items-center gap-1 mt-2.5 self-start active:opacity-75"
              hitSlop={8}
            >
              <Text className="text-xs font-bold text-primary font-sans">
                {displayAction}
              </Text>
              <Icon as={ChevronRight} size={14} className="text-primary" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default SettingsPlanBanner;
