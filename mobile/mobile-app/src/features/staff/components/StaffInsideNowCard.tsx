import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserCheck } from 'lucide-react-native';
import { StaffInsideNow } from '../services/staffService';
import { StaffAvatar } from './StaffAvatar';

interface StaffInsideNowCardProps {
  staff: StaffInsideNow[];
}

function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '--:--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const StaffInsideNowCard: React.FC<StaffInsideNowCardProps> = ({ staff }) => {
  if (staff.length === 0) return null;

  return (
    <View className="mb-4 rounded-2xl bg-card border border-border p-3.5">
      <View className="flex-row items-center mb-2">
        <UserCheck size={15} className="text-emerald-600 dark:text-emerald-400 me-1.5" />
        <Text className="text-xs font-bold text-foreground uppercase tracking-wide">
          Inside Community Now ({staff.length})
        </Text>
      </View>
      {staff.map((s, index) => (
        <View
          key={s.sessionId}
          className={`flex-row items-center justify-between py-2 ${
            index < staff.length - 1 ? 'border-b border-border/50' : ''
          }`}
        >
          <View className="me-3">
            <StaffAvatar name={s.name} photoUrl={s.photoUrl} size={36} />
          </View>
          <View className="flex-1 me-2">
            <Text className="text-sm font-semibold text-foreground">{s.name}</Text>
            <Text className="text-[11px] text-muted-foreground">
              {[s.designation || s.department, s.unitNumbers.join(', ')].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View className="items-end">
            <StatusBadge label="On-Site" variant="success" size="sm" />
            <Text className="text-[10px] text-muted-foreground mt-1">
              Since {formatTime(s.checkInTime)}
              {s.checkInGate ? ` · ${s.checkInGate}` : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default StaffInsideNowCard;
