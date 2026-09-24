import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { Shield, Phone, Home, MoreVertical } from 'lucide-react-native';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { useTranslation, i18n } from '@/src/utils/i18n';
import { UserData, AssignedUnit } from '../services/userService';
import { UserOverflowMenu } from './UserOverflowMenu';

export interface UserCardProps {
  user: UserData;
  currentUserId?: string;
  onManageRoles: (user: UserData, unit?: AssignedUnit | null) => void;
  onResendInvite?: (user: UserData) => void;
  onDeleteUser: (user: UserData) => void;
  onOpenMenu?: (user: UserData) => void;
  onViewDetails?: (user: UserData) => void;
  onToggleStatus?: (user: UserData) => void;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUserId,
  onManageRoles,
  onResendInvite,
  onDeleteUser,
  onOpenMenu,
  onViewDetails,
  onToggleStatus,
  className = '',
}) => {
  const { t } = useTranslation();
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const isPending = user.status === 'Pending' || user.status === 'Pending Verification';
  const isRejected = user.status === 'Rejected';
  const displayStatus = isRejected ? 'Rejected' : isPending ? 'Pending' : user.status || 'Active';

  const mapStatusVariant = (status: string): StatusVariant => {
    if (status === 'Rejected') return 'danger';
    if (status === 'Pending' || status === 'Pending Verification') return 'warning';
    switch (status) {
      case 'Active':
        return 'success';
      case 'Inactive':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const globalRolesList = typeof user.role === 'string'
    ? user.role.split(',').map((r) => r.trim()).filter(Boolean)
    : Array.isArray(user.role)
    ? user.role
    : [];

  const handleMenuPress = () => {
    if (onOpenMenu) {
      onOpenMenu(user);
    } else {
      setInternalMenuOpen(true);
    }
  };

  return (
    <>
      <View
        className={`mb-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-2xs ${className}`}
      >
        {/* Top Section: Avatar + Details (Left) and Status + Menu Button (Right) */}
        <View className="flex-row items-start justify-between">
          {/* Left: Avatar + Identity */}
          <View className="flex-row items-start flex-1 me-2">
            {/* Circular Avatar */}
            <View className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 items-center justify-center me-3 shrink-0 mt-0.5">
              <Text className="text-xs font-bold text-primary font-sans">
                {getInitials(user.name)}
              </Text>
            </View>

            {/* Name, Email, Phone, Role */}
            <View className="flex-1">
              <Text
                className="text-[14px] font-bold text-foreground font-sans tracking-tight"
                numberOfLines={1}
              >
                {user.name}
              </Text>

              <Text
                className="text-xs text-muted-foreground font-sans mt-0.5"
                numberOfLines={1}
              >
                {user.email}
              </Text>

              {/* Phone & Role Row */}
              <View className="flex-row items-center flex-wrap gap-1.5 mt-1.5">
                {user.phone ? (
                  <View className="flex-row items-center me-1.5">
                    <Phone size={11} className="text-muted-foreground me-1" />
                    <Text className="text-[11px] font-medium text-muted-foreground font-sans">
                      {user.phone}
                    </Text>
                  </View>
                ) : null}

                {globalRolesList.map((roleStr, idx) => (
                  <View
                    key={idx}
                    className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex-row items-center gap-1"
                  >
                    <Shield size={10} className="text-primary" />
                    <Text className="text-[10px] font-bold text-primary font-sans">
                      {i18n.tRole(roleStr)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Right: Status Badge & Overflow Menu Button */}
          <View className="flex-row items-center gap-2 shrink-0">
            <StatusBadge
              label={displayStatus}
              variant={mapStatusVariant(user.status)}
              className="py-0.5 px-2"
            />

            <TouchableOpacity
              onPress={handleMenuPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full items-center justify-center bg-secondary/80 border border-border/60 active:bg-secondary"
              accessibilityRole="button"
              accessibilityLabel={`More options for ${user.name}`}
            >
              <MoreVertical size={16} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Section: Assigned Villa Units Box (Subtle Tinted Background) */}
        {user.assignedUnits && user.assignedUnits.length > 0 ? (
          <View className="mt-2.5 pt-2.5 border-t border-border/50 gap-1.5">
            {user.assignedUnits.map((unit, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between p-2 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/15"
              >
                <View className="flex-row items-center flex-1 me-2">
                  <Home size={12} color="#10b981" className="me-1.5 shrink-0" />
                  <Text className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-sans me-1.5">
                    {t('unit_label', 'Unit')} {unit.villaNumber} {unit.villaBlock ? `(${unit.villaBlock})` : ''}
                  </Text>
                  {unit.residentType && unit.residentType !== 'None' ? (
                    <Text className="text-[10px] text-muted-foreground font-sans">
                      | {i18n.tRole(unit.residentType)}
                    </Text>
                  ) : null}
                </View>

                {unit.role ? (
                  <View className="bg-card border border-border/60 px-1.5 py-0.5 rounded-md">
                    <Text className="text-[9px] font-semibold text-foreground font-sans">
                      {i18n.tRole(unit.role)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Internal Overflow Menu fallback if not controlled externally */}
      {!onOpenMenu && (
        <UserOverflowMenu
          visible={internalMenuOpen}
          onClose={() => setInternalMenuOpen(false)}
          user={user}
          currentUserId={currentUserId}
          onManageRoles={(u) => onManageRoles(u)}
          onViewDetails={onViewDetails}
          onResendInvite={onResendInvite}
          onToggleStatus={onToggleStatus}
          onDeleteUser={onDeleteUser}
        />
      )}
    </>
  );
};

export default UserCard;
