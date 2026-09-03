import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
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
import { SearchFilterBar } from '@/components/ui/SearchFilterBar';
import { PaginatedList } from '@/components/ui/PaginatedList';
import { ScanResultSheet, ScanResultData } from '@/components/hardware/ScanResultSheet';
import { ManualCodeEntrySheet } from '@/components/hardware/ManualCodeEntrySheet';
import { GuardQRScannerModal } from '@/src/features/visitor/components/guard/GuardQRScannerModal';
import { AmenitySecurityLogCard } from '@/src/features/amenities/components/AmenitySecurityLogCard';
import { SecurityLogDetailModal } from '@/src/features/amenities/components/SecurityLogDetailModal';
import { SecurityLog } from '@/src/features/amenities/services/securityLogApi';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useSecurityScanner } from '../../../src/features/amenities/hooks/useSecurityScanner';
import { useSecurityLogs } from '../../../src/features/amenities/hooks/useSecurityLogs';

const AMENITY_TABS = [
  { key: 'CONSOLE', label: 'Console' },
  { key: 'LOGS', label: 'Security Logs' },
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

  const loadData = useCallback(async () => {
    setRefreshing(true);
    refreshSecurityLogs();
    setRefreshing(false);
  }, [refreshSecurityLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clean raw scanned text
  const extractCodeFromRaw = (raw: string): string => {
    let text = (raw || '').trim();
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        text = parsed.bookingId || parsed._id || parsed.id || parsed.code || text;
      } catch {}
    }
    return text.trim();
  };

  const handleVerifyPass = async (codeToVerify?: string) => {
    const raw = (codeToVerify || passCode).trim();
    if (!raw) return;
    const cleanCode = extractCodeFromRaw(raw);
    if (!cleanCode) return;

    setStatusMessage(null);
    await handleBarCodeScanned({ type: 'MANUAL', data: cleanCode });
    refreshSecurityLogs();
  };

  const handleManualSubmit = (token: string) => {
    setManualSheetOpen(false);
    handleVerifyPass(token);
  };

  // Standardize check-in result for ScanResultSheet
  const formattedResult: ScanResultData | null = checkInResult
    ? {
        success: Boolean(checkInResult.success),
        status: checkInResult.success ? 'VERIFIED' : 'REJECTED',
        title: checkInResult.success
          ? 'Amenity Pass Verified'
          : 'Amenity Access Denied',
        message:
          checkInResult.message ||
          (checkInResult.success
            ? 'Reservation pass is active and verified for facility entry.'
            : 'Pass is expired, invalid, or already checked in.'),
        visitorName: checkInResult.booking?.residentName || 'Resident Member',
        passType: 'AMENITY ACCESS',
        amenityName: checkInResult.booking?.amenityName || 'Community Facility',
        unitOrVilla:
          (checkInResult.booking as any)?.unitNumber ||
          (checkInResult.booking as any)?.villaNumber ||
          (checkInResult.booking as any)?.unit ||
          'Estate',
        validityWindow:
          checkInResult.booking?.startTime && checkInResult.booking?.endTime
            ? `${checkInResult.booking.startTime} - ${checkInResult.booking.endTime}`
            : 'Today',
        bookingReference:
          checkInResult.booking?.bookingId ||
          (checkInResult.booking as any)?.bookingReference ||
          checkInResult.booking?._id ||
          checkInResult.booking?.passCode ||
          'N/A',
      }
    : null;

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

            {/* Verification Input Card */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3 shadow-xs">
              <View className="flex-row items-center gap-2 border-b border-border/40 pb-2.5">
                <ScanLine size={18} color="#ea580c" />
                <Text className="text-sm font-bold text-foreground">Verify Pass Code / QR / Token</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={passCode}
                    onChangeText={setPassCode}
                    placeholder="Enter 6-digit PIN, Code, or Name..."
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
                onPress={() => setQrScannerOpen(true)}
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
      <GuardQRScannerModal
        visible={qrScannerOpen}
        title="Amenity QR Scanner"
        instruction="Align Amenity QR Code inside Frame"
        onClose={() => setQrScannerOpen(false)}
        onScanCode={async (code) => {
          setPassCode(code);
          await handleVerifyPass(code);
          refreshSecurityLogs();
        }}
      />

      {/* Verification Result Sheet */}
      <ScanResultSheet
        visible={isResultModalOpen}
        onClose={resetScanner}
        result={formattedResult}
        loading={checkingIn}
        onPrimaryAction={resetScanner}
        primaryActionLabel="Confirm Facility Entry"
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
