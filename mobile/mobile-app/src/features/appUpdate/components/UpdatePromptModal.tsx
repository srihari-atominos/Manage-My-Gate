import React from 'react';
import { View, Modal, ScrollView, Platform } from 'react-native';
import Constants from 'expo-constants';
import { Download, Sparkles, CheckCircle, Clock } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AppReleasePolicy } from '../services/appUpdateService';

interface UpdatePromptModalProps {
  visible: boolean;
  policy: AppReleasePolicy | null;
  downloadProgress: number;
  isDownloading: boolean;
  isDownloaded: boolean;
  onUpdateNow: () => void;
  onCompleteUpdate: () => void;
  onLater: () => void;
}

export const UpdatePromptModal: React.FC<UpdatePromptModalProps> = ({
  visible,
  policy,
  downloadProgress,
  isDownloading,
  isDownloaded,
  onUpdateNow,
  onCompleteUpdate,
  onLater,
}) => {
  if (!visible || !policy || Platform.OS === 'web') return null;

  const currentVersion = Constants.expoConfig?.version || '1.0.8';
  const newVersion = policy.latestVersion || 'Latest';
  const isImportant = policy.releaseType === 'IMPORTANT';
  const daysRemaining = policy.daysRemaining ?? policy.gracePeriodDays ?? 7;

  const currentVersionLabel = `v${currentVersion}`;
  const newVersionLabel = `v${newVersion}`;
  const gracePeriodMessage = `Grace period active: ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining to update.`;
  const downloadPercentLabel = `${downloadProgress}%`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onLater}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl">
          {/* Header Icon & Badges */}
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 items-center justify-center mb-3">
              <Sparkles size={32} className="text-primary" />
            </View>

            <View className="flex-row items-center gap-2 mb-1">
              <StatusBadge
                variant={isImportant ? 'warning' : 'info'}
                label={isImportant ? 'Important Update' : 'New Version Available'}
                size="sm"
              />
            </View>

            <Text className="text-xl font-extrabold text-foreground text-center mt-2">
              A New Version of NAHOM Is Available!
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1">
              Update NAHOM to access the latest improvements.
            </Text>
          </View>

          {/* Version Info Strip */}
          <View className="bg-muted/40 rounded-2xl p-3 mb-4 border border-border/50 flex-row items-center justify-around">
            <View className="items-center">
              <Text className="text-[10px] uppercase font-semibold text-muted-foreground">Current</Text>
              <Text className="text-xs font-bold text-foreground">{currentVersionLabel}</Text>
            </View>
            <View className="h-6 w-px bg-border/60" />
            <View className="items-center">
              <Text className="text-[10px] uppercase font-semibold text-primary">Available</Text>
              <Text className="text-xs font-bold text-primary">{newVersionLabel}</Text>
            </View>
          </View>

          {/* Grace Period Reminder for IMPORTANT updates */}
          {isImportant && daysRemaining > 0 && (
            <View className="flex-row items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-4">
              <Clock size={16} className="text-amber-500 shrink-0" />
              <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium flex-1">
                {gracePeriodMessage}
              </Text>
            </View>
          )}

          {/* Release Notes */}
          {policy.releaseNotes && policy.releaseNotes.length > 0 && (
            <View className="mb-5 max-h-40">
              <Text className="text-xs font-bold text-foreground mb-2">What's New:</Text>
              <ScrollView showsVerticalScrollIndicator={false} className="max-h-32">
                {policy.releaseNotes.map((note, index) => (
                  <View key={index} className="flex-row items-start gap-2 mb-1.5">
                    <Text className="text-xs text-primary leading-tight">•</Text>
                    <Text className="text-xs text-muted-foreground leading-relaxed flex-1">
                      {note}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Download Progress State */}
          {isDownloading && (
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-xs font-medium text-muted-foreground">Downloading update...</Text>
                <Text className="text-xs font-bold text-primary">{downloadPercentLabel}</Text>
              </View>
              <View className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${downloadProgress}%` }}
                />
              </View>
            </View>
          )}

          {/* Actions */}
          <View className="gap-2.5">
            {isDownloaded ? (
              <Button
                variant="default"
                onPress={onCompleteUpdate}
                accessibilityRole="button"
                accessibilityLabel="Restart to Apply"
                className="w-full h-11"
              >
                <CheckCircle size={16} className="text-primary-foreground me-1.5" />
                <Text className="font-bold text-xs text-primary-foreground">Restart to Apply</Text>
              </Button>
            ) : (
              <Button
                variant="default"
                onPress={onUpdateNow}
                disabled={isDownloading}
                accessibilityRole="button"
                accessibilityLabel="Update Now"
                className="w-full h-11"
              >
                <Download size={16} className="text-primary-foreground me-1.5" />
                <Text className="font-bold text-xs text-primary-foreground">
                  {isDownloading ? 'Downloading...' : 'Update Now'}
                </Text>
              </Button>
            )}

            {!isDownloading && (
              <Button
                variant="ghost"
                onPress={onLater}
                accessibilityRole="button"
                accessibilityLabel="Later"
                className="w-full h-10"
              >
                <Text className="font-semibold text-xs text-muted-foreground">Later</Text>
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UpdatePromptModal;
