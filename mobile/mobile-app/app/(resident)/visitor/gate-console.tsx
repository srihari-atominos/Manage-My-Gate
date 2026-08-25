import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TabBar } from '@/components/ui/TabBar';
import { KPIRow } from '@/components/ui/KPIRow';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/forms/TextInput';
import { VisitorPassDetailsModal } from '@/src/features/visitor/components/VisitorPassDetailsModal';
import { GuardInitiateWalkInModal } from '@/src/features/visitor/components/guard/GuardInitiateWalkInModal';
import { GuardQRScannerModal } from '@/src/features/visitor/components/guard/GuardQRScannerModal';
import { InsideVisitorsView } from '@/src/features/visitor/components/guard/InsideVisitorsView';
import { GuardWalkInStatusView } from '@/src/features/visitor/components/guard/GuardWalkInStatusView';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { selectActiveOrgId, selectAuthUser } from '@/src/features/auth/store/authSelectors';
import { useSelector } from 'react-redux';
import { QrCode, ScanLine, Search, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react-native';

const GATE_TABS = [
  { key: 'CONSOLE', label: 'Console' },
  { key: 'WALK_INS', label: 'Walk-Ins Queue' },
  { key: 'INSIDE', label: 'Visitors Inside' },
];

export default function GateConsoleScreen() {
  const activeOrgId = useSelector(selectActiveOrgId);
  const authUser = useSelector(selectAuthUser);
  const {
    activePass,
    fetchPassDetails,
    walkIns,
    loadPendingWalkIns,
    submitWalkIn,
    fetchActiveVisitors,
  } = useVisitorPass();

  const [passCode, setPassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'WALK_INS' | 'INSIDE'>('CONSOLE');
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [insideCount, setInsideCount] = useState<number>(0);

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
    setRefreshing(true);
    await Promise.all([loadPendingWalkIns(), fetchGateMetrics()]);
    setRefreshing(false);
  }, [loadPendingWalkIns, fetchGateMetrics]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerifyPass = async (codeToVerify?: string) => {
    const code = (codeToVerify || passCode).trim();
    if (!code) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetchPassDetails(code);
      if (res?.payload) {
        setDetailsModalOpen(true);
      } else {
        setStatusMessage('Pass code not found or invalid.');
      }
    } catch (e: any) {
      setStatusMessage(e?.message || 'Pass verification failed.');
    } finally {
      setLoading(false);
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
                value: String(insideCount),
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

        {/* Canonical TabBar: Console vs Walk-In Queue vs Inside Visitors */}
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
                <Text className="text-sm font-bold text-foreground">Verify Pass Code / QR</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <TextInput
                    value={passCode}
                    onChangeText={setPassCode}
                    placeholder="Enter 6-digit PIN code..."
                    keyboardType="number-pad"
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
                  onPress={() => setActiveTab('INSIDE')}
                  className="flex-1 h-auto py-3.5 rounded-xl flex-col items-center justify-center gap-1.5 bg-status-success/10 border-status-success/20"
                  accessibilityLabel="Gate Check-Out"
                >
                  <LogOut size={22} className="text-status-success" />
                  <Text className="text-xs font-bold text-status-success text-center">
                    Gate Check-Out
                  </Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Verification Details Modal */}
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
