import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Shield, Lock, Plug, MoreVertical, Users } from 'lucide-react-native';
import { StatusBadge, StatusVariant } from '@/components/ui/StatusBadge';
import { useTranslation, i18n } from '@/src/utils/i18n';
import { RoleData } from '../services/roleService';
import { RoleOverflowMenu } from './RoleOverflowMenu';

export interface RoleCardProps {
  role: RoleData;
  onEdit: (role: RoleData) => void;
  onDelete: (role: RoleData) => void;
  onOpenMenu?: (role: RoleData) => void;
  onManagePermissions?: (role: RoleData) => void;
  onDuplicate?: (role: RoleData) => void;
  className?: string;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  onEdit,
  onDelete,
  onOpenMenu,
  onManagePermissions,
  onDuplicate,
  className = '',
}) => {
  const { t } = useTranslation();
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);

  const permissionsCount = Array.isArray(role?.permissions) ? role.permissions.length : 0;
  const isTenant = !!role?.isTenantRole;
  const mappingsCount = role?.integrationMappings ? Object.keys(role.integrationMappings).length : 0;
  const usersCount = (role as any)?.usersCount ?? (role as any)?.userCount;

  const getStatusVariant = (): StatusVariant => {
    return isTenant ? 'info' : 'success';
  };

  const getInitials = (name: string) => {
    if (!name) return 'RL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleMenuPress = () => {
    if (onOpenMenu) {
      onOpenMenu(role);
    } else {
      setInternalMenuOpen(true);
    }
  };

  return (
    <>
      <View
        className={`mb-3 p-3.5 bg-card border border-border/80 rounded-2xl shadow-2xs ${className}`}
      >
        {/* Top Header: Avatar + Title & Description (Left) and Scope Badge + Overflow Menu (Right) */}
        <View className="flex-row items-start justify-between">
          {/* Left: Avatar + Title + Description */}
          <View className="flex-row items-start flex-1 me-2">
            {/* Circular Avatar */}
            <View className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 items-center justify-center me-3 shrink-0 mt-0.5">
              <Text className="text-xs font-bold text-primary font-sans">
                {getInitials(role?.name)}
              </Text>
            </View>

            {/* Title & Description */}
            <View className="flex-1">
              <Text
                className="text-[14px] font-bold text-foreground font-sans tracking-tight"
                numberOfLines={1}
              >
                {i18n.tRole(role?.name, role?.name || t('unnamed_role', 'Unnamed Role'))}
              </Text>

              <Text
                className="text-xs text-muted-foreground font-sans mt-0.5"
                numberOfLines={2}
              >
                {role?.description || t('no_description_provided', 'No description provided.')}
              </Text>
            </View>
          </View>

          {/* Right: Scope Badge & Single ⋯ Overflow Menu */}
          <View className="flex-row items-center gap-2 shrink-0">
            <StatusBadge
              label={isTenant ? t('unit_scope', 'UNIT SCOPE') : t('global_role', 'GLOBAL ROLE')}
              variant={getStatusVariant()}
              className="py-0.5 px-2"
            />

            <TouchableOpacity
              onPress={handleMenuPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-8 h-8 rounded-full items-center justify-center bg-secondary/80 border border-border/60 active:bg-secondary"
              accessibilityRole="button"
              accessibilityLabel={`More options for ${role?.name}`}
            >
              <MoreVertical size={16} className="text-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Section: Permissions & Metadata Badges */}
        <View className="mt-3 pt-2.5 border-t border-border/50 flex-row items-center justify-between flex-wrap gap-2">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            {/* Permissions Badge */}
            <View className="flex-row items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <Lock size={10} className="text-primary" />
              <Text className="text-[10px] font-bold text-primary font-sans">
                {permissionsCount} {permissionsCount === 1 ? t('permission_singular', 'Permission') : t('permissions_plural', 'Permissions')}
              </Text>
            </View>

            {/* Integrations Badge */}
            {mappingsCount > 0 ? (
              <View className="flex-row items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <Plug size={10} color="#10b981" />
                <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                  {mappingsCount} {mappingsCount === 1 ? t('integration_singular', 'Integration') : t('integrations_plural', 'Integrations')}
                </Text>
              </View>
            ) : null}

            {/* Users Count Badge (if available) */}
            {typeof usersCount === 'number' ? (
              <View className="flex-row items-center gap-1 bg-muted/60 border border-border/60 px-2 py-0.5 rounded-full">
                <Users size={10} className="text-muted-foreground" />
                <Text className="text-[10px] font-semibold text-muted-foreground font-sans">
                  {usersCount} {usersCount === 1 ? t('user_singular', 'User') : t('users_plural', 'Users')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Internal Fallback Overflow Menu */}
      {!onOpenMenu && (
        <RoleOverflowMenu
          visible={internalMenuOpen}
          onClose={() => setInternalMenuOpen(false)}
          role={role}
          onEdit={onEdit}
          onManagePermissions={onManagePermissions}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
    </>
  );
};

export default RoleCard;
