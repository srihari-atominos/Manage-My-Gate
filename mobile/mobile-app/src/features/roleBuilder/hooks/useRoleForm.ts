import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ROLE_SCOPE_VALUES, RoleScope, getRoleScopeOption, isTenantScope } from '../roleScopes';

export type AmenityTier = 'resident' | 'security_guard' | 'admin' | 'none';

export const AMENITY_V2_TIER_PERMISSIONS: Record<AmenityTier, string[]> = {
  resident: ['amenities:discover', 'amenities:my_booking', 'amenities:wallet'],
  security_guard: ['amenities:scanner', 'amenities:security_logs'],
  admin: ['amenities:amenities', 'amenities:admin_calander', 'amenities:maintenance', 'amenities:settings', 'amenities:dashboard', 'amenities:ledgers'],
  none: [],
};

const allAmenityTierPermissions = new Set(Object.values(AMENITY_V2_TIER_PERMISSIONS).flat());

export const detectInitialAmenityTier = (permissions: string[] = []): AmenityTier => {
  const amenityPermissions = permissions.filter((permission) => allAmenityTierPermissions.has(permission));
  for (const [tier, tierPermissions] of Object.entries(AMENITY_V2_TIER_PERMISSIONS)) {
    if (tier !== 'none' && amenityPermissions.length === tierPermissions.length && tierPermissions.every((permission) => amenityPermissions.includes(permission))) {
      return tier as AmenityTier;
    }
  }
  return 'none';
};

const schema = yup.object().shape({
  name: yup.string().trim().required('Role name is required').max(50, 'Role name cannot exceed 50 characters'),
  description: yup.string().trim().max(200, 'Description cannot exceed 200 characters').optional(),
  isTenantRole: yup.boolean().optional().default(false),
  roleScope: yup.string().oneOf(ROLE_SCOPE_VALUES).optional().default('GLOBAL'),
  communityOnly: yup.boolean().optional().default(false),
  permissions: yup.array().of(yup.string().required()).required('Permissions array is required'),
  integrationMappings: yup.object().optional().default({}),
});

interface RoleData {
  name: string;
  description?: string;
  isTenantRole?: boolean;
  roleScope?: RoleScope;
  communityOnly?: boolean;
  permissions?: string[];
  integrationMappings?: Record<string, string>;
}

interface UseRoleFormProps {
  role?: RoleData | null;
  visible: boolean;
  onSave: (data: RoleData) => Promise<any>;
  allowedPermissions?: string[];
}

