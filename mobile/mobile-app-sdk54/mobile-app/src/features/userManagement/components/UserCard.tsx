import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Shield, Phone, Trash2, Key, Send, Home } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { UserData, AssignedUnit } from '../services/userService';

interface UserCardProps {
  user: UserData;
  currentUserId?: string;
  onManageRoles: (user: UserData, unit?: AssignedUnit | null) => void;
  onResendInvite: (user: UserData) => void;
  onDeleteUser: (user: UserData) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  currentUserId,
  onManageRoles,
  onResendInvite,
  onDeleteUser,
}) => {
  const isSelf = user.id === currentUserId || user._id === currentUserId;
  const isPending = user.status === 'Pending' || user.status === 'Pending Verification';
  const displayStatus = isPending ? 'Pending' : user.status || 'Active';

  const mapStatusVariant = (status: string): StatusVariant => {
    if (status === 'Pending' || status === 'Pending Verification') {
      return 'warning';
    }
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

  return (
    <ListCard
      title={user.name}
      subtitle={user.email}
      leftAvatarFallback={getInitials(user.name)}
      status={{ label: displayStatus, variant: mapStatusVariant(user.status) }}
      showChevron={false}
      className="mb-2 p-2.5 bg-card border border-border/70 rounded-xl shadow-xs"
    >
      <View className="mt-0.5">
        {/* Phone & Role Row */}
        <View className="flex-row items-center flex-wrap gap-1 mb-1">
          {user.phone ? (
            <View className="flex-row items-center me-2">
              <Phone size={10} color="#6b7280" className="me-1" />
              <Text className="text-[10px] font-medium text-muted-foreground text-start">
                {user.phone}
              </Text>
            </View>
          ) : null}

          {globalRolesList.length > 0 ? (
            <View className="flex-row items-center flex-wrap gap-1">
              <Shield size={10} color="#6366f1" className="me-0.5" />
              {globalRolesList.map((roleStr, idx) => (
                <View
                  key={idx}
                  className="bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 rounded-full"
                >
                  <Text className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 text-start">
                    {roleStr}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Assigned Villa Units Box */}
        {user.assignedUnits && user.assignedUnits.length > 0 ? (
          <View className="my-1 border-t border-border/40 pt-1">
            {user.assignedUnits.map((unit, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between p-1 bg-muted/40 border border-border/40 rounded-lg mb-1"
              >
                <View className="flex-row items-center flex-1 me-1">
                  <Home size={10} color="#10b981" className="me-1" />
                  <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-start me-1">
                    Unit {unit.villaNumber} {unit.villaBlock ? `(${unit.villaBlock})` : ''}
                  </Text>
                  {unit.residentType && unit.residentType !== 'None' ? (
                    <Text className="text-[9px] text-muted-foreground text-start">
                      • {unit.residentType}
                    </Text>
                  ) : null}
                </View>

                {unit.role ? (
                  <View className="bg-background border border-border/60 px-1 py-0.2 rounded">
                    <Text className="text-[9px] font-medium text-foreground text-start">
                      {unit.role}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Compact Card Action Row */}
        <View className="flex-row items-center justify-end mt-1 pt-1 border-t border-border/40 gap-1.5">
          {isPending ? (
            <TouchableOpacity
              onPress={() => onResendInvite(user)}
              className="flex-row items-center bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={`Resend invite to ${user.name}`}
            >
              <Send size={10} color="#10b981" className="me-1" />
              <Text className="text-[10px] font-bold text-emerald-600">Resend</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => onManageRoles(user)}
            disabled={isSelf}
            className={`flex-row items-center px-2 py-0.5 rounded-md border active:opacity-70 ${
              isSelf
                ? 'bg-muted border-border opacity-40'
                : 'bg-primary/10 border-primary/20'
            }`}
            accessibilityRole="button"
            accessibilityLabel={`Manage roles for ${user.name}`}
          >
            <Key size={10} color={isSelf ? '#9ca3af' : '#6366f1'} className="me-1" />
            <Text className={`text-[10px] font-bold ${isSelf ? 'text-muted-foreground' : 'text-primary'}`}>
              Roles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDeleteUser(user)}
            disabled={isSelf}
            className={`flex-row items-center px-2 py-0.5 rounded-md border active:opacity-70 ${
              isSelf
                ? 'bg-muted border-border opacity-40'
                : 'bg-destructive/10 border-destructive/20'
            }`}
            accessibilityRole="button"
            accessibilityLabel={`Delete user ${user.name}`}
          >
            <Trash2 size={10} color={isSelf ? '#9ca3af' : '#ef4444'} className="me-1" />
            <Text className={`text-[10px] font-bold ${isSelf ? 'text-muted-foreground' : 'text-destructive'}`}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ListCard>
  );
};

export default UserCard;
