import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import {
  Edit2,
  Lock,
  Copy,
  Trash2,
  Shield,
  Building2,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTranslation, i18n } from '@/src/utils/i18n';
import { RoleData } from '../services/roleService';

export interface RoleOverflowMenuProps {
  visible: boolean;
  onClose: () => void;
  role: RoleData | null;
  onEdit: (role: RoleData) => void;
  onManagePermissions?: (role: RoleData) => void;
  onDuplicate?: (role: RoleData) => void;
  onDelete: (role: RoleData) => void;
}

export const RoleOverflowMenu: React.FC<RoleOverflowMenuProps> = ({
  visible,
  onClose,
  role,
  onEdit,
  onManagePermissions,
  onDuplicate,
  onDelete,
}) => {
  const { t } = useTranslation();

  if (!role) return null;

  const isSuperAdmin = role.name === 'Super Admin' || role.name === 'Platform Super Admin';
  const isTenant = !!role.isTenantRole;
  const permissionsCount = Array.isArray(role.permissions) ? role.permissions.length : 0;

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
      title={t('role_actions', 'Role Actions')}
    >
      <View className="py-2 gap-4">
        {/* Role Mini Profile Header */}
        <View className="flex-row items-center p-3 rounded-2xl bg-muted/40 border border-border/60">
          <View className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 items-center justify-center me-3">
            <Shield size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-foreground font-sans" numberOfLines={1}>
                {i18n.tRole(role.name, role.name)}
              </Text>
              <StatusBadge
                label={isTenant ? t('unit_scope', 'UNIT SCOPE') : t('global_role', 'GLOBAL ROLE')}
                variant={isTenant ? 'info' : 'success'}
                className="py-0.5 px-2"
              />
            </View>
            <Text className="text-xs text-muted-foreground font-sans mt-0.5" numberOfLines={2}>
              {role.description || t('no_description_provided', 'No description provided.')}
            </Text>
            <Text className="text-[11px] font-semibold text-primary font-sans mt-1">
              {permissionsCount} {t('permissions', 'Permissions')}
            </Text>
          </View>
        </View>

        {/* Options List */}
        <View className="gap-1.5">
          {/* 1. Edit Role */}
          <TouchableOpacity
            onPress={() => handleAction(() => onEdit(role))}
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 active:bg-secondary/60"
            accessibilityRole="button"
            accessibilityLabel={t('edit_role', 'Edit Role')}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-blue-500/10 items-center justify-center">
                <Edit2 size={16} color="#2563eb" />
              </View>
              <View>
                <Text className="text-xs font-bold text-foreground font-sans">
                  {t('edit_role', 'Edit Role')}
                </Text>
                <Text className="text-[11px] text-muted-foreground font-sans">
                  {t('modify_role_details', 'Update role name, description & scope')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2. Manage Permissions */}
          <TouchableOpacity
            onPress={() =>
              handleAction(() => {
                if (onManagePermissions) {
                  onManagePermissions(role);
                } else {
                  onEdit(role);
                }
              })
            }
            activeOpacity={0.7}
            className="flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 active:bg-secondary/60"
            accessibilityRole="button"
            accessibilityLabel={t('manage_permissions', 'Manage Permissions')}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-indigo-500/10 items-center justify-center">
                <Lock size={16} color="#6366f1" />
              </View>
              <View>
                <Text className="text-xs font-bold text-foreground font-sans">
                  {t('manage_permissions', 'Manage Permissions')}
                </Text>
                <Text className="text-[11px] text-muted-foreground font-sans">
                  {t('customize_feature_grants', 'Configure module access and action policies')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 3. Duplicate Role */}
          {onDuplicate ? (
            <TouchableOpacity
              onPress={() => handleAction(() => onDuplicate(role))}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-card border border-border/70 active:bg-secondary/60"
              accessibilityRole="button"
              accessibilityLabel={t('duplicate_role', 'Duplicate Role')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                  <Copy size={16} color="#10b981" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-foreground font-sans">
                    {t('duplicate_role', 'Duplicate Role')}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground font-sans">
                    {t('clone_role_config', 'Clone permissions into a new role template')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 4. Delete Role */}
          {!isSuperAdmin ? (
            <TouchableOpacity
              onPress={() => handleAction(() => onDelete(role))}
              activeOpacity={0.7}
              className="flex-row items-center justify-between p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 active:bg-rose-100/60"
              accessibilityRole="button"
              accessibilityLabel={t('delete_role', 'Delete Role')}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-lg bg-rose-500/10 items-center justify-center">
                  <Trash2 size={16} color="#ef4444" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-rose-600 dark:text-rose-400 font-sans">
                    {t('delete_role', 'Delete Role')}
                  </Text>
                  <Text className="text-[11px] text-muted-foreground font-sans">
                    {t('permanently_remove_role', 'Permanently remove role from community registry')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
};

export default RoleOverflowMenu;
