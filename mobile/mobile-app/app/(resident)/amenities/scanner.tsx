import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import {
  QrCode,
  ScanLine,
  Search,
  CheckCircle2,
  DoorOpen,
  DoorClosed,
  ShieldAlert,
} from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { KPIRow } from '@/components/ui/KPIRow';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ScanResultSheet, ScanResultData } from '@/components/hardware/ScanResultSheet';
import { ManualCodeEntrySheet } from '@/components/hardware/ManualCodeEntrySheet';
import { QRScannerModal } from '@/components/hardware/QRScannerModal';
import { AmenitySecurityLogCard } from '@/src/features/amenities/components/AmenitySecurityLogCard';
import { SecurityLogDetailModal } from '@/src/features/amenities/components/SecurityLogDetailModal';
import { SecurityLog } from '@/src/features/amenities/services/securityLogApi';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useSecurityScanner } from '../../../src/features/amenities/hooks/useSecurityScanner';
import { useSecurityLogs } from '../../../src/features/amenities/hooks/useSecurityLogs';
import { useAuth } from '../../../src/features/auth/hooks/useAuth';
import { isFeatureAllowedForUser } from '../../../src/utils/rbac';
import { formatUtcToLocalDisplay } from '../../../src/features/amenities/utils/amenityStateHelpers';

const AMENITY_TABS = [
  { key: 'CONSOLE', label: 'Console' },
  { key: 'LOGS', label: 'Security Logs' },
];

const SCAN_MODE_TABS = [
  { key: 'CHECK_IN', label: 'Facility Entry (Check-In)' },
  { key: 'CHECK_OUT', label: 'Facility Exit (Check-Out)' },
];

const SCAN_TYPE_TABS = [
  { key: '', label: 'All Types' },
  { key: 'Entry', label: 'Entry' },
  { key: 'Exit', label: 'Exit' },
  { key: 'Denied', label: 'Denied' },
  { key: 'Manual Verification', label: 'Manual' },
];

export default function AmenitySecurityGateScannerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Guard: Users without security guard / scanner permissions are redirected
  if (user && !isFeatureAllowedForUser({ id: 'amenities_scanner', permission: 'amenities:scanner' }, user)) {
    if (isFeatureAllowedForUser({ id: 'amenities_discover', permission: 'amenities:discover' }, user)) {
      return <Redirect href="/(resident)/amenities/discover" />;
    }
    return <Redirect href="/(resident)/dashboard" />;
  }
  const {
    scanMode,
    setScanMode,
    isScanning,
    isFlashlightOn,
    isResultModalOpen,
    isInspectionModalOpen,
    setIsInspectionModalOpen,
    v2CheckInResult,
    v2CheckOutResult,
    v2PassActionLoading,
    v2PassError,
    localScanError,
    checkInResult,
    checkingIn,
    toggleFlashlight,
    handleBarCodeScanned,
    executeCheckOutWithInspection,
    cancelCheckOutInspection,
    resetScanner,
  } = useSecurityScanner();

  // Full Security Logs Hook integration for real-time backend data
  const {
    logs: auditLogs,
    dashboard: logDashboard,
    pagination: logPagination,
    filters: logFilters,
    loading: logsLoading,
    error: logsError,
    loadData: refreshSecurityLogs,
    handleFilterChange: onLogFilterChange,
    handlePageChange: onLogPageChange,
    handleClearFilters: onClearLogFilters,
    handleDeleteLog: onDeleteLog,
  } = useSecurityLogs();

  const [passCode, setPassCode] = useState('');
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'LOGS'>('CONSOLE');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<SecurityLog | null>(null);

  // Check-Out Inspection Form State
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    refreshSecurityLogs();
    setRefreshing(false);
  }, [refreshSecurityLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerifyPass = async (codeToVerify?: string) => {
    const raw = (codeToVerify || passCode).trim();
    if (!raw) return;

    setStatusMessage(null);
    await handleBarCodeScanned({ type: 'MANUAL', data: raw });
    refreshSecurityLogs();
  };

  const handleManualSubmit = (token: string) => {
    setManualSheetOpen(false);
    handleVerifyPass(token);
  };

  const handleConfirmInspection = async () => {
    await executeCheckOutWithInspection({
      isDamaged,
      damageNotes: damageNotes.trim() || undefined,
      assessedPenaltyAmount: Number(penaltyAmount) || 0,
    });
    setIsDamaged(false);
    setDamageNotes('');
    setPenaltyAmount('');
    refreshSecurityLogs();
  };

  const handleCancelInspection = () => {
    cancelCheckOutInspection();
    setIsDamaged(false);
    setDamageNotes('');
    setPenaltyAmount('');
  };

  // Standardize check-in / check-out result for ScanResultSheet (V2 Authoritative)
  const formattedResult: ScanResultData | null = useMemo(() => {
    if (localScanError) {
      return {
        success: false,
        status: 'REJECTED',
        title: 'Invalid Pass Format',
        message: localScanError,
        passType: 'AMENITY PASS',
      };
    }

    if (v2PassError) {
      const code = v2PassError.statusCode;
      let title = 'Verification Refused';
      let message = v2PassError.message || 'Pass verification failed.';

      if (code === 409) {
        if (scanMode === 'CHECK_IN') {
          title = 'Security Alert: Pass Replay Detected';
          message = v2PassError.message || 'This pass has already been used for entry.';
        } else {
          title = 'Check-Out Conflict';
          message = v2PassError.message || 'This pass has already been checked out.';
        }
      } else if (code === 403) {
        title = 'Access Denied';
        message = v2PassError.message || 'Pass is revoked or outside its validity window.';
      } else if (code === 404) {
        title = 'Pass Not Recognized';
        message = v2PassError.message || 'Invalid pass. This QR code is not recognized for this community.';
      } else if (code === 400) {
        title = scanMode === 'CHECK_OUT' ? 'Check-Out Rejected' : 'Check-In Rejected';
        message = v2PassError.message || 'Pass validation failed.';
      }

      return {
        success: false,
        status: 'REJECTED',
        title,
        message,
        passType: 'AMENITY PASS',
      };
    }

    if (v2CheckInResult) {
      const validFromStr = formatUtcToLocalDisplay(v2CheckInResult.validFrom).formatted;
      const validUntilStr = formatUtcToLocalDisplay(v2CheckInResult.validUntil).formatted;
      const checkInStr = v2CheckInResult.checkInTimestamp
        ? formatUtcToLocalDisplay(v2CheckInResult.checkInTimestamp).formatted
        : 'Just now';

      return {
        success: true,
        status: 'VERIFIED',
        title: 'Facility Entry Verified',
        message: 'Reservation pass is active and verified for facility entry.',
        visitorName: 'Amenity Passholder',
        passType: v2CheckInResult.passType || 'AMENITY ACCESS',
        amenityName: v2CheckInResult.facilityName || 'Community Facility',
        unitOrVilla: v2CheckInResult.gateId ? `Gate: ${v2CheckInResult.gateId}` : 'Main Turnstile',
        validityWindow: validFromStr && validUntilStr ? `${validFromStr} - ${validUntilStr}` : 'Active Window',
        entryTime: checkInStr,
        bookingReference: v2CheckInResult.reservationId || 'N/A',
      };
    }

    if (v2CheckOutResult) {
      const validFromStr = formatUtcToLocalDisplay(v2CheckOutResult.validFrom).formatted;
      const validUntilStr = formatUtcToLocalDisplay(v2CheckOutResult.validUntil).formatted;
      const checkOutStr = v2CheckOutResult.checkOutTimestamp
        ? formatUtcToLocalDisplay(v2CheckOutResult.checkOutTimestamp).formatted
        : 'Just now';

      return {
        success: true,
        status: 'VERIFIED',
        title: 'Facility Exit Recorded',
        message: 'Pass check-out completed and exit recorded.',
        visitorName: 'Amenity Passholder',
        passType: v2CheckOutResult.passType || 'AMENITY ACCESS',
        amenityName: v2CheckOutResult.facilityName || 'Community Facility',
        unitOrVilla: v2CheckOutResult.gateId ? `Gate: ${v2CheckOutResult.gateId}` : 'Main Turnstile',
        validityWindow: validFromStr && validUntilStr ? `${validFromStr} - ${validUntilStr}` : 'Completed Window',
        entryTime: checkOutStr,
        bookingReference: v2CheckOutResult.reservationId || 'N/A',
        metadata: v2CheckOutResult.inspectionDetails
          ? {
              'Damaged': v2CheckOutResult.inspectionDetails.isDamaged ? 'YES' : 'NO',
              'Damage Notes': v2CheckOutResult.inspectionDetails.damageNotes || 'None',
              'Assessed Penalty': String(v2CheckOutResult.inspectionDetails.assessedPenaltyAmount || 0),
            }
          : undefined,
      };
    }

    // Backward compatibility fallback
    if (checkInResult) {
      return {
        success: Boolean(checkInResult.success),
        status: checkInResult.success ? 'VERIFIED' : 'REJECTED',
        title: checkInResult.success ? 'Amenity Pass Verified' : 'Amenity Access Denied',
        message: checkInResult.message || 'Pass processed',
        visitorName: checkInResult.booking?.residentName || 'Resident Member',
        passType: 'AMENITY ACCESS',
        amenityName: checkInResult.booking?.amenityName || 'Community Facility',
        bookingReference: checkInResult.booking?.bookingId || checkInResult.booking?._id || 'N/A',
      };
    }

    return null;
  }, [localScanError, v2PassError, v2CheckInResult, v2CheckOutResult, scanMode, checkInResult]);

  return (
    <ScreenShell
      title="Amenity Security Console"
      subtitle="Facility entry verification & QR pass scanner"
      iconName="ShieldCheck"
    >
      <View className="flex-1 bg-background">
        {/* Top KPI Box: Today's Entries, Today's Exits, Denied Access */}
        <View className="py-2.5 bg-background border-b border-border/40">
          <KPIRow
            cards={[
              {
                title: "Today's Entries",
                value: String(logDashboard?.entries || 0),
                subtitle: 'Verified In',
                iconName: 'DoorOpen',
                variant: 'success',
                onPress: () => {
                  setActiveTab('LOGS');
                  onLogFilterChange('scanType', 'Entry');
                },
              },
              {
                title: "Today's Exits",
                value: String(logDashboard?.exits || 0),
                subtitle: 'Checked Out',
                iconName: 'DoorClosed',
                variant: 'info',
                onPress: () => {
                  setActiveTab('LOGS');
                  onLogFilterChange('scanType', 'Exit');
                },
              },
              {
                title: 'Denied Access',
                value: String(logDashboard?.denied || 0),
                subtitle: 'Refused Scans',
                iconName: 'ShieldAlert',
                variant: 'destructive',
                onPress: () => {
                  setActiveTab('LOGS');
                  onLogFilterChange('scanType', 'Denied');
                },
              },
            ]}
          />
        </View>

        {/* TabBar Navigation: Console vs Security Logs */}
        <TabBar
          tabs={AMENITY_TABS}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as any)}
          variant="pill"
          className="mx-4 mt-3 mb-2"
        />

        {activeTab === 'LOGS' ? (
          <View className="flex-1 px-4 pt-1">
            {/* Scan Type Filter Pills & Search Filter */}
            <View className="gap-2 mb-2">
              <TabBar
                tabs={SCAN_TYPE_TABS}
                activeTab={logFilters.scanType || ''}
                onTabChange={(tabKey) => onLogFilterChange('scanType', tabKey)}
                variant="pill"
              />

              <SearchFilterBar
                searchValue={logFilters.search || ''}
                onSearchChange={(text) => onLogFilterChange('search', text)}
                searchPlaceholder="Search resident, amenity, pass code..."
                variant="bordered"
                className="px-0 py-0 border-0"
              />

              {Boolean(logFilters.search || logFilters.scanType) && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={onClearLogFilters}
                  className="self-end py-1 h-7 px-2.5"
                >
                  Clear Filters
                </Button>
              )}
            </View>

            {/* Paginated Embedded Security Log List */}
            <PaginatedList<SecurityLog>
              data={auditLogs}
              renderItem={(item) => (
                <AmenitySecurityLogCard
                  key={item._id}
                  log={item}
                  onPress={setSelectedAuditLog}
                />
              )}
              pagination={{
                currentPage: (logPagination as any).currentPage || logPagination.page || 1,
                totalPages: logPagination.totalPages || 1,
                totalRecords: (logPagination as any).totalRecords || logPagination.total || auditLogs.length,
                limit: logPagination.limit || 20,
              }}
              onLoadMore={() => {
                const current = (logPagination as any).currentPage || logPagination.page || 1;
                if (current < logPagination.totalPages) {
                  onLogPageChange(current + 1);
                }
              }}
              onRefresh={loadData}
              loading={logsLoading}
              emptyIcon="ClipboardList"
              emptyTitle="No Security Logs Found"
              emptySubtitle="Security verification logs will stream here as passes are scanned."
              contentContainerClassName="pb-28 gap-2"
            />
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 gap-4 pb-28 pt-2"
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          >
            {statusMessage && (
              <View className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex-row items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <Text className="text-xs font-semibold text-primary flex-1">{statusMessage}</Text>
              </View>
            )}

            {/* Mode Switcher: Facility Entry (Check-In) vs Facility Exit (Check-Out) */}
            <TabBar
              tabs={SCAN_MODE_TABS}
              activeTab={scanMode}
              onTabChange={(key) => {
                resetScanner();
                setScanMode(key as any);
              }}
              variant="pill"
              className="mx-0 mb-1"
            />

            {/* Verification Input Card */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs">
              <View className="flex-row items-center gap-2 border-b border-border/40 pb-2.5">
                <ScanLine size={18} color="#ea580c" />
                <Text className="text-sm font-bold text-foreground">
                  {scanMode === 'CHECK_IN'
                    ? 'Verify Entry Pass (Check-In)'
                    : 'Process Exit Pass (Check-Out)'}
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={passCode}
                    onChangeText={setPassCode}
                    placeholder="Enter Pass Token or QR Code..."
                    keyboardType="default"
                    inputClassName="font-mono text-sm tracking-wider"
                    onSubmitEditing={() => handleVerifyPass()}
                  />
                </View>
                <Button
                  size="sm"
                  onPress={() => handleVerifyPass()}
                  disabled={checkingIn || !passCode.trim()}
                  loading={checkingIn}
                  className="h-12 w-12 rounded-2xl items-center justify-center p-0"
                  accessibilityLabel="Search Pass Code"
                >
                  <Search size={18} className="text-primary-foreground" />
                </Button>
              </View>

              <Button
                variant="outline"
                className="flex-row items-center justify-center gap-2 h-11 rounded-xl border-amber-500/40 bg-amber-500/10"
                onPress={() => {
                  resetScanner();
                  setQrScannerOpen(true);
                }}
                accessibilityLabel="Open Camera QR Scanner"
              >
                <QrCode size={18} color="#ea580c" />
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  Open Camera QR Scanner
                </Text>
              </Button>
            </View>

            {/* Live Attendance Stream Section */}
            <View className="gap-2.5">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-sm font-bold text-foreground">Recent Check-In Stream</Text>
                <Text className="text-xs text-muted-foreground font-semibold">Today</Text>
              </View>

              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log: any, idx: number) => (
                  <AmenitySecurityLogCard
                    key={log._id || idx}
                    log={log}
                    onPress={setSelectedAuditLog}
                  />
                ))
              ) : (
                <EmptyState
                  title="No Live Activity"
                  description="Recent check-in scans will stream live here as residents access facilities."
                />
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Hardware Camera QR Scanner Modal */}
      <QRScannerModal
        visible={qrScannerOpen}
        title="Amenity QR Scanner"
        instruction="Align Amenity QR Code inside Frame"
        onClose={() => setQrScannerOpen(false)}
        onScanCode={async (code) => {
          setQrScannerOpen(false);
          setPassCode(code);
          await handleVerifyPass(code);
        }}
      />

      {/* Check-Out Inspection Bottom Sheet */}
      <BottomSheet
        visible={isInspectionModalOpen}
        onClose={handleCancelInspection}
        title="Equipment & Facility Return Inspection"
      >
        <View className="gap-4 pb-4">
          <Text className="text-xs text-muted-foreground">
            Inspect returned facility equipment or physical condition before confirming exit.
          </Text>

          <ToggleSwitch
            label="Damage or Defect Identified?"
            description="Enable if returned equipment has issues or requires repair."
            value={isDamaged}
            onValueChange={setIsDamaged}
          />

          {isDamaged && (
            <View className="gap-3 pt-1">
              <TextInput
                label="Damage Notes & Description"
                value={damageNotes}
                onChangeText={setDamageNotes}
                placeholder="Describe damage, broken parts, missing items..."
                multiline={true}
                numberOfLines={3}
              />

              <TextInput
                label="Assessed Penalty Amount (Optional)"
                value={penaltyAmount}
                onChangeText={setPenaltyAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          )}

          <View className="gap-2.5 pt-2">
            <Button
              onPress={handleConfirmInspection}
              disabled={checkingIn}
              loading={checkingIn}
              className="w-full h-12 bg-primary flex-row items-center justify-center gap-2"
              accessibilityRole="button"
              accessibilityLabel="Confirm Facility Exit"
            >
              <DoorClosed size={18} color="#FFFFFF" />
              <Text className="text-sm font-bold text-primary-foreground">
                {checkingIn ? 'Processing Exit...' : 'Confirm Facility Exit'}
              </Text>
            </Button>

            <Button
              variant="outline"
              onPress={handleCancelInspection}
              disabled={checkingIn}
              className="w-full h-11 border-border"
              accessibilityRole="button"
              accessibilityLabel="Cancel Inspection"
            >
              <Text className="text-sm font-semibold text-foreground">Cancel</Text>
            </Button>
          </View>
        </View>
      </BottomSheet>

      {/* Verification Result Sheet */}
      <ScanResultSheet
        visible={isResultModalOpen}
        onClose={resetScanner}
        result={formattedResult}
        loading={checkingIn}
        onPrimaryAction={resetScanner}
        primaryActionLabel={scanMode === 'CHECK_IN' ? 'Confirm Facility Entry' : 'Confirm Facility Exit'}
        onSecondaryAction={resetScanner}
        secondaryActionLabel="Dismiss"
      />

      {/* Manual Token Lookup Fallback Sheet */}
      <ManualCodeEntrySheet
        visible={manualSheetOpen}
        onClose={() => setManualSheetOpen(false)}
        onSubmitCode={handleManualSubmit}
        loading={checkingIn}
        title="Manual Booking Token Lookup"
        description="Enter the resident reservation reference token if optical QR scan is unavailable."
        placeholder="e.g. BK-778899"
        label="Booking Reference Token"
      />

      {/* Security Log Details Inspection Modal */}
      <SecurityLogDetailModal
        visible={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        onDelete={onDeleteLog}
        log={selectedAuditLog}
      />
    </ScreenShell>
  );
}