export const useRoleForm = ({ role, visible, onSave, allowedPermissions = [] }: UseRoleFormProps) => {
  const [isIntegrationDrawerOpen, setIsIntegrationDrawerOpen] = useState(false);
  const [activeRoleScope, setActiveRoleScope] = useState<RoleScope>('GLOBAL');
  const [amenityTier, setAmenityTier] = useState<AmenityTier>('none');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RoleData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      name: '',
      description: '',
      isTenantRole: false,
      roleScope: 'GLOBAL',
      communityOnly: false,
      permissions: [],
      integrationMappings: {},
    },
  });

  const selectedPermissions = watch('permissions') || [];
  const isTenantRole = watch('isTenantRole') || false;
  const integrationMappings = watch('integrationMappings') || {};

  useEffect(() => {
    register('permissions');
    register('integrationMappings');
    register('roleScope');
    register('isTenantRole');
    register('communityOnly');

    if (visible && role) {
      const derivedScope = (role.roleScope || (role.isTenantRole ? 'UNIT' : 'GLOBAL')) as RoleScope;
      setActiveRoleScope(derivedScope);
      setAmenityTier(detectInitialAmenityTier(role.permissions || []));
      reset({
        name: role.name || '',
        description: role.description || '',
        isTenantRole: isTenantScope(derivedScope),
        roleScope: derivedScope,
        communityOnly: derivedScope === 'COMMUNITY_STAFF' && role.communityOnly === true,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      });
    } else if (visible && !role) {
      setActiveRoleScope('GLOBAL');
      setAmenityTier('none');
      reset({
        name: '',
        description: '',
        isTenantRole: false,
        roleScope: 'GLOBAL',
        communityOnly: false,
        permissions: [],
        integrationMappings: {},
      });
    } else if (!visible) {
      setActiveRoleScope('GLOBAL');
      setAmenityTier('none');
      reset({
        name: '',
        description: '',
        isTenantRole: false,
        roleScope: 'GLOBAL',
        communityOnly: false,
        permissions: [],
        integrationMappings: {},
      });
      setIsIntegrationDrawerOpen(false);
    }
  }, [role, visible, reset, register]);

  const handleSelectScope = (scope: RoleScope) => {
    setActiveRoleScope(scope);
    setValue('roleScope', scope, { shouldValidate: true, shouldDirty: true });
    setValue('isTenantRole', isTenantScope(scope), { shouldValidate: true, shouldDirty: true });
    if (scope !== 'COMMUNITY_STAFF') setValue('communityOnly', false, { shouldValidate: true, shouldDirty: true });
    const defaultPerms = getRoleScopeOption(scope)?.defaultPermissions;
    if (defaultPerms) {
      // A scope is metadata. Do not silently add default permissions that the
      // editor is not authorized to delegate, because that makes Save appear
      // unresponsive after a scope change.
      const normalizePermission = (value: unknown) => String(value || '').trim().replace(':', '.').toLowerCase();
      const currentPermissions = getValues('permissions') || [];
      const held = new Set(allowedPermissions.map(normalizePermission));
      const existing = new Set(currentPermissions.map(normalizePermission));
      const canGrantAnything = held.has('*');
      const grantableDefaults = defaultPerms.filter((permission) =>
        canGrantAnything || existing.has(normalizePermission(permission)) || held.has(normalizePermission(permission))
      );
      const merged = Array.from(new Set([...currentPermissions, ...grantableDefaults]));
      setValue('permissions', merged, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleSelectAllGroup = (groupCodes: string[], checked: boolean) => {
    const currentPermissions = getValues('permissions') || [];

    // Expand any virtual full_access or staff codes into their real backend permissions
    const expandedGroupCodes = groupCodes.flatMap(code => {
      if (String(code).endsWith(':full_access')) {
        const category = code.split(':')[0];
        return [`${category}:create`, `${category}:read`, `${category}:update`, `${category}:delete`, `${category}:manage`, `${category}:super_admin`];
      }
      if (code === 'staff:directory') {
        return ['staff:view', 'staff:manage', 'staff:directory'];
      }
      if (code === 'staff:portal') {
        return ['staff:view_own', 'staff:portal'];
      }
      if (code === 'notices:active_board') return ['notices:active_board', 'notices:read'];
      if (code === 'notices:polls') return ['notices:polls', 'polls:read', 'polls:vote'];
      if (code === 'notices:manage_notices') {
        return ['notices:manage_notices', 'notices:dashboard', 'notices:create', 'notices:update', 'notices:delete', 'notices:publish', 'polls:create', 'polls:update', 'polls:delete', 'polls:publish', 'polls:close'];
      }
      return code;
    });

    let newValue: string[];

    if (checked) {
      newValue = Array.from(new Set([...currentPermissions, ...expandedGroupCodes]));
    } else {
      const toRemove = new Set(expandedGroupCodes);
      newValue = currentPermissions.filter((code) => !toRemove.has(code));
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true });
  };

  const handleTogglePermission = (permValue: string, checked: boolean) => {
    const currentPermissions = getValues('permissions') || [];
    if (permValue.startsWith('amenities_tier:')) {
      const requestedTier = permValue.slice('amenities_tier:'.length) as AmenityTier;
      if (!(requestedTier in AMENITY_V2_TIER_PERMISSIONS)) return;
      const preservedPermissions = currentPermissions.filter((permission) => !allAmenityTierPermissions.has(permission));
      const nextTier: AmenityTier = checked ? requestedTier : 'none';
      setAmenityTier(nextTier);
      setValue('permissions', [...preservedPermissions, ...AMENITY_V2_TIER_PERMISSIONS[nextTier]], { shouldDirty: true, shouldValidate: true });
      return;
    }

    let newValue: string[];

    if (String(permValue).endsWith(':full_access')) {
      const category = permValue.split(':')[0];
      const adminActions = ['create', 'read', 'update', 'delete', 'manage', 'super_admin'];
      const permsToToggle = adminActions.map(a => `${category}:${a}`);

      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...permsToToggle]));
      } else {
        const toRemove = new Set(permsToToggle);
        newValue = currentPermissions.filter((p) => !toRemove.has(p) && !String(p).startsWith(`${category}:`));
      }
    } else if (permValue === 'staff:directory') {
      const targetCodes = ['staff:view', 'staff:manage', 'staff:directory'];
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]));
      } else {
        const toRemove = new Set(targetCodes);
        newValue = currentPermissions.filter((p) => !toRemove.has(p));
      }
    } else if (permValue === 'staff:portal') {
      const targetCodes = ['staff:view_own', 'staff:portal'];
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]));
      } else {
        const toRemove = new Set(targetCodes);
        newValue = currentPermissions.filter((p) => !toRemove.has(p));
      }
    } else if (checked) {
      newValue = Array.from(new Set([...currentPermissions, permValue]));
    } else {
      newValue = currentPermissions.filter((p) => p !== permValue);
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true });
  };

  const handleApplyIntegrationMappings = (mappings: Record<string, string>) => {
    setValue('integrationMappings', mappings, { shouldDirty: true, shouldValidate: true });
  };

  const toggleIntegrationDrawer = () => {
    setIsIntegrationDrawerOpen((prev) => !prev);
  };

  const onSubmit = async (data: RoleData) => {
    const name = String(data.name || '').trim();
    if (!name) {
      setError('name', { type: 'manual', message: 'Role name is required.' });
      return;
    }

    const finalData = {
      ...data,
      name,
      roleScope: activeRoleScope,
      communityOnly: activeRoleScope === 'COMMUNITY_STAFF' && getValues('communityOnly') === true,
      isTenantRole: isTenantScope(activeRoleScope),
      permissions: getValues('permissions') || [],
      integrationMappings: getValues('integrationMappings') || {},
    };

    // Authorization is evaluated by the API from the active community role.
    // Do not block a save with cached mobile permissions: they can be stale
    // immediately after a Platform/Community Admin changes role grants.
    // The backend remains the authoritative delegation check.

    await onSave(finalData);
  };

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    control,
    isSubmitting,
    selectedPermissions,
    isTenantRole,
    amenityTier,
    roleScope: activeRoleScope,
    communityOnly: watch('communityOnly') || false,
    handleSelectScope,
    integrationMappings,
    isIntegrationDrawerOpen,
    toggleIntegrationDrawer,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission,
    handleApplyIntegrationMappings,
  };
};

export default useRoleForm;
