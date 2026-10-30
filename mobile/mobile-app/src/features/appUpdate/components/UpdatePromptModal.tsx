import React from 'react';
import { View, Modal, Platform, TouchableOpacity } from 'react-native';
import { ArrowDownToLine, CheckCircle, X } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
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

  const downloadPercentLabel = `${downloadProgress}%`;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onLater}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        <View className="w-full max-w-[320px] bg-card border border-border/80 rounded-[28px] p-6 shadow-2xl text-center relative items-center">
          
          {/* Top Right Close '✕' Button */}
          <TouchableOpacity
            onPress={onLater}
            accessibilityRole="button"
            accessibilityLabel="Close update dialog"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="absolute top-4 end-4 w-7 h-7 rounded-full items-center justify-center bg-muted/40"
          >
            <X size={15} className="text-muted-foreground" />
          </TouchableOpacity>

          {/* Green Download Tray Icon with Notification Alert Badge (!) */}
          <View className="relative w-18 h-18 items-center justify-center mt-1 mb-3">
            <View className="w-16 h-16 rounded-2xl bg-emerald-500/10 items-center justify-center">
              <ArrowDownToLine size={34} color="#10b981" strokeWidth={2.4} />
            </View>

            {/* Notification Badge (!) */}
            <View className="absolute bottom-0 end-0 w-5 h-5 rounded-full bg-orange-500 border-2 border-card items-center justify-center shadow-sm">
              <Text className="text-[10px] font-black text-white leading-none">!</Text>
            </View>
          </View>

          {/* Clean, Simple Title */}
          <Text className="text-lg font-bold text-foreground text-center tracking-tight">
            New update available
          </Text>

          {/* Clean, Professional Subtitle */}
          <Text className="text-xs text-muted-foreground text-center font-normal leading-relaxed mt-1 mb-4 px-1">
            To enjoy our newest features tap the button below
          </Text>

          {/* Download Progress State */}
          {isDownloading && (
            <View className="w-full mb-3 mt-1">
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

          {/* Action Buttons */}
          <View className="w-full gap-2 mt-2">
            {isDownloaded ? (
              <Button
                variant="default"
                onPress={onCompleteUpdate}
                accessibilityRole="button"
                accessibilityLabel="Restart to Apply"
                className="w-full h-11 rounded-2xl"
              >
                <CheckCircle size={16} className="text-primary-foreground me-1.5" />
                <Text className="font-bold text-primary-foreground text-sm">Restart to Apply</Text>
              </Button>
            ) : (
              <Button
                variant="default"
                onPress={onUpdateNow}
                disabled={isDownloading}
                accessibilityRole="button"
                accessibilityLabel="Update the app"
                className="w-full h-11 rounded-2xl"
              >
                <Text className="font-bold text-primary-foreground text-sm">
                  {isDownloading ? 'Downloading...' : 'Update the app'}
                </Text>
              </Button>
            )}

            {!isDownloading && (
              <TouchableOpacity
                onPress={onLater}
                accessibilityRole="button"
                accessibilityLabel="Not now"
                className="py-1.5 items-center justify-center"
              >
                <Text className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Not now
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
};

export default UpdatePromptModal;
