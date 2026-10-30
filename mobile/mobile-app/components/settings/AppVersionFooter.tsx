import React from 'react';
import { View, Pressable, Platform, Alert, Clipboard } from 'react-native';
import Constants from 'expo-constants';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/src/utils/i18n';
import storage from '@/src/utils/storage';

export interface AppVersionFooterProps {
  onPressPrivacy?: () => void;
  onPressTerms?: () => void;
  onPressRefund?: () => void;
  className?: string;
}

export const AppVersionFooter = ({
  onPressPrivacy,
  onPressTerms,
  onPressRefund,
  className,
}: AppVersionFooterProps) => {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version || '1.0.1';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber || '18'
      : Constants.expoConfig?.android?.versionCode?.toString() || '22';

  const handleCopyPushToken = async () => {
    try {
      const token = await storage.getItem('device_push_token');
      if (token) {
        if (typeof navigator !== 'undefined' && (navigator as any).clipboard) {
          await (navigator as any).clipboard.writeText(token);
        } else if (Clipboard && typeof Clipboard.setString === 'function') {
          Clipboard.setString(token);
        }
        Alert.alert(
          'Expo Push Token Copied',
          `${token}\n\nCopied to clipboard! You can paste it into expo.dev/notifications.`
        );
      } else {
        Alert.alert(
          'Push Token Not Found',
          'No push token found in local storage. Ensure notifications are enabled and launch the app on a physical device.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to copy push token');
    }
  };

  return (
    <View className={cn('pt-6 pb-4 items-center justify-center gap-2', className)}>
      <Text className="text-xs font-bold text-muted-foreground tracking-wider uppercase font-sans">
        {t('nahom_enterprise', 'Nahom Enterprise')}
      </Text>

      {onPressPrivacy || onPressTerms || onPressRefund ? (
        <View className="flex-row items-center gap-3">
          {onPressPrivacy && (
            <Pressable accessibilityRole="link" onPress={onPressPrivacy} hitSlop={6} className="active:opacity-75">
              <Text className="text-[11px] font-semibold text-primary font-sans underline">
                {t('privacy_policy', 'Privacy Policy')}
              </Text>
            </Pressable>
          )}
          {onPressPrivacy && onPressTerms && (
            <Text className="text-[11px] text-muted-foreground">•</Text>
          )}
          {onPressTerms && (
            <Pressable accessibilityRole="link" onPress={onPressTerms} hitSlop={6} className="active:opacity-75">
              <Text className="text-[11px] font-semibold text-primary font-sans underline">
                {t('terms_conditions', 'Terms & Conditions')}
              </Text>
            </Pressable>
          )}
          {onPressRefund && (onPressPrivacy || onPressTerms) && (
            <Text className="text-[11px] text-muted-foreground">•</Text>
          )}
          {onPressRefund && (
            <Pressable accessibilityRole="link" onPress={onPressRefund} hitSlop={6} className="active:opacity-75">
              <Text className="text-[11px] font-semibold text-primary font-sans underline">
                {t('refund_policy', 'Refund Policy')}
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <Pressable
        onPress={handleCopyPushToken}
        onLongPress={handleCopyPushToken}
        hitSlop={8}
        className="active:opacity-60"
        accessibilityLabel="Copy Device Push Token"
        accessibilityRole="button"
      >
        <Text className="text-[11px] text-muted-foreground/70 font-mono">
          v{version} ({t('build', 'Build')} {buildNumber}) • {t('smart_gate_os', 'Smart Gate OS')}
        </Text>
      </Pressable>
    </View>
  );
};

export default AppVersionFooter;
