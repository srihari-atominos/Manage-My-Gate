import React from 'react';
import { Modal, View } from 'react-native';
import { CameraOff } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export interface CameraPermissionPromptProps {
  visible: boolean;
  onNo: () => void;
  onYes: () => void;
}

/** Themed in-app prompt shown after iOS has already denied camera access. */
export function CameraPermissionPrompt({ visible, onNo, onYes }: CameraPermissionPromptProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNo}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
          <View className="h-12 w-12 self-center items-center justify-center rounded-full bg-primary/15">
            <CameraOff size={25} className="text-primary" />
          </View>
          <Text className="mt-4 text-center text-lg font-bold text-foreground">
            Camera access is off
          </Text>
          <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
            Camera access is needed to scan barcodes. Would you like to turn it on in Settings?
          </Text>
          <View className="mt-6 flex-row gap-3">
            <Button
              variant="outline"
              onPress={onNo}
              className="flex-1 border-primary/30"
              accessibilityRole="button"
              accessibilityLabel="No, keep camera access off"
            >
              <Text className="text-primary">No</Text>
            </Button>
            <Button
              variant="default"
              onPress={onYes}
              className="flex-1"
              accessibilityRole="button"
              accessibilityLabel="Yes, open camera settings"
            >
              <Text className="text-primary-foreground">Yes</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default CameraPermissionPrompt;
