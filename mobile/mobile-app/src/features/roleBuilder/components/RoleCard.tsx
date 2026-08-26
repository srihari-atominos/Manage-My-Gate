import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ShieldCheck, Building2, Edit2, Trash2, Lock, Plug } from 'lucide-react-native';
import { ListCard } from '@/components/ui/ListCard';
import { StatusVariant } from '@/components/ui/StatusBadge';
import { RoleData } from '../services/roleService';

interface RoleCardProps {
  role: RoleData;
  onEdit: (role: RoleData) => void;
  onDelete: (role: RoleData) => void;
  className?: string;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  onEdit,
  onDelete,
  className = '',
}) => {
  const isSuperAdmin = role?.name === 'Super Admin' || role?.name === 'Platform Super Admin';
  const permissionsCount = Array.isArray(role?.permissions) ? role.permissions.length : 0;
  const isTenant = !!role?.isTenantRole;
  const mappingsCount = role?.integrationMappings ? Object.keys(role.integrationMappings).length : 0;

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

  return (
    <ListCard
      title={role?.name || 'Unnamed Role'}
      subtitle={role?.description || 'No description provided.'}
      leftAvatarFallback={getInitials(role?.name)}
      status={{
        label: isTenant ? 'UNIT SCOPE' : 'GLOBAL ROLE',
        variant: getStatusVariant(),
      }}
      showChevron={false}
      className={`mb-2 p-2.5 bg-card border border-border/70 rounded-xl shadow-xs ${className}`}
    >
      <View className="mt-1 pt-2 border-t border-border/40 flex-row items-center justify-between">
        {/* Metadata Pills Row (User Management Pattern) */}
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <View className="flex-row items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
            <Lock size={10} color="#6366f1" />
            <Text className="text-[10px] font-bold text-primary">
              {permissionsCount} {permissionsCount === 1 ? 'Perm' : 'Perms'}
            </Text>
          </View>

          {mappingsCount > 0 ? (
            <View className="flex-row items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <Plug size={10} color="#10b981" />
              <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {mappingsCount} {mappingsCount === 1 ? 'Integration' : 'Integrations'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action Controls Row */}
        <View className="flex-row items-center gap-1.5">
          <TouchableOpacity
            onPress={() => onEdit(role)}
            activeOpacity={0.7}
            className="w-7 h-7 rounded-lg bg-muted/80 items-center justify-center border border-border/60"
            accessibilityRole="button"
            accessibilityLabel="Edit Role"
          >
            <Edit2 size={13} color="#6b7280" />
          </TouchableOpacity>

          {!isSuperAdmin ? (
            <TouchableOpacity
              onPress={() => onDelete(role)}
              activeOpacity={0.7}
              className="w-7 h-7 rounded-lg bg-destructive/10 items-center justify-center border border-destructive/20"
              accessibilityRole="button"
              accessibilityLabel="Delete Role"
            >
              <Trash2 size={13} color="#ef4444" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </ListCard>
  );
};

export default RoleCard;
