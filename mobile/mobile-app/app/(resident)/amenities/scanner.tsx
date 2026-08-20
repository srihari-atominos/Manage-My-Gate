import React, { useState } from 'react';
import { View, ScrollView, Image } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { CameraViewFinder } from '@/components/hardware/CameraViewFinder';
import { TextInput } from '@/components/forms/TextInput';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Check, X } from 'lucide-react-native';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListCard } from '@/components/ui/ListCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useSecurityScanner } from '../../../src/features/amenities/hooks/useSecurityScanner';

export default function AmenitySecurityGateScannerScreen() {
  const {
    isScanning,
    isResultModalOpen,
    checkInResult,
    checkingIn,
    recentScans,
    handleBarCodeScanned,
    resetScanner,
  } = useSecurityScanner();

  const [manualToken, setManualToken] = useState('');

  const handleManualSubmit = () => {
    if (!manualToken.trim()) return;
    handleBarCodeScanned({ type: 'MANUAL', data: manualToken.trim() });
    setManualToken('');
  };

  const lastScan = recentScans?.[0];

  return (
    <ScreenShell
      title="Facility Pass Verification"
      subtitle="Gate scanner for amenity reservation pass codes"
      iconName="QrCode"
      loading={checkingIn}
    >
      <ScrollView className="flex-1 px-4 pt-2 pb-6" showsVerticalScrollIndicator={false}>
        {/* Active Camera View Finder */}
        <CameraViewFinder
          onScan={(data) => handleBarCodeScanned({ type: 'CAMERA', data })}
          isScanning={isScanning}
          title="Scan Resident Reservation Pass"
          instruction="Align the QR code within the frame"
        />

        {/* Manual Token Fallback */}
        <View className="bg-card p-4 rounded-2xl border border-border mb-4">
          <Text className="font-bold text-sm text-foreground mb-1">
            Manual Booking Token Lookup
          </Text>
          <Text variant="muted" className="text-xs text-muted-foreground mb-3">
            If resident phone screen cannot be scanned, enter the booking reference token.
          </Text>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextInput
                value={manualToken}
                onChangeText={setManualToken}
                placeholder="e.g. BK-982341"
              />
            </View>
            <Button
              variant="default"
              disabled={!manualToken.trim() || checkingIn}
              onPress={handleManualSubmit}
              className="bg-primary px-4 self-end"
            >
              <Text className="text-white font-bold text-sm">Verify Pass</Text>
            </Button>
          </View>
        </View>

        {/* Last Scan Details Card */}
        {Boolean(lastScan) && (
          <View className="bg-card p-4 rounded-2xl border border-border/80 mb-4 shadow-sm">
            <View className="flex-row items-center justify-between mb-3 border-b border-border/40 pb-2">
              <Text className="font-bold text-sm text-foreground">Last Scan Summary</Text>
              <StatusBadge
                label={lastScan.scanType || 'Scan'}
                variant={lastScan.scanType === 'Exit' ? 'info' : 'success'}
                size="sm"
              />
            </View>

            <View className="flex-row items-center gap-3">
              {lastScan.residentPhoto ? (
                <Image
                  source={{ uri: lastScan.residentPhoto }}
                  className="w-12 h-12 rounded-full border border-border"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center border border-primary/20">
                  <Text className="text-primary font-bold text-base">
                    {(lastScan.residentName || 'R')[0].toUpperCase()}
                  </Text>
                </View>
              )}

              <View className="flex-1">
                <Text className="font-bold text-sm text-foreground">
                  {lastScan.residentName || 'Resident'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Amenity: {lastScan.amenityName || 'Community Facility'}
                </Text>
                <Text className="text-xs font-mono text-primary mt-0.5">
                  Ref: {lastScan.bookingId || lastScan.bookingReference || 'N/A'}
                </Text>
              </View>

              <Text className="text-[11px] text-muted-foreground self-start">
                {lastScan.scanTime
                  ? new Date(lastScan.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </Text>
            </View>
          </View>
        )}

        {/* Recent Scan History List */}
        <View className="bg-card p-4 rounded-2xl border border-border mb-6">
          <Text className="font-bold text-sm text-foreground mb-3">
            Today's Scan History
          </Text>

          {recentScans && recentScans.length > 0 ? (
            recentScans.slice(0, 5).map((scan: any, idx: number) => {
              const isExit = scan.scanType === 'Exit';
              const scanTimeFormatted = scan.scanTime
                ? new Date(scan.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '-';

              return (
                <View key={scan._id || idx} className="mb-2">
                  <ListCard
                    title={scan.amenityName || 'Amenity Pass'}
                    subtitle={`${scan.residentName || 'Resident'} • Guard: ${scan.guardName || 'System'} • ${scanTimeFormatted}`}
                    leftIcon={isExit ? 'DoorClosed' : 'DoorOpen'}
                    status={{
                      label: scan.scanType || 'ENTRY',
                      variant: isExit ? 'info' : 'success',
                    }}
                  />
                </View>
              );
            })
          ) : (
            <Text className="text-xs text-muted-foreground text-center py-4">
              No scan history recorded today.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Verification Result Dialog */}
      <BottomSheet visible={isResultModalOpen} onClose={resetScanner} title="Pass Verification Result">
        <View className="p-4 items-center gap-3">
          {checkInResult?.success ? (
            <>
              <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-1">
                <Icon as={Check} size={32} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <StatusBadge label="VERIFIED ACCESS" variant="success" />
              <Text className="text-xl font-bold text-foreground text-center mt-1">
                {checkInResult?.booking?.amenityName || 'Amenity Access Granted'}
              </Text>
              <Text variant="muted" className="text-xs text-center text-muted-foreground">
                Slot: {checkInResult?.booking?.startTime} - {checkInResult?.booking?.endTime}
              </Text>
              <Text className="text-sm font-semibold text-foreground text-center">
                Resident: {checkInResult?.booking?.residentName || 'Villa Resident'}
              </Text>
              <Button variant="default" onPress={resetScanner} className="bg-primary w-full mt-3">
                <Text className="text-white font-bold text-base">Confirm Gate Entry</Text>
              </Button>
            </>
          ) : (
            <>
              <View className="w-16 h-16 rounded-full bg-destructive/20 items-center justify-center mb-1">
                <Icon as={X} size={32} className="text-destructive" />
              </View>
              <StatusBadge label="REJECTED ACCESS" variant="danger" />
              <Text className="text-lg font-bold text-foreground text-center mt-1">
                Pass Verification Failed
              </Text>
              <Text variant="muted" className="text-xs text-center text-destructive">
                {checkInResult?.message || 'Invalid, expired or already checked-in pass token.'}
              </Text>
              <Button variant="default" onPress={resetScanner} className="bg-primary w-full mt-3">
                <Text className="text-white font-bold text-base">Scan Next Pass</Text>
              </Button>
            </>
          )}
        </View>
      </BottomSheet>
    </ScreenShell>
  );
}
