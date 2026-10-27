import React from 'react';
import { View, Modal, Platform, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { ShieldAlert, Download, RefreshCw, ExternalLink } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppReleasePolicy } from '../services/appUpdateService';

interface MandatoryUpdateModalProps {
  visible: boolean;
  policy: AppReleasePolicy | null;
  onUpdateNow: () => void;
  onOpenStore: () => void;
  onRetryCheck: () => void;
  isChecking: boolean;
}

export const MandatoryUpdateModal: React.FC<MandatoryUpdateModalProps> = ({
  visible,
  policy,
  onUpdateNow,
  onOpenStore,
  onRetryCheck,
  isChecking,
}) => {
  if (!visible || !policy || Platform.OS === 'web') return null;

  const currentVersion = Constants.expoConfig?.version || '1.0.8';
  const targetVersion = policy.latestVersion || 'Latest';
  const isCritical = policy.releaseType === 'CRITICAL';

  const currentVersionLabel = `v${currentVersion}`;
  const targetVersionLabel = `v${targetVersion}`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={() => {}}
    >
      <View className="flex-1 bg-background items-center justify-center p-6">
        <View className="w-full max-w-sm items-center">
          {/* Critical Icon Shield */}
          <View className="w-20 h-20 rounded-3xl bg-destructive/10 border border-destructive/20 items-center justify-center mb-4 shadow-sm">
            <ShieldAlert size={40} className="text-destructive" />
          </View>

          <StatusBadge
            variant={isCritical ? 'critical' : 'danger'}
            label={isCritical ? 'Critical Security Update' : 'Version Unsupported'}
            size="sm"
          />

          <Text className="text-2xl font-black text-foreground text-center mt-3 mb-2">
            NAHOM Update Required
          </Text>

          <Text className="text-xs text-muted-foreground text-center leading-relaxed mb-6">
            Your current version of NAHOM is no longer supported. Update the application to continue.
          </Text>

          {/* Version Specs Card */}
          <View className="w-full bg-card rounded-2xl p-4 border border-border mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs text-muted-foreground">Installed Version</Text>
              <Text className="text-xs font-bold text-foreground">{currentVersionLabel}</Text>
            </View>
            <View className="h-px bg-border/60 my-1.5" />
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-muted-foreground">Required Version</Text>
              <Text className="text-xs font-bold text-primary">{targetVersionLabel}</Text>
            </View>
          </View>

          {/* Release Notes Preview */}
          {policy.releaseNotes && policy.releaseNotes.length > 0 && (
            <View className="w-full bg-muted/30 rounded-2xl p-4 border border-border/40 mb-6 max-h-36">
              <Text className="text-xs font-bold text-foreground mb-1.5">Update Details:</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {policy.releaseNotes.map((note, idx) => (
                  <View key={idx} className="flex-row items-start gap-2 mb-1">
                    <Text className="text-xs text-primary leading-tight">•</Text>
                    <Text className="text-xs text-muted-foreground leading-relaxed flex-1">{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action CTAs */}
          <View className="w-full gap-3">
            <Button
              variant="default"
              onPress={onUpdateNow}
              accessibilityRole="button"
              accessibilityLabel="Update Now"
              className="w-full h-12"
            >
              <Download size={18} className="text-primary-foreground me-2" />
              <Text className="font-bold text-sm text-primary-foreground">Update Now</Text>
            </Button>

            <Button
              variant="outline"
              onPress={onOpenStore}
              accessibilityRole="button"
              accessibilityLabel="Open Google Play Store"
              className="w-full h-11"
            >
              <ExternalLink size={16} className="text-foreground me-1.5" />
              <Text className="font-semibold text-xs text-foreground">Open Google Play Store</Text>
            </Button>

            <Button
              variant="ghost"
              onPress={onRetryCheck}
              disabled={isChecking}
              accessibilityRole="button"
              accessibilityLabel="Retry Check"
              className="w-full h-10"
            >
              <RefreshCw size={14} className={`text-muted-foreground me-1.5 ${isChecking ? 'animate-spin' : ''}`} />
              <Text className="font-medium text-xs text-muted-foreground">
                {isChecking ? 'Checking...' : 'Check Again'}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MandatoryUpdateModal;
