import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { QRScannerOverlay } from '@/components/hardware/QRScannerOverlay';
import { FlashlightToggle } from '@/components/hardware/FlashlightToggle';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { useSecurityScanner } from '../../src/features/amenities/hooks/useSecurityScanner';

export default function GateSecurityScannerScreen() {
  const router = useRouter();
  const {
    isScanning,
    isFlashlightOn,
    isResultModalOpen,
    checkInResult,
    checkingIn,
    toggleFlashlight,
    handleBarCodeScanned,
    resetScanner,
  } = useSecurityScanner();

  const handleSimulateScan = () => {
    handleBarCodeScanned({ type: 'qr', data: '659c8d32a10e42b890f11122' });
  };

  const isSuccess = checkInResult?.success && checkInResult?.status === 'SUCCESS';

  return (
    <SafeAreaWrapper backgroundColorClassName="bg-black">
      <View className="flex-1 relative justify-between">
        {/* Top Floating Control Bar */}
        <View className="z-20 flex-row items-center justify-between px-4 pt-3">
          <Pressable
            onPress={() => router.back()}
            className="p-2.5 rounded-full bg-black/60 border border-white/20 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon as={ChevronLeft} size={22} color="#ffffff" />
          </Pressable>

          <Text className="text-white font-bold text-base tracking-wide">
            Gate Security Check-In
          </Text>

          <View className="w-10" />
        </View>

        {/* QR Scanner Overlay Component */}
        <QRScannerOverlay instruction="Align Resident Pass QR inside frame" />

        {/* Bottom Control Bar & Test Trigger */}
        <View className="z-20 px-6 pb-8 items-center gap-4">
          <FlashlightToggle
            isOn={isFlashlightOn}
            onToggle={toggleFlashlight}
            className="bg-black/70 border-white/20 w-48"
          />

          <Button
            variant="outline"
            onPress={handleSimulateScan}
            disabled={checkingIn}
            className="border-primary/50 bg-primary/20 w-full"
          >
            <Icon as={Camera} size={18} color="#ffffff" className="mr-2" />
            <Text className="text-white font-semibold text-sm">
              {checkingIn ? 'Verifying Pass...' : 'Simulate QR Scan (Test)'}
            </Text>
          </Button>
        </View>

        {/* Instant Verification Result Confirmation Modal */}
        <ConfirmationModal
          visible={isResultModalOpen}
          title={isSuccess ? 'Gate Check-In Verified' : 'Check-In Refused'}
          message={
            checkInResult?.message ||
            (isSuccess
              ? 'Amenity pass is valid and checked in.'
              : 'Pass is expired, invalid, or already checked in.')
          }
          confirmLabel="Scan Next Pass"
          cancelLabel="Close"
          variant={isSuccess ? 'info' : 'danger'}
          onConfirm={resetScanner}
          onCancel={resetScanner}
          loading={checkingIn}
        />
      </View>
    </SafeAreaWrapper>
  );
}
