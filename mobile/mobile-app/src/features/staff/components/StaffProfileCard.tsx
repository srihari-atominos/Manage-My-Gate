import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { StaffMember } from '../services/staffService';
import { ShieldCheck, QrCode } from 'lucide-react-native';
import { StaffAvatar } from './StaffAvatar';

interface StaffProfileCardProps {
  member: StaffMember;
  activeOrgId?: string | null;
  onOpenQrPass?: () => void;
}

const getStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Inactive':
    default:
      return 'neutral';
  }
};

export const StaffProfileCard: React.FC<StaffProfileCardProps> = ({
  member,
  activeOrgId,
  onOpenQrPass,
}) => {
  return (
    <View className="mb-4 rounded-3xl bg-card border border-border p-5 shadow-sm">
      {/* Top Profile Summary */}
      <View className="items-center pb-5 border-b border-border relative">
        {onOpenQrPass ? (
          <TouchableOpacity
            onPress={onOpenQrPass}
            className="absolute right-0 top-0 h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Open digital gate QR pass"
          >
            <QrCode size={19} className="text-primary" />
          </TouchableOpacity>
        ) : null}
        <View className="mb-3 rounded-full border-2 border-primary/20">
          <StaffAvatar name={member.name} photoUrl={member.photoUrl} size={80} />
        </View>

        <Text className="text-xl font-bold text-foreground text-center">
          {member.name}
        </Text>

        {member.designation ? (
          <Text className="text-sm font-medium text-muted-foreground text-center mt-0.5">
            {member.designation}
          </Text>
        ) : (
          <Text className="text-sm font-medium text-muted-foreground text-center mt-0.5">
            {member.department}
          </Text>
        )}

        <View className="flex-row items-center gap-2 mt-3">
          <StatusBadge
            label={member.status}
            variant={getStatusVariant(member.status)}
            size="md"
          />
          {member.staffCode ? (
            <View className="px-2.5 py-1 rounded-full bg-muted border border-border flex-row items-center">
              <ShieldCheck size={12} className="text-muted-foreground me-1" />
              <Text className="text-xs font-semibold text-muted-foreground">
                {member.staffCode}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Specifications & Contact */}
      <View className="pt-3">
        <DetailRow label="Department / Trade" value={member.department} />
        <DetailRow label="Employment Type" value={member.type} />
        {member.phone ? <DetailRow label="Phone" value={member.phone} /> : null}
        {member.email ? <DetailRow label="Email" value={member.email} /> : null}
      </View>
    </View>
  );
};

export default StaffProfileCard;


