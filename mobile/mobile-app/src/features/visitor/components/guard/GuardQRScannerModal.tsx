import React, { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { CameraViewFinder } from '@/components/hardware/CameraViewFinder';
import { QrCode, Search } from 'lucide-react-native';

export interface GuardQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanCode: (code: string) => void;
}

export const GuardQRScannerModal: React.FC<GuardQRScannerModalProps> = ({
  visible,
  onClose,
  onScanCode,
}) => {
  const [manualCode, setManualCode] = useState('');

  const handleSimulatedScan = () => {
    const trimmed = manualCode.trim();
    if (trimmed) {
      onScanCode(trimmed);
      setManualCode('');
      onClose();
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Guard Gate QR Scanner"
    >
      <View className="gap-4 pb-2">
        {/* Live Hardware Camera Viewfinder */}
        <CameraViewFinder
          isScanning={visible}
          instruction="Align visitor QR pass code inside viewfinder"
          onScan={(data) => {
            onScanCode(data);
            onClose();
          }}
          className="h-64 mb-0"
        />

        {/* Manual Code Lookup Form */}
        <View className="bg-card border border-border rounded-2xl p-3.5 gap-2.5">
          <View className="flex-row items-center gap-2">
            <QrCode size={16} className="text-primary" />
            <Text className="text-xs font-bold text-foreground">Manual Pass Verification</Text>
          </View>

          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Enter 6-digit PIN code..."
                keyboardType="number-pad"
                inputClassName="font-mono text-sm tracking-widest"
                onSubmitEditing={handleSimulatedScan}
              />
            </View>
            <Button
              variant="default"
              size="sm"
              onPress={handleSimulatedScan}
              disabled={!manualCode.trim()}
              className="h-11 px-4 rounded-xl flex-row items-center gap-1.5"
              accessibilityLabel="Verify Pass Code"
            >
              <Search size={15} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Verify</Text>
            </Button>
          </View>
        </View>

        <Button
          variant="outline"
          onPress={onClose}
          className="h-11 rounded-xl"
          accessibilityLabel="Close QR Scanner"
        >
          <Text className="text-xs font-semibold text-foreground">Close Scanner</Text>
        </Button>
      </View>
    </BottomSheet>
  );
};

export default GuardQRScannerModal;
