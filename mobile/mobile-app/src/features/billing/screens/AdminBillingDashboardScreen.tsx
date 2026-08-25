import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Pressable, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { KPICardProps } from '@/components/ui/KPICard';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { EmptyState } from '@/components/feedback/EmptyState';
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

const mapInvoiceStatus = (status?: string): { label: string; variant: StatusVariant } => {
  const s = String(status || 'PENDING').toUpperCase();
  if (s === 'PAID' || s === 'CLEARED' || s === 'SUCCESS') {
    return { label: 'PAID', variant: 'success' };
  }
  if (s === 'OVERDUE' || s === 'FAILED' || s === 'REJECTED') {
    return { label: 'OVERDUE', variant: 'danger' };
  }
  if (s === 'IN_TRANSIT' || s === 'PENDING' || s === 'UNPAID') {
    return { label: s === 'IN_TRANSIT' ? 'IN-TRANSIT' : 'PENDING', variant: 'warning' };
  }
  return { label: s || 'DRAFT', variant: 'neutral' };
};

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
      iconName: 'IndianRupee',
      variant: 'default',
      subtitle: `${grossDemandCount} invoices`,
    },
    {
      title: 'Total Collected',
      value: `₹${totalCollected.toLocaleString('en-IN')}`,
      iconName: 'CheckCircle2',
      variant: 'success',
      trend: { direction: 'up', value: `${collectionRate}%` },
    },
    {
      title: 'Unpaid Arrears',
      value: `₹${totalUnpaidArrears.toLocaleString('en-IN')}`,
      iconName: 'XCircle',
      variant: 'destructive',
      subtitle: 'Overdue balance',
    },
    {
      title: 'Pending Clear',
      value: `₹${inTransitGateway.toLocaleString('en-IN')}`,
      iconName: 'Clock',
      variant: 'warning',
      subtitle: 'In-transit payments',
    },
  ];

  const billingNavActions: ActionGridItem[] = [
    {
      id: 'dashboard',
      name: 'Billing Dashboard',
      iconName: 'Target',
      colorBg: 'bg-primary/10',
      colorIcon: '#6366f1',
      route: '/(resident)/admin/billing',
    },
    {
      id: 'ledger',
      name: 'Billing Ledger',
      iconName: 'Receipt',
      colorBg: 'bg-primary/10',
      colorIcon: '#6366f1',
      route: '/(resident)/admin/billing/ledger',
    },
    {
      id: 'assessments',
      name: 'Assessments',
      iconName: 'Landmark',
      colorBg: 'bg-emerald-500/10',
      colorIcon: '#10b981',
      route: '/(resident)/admin/billing/assessments',
    },
    {
      id: 'dues',
      name: 'Resident Dues',
      iconName: 'Layers',
      colorBg: 'bg-indigo-500/10',
      colorIcon: '#6366f1',
      route: '/(resident)/billing/my-dues',
    },
  ];

  const recentTransactions = invoicesList.slice(0, 3);

  return (
    <ScreenShell
      title="Billing Overview"
      subtitle="Community Collection & Dues Snapshot"
      iconName="BarChart3"
      permission="billing:dashboard"
      permissionGranted={hasDashboardPermission}
      loading={loadingStates.fetchKPIs && !kpis}
      headerRight={
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push('/(resident)/admin/billing/ledger' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="View Ledger"
        >
          <Receipt size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">Ledger</Text>
        </Button>
      }
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 pb-28 gap-4"
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
          <ErrorBanner message={error} onDismiss={resetBillingError} />
        ) : null}

        {/* 1. Collection Target Progress Widget */}
        <Card className="bg-card border border-border rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Icon as={Target} size={18} className="text-primary me-2" />
              <Text className="text-sm font-bold text-foreground">Current Month Collection Progress</Text>
            </View>
            <Text className="text-sm font-extrabold text-primary">{collectionRate}%</Text>
          </View>
          <ProgressBar progress={collectionRate / 100} className="h-2 rounded-full mb-3" />
          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-muted-foreground">
              Collected: <Text className="font-semibold text-foreground">₹{totalCollected.toLocaleString('en-IN')}</Text>
            </Text>
            <Text className="text-xs text-muted-foreground">
              Billed: <Text className="font-semibold text-foreground">₹{grossDemand.toLocaleString('en-IN')}</Text>
            </Text>
          </View>
        </Card>

        {/* 2. Collection KPI Metrics Universal 2x2 Grid */}
        <KPIDashboardStrip cards={kpiCards} loading={loadingStates.fetchKPIs} />

        {/* 3. Attention Required Box */}
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

        {/* 4. Sub-Navigation Quick Action Grid (Universal 3-Column Wrap) */}
        <ActionGrid title="Quick Actions" items={billingNavActions} className="mb-0" />

        {/* 5. Recent Activity Feed Snippet */}
        <View className="gap-2">
          <SectionHeader
            title="Recent Activity"
            actionLabel="View All"
            onAction={() => router.push('/(resident)/admin/billing/ledger' as any)}
            className="px-0 bg-transparent dark:bg-transparent"
          />
          {recentTransactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No Recent Transactions"
              description="No recent collection transactions found."
              actionLabel="View Ledger"
              onAction={() => router.push('/(resident)/admin/billing/ledger' as any)}
            />
          ) : (
            <View className="gap-2.5">
              {recentTransactions.map((tx: any) => {
                const statusMeta = mapInvoiceStatus(tx.status);
                const unit = tx.unitNumber || tx.unitId?.unitNumber || 'Unit';
                const resident = tx.targetUser || tx.residentName || tx.targetUserName || 'Resident';
                const amount = tx.totalDue ?? tx.amount ?? tx.totalAmount ?? 0;
                const formattedAmount = typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : String(amount);
                const invNum = tx.invoiceNumber ? `Inv #${tx.invoiceNumber}` : 'Invoice';

                return (
                  <ListCard
                    key={tx._id || tx.invoiceNumber}
                    title={`${unit} • ${resident}`}
                    subtitle={`${invNum} • ${formattedAmount}`}
                    leftIcon={FileText}
                    status={{
                      label: statusMeta.label,
                      variant: statusMeta.variant,
                    }}
                    timestamp={tx.createdAt || tx.date || tx.dueDate}
                    onPress={() => router.push('/(resident)/admin/billing/ledger' as any)}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

export default AdminBillingDashboardScreen;
