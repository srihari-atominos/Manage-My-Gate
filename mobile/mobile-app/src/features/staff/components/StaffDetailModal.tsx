import React from 'react';
import { View, ScrollView } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DetailRow } from '@/components/ui/DetailRow';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StaffMember } from '../services/staffService';
import { Edit3 } from 'lucide-react-native';

interface StaffDetailModalProps {
  visible: boolean;
  member: StaffMember | null;
  canManage: boolean;
  onClose: () => void;
  onEdit?: () => void;
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

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  visible,
  member,
  canManage,
  onClose,
  onEdit,
}) => {
  if (!member) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Staff Profile Details">
      <ScrollView className="px-4 py-2" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Summary */}
        <View className="mb-4 p-4 rounded-2xl bg-card border border-border items-center">
          <View className="h-14 w-14 rounded-full bg-primary/10 items-center justify-center mb-2">
            <Text className="text-lg font-bold text-primary">
              {(member.name || 'S').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text className="text-lg font-bold text-foreground text-center">
            {member.name}
          </Text>
          {member.designation ? (
            <Text className="text-sm text-muted-foreground text-center mt-0.5">
              {member.designation}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-2.5">
            <StatusBadge
              label={member.status}
              variant={getStatusVariant(member.status)}
              size="sm"
            />
            <StatusBadge label={member.type} variant="info" size="sm" />
          </View>
        </View>

        {/* Specifications */}
        <View className="rounded-2xl bg-card border border-border px-3.5 py-1 mb-4">
          <DetailRow label="Department" value={member.department} />
          {member.staffCode ? (
            <DetailRow label="Staff Code" value={member.staffCode} copyable />
          ) : null}
          <DetailRow label="Phone" value={member.phone} copyable />
          <DetailRow
            label="Email"
            value={member.email || 'Not provided'}
            copyable={Boolean(member.email)}
          />
          <DetailRow
            label="WhatsApp Notifications"
            value={member.whatsappEnabled ? 'Enabled' : 'Disabled'}
          />
          <DetailRow
            label="Linked User ID"
            value={member.userId ? String(member.userId) : 'Auto-generated on invite'}
            copyable={Boolean(member.userId)}
            isLast
          />
        </View>

        {/* Action Row */}
        <View className="flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={onClose}>
            Close
          </Button>
          {canManage && onEdit ? (
            <Button
              variant="default"
              className="flex-1"
              onPress={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit3 size={15} className="text-primary-foreground me-1.5" />
              <Text className="text-sm font-semibold text-primary-foreground">Edit Profile</Text>
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default StaffDetailModal;
