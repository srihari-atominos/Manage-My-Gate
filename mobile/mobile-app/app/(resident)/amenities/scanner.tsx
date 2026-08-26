import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, KeyRound, History, ChevronLeft } from 'lucide-react-native';
import { SafeAreaWrapper } from '@/components/layout';
import {
  CameraViewFinder,
  FlashlightToggle,
  ScanResultSheet,
  type ScanResultData,
  ManualCodeEntrySheet,
} from '@/components/hardware';
import { BottomSheet, Button, ListCard, Text, Icon } from '@/components/ui';
import { IconButton } from '@/components/common';
import { EmptyState } from '@/components/feedback';
import { useSecurityScanner } from '../../../src/features/amenities/hooks/useSecurityScanner';

export default function AmenitySecurityGateScannerScreen() {
  const router = useRouter();
  const {
    isScanning,
    isFlashlightOn,
    isResultModalOpen,
    checkInResult,
    checkingIn,
    recentScans,
    toggleFlashlight,
    handleBarCodeScanned,
    resetScanner,
  } = useSecurityScanner();

  const [isManualSheetOpen, setIsManualSheetOpen] = useState(false);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);

  const handleManualSubmit = (token: string) => {
    setIsManualSheetOpen(false);
    handleBarCodeScanned({ type: 'MANUAL', data: token });
  };

  const handleSimulateScan = () => {
    handleBarCodeScanned({
      type: 'SIMULATION',
      data: JSON.stringify({
        bookingId: 'BK-778899',
        amenityName: 'Tennis Court 1',
        residentName: 'Sarah Jenkins',
        unitNumber: 'Villa 202',
        startTime: '04:00 PM',
        endTime: '05:30 PM',
      }),
    });
  };

  // Standardize check-in result for ScanResultSheet
  const formattedResult: ScanResultData | null = checkInResult
    ? {
        success: Boolean(checkInResult.success),
        status: checkInResult.success ? 'VERIFIED' : 'REJECTED',
        title: checkInResult.success
          ? 'Amenity Ticket Verified'
          : 'Amenity Access Refused',
        message:
          checkInResult.message ||
          (checkInResult.success
            ? 'Reservation pass is active and verified for entry.'
            : 'Pass is expired, invalid, or already checked in.'),
        visitorName: checkInResult.booking?.residentName || 'Resident Member',
        passType: 'AMENITY ACCESS',
        amenityName: checkInResult.booking?.amenityName || 'Community Facility',
        unitOrVilla:
          (checkInResult.booking as any)?.unitNumber ||
          (checkInResult.booking as any)?.villaNumber ||
          (checkInResult.booking as any)?.unit,
        validityWindow:
          checkInResult.booking?.startTime && checkInResult.booking?.endTime
            ? `${checkInResult.booking.startTime} - ${checkInResult.booking.endTime}`
            : undefined,
        bookingReference:
          checkInResult.booking?.bookingId ||
          (checkInResult.booking as any)?.bookingReference ||
          checkInResult.booking?._id ||
          checkInResult.booking?.passCode ||
          'N/A',
      }
    : null;

  return (
    <View className="flex-1 bg-black relative">
      {/* 1. Fullscreen Live Camera Viewport Base Layer */}
      <CameraViewFinder
        isScanning={isScanning}
        enableTorch={isFlashlightOn}
        instruction="Align Amenity Reservation QR inside frame"
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
              Amenity Ticket Scanner
            </Text>
          </View>

          <IconButton
            icon={History}
            variant="outline"
            size="md"
            onPress={() => setIsHistorySheetOpen(true)}
            className="bg-black/60 border-white/20"
            accessibilityLabel="Scan History Logs"
          />
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
              onPress={() => setIsManualSheetOpen(true)}
              className="flex-1 h-11 bg-black/70 border-white/20 flex-row items-center justify-center gap-1.5"
              accessibilityRole="button"
              accessibilityLabel="Manual token lookup"
            >
              <Icon as={KeyRound} size={16} className="text-primary-foreground" />
              <Text className="text-xs font-bold text-primary-foreground">Manual Token</Text>
            </Button>
          </View>

          {/* Simulation Test Trigger */}
          <Button
            variant="outline"
            onPress={handleSimulateScan}
            disabled={checkingIn}
            className="w-full max-w-sm h-11 border-primary/50 bg-primary/20 flex-row items-center justify-center gap-2"
            accessibilityRole="button"
            accessibilityLabel="Simulate amenity QR scan"
          >
            <Icon as={Camera} size={16} className="text-primary-foreground" />
            <Text className="text-primary-foreground font-bold text-xs">
              {checkingIn ? 'Verifying Amenity Pass...' : 'Simulate Amenity Scan (Test)'}
            </Text>
          </Button>
        </View>
      </SafeAreaWrapper>

      {/* 3. Reusable Verification Result Bottom Sheet */}
      <ScanResultSheet
        visible={isResultModalOpen}
        onClose={resetScanner}
        result={formattedResult}
        loading={checkingIn}
        onPrimaryAction={resetScanner}
        primaryActionLabel="Confirm Facility Entry"
        onSecondaryAction={resetScanner}
        secondaryActionLabel="Scan Next Ticket"
      />

      {/* 4. Reusable Manual Token Entry Bottom Sheet */}
      <ManualCodeEntrySheet
        visible={isManualSheetOpen}
        onClose={() => setIsManualSheetOpen(false)}
        onSubmitCode={handleManualSubmit}
        loading={checkingIn}
        title="Manual Booking Token Lookup"
        description="Enter the resident reservation reference token if camera optical scanning fails."
        placeholder="e.g. BK-982341"
        label="Booking Reference Token"
      />

      {/* 5. Reusable Today's Scan History Bottom Sheet */}
      <BottomSheet
        visible={isHistorySheetOpen}
        onClose={() => setIsHistorySheetOpen(false)}
        title="Today's Amenity Check-In Logs"
      >
        <View className="gap-3 pb-4">
          {recentScans && recentScans.length > 0 ? (
            recentScans.slice(0, 10).map((scan: any, idx: number) => {
              const isExit = scan.scanType === 'Exit';
              const scanTimeFormatted = scan.scanTime
                ? new Date(scan.scanTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-';

              return (
                <ListCard
                  key={scan._id || idx}
                  title={scan.amenityName || 'Amenity Access'}
                  subtitle={`${scan.residentName || 'Resident'} • ${scanTimeFormatted}`}
                  leftIcon={isExit ? 'DoorClosed' : 'DoorOpen'}
                  status={{
                    label: scan.scanType || 'ENTRY',
                    variant: isExit ? 'info' : 'success',
                  }}
                />
              );
            })
          ) : (
            <EmptyState
              title="No Scan History Recorded"
              description="Amenity attendance logs for today will appear here after passes are verified."
            />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}
