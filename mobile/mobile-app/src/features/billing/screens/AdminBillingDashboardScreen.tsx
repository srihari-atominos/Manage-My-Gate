import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIRow } from '@/components/ui/KPIRow';
import { KPICardProps } from '@/components/ui/KPICard';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ListItem } from '@/components/common/ListItem';
import { StatusBadge, getStatusVariant } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import {
  Receipt,
  Clock,
  ShieldAlert,
  Landmark,
  Target,
  Layers,
  FileText,
} from 'lucide-react-native';
import { useBilling } from '../hooks/useBilling';
import { useBillingSocket } from '../hooks/useBillingSocket';

export function AdminBillingDashboardScreen() {
  const router = useRouter();
  const {
    kpis,
    invoicesList,
    loadingStates,
    error,
    activeOrgId,
    loadAdminDashboard,
    resetBillingError,
  } = useBilling();

  // Socket sync for real-time KPI & ledger updates
  useBillingSocket();

  // Permission check from auth state
  const permissions: string[] = useSelector((state: any) => state.auth?.user?.permissions || []);
  const userRole: string = useSelector((state: any) => state.auth?.user?.role || '');
  const isSuperAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
  const hasDashboardPermission =
    isSuperAdmin || permissions.includes('billing:dashboard') || permissions.includes('*');

  const fetchDashboardData = useCallback(() => {
    if (activeOrgId) {
      loadAdminDashboard(activeOrgId);
    }
  }, [activeOrgId, loadAdminDashboard]);

  useEffect(() => {
    if (hasDashboardPermission) {
      fetchDashboardData();
    }
  }, [hasDashboardPermission, fetchDashboardData]);

  // Permission Denied View
  if (!hasDashboardPermission) {
    return (
      <ScreenShell title="Financial Overview" subtitle="Access Restricted" iconName="BarChart3">
        <View className="flex-1 bg-background p-6 items-center justify-center">
          <View className="w-16 h-16 rounded-full bg-destructive/10 items-center justify-center mb-4">
            <Icon as={ShieldAlert} size={32} className="text-destructive" />
          </View>
          <Text className="text-xl font-bold text-foreground text-center mb-2">Access Denied</Text>
          <Text className="text-sm text-muted-foreground text-center mb-6 px-4">
            You do not have the required administrative permission (
            <Text className="font-mono text-xs font-bold">billing:dashboard</Text>) to view community
            financial KPIs.
          </Text>
          <Button
            variant="default"
            size="lg"
            onPress={() => router.push('/(resident)/billing/my-dues' as any)}
            accessibilityRole="button"
            accessibilityLabel="Return to My Dues"
          >
            Return to My Dues
          </Button>
        </View>
      </ScreenShell>
    );
  }

  // Authoritative metrics from backend
  const grossDemand = kpis?.grossDemand || 0;
  const grossDemandCount = kpis?.grossDemandCount || 0;
  const totalCollected = kpis?.totalCollected || 0;
  const totalUnpaidArrears = kpis?.totalUnpaidArrears || 0;
  const inTransitGateway = kpis?.inTransitGateway || 0;
  const pendingOffline = kpis?.pendingOffline || 0;

  // Calculate collection progress percentage
  const collectionRate = grossDemand > 0 ? Math.min(100, Math.round((totalCollected / grossDemand) * 100)) : 0;

  const kpiCards: KPICardProps[] = [
    {
      title: 'Gross Billed',
      value: `₹${grossDemand.toLocaleString('en-IN')}`,
      iconName: 'Receipt',
      iconColor: '#E5A93C',
      bgColor: 'rgba(229, 169, 60, 0.12)',
      subtitle: `${grossDemandCount} total invoices`,
    },
    {
      title: 'Total Collected',
      value: `₹${totalCollected.toLocaleString('en-IN')}`,
      iconName: 'Check',
      iconColor: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
    },
    {
      title: 'Unpaid Arrears',
      value: `₹${totalUnpaidArrears.toLocaleString('en-IN')}`,
      iconName: 'AlertCircle',
      iconColor: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
    },
    {
      title: 'Pending Clearance',
      value: `₹${inTransitGateway.toLocaleString('en-IN')}`,
      iconName: 'Clock',
      iconColor: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  const recentTransactions = Array.isArray(invoicesList) ? invoicesList.slice(0, 3) : [];

  return (
    <ScreenShell
      title="Billing Overview"
      subtitle="Community Collection & Dues Snapshot"
      iconName="ChartColumn"
      loading={loadingStates.fetchKPIs && !kpis}
    >
      <ScrollView
        className="flex-1 bg-background"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={loadingStates.fetchKPIs}
            onRefresh={fetchDashboardData}
            colors={['#6366f1']}
          />
        }
      >
        {/* Error Banner */}
        {error ? (
          <View className="px-4 mb-4">
            <ErrorBanner message={error} onDismiss={resetBillingError} />
          </View>
        ) : null}

        {/* 1. Collection Target Progress Widget */}
        <View className="px-4 mb-6">
          <Card className="bg-card border border-border rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Icon as={Target} size={18} className="text-primary me-2" />
                <Text className="text-sm font-bold text-foreground">Current Month Collection Progress</Text>
              </View>
              <Text className="text-sm font-extrabold text-primary">{collectionRate}%</Text>
            </View>
            <ProgressBar progress={collectionRate} className="h-2 rounded-full mb-3" />
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-muted-foreground">
                Collected: <Text className="font-semibold text-foreground">₹{totalCollected.toLocaleString('en-IN')}</Text>
              </Text>
              <Text className="text-xs text-muted-foreground">
                Billed: <Text className="font-semibold text-foreground">₹{grossDemand.toLocaleString('en-IN')}</Text>
              </Text>
            </View>
          </Card>
        </View>

        {/* 2. Collection KPI Metrics Carousel */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-4 mb-3">
            Collection Performance Summary
          </Text>
          <KPIRow cards={kpiCards} loading={loadingStates.fetchKPIs} />
        </View>

        {/* 3. Attention Required Box */}
        <View className="px-4 mb-6">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Attention Required
          </Text>
          <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex-row items-start justify-between">
            <View className="flex-row items-start flex-1 me-3">
              <Icon as={Clock} size={22} className="text-amber-600 dark:text-amber-400 me-3 mt-0.5" />
              <View className="flex-1">
                <Text className="font-extrabold text-sm text-amber-900 dark:text-amber-200">
                  Pending Offline Payment Verification
                </Text>
                <Text className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {pendingOffline > 0
                    ? `₹${pendingOffline.toLocaleString('en-IN')} in cheque/NEFT submissions awaiting admin clearance.`
                    : 'Review pending cheque & NEFT submissions from residents.'}
                </Text>
              </View>
            </View>
            <Button
              variant="outline"
              size="sm"
              className="bg-amber-500/20 border-amber-500/40"
              onPress={() => router.push('/(resident)/admin/billing/ledger' as any)}
              accessibilityRole="button"
              accessibilityLabel="Review pending offline payments"
            >
              Review
            </Button>
          </View>
        </View>

        {/* 4. Quick Navigation Hub (4 Sub-View Action Tiles in 2x2 Grid) */}
        <View className="px-4 mb-6">
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Navigation
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {/* Tile 1: Billing Dashboard (Active) */}
            <Pressable
              className="w-[48%] bg-primary/10 border border-primary/30 rounded-xl p-3 justify-between active:opacity-80"
              onPress={() => router.push('/(resident)/admin/billing' as any)}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Billing Dashboard"
            >
              <View className="w-9 h-9 rounded-lg bg-primary/20 items-center justify-center mb-2">
                <Icon as={Target} size={18} className="text-primary" />
              </View>
              <Text className="text-primary font-extrabold text-xs mb-0.5">Billing Dashboard</Text>
              <Text className="text-primary/70 text-[10px]" numberOfLines={2}>
                Collection KPIs & overview
              </Text>
            </Pressable>

            {/* Tile 2: Billing Ledger */}
            <Pressable
              className="w-[48%] bg-card border border-border rounded-xl p-3 justify-between active:opacity-80"
              onPress={() => router.push('/(resident)/admin/billing/ledger' as any)}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Billing Ledger"
            >
              <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center mb-2">
                <Icon as={Receipt} size={18} className="text-primary" />
              </View>
              <Text className="text-foreground font-bold text-xs mb-0.5">Billing Ledger</Text>
              <Text className="text-muted-foreground text-[10px]" numberOfLines={2}>
                Search invoices & settle offline
              </Text>
            </Pressable>

            {/* Tile 3: Assessment Manager */}
            <Pressable
              className="w-[48%] bg-card border border-border rounded-xl p-3 justify-between active:opacity-80"
              onPress={() => router.push('/(resident)/admin/billing/assessments' as any)}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Assessment Manager"
            >
              <View className="w-9 h-9 rounded-lg bg-emerald-500/10 items-center justify-center mb-2">
                <Icon as={Landmark} size={18} className="text-emerald-600 dark:text-emerald-400" />
              </View>
              <Text className="text-foreground font-bold text-xs mb-0.5">Assessment Manager</Text>
              <Text className="text-muted-foreground text-[10px]" numberOfLines={2}>
                Formulas & WhatsApp links
              </Text>
            </Pressable>

            {/* Tile 4: Action Center */}
            <Pressable
              className="w-[48%] bg-card border border-border rounded-xl p-3 justify-between active:opacity-80"
              onPress={() => router.push('/(resident)/billing/my-dues' as any)}
              accessibilityRole="button"
              accessibilityLabel="Navigate to Action Center"
            >
              <View className="w-9 h-9 rounded-lg bg-indigo-500/10 items-center justify-center mb-2">
                <Icon as={Layers} size={18} className="text-indigo-600 dark:text-indigo-400" />
              </View>
              <Text className="text-foreground font-bold text-xs mb-0.5">Action Center</Text>
              <Text className="text-muted-foreground text-[10px]" numberOfLines={2}>
                Resident dues & portfolio list
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 5. Recent Activity Feed Snippet */}
        <View className="px-4 mb-6">
          <SectionHeader
            title="Recent Collections"
            actionLabel="View All"
            onAction={() => router.push('/(resident)/admin/billing/ledger' as any)}
          />
          {recentTransactions.length === 0 ? (
            <Card className="bg-card border border-border rounded-xl p-4 items-center justify-center">
              <Text className="text-xs text-muted-foreground text-center">
                No recent collection transactions found.
              </Text>
            </Card>
          ) : (
            <View className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {recentTransactions.map((tx: any) => (
                <ListItem
                  key={tx._id || tx.invoiceNumber}
                  title={`${tx.unitNumber || 'Unit'} • ${tx.targetUser || 'Resident'}`}
                  subtitle={`Inv #${tx.invoiceNumber || '—'} • ${tx.date || ''}`}
                  leftIcon={FileText}
                  onPress={() => router.push('/(resident)/admin/billing/ledger' as any)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

export default AdminBillingDashboardScreen;
