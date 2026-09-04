import React, { useState, useEffect } from 'react';
import { View, Modal, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/forms/TextInput';
import { QRScannerOverlay } from '@/components/hardware/QRScannerOverlay';
import { FlashlightToggle } from '@/components/hardware/FlashlightToggle';
import { ScanLine, X, CameraOff } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface LedgerQRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanCode: (code: string) => void;
  title?: string;
  instruction?: string;
}

export const LedgerQRScannerModal: React.FC<LedgerQRScannerModalProps> = ({
  visible,
  onClose,
  onScanCode,
  title = 'Invoice & Cheque Scanner',
  instruction = 'Align Invoice or Cheque QR Code inside Frame',
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setTorchOn(false);
      setManualCode('');
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);
    onScanCode(data.trim());
    onClose();
  };

  const handleManualScan = () => {
    if (manualCode.trim()) {
      onScanCode(manualCode.trim());
      setManualCode('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center p-4 items-center">
        <View className="bg-card w-full rounded-3xl p-4 gap-4 max-w-md border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-border pb-3">
            <View className="flex-row items-center gap-2">
              <ScanLine size={20} className="text-primary" />
              <Text className="text-base font-extrabold text-foreground">{title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              className="p-1.5 rounded-full bg-secondary active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
            >
              <X size={16} className="text-muted-foreground" />
            </Pressable>
          </View>

          {/* Camera / Permission Body */}
          <View className="h-72 w-full bg-black rounded-2xl overflow-hidden relative border border-border justify-center items-center">
            {!permission ? (
              <Text className="text-white text-xs">Checking camera status...</Text>
            ) : !permission.granted ? (
              <View className="p-4 items-center justify-center gap-2 text-center">
                <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mb-1">
                  <CameraOff size={28} color="#ffffff" />
                </View>
                <Text className="text-white font-bold text-center">Camera Access Required</Text>
                <Text className="text-white/60 text-xs text-center px-4">
                  Enable camera to scan invoice barcode slips or cheque references.
                </Text>
                <Button variant="default" size="sm" onPress={requestPermission} className="mt-2">
                  <Text className="text-white font-bold text-xs">Enable Camera</Text>
                </Button>
              </View>
            ) : (
              <>
                <CameraView
                  facing="back"
                  enableTorch={torchOn}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'code128', 'code39'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Animated Viewfinder Overlay */}
                <QRScannerOverlay instruction={instruction} />

                {/* Flashlight toggle from Catalog */}
                <View className="absolute bottom-3 right-3 z-30">
                  <FlashlightToggle
                    isOn={torchOn}
                    onToggle={() => setTorchOn((prev) => !prev)}
                    variant="compact-pill"
                  />
                </View>
              </>
            )}
          </View>

          {/* Manual Entry Fallback using Catalog TextInput */}
          <View className="gap-2">
            <Text className="text-xs font-semibold text-muted-foreground">Or Enter Invoice / Chq # Manually</Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <TextInput
                  value={manualCode}
                  onChangeText={setManualCode}
                  placeholder="e.g. INV-2026-001 or CHQ-883"
                  autoCapitalize="characters"
                  returnKeyType="search"
                  onSubmitEditing={handleManualScan}
                />
              </View>
              <Button
                variant="outline"
                size="default"
                onPress={handleManualScan}
                disabled={!manualCode.trim()}
                accessibilityLabel="Find invoice by number"
              >
                <Text className="text-xs font-bold text-foreground">Find</Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LedgerQRScannerModal;
