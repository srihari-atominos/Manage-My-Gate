import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { BottomSheet } from "@/components/ui/BottomSheet";
import { HeaderActionButton } from '@/components/ui/HeaderActionButton';
import { Plus } from 'lucide-react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Redirect } from 'expo-router';
import { TabBar } from '@/components/ui/TabBar';
import { KPIRow } from '@/components/ui/KPIRow';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { QRScannerOverlay } from '@/components/hardware/QRScannerOverlay';
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
import staffService, { resolveStaffPhotoUrl, getDepartmentLabel, type StaffScanLookup } from '@/src/features/staff/services/staffService';
import {
  QrCode,
  ScanLine,
  Search,
  ShieldAlert,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  Zap,
  ZapOff,
  Maximize2,
  Minimize2,
  Camera,
} from 'lucide-react-native';
import { parseAndValidateAppBarcode } from '@/src/utils/appBarcodeProtocol';
import { useTranslation } from '@/src/utils/i18n';
import { isFeatureAllowedForUser } from '@/src/utils/rbac';

export default function GateConsoleScreen() {
  const { t } = useTranslation();
  const GATE_TABS = [
    { key: 'CONSOLE', label: t('console', 'Console') },
    { key: 'WALK_INS', label: t('walk_ins', 'Walk-Ins') },
    { key: 'INSIDE', label: t('inside', 'Inside') },
    { key: 'DIRECTORY', label: t('directory', 'Directory') },
  ];
  const activeOrgId = useSelector(selectActiveOrgId);
  const authUser = useSelector(selectAuthUser);
  const hasGateAccess = isFeatureAllowedForUser({ id: 'visitor_gate_console', permission: 'visitor:guard' }, authUser);
  if (authUser && !hasGateAccess) {
    return <Redirect href="/(resident)/dashboard" />;
  }
  const {
    passes,
    activePass,
    setActivePass,
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
  // Verified staff pass awaiting the guard's explicit Check In / Check Out choice.
  const [staffScan, setStaffScan] = useState<{ payload: string; key: string; lookup: StaffScanLookup } | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  // Group passes: one QR admits many people, so check-in and check-out are both offered while some are inside.
  const [groupCheckoutLogId, setGroupCheckoutLogId] = useState<string | null>(null);
  const [groupAdmitAllowed, setGroupAdmitAllowed] = useState(true);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'WALK_INS' | 'INSIDE' | 'DIRECTORY'>('CONSOLE');
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [insideCount, setInsideCount] = useState<number>(0);

  // Minimized Barcode Scanner Hardware State
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScannerMinimized, setIsScannerMinimized] = useState(false);
  const [inlineTorchOn, setInlineTorchOn] = useState(false);

  const fetchGateMetrics = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      const activeList = await fetchActiveVisitors(activeOrgId);
      setInsideCount(activeList.length);
    } catch {
      // Handled silently
    }
  }, [activeOrgId, fetchActiveVisitors]);

  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    setRefreshing(true);
    await Promise.all([
      loadPendingWalkIns(activeOrgId),
      fetchActiveVisitors(activeOrgId),
    ]);
    setRefreshing(false);
  }, [loadPendingWalkIns, fetchActiveVisitors, activeOrgId]);

  useEffect(() => {
    if (activeOrgId) {
      loadData();
    }
  }, [loadData, activeOrgId]);

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

  const isStaffResult = scanResult?.passType === 'STAFF';

  const handleVerifyPass = async (codeToVerify?: string) => {
    const raw = (codeToVerify || passCode).trim();
    if (!raw) return;
    let code = raw;
    let barcodeMeta: any = null;
    const validation = parseAndValidateAppBarcode(raw);
    if (validation.isValid) {
      code = validation.code || validation.passId || raw;
      barcodeMeta = validation;
    }
    const cleanCode = extractCodeFromRaw(code);
    if (!cleanCode) return;

    // Group-pass sheet state must not leak into staff or non-group results.
    setGroupCheckoutLogId(null);
    setGroupAdmitAllowed(true);

    // Detect Staff Pass / Service barcode
    const isStaffBarcode =
      barcodeMeta?.type === 'SERVICE' ||
      /^MMG[:\-_]SERVICE/i.test(raw) ||
      /^STF:/i.test(raw) ||
      (raw.startsWith('{') && (raw.includes('"SERVICE"') || raw.includes('"staffCode"')));

    if (isStaffBarcode) {
      setLoading(true);
      setStatusMessage(null);
      // Staff attendance is recorded by the scan itself. Clear any visitor check-in/out state left over
      // from a previous scan so the result sheet can never act on another visitor's log.
      setIsInsideAction(false);
      setActiveLogId(null);
      setStaffScan(null);
      try {
        const lookup = await staffService.lookupStaffScan(raw);
        const tech = lookup.technician;
        const assignedUnitsStr =
          lookup.associatedUnits && lookup.associatedUnits.length > 0
            ? lookup.associatedUnits.map((u) => u.unitNumber).join(', ')
            : 'Community-Wide / General';
        const fmt = (iso?: string) =>
          iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        setStaffScan({ payload: raw, key: `${tech._id}-${Date.now()}`, lookup });

        const result: ScanResultData = {
          success: true,
          // PENDING makes the sheet show the action buttons: nothing is recorded until the guard chooses.
          status: 'PENDING',
          statusLabel: lookup.isInside ? 'INSIDE' : 'OUTSIDE',
          title: 'Staff Pass Verified',
          message: lookup.canCheckIn
            ? 'Tap Check In to record entry.'
            : lookup.canCheckOut
            ? 'Staff member is inside. Tap Check Out to record exit.'
            : 'This staff member cannot be checked in.',
          visitorName: tech?.name || 'Staff Member',
          visitorPhone: tech?.phone,
          // Face next to the QR result lets the guard confirm the person holding the pass is the staff member.
          visitorPhoto: resolveStaffPhotoUrl((tech as any)?.photoUrl),
          passType: 'STAFF',
          unitOrVilla: assignedUnitsStr,
          // The sheet is shared with visitor passes: staff facts go in `details`, not Host / Validity rows.
          bookingReference: tech?.staffCode || undefined,
          details: [
            {
              label: 'Current Status',
              value: lookup.isInside
                ? `Inside since ${fmt(lookup.openSession?.checkInTime)}${
                    lookup.openSession?.checkInGate ? ` via ${lookup.openSession.checkInGate}` : ''
                  }`
                : 'Outside',
            },
            { label: 'Department', value: getDepartmentLabel(tech) || '-' },
            ...(tech?.designation ? [{ label: 'Role', value: tech.designation }] : []),
            ...(tech?.staffCode ? [] : [{ label: 'Staff Code', value: 'Not assigned' }]),
            { label: 'Authorized Units', value: assignedUnitsStr },
          ],
        };
        setScanResult(result);
        setScanResultSheetOpen(true);
        setLoading(false);
        return;
      } catch (staffErr: any) {
        setLoading(false);
        const errMsg = staffErr?.response?.data?.message || staffErr?.message || 'Staff attendance check failed.';
        const result: ScanResultData = {
          success: false,
          status: 'REJECTED',
          title: 'Staff Verification Denied',
          message: errMsg,
          passType: 'STAFF',
          bookingReference: cleanCode,
        };
        setScanResult(result);
        setScanResultSheetOpen(true);
        return;
      }
    }

    setLoading(true);
    setStatusMessage(null);

    let passData: any = null;

    try {
      // 1. Try Redux thunk fetch
      const res: any = await fetchPassDetails(cleanCode);
      if (res?.meta?.requestStatus === 'fulfilled' && res?.payload) {
        passData = res.payload.data || res.payload;
      } else if (res?.payload) {
        passData = res.payload;
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
      const isGroupPass = Boolean(passData.isGroupPass);
      const targetId = (passData._id || passData.id)?.toString();

      // Check if visitor is currently INSIDE
      let isCurrentlyInside = false;
      let matchedLogId: string | null = null;
      let groupInsideLogs: any[] = [];

      try {
        // Group passes need a fresh list: other gates admit and release people from the same pass.
        const currentActiveList = !isGroupPass && activeVisitors && activeVisitors.length > 0
          ? activeVisitors
          : await fetchActiveVisitors(activeOrgId);
        const logs = Array.isArray(currentActiveList) ? currentActiveList : [];
        const matches = logs.filter((l: any) => {
          const lPassId = (l.passId?._id || l.passId)?.toString();
          return lPassId && targetId && lPassId === targetId;
        });
        if (isGroupPass) {
          // Oldest check-in first: group members share one identity, so release in arrival order.
          groupInsideLogs = [...matches].sort(
            (a: any, b: any) => new Date(a.checkInTime || 0).getTime() - new Date(b.checkInTime || 0).getTime()
          );
        } else if (matches[0]) {
          isCurrentlyInside = true;
          matchedLogId = matches[0]._id || matches[0].id;
        }
      } catch {}

      const isRevoked = passData.status === 'REVOKED';
      const isExpired =
        passData.status === 'EXPIRED' ||
        (passData.validUntil && new Date(passData.validUntil).getTime() < Date.now());

      const groupInsideCount = groupInsideLogs.length;
      const maxUses = passData.usageLimit?.maxUses || 1;
      const usesLeft = Math.max(0, maxUses - (passData.usageLimit?.currentUses || 0));
      const groupCanAdmit = isGroupPass && !isRevoked && !isExpired && usesLeft > 0;
      const groupHasInside = isGroupPass && groupInsideCount > 0;
      if (groupHasInside) isCurrentlyInside = true;

      // Group: the primary button stays Confirm Entry; check-out is the extra button.
      setIsInsideAction(isGroupPass ? false : isCurrentlyInside);
      setActiveLogId(matchedLogId);
      setGroupCheckoutLogId(groupHasInside ? groupInsideLogs[0]._id || groupInsideLogs[0].id : null);
      setGroupAdmitAllowed(!groupHasInside || groupCanAdmit);

      const requiresServerDecision = isGroupPass
        ? groupCanAdmit
        : !isCurrentlyInside && !isRevoked && !isExpired;

      // A visitor already inside is a verified pass awaiting check-out, not a refusal.
      const status: 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'PENDING' | 'REVOKED' = groupHasInside
        ? (groupCanAdmit ? 'PENDING' : 'VERIFIED')
        : isCurrentlyInside
        ? 'VERIFIED'
        : isRevoked
        ? 'REVOKED'
        : isExpired
        ? 'EXPIRED'
        : requiresServerDecision
        ? 'PENDING'
        : 'REJECTED';

      const result: ScanResultData = {
        success: isCurrentlyInside,
        status,
        ...(groupHasInside ? { statusLabel: `GROUP PASS · ${groupInsideCount} INSIDE` } : {}),
        title: groupHasInside
          ? 'Group Pass: Guests On-Premises'
          : isCurrentlyInside
          ? 'Visitor Currently On-Premises'
          : requiresServerDecision
          ? 'Pass Located'
          : 'Access Verification Denied',
        message: groupHasInside
          ? `${groupInsideCount} of this group ${groupInsideCount === 1 ? 'is' : 'are'} inside. ${
              groupCanAdmit
                ? `${usesLeft} ${usesLeft === 1 ? 'entry' : 'entries'} left: admit the next guest or check one out.`
                : 'No entries left: check guests out as they leave.'
            }`
          : isCurrentlyInside
          ? 'Visitor is currently inside the community. Tap below to log gate check-out.'
          : isRevoked
          ? 'Pass has been revoked by host resident or community admin.'
          : isExpired
          ? 'This visitor pass has expired.'
          : requiresServerDecision
          ? 'Pass found. Tap Confirm Gate Entry to let the visitor in.'
          : 'Pass is not eligible for entry.',
        visitorName: passData.visitorDetails?.name || passData.visitorName || 'Guest Visitor',
        visitorPhone: passData.visitorDetails?.phone || passData.phone,
        passType: passData.passType || 'GUEST',
        unitOrVilla: passData.villaId?.unitNumber
          ? `Villa ${passData.villaId.unitNumber}${passData.villaId.blockOrBuilding ? ` (${passData.villaId.blockOrBuilding})` : ''}`
          : passData.villaId?.name || passData.villaId?.number || passData.unit || 'Community / Common Area',
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

  const handleStaffAttendanceAction = async (action: 'ENTRY' | 'EXIT') => {
    if (!staffScan) return;
    setAdmitLoading(true);
    try {
      const res = await staffService.scanAttendance({
        scannedPayload: staffScan.payload,
        gateId: t('default_gate_name', 'Main gate'),
        action,
        // Stable per scan+action so a double tap or network retry cannot record twice.
        idempotencyKey: `${staffScan.key}-${action}`,
      });
      const name = res.technician?.name || staffScan.lookup.technician?.name || 'Staff member';
      setScanResultSheetOpen(false);
      setStaffScan(null);
      setPassCode('');
      setStatusMessage(`${name} ${action === 'ENTRY' ? 'checked in' : 'checked out'} successfully.`);
      await loadData();
    } catch (err: any) {
      setScanResultSheetOpen(false);
      setStaffScan(null);
      setStatusMessage(err?.response?.data?.message || err?.message || 'Failed to record staff attendance.');
    } finally {
      setAdmitLoading(false);
    }
  };

  const handleAdmitVisitor = async () => {
    // Staff results use handleStaffAttendanceAction; they are never visitor passes to admit.
    if (scanResult?.passType === 'STAFF') {
      setScanResultSheetOpen(false);
      return;
    }
    if (!scanResult?.metadata?.passId && !scanResult?.bookingReference) {
      setScanResultSheetOpen(false);
      return;
    }

    setAdmitLoading(true);
    try {
      await processPreApproved({
        passId: scanResult.metadata?.passId,
        code: scanResult.metadata?.code || scanResult.bookingReference,
        orgId: activeOrgId,
        gateName: t('default_gate_name', 'Main gate'),
      });

      setScanResultSheetOpen(false);
      setPassCode('');
      setStatusMessage(`Visitor ${scanResult.visitorName || ''} successfully admitted!`);
      await loadData();
    } catch (err: any) {
      // Close the sheet so the refusal reason is visible on the console.
      setScanResultSheetOpen(false);
      setStatusMessage(err?.response?.data?.message || err?.message || 'Failed to admit visitor.');
    } finally {
      setAdmitLoading(false);
    }
  };

  const handleCheckOutFromConsole = async () => {
    const logIdToRelease = groupCheckoutLogId && !isInsideAction ? groupCheckoutLogId : activeLogId;
    if (!logIdToRelease) {
      setScanResultSheetOpen(false);
      return;
    }

    setAdmitLoading(true);
    try {
      await checkoutVisitor(logIdToRelease);
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
      const targetResidentUser = data.residentId;
      await submitWalkIn({
        orgId: activeOrgId,
        residentId: targetResidentUser,
        entryType: 'WALK_IN',
        gateName: t('default_gate_name', 'Main gate'),
        snapshot: {
          visitorName: data.visitorName,
          phone: data.phone?.replace(/\D/g, ''),
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
      headerRight={
        <HeaderActionButton
          onPress={() => setWalkInModalOpen(true)}
          icon={Plus}
          label={t('gate_actions', 'Gate Actions')}
          accessibilityRole="button"
          accessibilityLabel="Gate Actions"
        />
      }
    >
      <View className="flex-1 bg-background">
        {/* Live Gate Operational KPI Strip */}
        <View className="py-2.5 bg-background border-b border-border/40">
          <KPIRow
            cards={[
              ({
                title: 'Inside Now',
                value: String(activeVisitors?.length || 0),
                subtitle: 'Active Visitors',
                iconName: 'Users',
                variant: 'success',
                onPress: () => setActiveTab('INSIDE'),
              } as any),
              ({
                title: 'Pending Walk-Ins',
                value: String(pendingCount),
                subtitle: 'Awaiting Host',
                iconName: 'Clock',
                variant: pendingCount > 0 ? 'warning' : 'default',
                onPress: () => setActiveTab('WALK_INS'),
              } as any),
              ({
                title: 'Gate Status',
                value: 'Active',
                subtitle: 'Main Gate Desk',
                iconName: 'ShieldCheck',
                variant: 'info',
              } as any),
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
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          >
            {statusMessage && (
              <View className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex-row items-center gap-2">
                <CheckCircle2 size={16} className="text-primary shrink-0" />
                <Text className="text-xs font-semibold text-primary flex-1">{statusMessage}</Text>
              </View>
            )}
            {/* Verification Card with Integrated Minimized Barcode Scanner */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3 overflow-hidden shadow-sm">
              <View className="flex-row items-center justify-between border-b border-border/40 pb-2.5">
                <View className="flex-row items-center gap-2">
                  <Barcode size={18} className="text-emerald-500" />
                  <Text className="text-sm font-bold text-foreground">{t('barcode_qr_gate_scanner', 'Barcode & QR Gate Scanner')}</Text>
                </View>

                {/* Top Controls: Light / Torch, Minimize/Expand, Fullscreen */}
                <View className="flex-row items-center gap-1.5">
                  {cameraPermission?.granted && !isScannerMinimized && (
                    <TouchableOpacity
                      onPress={() => setInlineTorchOn((prev) => !prev)}
                      className={`p-1.5 rounded-lg border ${
                        inlineTorchOn
                          ? 'bg-amber-400 border-amber-300'
                          : 'bg-muted border-border'
                      }`}
                      accessibilityLabel={t('toggle_scanner_light', 'Toggle Scanner Light')}
                    >
                      {inlineTorchOn ? (
                        <Zap size={14} color="#000000" fill="#000000" />
                      ) : (
                        <ZapOff size={14} className="text-muted-foreground" />
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setIsScannerMinimized((prev) => !prev)}
                    className="p-1.5 rounded-lg border border-border bg-muted"
                    accessibilityLabel={isScannerMinimized ? t('expand_scanner', 'Expand scanner') : t('minimize_scanner', 'Minimize scanner')}
                  >
                    {isScannerMinimized ? (
                      <Maximize2 size={14} className="text-foreground" />
                    ) : (
                      <Minimize2 size={14} className="text-foreground" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setQrScannerOpen(true)}
                    className="p-1.5 rounded-lg border border-border bg-muted"
                    accessibilityLabel={t('open_fullscreen_scanner', 'Open Fullscreen Scanner')}
                  >
                    <Maximize2 size={14} className="text-foreground" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Minimized Live Camera Viewport */}
              {!isScannerMinimized ? (
                !cameraPermission?.granted ? (
                  <View className="h-44 w-full rounded-xl bg-black/90 items-center justify-center p-4 border border-border/40 gap-2">
                    <Camera size={28} color="#94a3b8" />
                    <Text className="text-xs text-white/80 font-semibold text-center">
                      {t('camera_access_required_to_scan_barcodes', 'Camera access required to scan barcodes')}
                    </Text>
                    <Button
                      size="sm"
                      variant="default"
                      onPress={requestCameraPermission}
                      className="bg-emerald-600 px-4 py-1.5 rounded-lg mt-1"
                    >
                      <Text className="text-xs font-bold text-white">{t('continue', 'Continue')}</Text>
                    </Button>
                  </View>
                ) : (
                  <View className="h-48 w-full rounded-xl overflow-hidden bg-black relative border border-emerald-500/30">
                    <CameraView
                      facing="back"
                      enableTorch={Boolean(inlineTorchOn)}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'pdf417', 'upc_a', 'upc_e'],
                      }}
                      onBarcodeScanned={loading ? undefined : ({ data }) => handleVerifyPass(data)}
                      style={{ width: '100%', height: '100%' }}
                    />
                    <QRScannerOverlay
                      mode="barcode"
                      frameHeight={120}
                      frameWidth={260}
                      instruction={t('fit_barcode_inside_box', 'Fit Barcode inside Box')}
                    />
                  </View>
                )
              ) : (
                <TouchableOpacity
                  onPress={() => setIsScannerMinimized(false)}
                  className="flex-row items-center justify-between p-3 rounded-xl bg-muted/60 border border-border"
                >
                  <View className="flex-row items-center gap-2">
                    <Barcode size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <Text className="text-xs font-semibold text-foreground">{t('scanner_minimized', 'Scanner Minimized')}</Text>
                  </View>
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('expand_camera', 'Expand Camera')}</Text>
                </TouchableOpacity>
              )}

              {/* Manual Pass Code Fallback Input */}
              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={passCode}
                    onChangeText={setPassCode}
                    placeholder={t('enter_6_digit_pin_plate_or_name', 'Enter 6-digit PIN, Plate, or Name...')}
                    keyboardType="default"
                    leftIcon={Search}
                    inputClassName="font-mono text-sm tracking-wider"
                    onSubmitEditing={() => handleVerifyPass()}
                  />
                </View>
                <Button
                  size="sm"
                  onPress={() => handleVerifyPass()}
                  disabled={loading || !passCode.trim()}
                  className="h-12 px-4 rounded-xl bg-emerald-600 active:bg-emerald-700"
                  accessibilityLabel={t('search_pass_code', 'Search Pass Code')}
                >
                  <Search size={18} color="#FFFFFF" strokeWidth={2.5} />
                </Button>
              </View>

              {/* Fullscreen Modal Option */}
              <Button
                variant="outline"
                className="flex-row items-center justify-center gap-2 h-11 rounded-xl border-emerald-500/30 bg-emerald-500/10 active:bg-emerald-500/20"
                onPress={() => setQrScannerOpen(true)}
                accessibilityLabel={t('open_fullscreen_barcode_scanner', 'Open Fullscreen Barcode Scanner')}
              >
                <Barcode size={18} className="text-emerald-600 dark:text-emerald-400" />
                <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {t('open_fullscreen_scanner', 'Open Fullscreen Scanner')}
                </Text>
              </Button>
            </View>

            
          </ScrollView>
        )}
      </View>

      {/* Hardware / Verification Scan Result Sheet with Admit / Checkout Action */}
      <ScanResultSheet
        visible={scanResultSheetOpen}
        result={scanResult}
        loading={admitLoading}
        primaryActionLabel={
          isStaffResult
            ? t('staff_check_in', 'Check In')
            : isInsideAction
            ? t('gate_check_out', 'Gate Check-Out')
            : t('confirm_gate_entry', 'Confirm Gate Entry')
        }
        secondaryActionLabel={isStaffResult ? t('scan_next_pass', 'Scan Next Pass') : t('dismiss', 'Dismiss')}
        onPrimaryAction={
          isStaffResult
            ? () => handleStaffAttendanceAction('ENTRY')
            : isInsideAction
            ? handleCheckOutFromConsole
            : groupAdmitAllowed
            ? handleAdmitVisitor
            : undefined
        }
        primaryActionDisabled={isStaffResult && !staffScan?.lookup.canCheckIn}
        extraActionLabel={
          isStaffResult
            ? t('staff_check_out', 'Check Out')
            : groupCheckoutLogId
            ? t('gate_check_out', 'Gate Check-Out')
            : undefined
        }
        onExtraAction={
          isStaffResult
            ? () => handleStaffAttendanceAction('EXIT')
            : groupCheckoutLogId
            ? handleCheckOutFromConsole
            : undefined
        }
        extraActionDisabled={isStaffResult && !staffScan?.lookup.canCheckOut}
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
