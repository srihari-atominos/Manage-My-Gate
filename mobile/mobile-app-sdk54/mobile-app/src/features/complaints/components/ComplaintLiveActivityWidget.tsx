import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Wrench, ShieldAlert, ArrowRight, Clock, CheckCircle2, AlertTriangle, UserCheck } from 'lucide-react-native';
import { Complaint } from '../types';
import { ComplaintDetailSheet } from './ComplaintDetailSheet';

export interface ComplaintLiveActivityWidgetProps {
  complaints?: Complaint[];
  maintenanceNotices?: Array<{
    id: string;
    title: string;
    message: string;
    date: string;
    variant?: 'warning' | 'danger' | 'info';
  }>;
}

export function ComplaintLiveActivityWidget({ complaints = [], maintenanceNotices = [] }: ComplaintLiveActivityWidgetProps) {
  const router = useRouter();
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Take the 3 most relevant recent tickets or notices
  const recentComplaints = complaints.slice(0, 3);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Closed':
      case 'Completed':
        return 'success';
      case 'Work Completed':
      case 'Waiting For Resident Confirmation':
        return 'warning';
      case 'In Progress':
      case 'Assigned':
      case 'Accepted':
        return 'info';
      case 'Escalated':
      case 'Rejected':
      case 'Cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <View className="mb-8">
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-4 px-1">
        <View className="flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-emerald-500 me-2 animate-pulse" />
          <Text className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Live Ticket & Activity Feed
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(resident)/complaints/my-tickets' as any)}
          className="flex-row items-center active:opacity-70"
        >
          <Text className="text-xs font-bold text-primary me-1">View All</Text>
          <ArrowRight size={14} className="text-primary" />
        </Pressable>
      </View>

      {/* Notices Banner Row if any critical notices exist */}
      {maintenanceNotices.length > 0 ? (
        <View className="mb-4 gap-2">
          {maintenanceNotices.slice(0, 2).map((notice) => (
            <View
              key={notice.id}
              className={`p-3 rounded-2xl border flex-row items-start ${
                notice.variant === 'danger'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : notice.variant === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}
            >
              <View className="p-1.5 rounded-xl bg-background me-3 mt-0.5">
                <AlertTriangle
                  size={16}
                  color={
                    notice.variant === 'danger'
                      ? '#f43f5e'
                      : notice.variant === 'warning'
                      ? '#f59e0b'
                      : '#3b82f6'
                  }
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between mb-0.5">
                  <Text className="text-xs font-extrabold text-foreground" numberOfLines={1}>
                    {notice.title}
                  </Text>
                  <Text className="text-[10px] font-semibold text-muted-foreground me-1">
                    {notice.date}
                  </Text>
                </View>
                <Text className="text-[11px] text-muted-foreground" numberOfLines={2}>
                  {notice.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Active Complaints Feed List */}
      {recentComplaints.length > 0 ? (
        <View className="gap-y-2.5">
          {recentComplaints.map((item) => {
            const variant = getStatusBadgeVariant(item.status);
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <Pressable
                key={item._id}
                onPress={() => setSelectedComplaint(item)}
                className="bg-card p-3.5 rounded-2xl border border-border/80 shadow-xs flex-row items-center justify-between active:opacity-75"
              >
                <View className="flex-row items-center flex-1 me-3">
                  <View className="w-10 h-10 rounded-2xl bg-primary/10 items-center justify-center me-3">
                    <Wrench size={18} className="text-primary" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-0.5">
                      <Text className="text-xs font-extrabold text-foreground me-2" numberOfLines={1}>
                        #{item.complaintNumber || item._id.slice(-6)}
                      </Text>
                      <StatusBadge label={item.status} variant={variant as any} />
                    </View>
                    <Text className="text-[11px] font-semibold text-muted-foreground" numberOfLines={1}>
                      {item.title} • {item.category || 'General'}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground/80 mt-0.5">
                      {dateStr}
                    </Text>
                  </View>
                </View>
                <ArrowRight size={16} className="text-muted-foreground/60" />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View className="bg-card p-4 rounded-2xl border border-border items-center">
          <Text className="text-xs font-semibold text-muted-foreground">
            No recent activity or active tickets reported.
          </Text>
        </View>
      )}

      {/* Detail Sheet Modal */}
      {selectedComplaint ? (
        <ComplaintDetailSheet
          visible={!!selectedComplaint}
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
        />
      ) : null}
    </View>
  );
}
