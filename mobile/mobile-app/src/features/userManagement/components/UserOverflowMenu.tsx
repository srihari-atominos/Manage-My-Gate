import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import {
  Key,
  Eye,
  Send,
  Power,
  Trash2,
  Shield,
  Home,
  Phone,
  Mail,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { useTranslation, i18n } from '@/src/utils/i18n';
import { UserData } from '../services/userService';

export interface UserOverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  user: UserData | null;
  currentUserId?: string;
  onManageRoles: (user: UserData) => void;
  onViewDetails?: (user: UserData) => void;
  onResendInvite?: (user: UserData) => void;
  onToggleStatus?: (user: UserData) => void;
  onDeleteUser: (user: UserData) => void;
}

export const UserOverflowMenu: React.FC<UserOverflowMenuProps> = ({
  visible,
  onClose,
  user,
  currentUserId,
  onManageRoles,
  onViewDetails,
  onResendInvite,
  onToggleStatus,
  onDeleteUser,
}) => {
  const { t } = useTranslation();

  if (!user) return null;

  const isSelf = user.id === currentUserId || user._id === currentUserId;
  const isPending = user.status === 'Pending' || user.status === 'Pending Verification';
  const isRejected = user.status === 'Rejected';
  const isActive = (user.status || 'Active').toLowerCase() === 'active';

  const mapStatusVariant = (status: string): StatusVariant => {
    if (status === 'Rejected') return 'danger';
    if (status === 'Pending' || status === 'Pending Verification') return 'warning';
    if (status === 'Active') return 'success';
    if (status === 'Inactive') return 'neutral';
    return 'warning';
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleAction = (action: () => void) => {
    onClose();
    setTimeout(() => {
      action();
    }, 150);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('user_actions', 'User Actions')}
    >
      <View className="py-2 gap-4">
        {/* User Mini Profile Header */}
        <View className="flex-row items-center p-3 rounded-2xl bg-muted/40 border border-border/60">
          <View className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center me-3">
            <Text className="text-sm font-bold text-primary font-sans">
              {getInitials(user.name)}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground font-sans" numberOfLines={1}>
                {user.name}
              </Text>
              <StatusBadge
                label={user.status || 'Active'}
                variant={mapStatusVariant(user.status)}
                className="py-0.5 px-2"
              />
            </View>
            <Text className="text-xs text-muted-foreground font-sans" numberOfLines={1}>
              {user.email}
            </Text>
            {user.phone ? (
              <Text className="text-[11px] text-muted-foreground font-sans mt-0.5">
                {user.phone}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Menu Options List */}
        <View className="gap-1.5">
          {/* 1. Manage Roles */}
          <TouchableOpacity
            onPress={() => handleAction(() => onManageRoles(user))}
            disabled={isSelf}
            activeOpacity={0.7}
            className={`flex-row items-center justify-between p-3.5 rounded-xl border border-border/70 ${
              isSelf ? 'opacity-40 bg-muted/20' : 'bg-card active:bg-secondary/60'
            }`}
            accessibilityRole="button"
            accessibilityLabel={t('role_manage_roles', 'Manage Roles')}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-blue-500/10 items-center justify-center">
                <Key size={16} color="#6366f1" />
              </View>
              <View>
                <Text className="text-xs font-bold text-foreground font-sans">
                  {t('role_manage_roles', 'Manage Roles')}
                </Text>
                <Text className="text-[11px] text-muted-foreground font-sans">
                  {t('assign_permissions_and_access', 'Assign roles & community permissions')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2. View Details / Summary */}
          {onViewDetails ? (
            <TouchableOpacity
              onPress={() => handleAction(() => onViewDetails(user))}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 active:bg-secondary/60"
              accessibilityRole="button"
              accessibilityLabel={t('view_details', 'View Details')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-slate-500/10 items-center justify-center">
                  <Eye size={16} color="#64748b" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-foreground font-sans">
                    {t('view_details', 'View Details')}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground font-sans">
                    {t('view_user_account_info', 'View full user and unit information')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 3. Resend Invite (Conditional) */}
          {(isPending || isRejected) && onResendInvite ? (
            <TouchableOpacity
              onPress={() => handleAction(() => onResendInvite(user))}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 active:bg-secondary/60"
              accessibilityRole="button"
              accessibilityLabel={t('resend_invitation', 'Resend Invitation')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                  <Send size={16} color="#10b981" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                    {t('resend_invitation', 'Resend Invitation')}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground font-sans">
                    {t('send_new_invite_email', 'Send a new onboarding invitation token')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 4. Deactivate / Activate (if supported) */}
          {onToggleStatus && !isSelf ? (
            <TouchableOpacity
              onPress={() => handleAction(() => onToggleStatus(user))}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 active:bg-secondary/60"
              accessibilityRole="button"
              accessibilityLabel={isActive ? t('deactivate_user', 'Deactivate User') : t('activate_user', 'Activate User')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-amber-500/10 items-center justify-center">
                  <Power size={16} color="#f59e0b" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-foreground font-sans">
                    {isActive ? t('deactivate_user', 'Deactivate User') : t('activate_user', 'Activate User')}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground font-sans">
                    {isActive
                      ? t('suspend_account_access', 'Temporarily suspend community access')
                      : t('restore_account_access', 'Restore full community access')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 5. Delete User (Destructive) */}
          <TouchableOpacity
            onPress={() => handleAction(() => onDeleteUser(user))}
            disabled={isSelf}
            activeOpacity={0.7}
            className={`flex-row items-center justify-between p-3.5 rounded-xl border ${
              isSelf
                ? 'opacity-40 bg-muted/20 border-border/50'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 active:bg-rose-100/60'
            }`}
            accessibilityRole="button"
            accessibilityLabel={t('delete_user', 'Delete User')}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-rose-500/10 items-center justify-center">
                <Trash2 size={16} color="#ef4444" />
              </View>
              <View>
                <Text className="text-xs font-bold text-rose-600 dark:text-rose-400 font-sans">
                  {t('delete_user', 'Delete User')}
                </Text>
                <Text className="text-[11px] text-muted-foreground font-sans">
                  {t('permanently_remove_account', 'Remove user profile and unit bindings')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

export default UserOverflowMenu;
