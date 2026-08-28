import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ScanLine, X, Camera, CameraOff, Zap, ZapOff } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QRScannerOverlay } from '@/components/hardware/QRScannerOverlay';

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
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Reset scanned status and torch whenever modal opens
  React.useEffect(() => {
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
              <ScanLine size={20} color="#0284c7" />
              <Text className="text-base font-extrabold text-foreground">Guard Gate QR Scanner</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-secondary">
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
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
                <Text className="text-white text-sm font-bold text-center">
                  Camera Permission Required
                </Text>
                <Text className="text-white/60 text-xs text-center px-4 mb-2">
                  Allow camera access to scan and verify visitor QR passes
                </Text>
                <Button
                  variant="default"
                  onPress={requestPermission}
                  className="bg-primary px-5 py-2.5 rounded-xl"
                >
                  <View className="flex-row items-center gap-2">
                    <Camera size={16} color="#ffffff" />
                    <Text className="text-white text-xs font-bold">Grant Camera Permission</Text>
                  </View>
                </Button>
              </View>
            ) : (
              <View className="w-full h-full relative">
                <CameraView
                  facing="back"
                  enableTorch={torchOn}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  style={{ width: '100%', height: '100%' }}
                />
                <QRScannerOverlay instruction="Align Visitor QR Code inside Frame" />

                {/* Compact Flashlight Torch Toggle Overlay */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setTorchOn(!torchOn)}
                  className={`absolute top-3 right-3 z-30 px-2.5 py-1.5 rounded-full flex-row items-center gap-1 border shadow-lg ${
                    torchOn
                      ? 'bg-amber-400 border-amber-300 shadow-amber-500/40'
                      : 'bg-black/75 border-white/30 shadow-black/50'
                  }`}
                >
                  {torchOn ? (
                    <>
                      <Zap size={13} color="#000000" fill="#000000" strokeWidth={2.5} />
                      <Text className="text-[10px] font-black text-black tracking-wider uppercase">Flash ON</Text>
                    </>
                  ) : (
                    <>
                      <ZapOff size={13} color="#ffffff" strokeWidth={2.5} />
                      <Text className="text-[10px] font-bold text-white tracking-wider uppercase">Flash OFF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Manual PIN Fallback Strip at Bottom */}
            <View className="absolute bottom-2 left-2 right-2 flex-row gap-2 bg-black/85 p-2 rounded-xl border border-white/20 z-20">
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Or type 6-digit PIN..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                className="flex-1 text-xs text-white px-2 font-mono"
                keyboardType="number-pad"
              />
              <Button size="sm" onPress={handleManualScan} className="px-3 rounded-lg bg-primary">
                <Text className="text-xs font-bold text-white">Verify</Text>
              </Button>
            </View>
          </View>

          <Button variant="outline" onPress={onClose} className="rounded-xl border-border">
            <Text className="text-xs font-semibold text-foreground">Cancel</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
};

export default GuardQRScannerModal;
