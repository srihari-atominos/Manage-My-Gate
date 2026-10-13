import React, { useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheet } from '../../../../components/ui/BottomSheet';
import { Button } from '../../../../components/ui/button';
import { Icon } from '../../../../components/ui/icon';
import { TextInput } from '../../../../components/forms/TextInput';
import { Checkbox } from '../../../../components/forms/Checkbox';
import { ChevronDown, ChevronUp, Plug } from 'lucide-react-native';
import { RoleData } from '../services/roleService';
import { useRoleForm } from '../hooks/useRoleForm';
import PermissionMatrixGrid from './PermissionMatrixGrid';
import RoleIntegrationConfigurator from './RoleIntegrationConfigurator';
import { AppLoader } from '@/components/ui/AppLoader';

interface RoleFormSheetModalProps {
  visible: boolean;
  role: RoleData | null;
  permissionsList: any;
  isPermissionsLoading: boolean;
  onClose: () => void;
  onSave: (data: RoleData) => Promise<any>;
  onLoadPermissions: () => void;
}

export const RoleFormSheetModal: React.FC<RoleFormSheetModalProps> = ({
  visible,
  role,
  permissionsList,
  isPermissionsLoading,
  onClose,
  onSave,
  onLoadPermissions,
}) => {
  const {
    handleSubmit,
    errors,
    isSubmitting,
    selectedPermissions,
    isTenantRole,
    roleScope,
    handleSelectScope,
    integrationMappings,
    isIntegrationDrawerOpen,
    toggleIntegrationDrawer,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission,
    handleApplyIntegrationMappings,
  } = useRoleForm({ role, visible, onSave });

  useEffect(() => {
    if (visible) {
      onLoadPermissions();
    }
  }, [visible, onLoadPermissions]);

  const mappedCount = Object.keys(integrationMappings || {}).length;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={role ? `Edit ${role.name}` : 'New Security Role'}
      footer={
        <View className="flex-row gap-3 pt-1">
          <Button
            variant="outline"
            onPress={onClose}
            className="flex-1 h-12 rounded-xl border border-border bg-background"
            disabled={isSubmitting}
          >
            <Text className="text-sm font-bold text-foreground">Cancel</Text>
          </Button>
          <Button
            variant="default"
            onPress={handleSubmit}
            className="flex-1 h-12 rounded-xl bg-primary shadow-sm shadow-orange-500/20"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            <Text className="text-sm font-bold text-white">Save Changes</Text>
          </Button>
        </View>
      }
    >
      <View className="gap-3.5 pb-6">
        {/* Role Name */}
          <TextInput
            label="Role Name"
            placeholder="e.g. Branch Manager"
            defaultValue={role?.name || ''}
            error={errors.name?.message}
            onChangeText={(text) => setValue('name', text, { shouldValidate: true })}
          />

          {/* Description */}
          <TextInput
            label="Description"
            placeholder="Enter role description..."
            multiline
            numberOfLines={2}
            defaultValue={role?.description || ''}
            error={errors.description?.message}
            onChangeText={(text) => setValue('description', text, { shouldValidate: true })}
          />

          {/* Scope Archetype Selector: Global vs Unit vs Staff */}
          <View className="bg-card border border-border/80 rounded-2xl p-3 shadow-xs">
            <Text className="text-xs font-bold text-foreground mb-1">Role Scope & Tenancy Archetype</Text>
            <Text className="text-[11px] text-muted-foreground mb-2.5">
              Choose how this role behaves across community facilities and residential units:
            </Text>

            <View className="gap-2">
              {/* Option 1: Global Role */}
              <Pressable
                onPress={() => handleSelectScope('GLOBAL')}
                accessibilityRole="radio"
                accessibilityState={{ selected: roleScope === 'GLOBAL' }}
                className={`p-2.5 rounded-xl border flex-row items-center justify-between cursor-pointer ${
                  roleScope === 'GLOBAL'
                    ? 'bg-blue-500/10 border-blue-500'
                    : 'bg-muted/20 border-border/60 active:bg-muted/40'
                }`}
              >
                <View className="flex-1 me-2 pointer-events-none">
                  <View className="flex-row items-center gap-1.5">
                    <Text className={`text-xs font-bold ${roleScope === 'GLOBAL' ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                      Global Scope
                    </Text>
                    <View className="bg-blue-500/15 px-1.5 py-0.2 rounded-md">
                      <Text className="text-[9px] font-bold text-blue-600 dark:text-blue-400">COMMUNITY</Text>
                    </View>
                  </View>
                  <Text className="text-[10px] text-muted-foreground mt-0.5">
                    Community-wide facility & management access. Unrestricted to any single unit.
                  </Text>
                </View>
                <View className={`w-4 h-4 rounded-full border items-center justify-center pointer-events-none ${roleScope === 'GLOBAL' ? 'border-blue-600 bg-blue-600' : 'border-muted-foreground/40'}`}>
                  {roleScope === 'GLOBAL' ? <View className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
                </View>
              </Pressable>

              {/* Option 2: Unit Scope */}
              <Pressable
                onPress={() => handleSelectScope('UNIT')}
                accessibilityRole="radio"
                accessibilityState={{ selected: roleScope === 'UNIT' }}
                className={`p-2.5 rounded-xl border flex-row items-center justify-between cursor-pointer ${
                  roleScope === 'UNIT'
                    ? 'bg-emerald-500/10 border-emerald-500'
                    : 'bg-muted/20 border-border/60 active:bg-muted/40'
                }`}
              >
                <View className="flex-1 me-2 pointer-events-none">
                  <View className="flex-row items-center gap-1.5">
                    <Text className={`text-xs font-bold ${roleScope === 'UNIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                      Unit Scope
                    </Text>
                    <View className="bg-emerald-500/15 px-1.5 py-0.2 rounded-md">
                      <Text className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">RESIDENTIAL</Text>
                    </View>
                  </View>
                  <Text className="text-[10px] text-muted-foreground mt-0.5">
                    Bound to specific villas/apartments when onboarding residents.
                  </Text>
                </View>
                <View className={`w-4 h-4 rounded-full border items-center justify-center pointer-events-none ${roleScope === 'UNIT' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'}`}>
                  {roleScope === 'UNIT' ? <View className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
                </View>
              </Pressable>

              {/* Option 3: Staff Member (Dual Scope: Global & Unit Access) */}
              <Pressable
                onPress={() => handleSelectScope('STAFF')}
                accessibilityRole="radio"
                accessibilityState={{ selected: roleScope === 'STAFF' }}
                className={`p-2.5 rounded-xl border flex-row items-center justify-between cursor-pointer ${
                  roleScope === 'STAFF'
                    ? 'bg-amber-500/10 border-amber-500'
                    : 'bg-muted/20 border-border/60 active:bg-muted/40'
                }`}
              >
                <View className="flex-1 me-2 pointer-events-none">
                  <View className="flex-row items-center gap-1.5">
                    <Text className={`text-xs font-bold ${roleScope === 'STAFF' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                      Staff Member
                    </Text>
                    <View className="bg-amber-500/15 px-1.5 py-0.2 rounded-md">
                      <Text className="text-[9px] font-bold text-amber-600 dark:text-amber-400">DUAL: GLOBAL & UNIT</Text>
                    </View>
                  </View>
                  <Text className="text-[10px] text-muted-foreground mt-0.5">
                    Acts across community facilities and can be linked to specific units. Auto-syncs to Staff Management.
                  </Text>
                </View>
                <View className={`w-4 h-4 rounded-full border items-center justify-center pointer-events-none ${roleScope === 'STAFF' ? 'border-amber-600 bg-amber-600' : 'border-muted-foreground/40'}`}>
                  {roleScope === 'STAFF' ? <View className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
                </View>
              </Pressable>
            </View>
          </View>

          {/* Integration Hub Drawer Card */}
          <View className="border border-border/80 rounded-2xl bg-card p-3 shadow-xs">
            <TouchableOpacity
              onPress={toggleIntegrationDrawer}
              activeOpacity={0.7}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2.5">
                <View className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                  <Icon as={Plug} size={16} className="text-primary" />
                </View>
                <View>
                  <Text className="text-xs font-bold text-foreground">
                    Integration Hub Connections
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">
                    Bind provider credentials (SMTP, Twilio, Razorpay)
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <View className="px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30">
                  <Text className="text-[10px] font-bold text-primary">
                    {mappedCount} Mapped
                  </Text>
                </View>
                {isIntegrationDrawerOpen ? (
                  <Icon as={ChevronUp} size={16} className="text-muted-foreground" />
                ) : (
                  <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
                )}
              </View>
            </TouchableOpacity>

            {/* Embedded Integration Configurator */}
            {isIntegrationDrawerOpen && (
              <RoleIntegrationConfigurator
                isOpen={isIntegrationDrawerOpen}
                onClose={toggleIntegrationDrawer}
                mappings={integrationMappings}
                onApply={handleApplyIntegrationMappings}
              />
            )}
          </View>

          {/* Granular Permissions Section */}
          <View className="mt-1">
            {isPermissionsLoading ? (
              <View className="py-6 items-center justify-center bg-card rounded-2xl border border-border">
                <AppLoader variant="inline" />
                <Text className="text-xs text-muted-foreground mt-2">Loading permissions matrix...</Text>
              </View>
            ) : (
              <PermissionMatrixGrid
                groupedPermissions={permissionsList}
                selectedIds={selectedPermissions}
                onSelectAllGroup={handleSelectAllGroup}
                onTogglePermission={handleTogglePermission}
              />
            )}
          </View>





        </View>
    </BottomSheet>
  );
};

export default RoleFormSheetModal;
