import * as React from 'react';
import { View, Linking, Platform, Modal } from 'react-native';
import Constants from 'expo-constants';
import { Download } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { getAppConfig } from '@/src/features/auth/services/authService';
import { isVersionSupported } from '@/src/features/auth/utils/appVersion';
import { useTranslation } from '@/src/utils/i18n';

/**
 * Blocks the app when the installed version is older than the server's minimum
 * supported version (e.g. before old password-based builds stop working).
 * Fails open: if the config can't be fetched, the app keeps working.
 */
export function ForceUpdateGate() {
  const { t } = useTranslation();
  const [storeUrl, setStoreUrl] = React.useState<string | null>(null);
  const [blocked, setBlocked] = React.useState(false);

  React.useEffect(() => {
    const installed = Constants.expoConfig?.version || '0.0.0';
    getAppConfig()
      .then((res: any) => {
        const config = res?.data?.data || res?.data || {};
        if (!isVersionSupported(installed, config.minSupportedVersion)) {
          setStoreUrl(Platform.OS === 'ios' ? config.storeUrls?.ios : config.storeUrls?.android);
          setBlocked(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!blocked || Platform.OS === 'web') return null;

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={() => {}}>
      <View className="flex-1 bg-background items-center justify-center p-8 gap-4">
        <View className="bg-primary/10 p-4 rounded-full">
          <Download size={28} className="text-primary" />
        </View>
        <Text className="text-xl font-extrabold text-foreground text-center">
          {t('update_required', 'Update required')}
        </Text>
        <Text className="text-sm text-muted-foreground text-center">
          {t('update_required_help', 'This version of the app is no longer supported. Please update to continue.')}
        </Text>
        {storeUrl ? (
          <Button testID="force-update-open-store" className="h-12 w-full max-w-xs" onPress={() => Linking.openURL(storeUrl)}>
            <Text className="font-bold text-primary-foreground">{t('update_now', 'Update now')}</Text>
          </Button>
        ) : null}
      </View>
    </Modal>
  );
}

export default ForceUpdateGate;
