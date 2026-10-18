import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/text';
import { CloudOff, LucideIcon } from 'lucide-react-native';
import { useIsNetworkBannerVisible } from '../../src/features/network/NetworkRecoveryProvider';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useTranslation } from '../../src/utils/i18n';
import { Icon as UIIcon } from '../ui/icon';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: RawIcon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const { translateText } = useTranslation();
  const connectionIssue = useIsNetworkBannerVisible();
  // An empty result while offline means the data could not load; don't claim there is none
  if (connectionIssue) {
    RawIcon = CloudOff;
    title = "Can't load right now";
    description = 'Your information is safe. Reconnect and pull down to refresh.';
  }

  return (
    <View className={cn('items-center justify-center py-10 px-4', className)}>
      {RawIcon && (
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 shadow-2xs">
          <UIIcon as={RawIcon} size={28} className="text-primary" />
        </View>
      )}
      <Text className="mb-1 text-center text-[18px] font-bold font-sans text-foreground tracking-tight">
        {translateText(title)}
      </Text>
      {description && (
        <Text className="mb-6 text-center text-[13.5px] font-sans text-muted-foreground max-w-xs leading-snug">
          {translateText(description)}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button onPress={onAction} className="px-6 rounded-2xl shadow-2xs">
          <Text className="font-bold text-primary-foreground">{translateText(actionLabel)}</Text>
        </Button>
      )}
    </View>
  );
};
