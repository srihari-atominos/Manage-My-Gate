import React from 'react';
import { View, Linking } from 'react-native';
import { StatusBadge, type StatusVariant } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { StaffUnitAssociation } from '../services/staffService';
import { Home, Phone, Mail, UserMinus, ShieldCheck } from 'lucide-react-native';

interface UnitStaffCardProps {
  association: StaffUnitAssociation;
  canManage: boolean;
  onRemove: () => void;
}

const getInitials = (name: string): string => {
  const parts = (name || '').trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || 'S').slice(0, 2).toUpperCase();
};

export const UnitStaffCard: React.FC<UnitStaffCardProps> = ({
  association,
  canManage,
  onRemove,
}) => {
  const staff = association.technicianId;
  const villa = association.villaId;

  const staffName = staff?.name || 'Staff Member';
  const roleDisplay =
    association.roleOrTrade ||
    staff?.designation ||
    staff?.department ||
    'Household Staff';

  const unitLabel = villa?.unitNumber
    ? `${villa.unitNumber}${villa.blockOrBuilding ? ` (${villa.blockOrBuilding})` : ''}`
    : 'Associated Unit';

  const handleCall = () => {
    if (staff?.phone) {
      Linking.openURL(`tel:${staff.phone}`);
    }
  };

  return (
    <View className="mb-3 rounded-2xl bg-card border border-border p-4 shadow-sm">
      {/* Top Header Row */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 me-2">
          <View className="h-11 w-11 rounded-full bg-primary/10 items-center justify-center me-3">
            <Text className="text-sm font-bold text-primary">
              {getInitials(staffName)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {staffName}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground mt-0.5">
              {roleDisplay}
            </Text>
          </View>
        </View>

        <StatusBadge
          variant={
            association.status === 'Active'
              ? 'success'
              : association.status === 'Pending'
              ? 'warning'
              : association.status === 'Rejected'
              ? 'danger'
              : 'neutral'
          }
          label={association.status === 'Pending' ? 'Awaiting Acceptance' : association.status}
        />
      </View>

      {/* Unit Scope Badge Row */}
      <View className="mt-3 flex-row items-center bg-muted/40 rounded-xl px-3 py-2">
        <Home size={14} className="text-muted-foreground me-2" />
        <Text className="text-xs font-semibold text-foreground flex-1">
          {unitLabel}
        </Text>
        {staff?.department && (
          <View className="ms-2 px-2 py-0.5 rounded-md bg-secondary/20">
            <Text className="text-[10px] font-medium text-secondary-foreground">
              {staff.department}
            </Text>
          </View>
        )}
      </View>

      {/* Schedule / Notes if present */}
      {association.notes ? (
        <Text className="text-xs text-muted-foreground mt-2 px-1" numberOfLines={2}>
          {association.notes}
        </Text>
      ) : null}

      {/* Action Footer */}
      <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-border">
        {staff?.phone ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={handleCall}
            className="flex-row items-center px-2 py-1"
          >
            <Phone size={13} className="text-primary me-1.5" />
            <Text className="text-xs font-medium text-primary">
              {staff.phone}
            </Text>
          </Button>
        ) : (
          <View />
        )}

        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onPress={onRemove}
            className="border-destructive/30 active:bg-destructive/10 px-3 py-1.5"
          >
            <UserMinus size={13} className="text-destructive me-1.5" />
            <Text className="text-xs font-semibold text-destructive">
              Remove
            </Text>
          </Button>
        )}
      </View>
    </View>
  );
};

export default UnitStaffCard;
