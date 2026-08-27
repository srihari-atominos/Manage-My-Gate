import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VisitorPassDetailsModal } from '@/src/features/visitor/components/VisitorPassDetailsModal';
import { GuardInitiateWalkInModal } from '@/src/features/visitor/components/guard/GuardInitiateWalkInModal';
import { GuardQRScannerModal } from '@/src/features/visitor/components/guard/GuardQRScannerModal';
import { InsideVisitorsView } from '@/src/features/visitor/components/guard/InsideVisitorsView';
import { GuardWalkInStatusView } from '@/src/features/visitor/components/guard/GuardWalkInStatusView';
import { useVisitorPass } from '@/src/features/visitor/hooks/useVisitorPass';
import { selectActiveOrgId, selectAuthUser } from '@/src/features/auth/store/authSelectors';
import { useSelector } from 'react-redux';
import visitorService from '@/src/features/visitor/services/visitorService';
import { QrCode, ScanLine, Search, ShieldCheck, UserCheck, ShieldAlert, LogOut, Users, Clock } from 'lucide-react-native';

export default function GateConsoleScreen() {
  const activeOrgId = useSelector(selectActiveOrgId);
  const authUser = useSelector(selectAuthUser);
  const { activePass, fetchPassDetails, selectPass } = useVisitorPass();

  const [passCode, setPassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'WALK_INS' | 'INSIDE'>('CONSOLE');
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleVerifyPass = async (codeToVerify?: string) => {
    const code = codeToVerify || passCode.trim();
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
      await visitorService.initiateWalkIn({
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
    } catch (err: any) {
      throw err;
    } finally {
      setWalkInLoading(false);
    }
  };

  return (
    <ScreenShell
      title="Gate Security Console"
      subtitle="Guard check-in verification, QR scanner & walk-in entry"
    >
      <View className="flex-1 bg-background">
        {/* Navigation Tabs: Console vs Walk-In Queue vs Inside Visitors */}
        <View className="flex-row border-b border-border bg-card p-1 mx-4 mt-3 rounded-2xl">
          <TouchableOpacity
            onPress={() => setActiveTab('CONSOLE')}
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1 ${
              activeTab === 'CONSOLE' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <ScanLine size={15} color={activeTab === 'CONSOLE' ? '#fff' : '#6b7280'} />
            <Text className={`text-[11px] font-bold ${activeTab === 'CONSOLE' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              Console
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('WALK_INS')}
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1 ${
              activeTab === 'WALK_INS' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Clock size={15} color={activeTab === 'WALK_INS' ? '#fff' : '#6b7280'} />
            <Text className={`text-[11px] font-bold ${activeTab === 'WALK_INS' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              Walk-Ins Queue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('INSIDE')}
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center gap-1 ${
              activeTab === 'INSIDE' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Users size={15} color={activeTab === 'INSIDE' ? '#fff' : '#6b7280'} />
            <Text className={`text-[11px] font-bold ${activeTab === 'INSIDE' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              Visitors Inside
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'INSIDE' ? (
          <InsideVisitorsView />
        ) : activeTab === 'WALK_INS' ? (
          <GuardWalkInStatusView />
        ) : (
          <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4 pb-8">
            {statusMessage && (
              <View className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                <Text className="text-xs font-semibold text-primary">{statusMessage}</Text>
              </View>
            )}

            {/* Verification Card */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3">
              <View className="flex-row items-center gap-2 border-b border-border/40 pb-2">
                <ScanLine size={20} className="text-primary" />
                <Text className="text-sm font-bold text-foreground">Verify Pass Code / QR</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1">
                  <Input
                    value={passCode}
                    onChangeText={setPassCode}
                    placeholder="Enter 6-digit PIN code..."
                    keyboardType="number-pad"
                    className="font-mono text-sm"
                  />
                </View>
                <Button size="sm" onPress={() => handleVerifyPass()} disabled={loading} className="h-12 px-4 rounded-xl">
                  <Search size={16} className="text-white" />
                </Button>
              </View>

              <Button
                variant="outline"
                className="flex-row items-center gap-2 h-11 rounded-xl border-primary/30 bg-primary/5"
                onPress={() => setQrScannerOpen(true)}
              >
                <QrCode size={18} className="text-primary" />
                <Text className="text-xs font-bold text-primary">Open Camera QR Scanner</Text>
              </Button>
            </View>

            {/* Guard Quick Actions */}
            <View className="bg-card border border-border rounded-2xl p-4 gap-3">
              <Text className="text-sm font-bold text-foreground">Guard Gate Actions</Text>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setWalkInModalOpen(true)}
                  activeOpacity={0.8}
                  className="flex-1 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl items-center gap-1.5"
                >
                  <ShieldAlert size={22} className="text-amber-600 dark:text-amber-400" />
                  <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 text-center">
                    Initiate Walk-In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('INSIDE')}
                  activeOpacity={0.8}
                  className="flex-1 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl items-center gap-1.5"
                >
                  <LogOut size={22} className="text-emerald-600 dark:text-emerald-400" />
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 text-center">
                    Gate Check-Out
                  </Text>
                </TouchableOpacity>
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
