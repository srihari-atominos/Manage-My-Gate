import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../ui/text';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react-native';
import FeatureIcon from '../ui/FeatureIcon';
import { useTranslation, translateText } from '@/src/utils/i18n';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenShell } from '../ui/ScreenShell';

interface FeatureDetailScreenProps {
  title: string;
  categoryName: string;
  sharedSlice: string;
  permission?: string;
  iconName: string;
  iconColor?: string;
  description: string;
  actionButton?: {
    label: string;
    onPress: () => void;
  };
  noticeBadge?: string;
}

export const FeatureDetailScreen: React.FC<FeatureDetailScreenProps> = ({
  title,
  categoryName,
  sharedSlice,
  permission,
  iconName,
  iconColor = '#0f172a',
  description,
  actionButton,
  noticeBadge,
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  const translatedTitle = translateText(title);
  const translatedCategory = translateText(categoryName);
  const translatedDesc = translateText(description);
  const badgeLabel = noticeBadge ? translateText(noticeBadge) : t('active_sub_feature', 'Active Sub-Feature');

  return (
    <ScreenShell
      title={translatedTitle}
      subtitle={translatedCategory}
      iconName={iconName as any}
      showBackButton={true}
    >
      <ScrollView className="flex-1 px-4 pt-4">
        <View className="gap-4 pb-12 max-w-md mx-auto w-full">
          {/* Main Feature Header Card */}
          <View className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <View className="flex-row items-start gap-3">
              <View className="size-12 rounded-2xl bg-primary/10 items-center justify-center border border-primary/25">
                <FeatureIcon iconName={iconName} color={iconColor} size={24} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 flex-wrap">
                  <Text className="text-base font-extrabold text-foreground">{translatedTitle}</Text>
                  <View className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-emerald-600">{badgeLabel}</Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {translatedDesc}
                </Text>
              </View>
            </View>

            {/* Shared Redux Slice & Domain Info Pill */}
            <View className="mt-4 pt-3 border-t border-border flex-row items-center justify-between flex-wrap gap-2">
              <View className="flex-row items-center gap-1.5">
                <Zap size={13} className="text-primary" />
                <Text className="text-[11px] font-semibold text-foreground">
                  {t('domain_label', 'Domain')}: <Text className="font-extrabold text-primary">{translatedCategory}</Text>
                </Text>
              </View>
              <View className="bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
                <Text className="text-[10px] font-mono text-muted-foreground">
                  {t('store_label', 'Store')}: {sharedSlice}
                </Text>
              </View>
            </View>
          </View>

          {/* RBAC Permission Banner */}
          {permission ? (
            <View className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <ShieldCheck size={16} color="#6366f1" />
                <Text className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  {t('required_permission', 'Required Permission')}: <Text className="font-mono text-indigo-600">{permission}</Text>
                </Text>
              </View>
              <View className="bg-indigo-600 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-bold text-white">{t('granted', 'Granted')}</Text>
              </View>
            </View>
          ) : null}

          {/* Real-time Status Metric Overview Cards */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-card border border-border rounded-2xl p-3 shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase">{t('status_label', 'Status')}</Text>
                <CheckCircle2 size={14} color="#10b981" />
              </View>
              <Text className="text-base font-extrabold text-foreground">{t('live_synced', 'Live & Synced')}</Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">{t('updated_just_now', 'Updated just now')}</Text>
            </View>

            <View className="flex-1 bg-card border border-border rounded-2xl p-3 shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[10px] font-bold text-muted-foreground uppercase">{t('activity_label', 'Activity')}</Text>
                <Clock size={14} color="#03A9F4" />
              </View>
              <Text className="text-base font-extrabold text-foreground">{t('connected', 'Connected')}</Text>
              <Text className="text-[10px] text-muted-foreground mt-0.5">{t('realtime_ws', 'Real-time WebSocket')}</Text>
            </View>
          </View>

          {/* Action Console Panel */}
          <View className="bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs">
            <Text className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              {t('subfeature_console', 'Sub-Feature Console')}
            </Text>
            
            <View className="bg-muted/40 border border-dashed border-border rounded-xl p-6 items-center justify-center gap-3">
              <View className="size-10 rounded-full bg-primary/10 items-center justify-center">
                <FeatureIcon iconName={iconName} color={iconColor} size={20} />
              </View>
              <Text className="text-sm font-extrabold text-foreground text-center">
                {translatedTitle} {t('active_view', 'Active View')}
              </Text>
              <Text className="text-xs text-muted-foreground text-center max-w-[260px]">
                {t('subfeature_ready_desc', 'This view is connected to state and ready for interactive sub-feature operations.')}
              </Text>

              {actionButton ? (
                <TouchableOpacity
                  onPress={actionButton.onPress}
                  activeOpacity={0.8}
                  className="mt-2 bg-blue-600 active:bg-blue-700 px-4 py-2.5 rounded-xl items-center justify-center"
                >
                  <Text className="text-xs font-bold text-white">
                    {translateText(actionButton.label)}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
};

export default FeatureDetailScreen;
