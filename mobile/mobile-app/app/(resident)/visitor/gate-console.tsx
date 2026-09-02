import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { KPIRow } from '@/components/ui/KPIRow';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { ScanResultSheet, ScanResultData } from '@/components/hardware/ScanResultSheet';
import { VisitorPassDetailsModal } from '@/src/features/visitor/components/VisitorPassDetailsModal';
import { GuardInitiateWalkInModal } from '@/src/features/visitor/components/guard/GuardInitiateWalkInModal';
import { GuardQRScannerModal } from '@/src/features/visitor/components/guard/GuardQRScannerModal';
import { InsideVisitorsView } from '@/src/features/visitor/components/guard/InsideVisitorsView';
import { GuardWalkInStatusView } from '@/src/features/visitor/components/guard/GuardWalkInStatusView';
import { GuardVillaDirectoryView } from '@/src/features/visitor/components/guard/GuardVillaDirectoryView';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { selectActiveOrgId, selectAuthUser } from '@/src/features/auth/store/authSelectors';
import { useSelector } from 'react-redux';
import visitorService from '@/src/features/visitor/services/visitorService';
import { QrCode, ScanLine, Search, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react-native';

const GATE_TABS = [
  { key: 'CONSOLE', label: 'Console' },
  { key: 'WALK_INS', label: 'Walk-Ins' },
  { key: 'INSIDE', label: 'Inside' },
  { key: 'DIRECTORY', label: 'Directory' },
];

export default function GateConsoleScreen() {
  const activeOrgId = useSelector(selectActiveOrgId);
  const authUser = useSelector(selectAuthUser);
  const {
    passes,
    activePass,
    activeVisitors,
    fetchPassDetails,
    walkIns,
    loadPendingWalkIns,
    submitWalkIn,
    fetchActiveVisitors,
    processPreApproved,
    checkoutVisitor,
  } = useVisitorPass();

  const [passCode, setPassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [admitLoading, setAdmitLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [scanResultSheetOpen, setScanResultSheetOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultData | null>(null);
  const [isInsideAction, setIsInsideAction] = useState(false);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'WALK_INS' | 'INSIDE' | 'DIRECTORY'>('CONSOLE');
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadPendingWalkIns(),
      fetchActiveVisitors(activeOrgId),
    ]);
    setRefreshing(false);
  }, [loadPendingWalkIns, fetchActiveVisitors, activeOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const extractCodeFromRaw = (raw: string): string => {
    let text = (raw || '').trim();
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        text = parsed.code || parsed.shortKey || parsed.token || parsed.passId || text;
      } catch {}
    }
    if (text.includes('?')) {
      const urlParams = text.split('?')[1];
      const match = urlParams.match(/(?:code|token|passId|id)=([^&]+)/i);
      if (match && match[1]) {
        text = match[1];
      }
    } else if (text.includes('/')) {
      const parts = text.split('/');
      text = parts[parts.length - 1] || text;
    }
    return text.replace(/^PASS-?/i, '').replace(/[\s-]/g, '').trim();
  };

  const handleVerifyPass = async (codeToVerify?: string) => {
    const raw = (codeToVerify || passCode).trim();
    if (!raw) return;
    const cleanCode = extractCodeFromRaw(raw);
    if (!cleanCode) return;

    setLoading(true);
    setStatusMessage(null);

    let passData: any = null;

    try {
      // 1. Try Redux thunk fetch
      const res: any = await fetchPassDetails(cleanCode);
      if (res?.meta?.requestStatus === 'fulfilled' && res?.payload) {
        passData = res.payload.data || res.payload;
      }
    } catch {
      // Fallback
    }

    // 2. Direct service lookups fallback by Code
    if (!passData || (!passData._id && !passData.visitorName && !passData.visitorDetails)) {
      try {
        const res = await visitorService.getPassByCode(cleanCode);
        const body = res && (res as any).success !== undefined ? res : (res as any)?.data;
        passData = body?.data || body;
      } catch {}
    }

    // 3. Direct service lookup by ID
    if (!passData || (!passData._id && !passData.visitorName && !passData.visitorDetails)) {
      try {
        const res = await visitorService.getPassDetails(cleanCode);
        const body = res && (res as any).success !== undefined ? res : (res as any)?.data;
        passData = body?.data || body;
      } catch {}
    }

    // 4. In-memory fallback across passes list (Search by Vehicle Plate Number or Visitor Name)
    if ((!passData || (!passData._id && !passData.visitorName && !passData.visitorDetails)) && Array.isArray(passes)) {
      const q = raw.toLowerCase().trim();
      const matched = passes.find(
        (p: any) =>
          p.vehicleDetails?.number?.toLowerCase().replace(/[\s-]/g, '').includes(cleanCode.toLowerCase()) ||
          p.vehicleNo?.toLowerCase().replace(/[\s-]/g, '').includes(cleanCode.toLowerCase()) ||
          p.visitorDetails?.name?.toLowerCase().includes(q) ||
          p.visitorName?.toLowerCase().includes(q) ||
          p.phone?.includes(cleanCode) ||
          p.visitorDetails?.phone?.includes(cleanCode)
      );
      if (matched) {
        passData = matched;
      }
    }

    setLoading(false);

    if (passData && (passData._id || passData.visitorName || passData.visitorDetails)) {
      // Check if visitor is currently INSIDE
      let isCurrentlyInside = false;
      let matchedLogId: string | null = null;

      try {
        const currentActiveList = activeVisitors && activeVisitors.length > 0 ? activeVisitors : await fetchActiveVisitors(activeOrgId);
        const logs = Array.isArray(currentActiveList) ? currentActiveList : [];
        const foundInside = logs.find((l: any) => {
          const lPassId = (l.passId?._id || l.passId)?.toString();
          const targetId = (passData._id || passData.id)?.toString();
          return lPassId && targetId && lPassId === targetId;
        });
        if (foundInside) {
          isCurrentlyInside = true;
          matchedLogId = foundInside._id || foundInside.id;
        }
      } catch {}

      setIsInsideAction(isCurrentlyInside);
      setActiveLogId(matchedLogId);

      const isRevoked = passData.status === 'REVOKED';
      const isExpired =
        passData.status === 'EXPIRED' ||
        (passData.validUntil && new Date(passData.validUntil).getTime() < Date.now());
      const isPending = passData.status === 'PENDING';
      const isValid = passData.status === 'ACTIVE' || (!isRevoked && !isExpired);

      const status: 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'PENDING' | 'REVOKED' = isRevoked
        ? 'REVOKED'
        : isExpired
        ? 'EXPIRED'
        : isValid
        ? 'VERIFIED'
        : 'REJECTED';

      const result: ScanResultData = {
        success: isValid,
        status,
        title: isCurrentlyInside
          ? 'Visitor Currently On-Premises'
          : isValid
          ? 'Visitor Access Verified'
          : 'Access Verification Denied',
        message: isCurrentlyInside
          ? 'Visitor is currently inside the estate. Tap below to log gate check-out.'
          : isRevoked
          ? 'Pass has been revoked by host resident or estate admin.'
          : isExpired
          ? 'This visitor pass has expired.'
          : isPending
          ? 'Pass is pending resident approval.'
          : 'Pre-approved pass is active and verified. Tap below to admit visitor.',
        visitorName: passData.visitorDetails?.name || passData.visitorName || 'Guest Visitor',
        visitorPhone: passData.visitorDetails?.phone || passData.phone,
        passType: passData.passType || 'GUEST',
        unitOrVilla: passData.villaId?.name || passData.villaId?.number || passData.unit || 'Estate',
        hostName: passData.createdById?.name || passData.hostName || 'Host Resident',
        bookingReference: passData.shortKey || passData.code || cleanCode,
        validityWindow:
          passData.validity?.startDate && passData.validity?.endDate
            ? `${new Date(passData.validity.startDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })} - ${new Date(passData.validity.endDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Today',
        metadata: {
          passId: passData._id || passData.id,
          code: passData.shortKey || passData.code || cleanCode,
        },
      };

      setScanResult(result);
      setScanResultSheetOpen(true);
    } else {
      setStatusMessage(`No active pass found matching "${raw}".`);
    }
  };

  const handleAdmitVisitor = async () => {
    if (!scanResult?.metadata?.passId && !scanResult?.bookingReference) {
      setScanResultSheetOpen(false);
      return;
    }

    const guardId =
      authUser?.id ||
      authUser?._id ||
      authUser?.userId ||
      authUser?.user?.id ||
      authUser?.user?._id;

    setAdmitLoading(true);
    try {
      await processPreApproved({
        passId: scanResult.metadata?.passId,
        code: scanResult.metadata?.code || scanResult.bookingReference,
        ...(guardId ? { guardId } : {}),
        orgId: activeOrgId,
        entryGate: 'Main Security Gate',
      });

      setScanResultSheetOpen(false);
      setPassCode('');
      setStatusMessage(`Visitor ${scanResult.visitorName || ''} successfully admitted!`);
      await loadData();
    } catch (err: any) {
      setStatusMessage(err?.response?.data?.message || err?.message || 'Failed to admit visitor.');
    } finally {
      setAdmitLoading(false);
    }
  };

  const handleCheckOutFromConsole = async () => {
    if (!activeLogId) {
      setScanResultSheetOpen(false);
      return;
    }

    setAdmitLoading(true);
    try {
      await checkoutVisitor(activeLogId);
      setScanResultSheetOpen(false);
      setPassCode('');
      setStatusMessage(`Visitor ${scanResult?.visitorName || ''} checked out successfully!`);
      await loadData();
    } catch (err: any) {
      setStatusMessage(err?.response?.data?.message || err?.message || 'Failed to checkout visitor.');
    } finally {
      setAdmitLoading(false);
    }
  };

  const handleWalkInSubmit = async (data: {
    visitorName: string;
    phone: string;
    villaId?: string;
    villaName?: string;
    residentId?: string;
    residentName?: string;
    idProofNumber?: string;
    vehicleNumber?: string;
  }) => {
    setWalkInLoading(true);
    try {
      const targetResidentUser = data.residentId || data.villaId;
      await submitWalkIn({
        orgId: activeOrgId,
        guardId: authUser?.id || authUser?._id,
        residentId: targetResidentUser,
        entryType: 'WALK_IN',
        snapshot: {
          visitorName: data.visitorName,
          idProofNumber: data.idProofNumber,
          vehicleNumber: data.vehicleNumber,
        },
      });
      setStatusMessage(`Walk-in gate approval request sent to ${data.residentName || data.villaName || 'Resident'}`);
      setActiveTab('WALK_INS');
      loadData();
    } catch (err: any) {
      const details = err?.response?.data?.details;
      const detailMsg = details && details.length > 0 ? details[0].message : null;
      setStatusMessage(detailMsg || err?.response?.data?.message || err?.message || 'Failed to send request.');
    } finally {
      setWalkInLoading(false);
    }
  };

  const pendingCount = walkIns?.pendingList?.length || 0;

  return (
    <ScreenShell
      title="Gate Security Console"
      subtitle="Guard check-in verification, QR scanner & walk-in entry"
      iconName="ShieldCheck"
    >
      <View className="flex-1 bg-background">
        {/* Live Gate Operational KPI Strip */}
        <View className="py-2.5 bg-background border-b border-border/40">
          <KPIRow
            cards={[
              {
                title: 'Inside Now',
                value: String(activeVisitors?.length || 0),
                subtitle: 'Active Visitors',
                iconName: 'Users',
                variant: 'success',
                onPress: () => setActiveTab('INSIDE'),
              },
              {
                title: 'Pending Walk-Ins',
                value: String(pendingCount),
                subtitle: 'Awaiting Host',
                iconName: 'Clock',
                variant: pendingCount > 0 ? 'warning' : 'default',
                onPress: () => setActiveTab('WALK_INS'),
              },
              {
                title: 'Gate Status',
                value: 'Active',
                subtitle: 'Main Gate Desk',
                iconName: 'ShieldCheck',
                variant: 'info',
              },
            ]}
          />
        </View>

        {/* Canonical TabBar: Console vs Walk-In Queue vs Inside Visitors vs Directory */}
        <TabBar
          tabs={GATE_TABS}
          activeTab={activeTab}
          onTabChange={(key) => setActiveTab(key as any)}
          variant="pill"
          className="mx-4 mt-3 mb-2"
        />

        {activeTab === 'INSIDE' ? (
          <InsideVisitorsView />
        ) : activeTab === 'WALK_INS' ? (
          <GuardWalkInStatusView />
        ) : activeTab === 'DIRECTORY' ? (
          <GuardVillaDirectoryView />
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

            {/* Verification Card */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3">
              <View className="flex-row items-center gap-2 border-b border-border/40 pb-2.5">
                <ScanLine size={18} className="text-primary" />
                <Text className="text-sm font-bold text-foreground">Verify Pass Code / QR / Plate</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={passCode}
                    onChangeText={setPassCode}
                    placeholder="Enter 6-digit PIN, Plate, or Name..."
                    keyboardType="default"
                    inputClassName="font-mono text-sm tracking-wider"
                    onSubmitEditing={() => handleVerifyPass()}
                  />
                </View>
                <Button
                  size="sm"
                  onPress={() => handleVerifyPass()}
                  disabled={loading || !passCode.trim()}
                  loading={loading}
                  className="h-12 px-4 rounded-xl"
                  accessibilityLabel="Search Pass Code"
                >
                  <Search size={16} className="text-primary-foreground" />
                </Button>
              </View>

              <Button
                variant="outline"
                className="flex-row items-center justify-center gap-2 h-11 rounded-xl border-primary/30 bg-primary/5"
                onPress={() => setQrScannerOpen(true)}
                accessibilityLabel="Open Camera QR Scanner"
              >
                <QrCode size={18} className="text-primary" />
                <Text className="text-xs font-bold text-primary">Open Camera QR Scanner</Text>
              </Button>
            </View>

            {/* Guard Quick Actions */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3">
              <Text className="text-sm font-bold text-foreground">Guard Gate Actions</Text>

              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  onPress={() => setWalkInModalOpen(true)}
                  className="flex-1 h-auto py-3.5 rounded-xl flex-col items-center justify-center gap-1.5 bg-amber-500/10 border-amber-500/20"
                  accessibilityLabel="Initiate Walk-In"
                >
                  <ShieldAlert size={22} className="text-amber-600 dark:text-amber-400" />
                  <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 text-center">
                    Initiate Walk-In
                  </Text>
                </Button>

                <Button
                  variant="outline"
                  onPress={() => setActiveTab('DIRECTORY')}
                  className="flex-1 h-auto py-3.5 rounded-xl flex-col items-center justify-center gap-1.5 bg-primary/10 border-primary/20"
                  accessibilityLabel="Villa Intercom Directory"
                >
                  <Search size={22} className="text-primary" />
                  <Text className="text-xs font-bold text-primary text-center">
                    Villa Directory
                  </Text>
                </Button>

                <Button
                  variant="outline"
                  onPress={() => setActiveTab('INSIDE')}
                  className="flex-1 h-auto py-3.5 rounded-xl flex-col items-center justify-center gap-1.5 bg-status-success/10 border-status-success/20"
                  accessibilityLabel="Gate Check-Out"
                >
                  <LogOut size={22} className="text-status-success" />
                  <Text className="text-xs font-bold text-status-success text-center">
                    Check-Out List
                  </Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Hardware / Verification Scan Result Sheet with Admit / Checkout Action */}
      <ScanResultSheet
        visible={scanResultSheetOpen}
        result={scanResult}
        loading={admitLoading}
        primaryActionLabel={isInsideAction ? 'Gate Check-Out' : 'Confirm Gate Entry'}
        secondaryActionLabel="Dismiss"
        onPrimaryAction={isInsideAction ? handleCheckOutFromConsole : handleAdmitVisitor}
        onSecondaryAction={() => setScanResultSheetOpen(false)}
        onClose={() => setScanResultSheetOpen(false)}
      />

      {/* Verification Details Modal for Resident Review / Revocation */}
      <VisitorPassDetailsModal
        visible={detailsModalOpen}
        pass={activePass}
        onClose={() => setDetailsModalOpen(false)}
      />

      {/* Guard Walk-in Form Modal */}
      <GuardInitiateWalkInModal
        visible={walkInModalOpen}
        loading={walkInLoading}
        onClose={() => setWalkInModalOpen(false)}
        onSubmit={handleWalkInSubmit}
      />

      {/* Camera QR Scanner Modal */}
      <GuardQRScannerModal
        visible={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onScanCode={(code) => {
          setPassCode(code);
          handleVerifyPass(code);
        }}
      />
    </ScreenShell>
  );
}
