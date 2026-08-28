import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Clock, Users, Zap } from 'lucide-react-native';

export interface StandbyQueueItem {
  id: string;
  amenityName: string;
  slotTime: string;
  queueCount: number;
  status: 'NOTIFIED' | 'WAITING';
  topResident: string;
  claimTimerSeconds?: number;
}

const sampleQueues: StandbyQueueItem[] = [
  {
    id: '1',
    amenityName: 'Tennis Court #1',
    slotTime: '06:00 PM - 07:00 PM',
    queueCount: 3,
    status: 'NOTIFIED',
    topResident: 'Amit V. (Villa 102)',
    claimTimerSeconds: 372,
  },
  {
    id: '2',
    amenityName: 'Community Swimming Pool',
    slotTime: '07:00 AM - 08:00 AM',
    queueCount: 2,
    status: 'WAITING',
    topResident: 'Priya Nair (Flat 404)',
  },
  {
    id: '3',
    amenityName: 'Fitness Gymnasium',
    slotTime: '07:00 PM - 08:00 PM',
    queueCount: 4,
    status: 'WAITING',
    topResident: 'Karan Patel (Villa 45)',
  },
];

export function MobileStandbyWaitlistWidget() {
  const formatTimer = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}m remaining`;
  };

  return (
    <View className="bg-card p-4 rounded-2xl border border-border mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="p-2 rounded-xl bg-amber-500/10">
            <Zap size={16} color="#f59e0b" />
          </View>
          <View>
            <Text variant="large" className="font-bold text-foreground">
              Standby Waitlist Queue
            </Text>
            <Text variant="muted" className="text-xs text-muted-foreground">
              Real-time priority claim monitoring
            </Text>
          </View>
        </View>
        <StatusBadge label="8 QUEUED" variant="warning" />
      </View>

      <View className="gap-2.5">
        {sampleQueues.map((item) => (
          <View
            key={item.id}
            className="bg-muted/40 p-3 rounded-xl border border-border/40 flex-row items-center justify-between"
          >
            <View className="flex-1 me-2">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
                  {item.amenityName}
                </Text>
                <StatusBadge
                  label={item.status}
                  variant={item.status === 'NOTIFIED' ? 'success' : 'neutral'}
                />
              </View>
              <Text className="text-[11px] text-muted-foreground font-medium mb-1">
                Slot: {item.slotTime} • {item.queueCount} residents queued
              </Text>
              <Text className="text-[11px] font-semibold text-foreground" numberOfLines={1}>
                Next: {item.topResident}
              </Text>
            </View>

            {item.status === 'NOTIFIED' && item.claimTimerSeconds ? (
              <View className="bg-emerald-500/15 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 items-end">
                <View className="flex-row items-center gap-1">
                  <Clock size={11} color="#10b981" />
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    CLAIM ACTIVE
                  </Text>
                </View>
                <Text className="text-[10px] font-bold text-foreground">
                  {formatTimer(item.claimTimerSeconds)}
                </Text>
              </View>
            ) : (
              <View className="bg-card px-2.5 py-1.5 rounded-lg border border-border items-center">
                <Users size={12} className="text-muted-foreground mb-0.5" />
                <Text className="text-[10px] font-bold text-muted-foreground">
                  Queue #{item.queueCount}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
