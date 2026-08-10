import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { QrCode, ScanLine, X, CheckCircle2 } from 'lucide-react-native';

interface GuardQRScannerModalProps {
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
    if (manualCode.trim()) {
      onScanCode(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center p-4 items-center">
        <View className="bg-background w-full rounded-2xl p-4 gap-4 max-w-md border border-border shadow-xl">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border pb-2">
            <View className="flex-row items-center gap-2">
              <ScanLine size={20} className="text-primary" />
              <Text className="text-base font-bold text-foreground">Guard Gate QR Scanner</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-muted">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>

          {/* Scanner View Frame */}
          <View className="h-56 bg-black rounded-xl items-center justify-center border-2 border-dashed border-primary/50 relative overflow-hidden">
            <ScanLine size={48} className="text-primary animate-pulse opacity-75" />
            <Text className="text-xs text-white/80 font-semibold mt-2 text-center px-4">
              Point camera at visitor QR pass code
            </Text>

            {/* Simulated Scan Overlay */}
            <View className="absolute bottom-2 left-2 right-2 flex-row gap-2 bg-black/80 p-2 rounded-lg border border-border">
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Or type pass PIN code..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                className="flex-1 text-xs text-white px-2 font-mono"
              />
              <Button size="sm" onPress={handleSimulatedScan} className="px-3">
                <Text className="text-xs font-bold text-white">Scan</Text>
              </Button>
            </View>
          </View>

          <Button variant="outline" onPress={onClose}>
            <Text className="text-xs font-semibold">Close Scanner</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default GuardQRScannerModal;
