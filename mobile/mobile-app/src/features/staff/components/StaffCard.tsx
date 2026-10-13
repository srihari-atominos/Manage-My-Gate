import React from 'react';
import { View } from 'react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StaffMember } from '../services/staffService';
import { Phone, Mail, Edit3, Trash2, Eye, ShieldCheck } from 'lucide-react-native';

interface StaffCardProps {
  member: StaffMember;
  canManage: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

const getTypeVariant = (type: string): StatusVariant => {
  return type === 'In-House Staff' ? 'info' : 'neutral';
};

const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || 'S').slice(0, 2).toUpperCase();
};

export const StaffCard: React.FC<StaffCardProps> = ({
  member,
  canManage,
  onPress,
  onEdit,
  onDelete,
}) => {
  const subtitle = member.designation
    ? `${member.designation} • ${member.department}`
    : member.department;

  return (
    <View className="mb-3 rounded-2xl bg-card border border-border p-3.5 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 me-2">
          <View className="h-11 w-11 rounded-full bg-primary/10 items-center justify-center me-3">
            <Text className="text-sm font-bold text-primary">
              {getInitials(member.name)}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center flex-wrap gap-1.5">
              <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                {member.name}
              </Text>
              {member.staffCode ? (
                <View className="px-1.5 py-0.5 rounded bg-muted">
                  <Text className="text-[10px] font-mono text-muted-foreground">
                    {member.staffCode}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View className="items-end gap-1">
          <StatusBadge
            label={member.status}
            variant={getStatusVariant(member.status)}
            size="sm"
          />
          <StatusBadge
            label={member.type}
            variant={getTypeVariant(member.type)}
            size="sm"
          />
        </View>
      </View>

      {/* Contact Info Row */}
      <View className="mt-3 pt-2.5 border-t border-border/50 flex-row items-center flex-wrap gap-x-4 gap-y-1.5">
        <View className="flex-row items-center">
          <Phone size={13} className="text-muted-foreground me-1.5" />
          <Text className="text-xs text-foreground font-medium">
            {member.phone}
          </Text>
        </View>
        {member.email ? (
          <View className="flex-row items-center flex-1 min-w-[120px]">
            <Mail size={13} className="text-muted-foreground me-1.5" />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {member.email}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action Buttons Row */}
      <View className="mt-2.5 pt-2 border-t border-border/40 flex-row items-center justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5"
          onPress={onPress}
          accessibilityLabel={`View details for ${member.name}`}
        >
          <Eye size={14} className="text-foreground me-1.5" />
          <Text className="text-xs font-medium text-foreground">View</Text>
        </Button>

        {canManage && onEdit ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5"
            onPress={onEdit}
            accessibilityLabel={`Edit ${member.name}`}
          >
            <Edit3 size={13} className="text-foreground me-1.5" />
            <Text className="text-xs font-medium text-foreground">Edit</Text>
          </Button>
        ) : null}

        {canManage && onDelete ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-8 px-2.5"
            onPress={onDelete}
            accessibilityLabel={`Deactivate ${member.name}`}
          >
            <Trash2 size={13} className="text-destructive-foreground me-1.5" />
            <Text className="text-xs font-medium text-destructive-foreground">Deactivate</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
};

export default StaffCard;
