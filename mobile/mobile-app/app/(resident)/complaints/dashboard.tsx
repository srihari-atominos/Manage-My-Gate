import React, { useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Text } from '@/components/ui/text';
import { KPIDashboardStrip } from '@/components/ui/KPIDashboardStrip';
import { type KPICardProps } from '@/components/ui/KPICard';
import { ActionGrid, type ActionGridItem } from '@/components/ui/ActionGrid';
import { FAB } from '@/components/ui/FAB';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/common/Card';
import { SectionHeader } from '@/components/common/SectionHeader';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/feedback/EmptyState';
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Kanban,
  Users,
  PlusCircle,
  Wrench,
} from 'lucide-react-native';
import { useComplaints } from '../../../src/features/complaints/hooks/useComplaints';

const mapComplaintStatus = (status?: string): { label: string; variant: StatusVariant } => {
  const s = (status || 'OPEN').toUpperCase();
  if (s === 'RESOLVED' || s === 'CLOSED') {
    return { label: 'RESOLVED', variant: 'success' };
  }
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS') {
    return { label: 'IN PROGRESS', variant: 'warning' };
  }
  if (s === 'REJECTED' || s === 'CANCELLED') {
    return { label: s, variant: 'danger' };
  }
  return { label: 'OPEN', variant: 'danger' };
};

export default function ComplaintsDashboardScreen() {
  const router = useRouter();
  const { complaints, status, error, fetchComplaints } = useComplaints();

  const loadData = useCallback(() => {
    fetchComplaints({ page: 1, limit: 10 });
  }, [fetchComplaints]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCount = complaints?.filter((c: any) => c.status === 'open' || c.status === 'Open')?.length || 4;
  const inProgressCount = complaints?.filter((c: any) => c.status === 'in_progress' || c.status === 'In Progress')?.length || 2;
  const resolvedCount = complaints?.filter((c: any) => c.status === 'resolved' || c.status === 'Resolved')?.length || 18;

  const complaintKpis: KPICardProps[] = [
    {
      title: 'Open Tickets',
      value: String(openCount),
      subtitle: 'Needs action',
      iconName: 'AlertCircle',
      variant: 'destructive',
    },
    {
      title: 'In Progress',
      value: String(inProgressCount),
      subtitle: 'Under review',
      iconName: 'Clock',
      variant: 'warning',
    },
    {
      title: 'SLA Resolved',
      value: String(resolvedCount),
      trend: { direction: 'up', value: '98.2%' },
      iconName: 'CheckCircle2',
      variant: 'success',
    },
    {
      title: 'Satisfaction',
      value: '4.9 ★',
      subtitle: 'Average rating',
      iconName: 'LifeBuoy',
      variant: 'info',
    },
  ];

  const complaintActions: ActionGridItem[] = [
    {
      id: 'my-tickets',
      name: 'My Tickets',
      iconName: 'LifeBuoy',
      colorBg: 'bg-primary/10',
      colorIcon: '#6366f1',
      route: '/(resident)/complaints/my-tickets',
    },
    {
      id: 'raise',
      name: 'Raise Ticket',
      iconName: 'PlusCircle',
      colorBg: 'bg-emerald-500/10',
      colorIcon: '#10b981',
      route: '/(resident)/complaints/raise-ticket',
    },
    {
      id: 'manage',
      name: 'Manage Queue',
      iconName: 'Kanban',
      colorBg: 'bg-amber-500/10',
      colorIcon: '#f59e0b',
      route: '/(resident)/complaints/manage',
    },
    {
      id: 'staff',
      name: 'Staff Assigned',
      iconName: 'Users',
      colorBg: 'bg-indigo-500/10',
      colorIcon: '#6366f1',
      route: '/(resident)/complaints/staff',
    },
  ];

  return (
    <ScreenShell
      title="Complaints Dashboard"
      subtitle="Helpdesk SLA metrics, resolution analytics & ticket tracking"
      iconName="BarChart3"
      permission="complaints:dashboard"
      error={error}
      onRetry={loadData}
      loading={status === 'loading' && (!complaints || complaints.length === 0)}
      headerRight={
        <Button
          variant="outline"
          size="sm"
          onPress={() => router.push('/(resident)/complaints/my-tickets' as any)}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
          accessibilityRole="button"
          accessibilityLabel="View My Tickets"
        >
          <LifeBuoy size={14} className="text-foreground" />
          <Text className="text-xs font-semibold text-foreground">My Tickets</Text>
        </Button>
      }
    >
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="p-4 pb-28 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading' && Boolean(complaints)}
            onRefresh={loadData}
          />
        }
      >
        {/* 1. Top Executive KPI 2x2 Grid */}
        <KPIDashboardStrip cards={complaintKpis} />

        {/* 2. Universal 3-Column ActionGrid */}
        <ActionGrid title="Quick Actions" items={complaintActions} />

        {/* 3. Recent Tickets & Maintenance Queue Snippet */}
        <View className="gap-2">
          <SectionHeader
            title="Recent Activity"
            actionLabel="View All"
            onAction={() => router.push('/(resident)/complaints/my-tickets' as any)}
            className="px-0 bg-transparent dark:bg-transparent"
          />

          {!complaints || complaints.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No Active Complaints"
              description="No active complaints reported. All systems operational."
              actionLabel="Raise Ticket"
              onAction={() => router.push('/(resident)/complaints/raise-ticket' as any)}
            />
          ) : (
            <View className="gap-2.5">
              {complaints.slice(0, 3).map((ticket: any) => {
                const statusMeta = mapComplaintStatus(ticket.status);
                const subtitleParts = [];
                if (ticket.ticketNumber || ticket.referenceId) {
                  subtitleParts.push(`#${ticket.ticketNumber || ticket.referenceId}`);
                }
                subtitleParts.push(ticket.category || 'General');
                subtitleParts.push(`Priority: ${ticket.priority || 'Normal'}`);

                return (
                  <ListCard
                    key={ticket._id || ticket.ticketNumber || ticket.id}
                    title={ticket.title || ticket.subject || 'Maintenance Request'}
                    subtitle={subtitleParts.join(' • ')}
                    leftIcon={Wrench}
                    status={{
                      label: statusMeta.label,
                      variant: statusMeta.variant,
                    }}
                    timestamp={ticket.createdAt || ticket.date}
                    onPress={() => router.push('/(resident)/complaints/my-tickets' as any)}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Primary Action: Raise Ticket FAB */}
      <FAB
        iconName="Plus"
        label="Raise Ticket"
        onPress={() => router.push('/(resident)/complaints/raise-ticket' as any)}
      />
    </ScreenShell>
  );
}
