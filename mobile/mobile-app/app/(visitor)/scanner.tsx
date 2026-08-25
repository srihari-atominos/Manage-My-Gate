import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, KeyRound, ChevronLeft } from 'lucide-react-native';
import { SafeAreaWrapper } from '@/components/layout';
import {
  CameraViewFinder,
  FlashlightToggle,
  ScanResultSheet,
  ManualCodeEntrySheet,
} from '@/components/hardware';
import { Button, Text, Icon } from '@/components/ui';
import { IconButton } from '@/components/common';
import { useGuardGateScanner } from '../../src/features/visitor/hooks/useGuardGateScanner';

export default function GateSecurityScannerScreen() {
  const router = useRouter();
  const {
    isScanning,
    isFlashlightOn,
    isResultSheetOpen,
    isManualEntryOpen,
    checkingIn,
    scanResult,
    toggleFlashlight,
    openManualEntry,
    closeManualEntry,
    handleBarCodeScanned,
    handleManualCodeSubmit,
    handleConfirmGateEntry,
    resetScanner,
  } = useGuardGateScanner();

  const handleSimulateScan = () => {
    handleBarCodeScanned({
      type: 'SIMULATION',
      data: JSON.stringify({
        code: 'VIS-982341',
        visitorName: 'Alex Mercer',
        phone: '+966 50 123 4567',
        passType: 'GUEST',
        unit: 'Villa 104',
        hostName: 'Mohammed Al-Saud',
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      }),
    });
  };

  return (
    <View className="flex-1 bg-black relative">
      {/* 1. Fullscreen Live Camera Viewport Base Layer */}
      <CameraViewFinder
        isScanning={isScanning}
        instruction="Align Visitor QR Pass inside frame"
        onScan={(data) => handleBarCodeScanned({ type: 'CAMERA', data })}
        fullscreen={true}
        className="absolute inset-0"
      />

      {/* 2. Floating HUD Controls Layer */}
      <SafeAreaWrapper
        backgroundColorClassName="bg-transparent"
        className="flex-1 justify-between p-4"
        pointerEvents="box-none"
      >
        {/* Top Floating Header Controls */}
        <View className="flex-row items-center justify-between z-20" pointerEvents="box-none">
          <IconButton
            icon={ChevronLeft}
            variant="outline"
            size="md"
            onPress={() => router.back()}
            className="bg-black/60 border-white/20"
            accessibilityLabel="Go back"
          />

          <View className="bg-black/60 border border-white/20 px-4 py-2 rounded-full">
            <Text className="text-primary-foreground font-bold text-xs tracking-wider uppercase">
              Gate Security Scanner
            </Text>
          </View>

          <View className="w-10" />
        </View>

        {/* Bottom Floating Control Bar */}
        <View className="z-20 gap-3 items-center pb-4 w-full" pointerEvents="box-none">
          {/* Flashlight Toggle & Manual Entry Trigger */}
          <View className="flex-row items-center justify-center gap-3 w-full max-w-sm">
            <FlashlightToggle
              isOn={isFlashlightOn}
              onToggle={toggleFlashlight}
              className="flex-1 bg-black/70 border-white/20"
            />

            <Button
              variant="outline"
              onPress={openManualEntry}
              className="flex-1 h-11 bg-black/70 border-white/20 flex-row items-center justify-center gap-1.5"
              accessibilityRole="button"
              accessibilityLabel="Manual pass PIN lookup"
            >
              <Icon as={KeyRound} size={16} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Manual PIN</Text>
            </Button>
          </View>

          {/* Test Simulation Trigger */}
          <Button
            variant="outline"
            onPress={handleSimulateScan}
            disabled={checkingIn}
            className="w-full max-w-sm h-11 border-primary/50 bg-primary/20 flex-row items-center justify-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="Simulate visitor QR scan"
          >
            <Icon as={Camera} size={16} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-xs">
              {checkingIn ? 'Verifying Visitor Pass...' : 'Simulate Visitor Scan (Test)'}
            </Text>
          </Button>
        </View>
      </SafeAreaWrapper>

      {/* 3. Reusable Verification Result Bottom Sheet */}
      <ScanResultSheet
        visible={isResultSheetOpen}
        onClose={resetScanner}
        result={scanResult}
        loading={checkingIn}
        onPrimaryAction={handleConfirmGateEntry}
        primaryActionLabel="Open Gate Barrier"
        onSecondaryAction={resetScanner}
        secondaryActionLabel="Scan Next Pass"
      />

      {/* 4. Reusable Manual Code Entry Bottom Sheet */}
      <ManualCodeEntrySheet
        visible={isManualEntryOpen}
        onClose={closeManualEntry}
        onSubmitCode={handleManualCodeSubmit}
        loading={checkingIn}
        title="Manual Visitor Pass Verification"
        description="Enter the 6-digit visitor PIN code or alphanumeric pass reference."
        placeholder="e.g. 982341 or VIS-982341"
      />
    </View>
  );
}
