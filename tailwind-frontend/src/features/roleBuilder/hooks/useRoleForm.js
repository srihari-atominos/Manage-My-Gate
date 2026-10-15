import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ROLE_SCOPE_VALUES, getRoleScopeOption, isTenantScope } from '../roleScopes'
import { syncRolePermissionsAsync } from '../store/roleSlice'

const schema = yup.object().shape({
  name: yup.string().trim().required('Role name is required'),
  description: yup.string().trim().optional(),
  isTenantRole: yup.boolean().optional().default(false),
  roleScope: yup.string().oneOf(ROLE_SCOPE_VALUES).optional().default('GLOBAL'),
  permissions: yup.array().of(yup.string().required()).required('Permissions array is required'),
  integrationMappings: yup.object().optional().default({}),
})

export const NOTICE_ACTION_GROUPS = {
  'notices:manage_notices': [
    'notices:manage_notices',
    'notices:dashboard',
    'notices:create',
    'notices:update',
    'notices:delete',
    'notices:publish',
    'notices:acknowledge',
    'notices.manage_notices',
    'notices.dashboard',
    'notices.create',
    'notices.update',
    'notices.delete',
    'notices.publish',
    'notices.acknowledge',
    'manage_notices',
    'dashboard',
    'create',
    'update',
    'delete',
    'publish',
    'acknowledge',
  ],
  'notices:active_board': [
    'notices:active_board',
    'notices:read',
    'notices.active_board',
    'notices.read',
    'active_board',
    'read',
  ],
  'notices:polls': [
    'notices:polls',
    'notices.polls',
    'polls',
  ],
};

export const ALL_NOTICE_ACTIONS = [
  ...NOTICE_ACTION_GROUPS['notices:manage_notices'],
  ...NOTICE_ACTION_GROUPS['notices:active_board'],
  ...NOTICE_ACTION_GROUPS['notices:polls'],
];

export const useRoleForm = ({ role, visible, onSave }) => {
  const dispatch = useDispatch()

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      isTenantRole: false,
      roleScope: 'GLOBAL',
      permissions: [],
      integrationMappings: {},
    },
  })

  const selectedPermissions = watch('permissions') || []
  const isTenantRole = watch('isTenantRole') || false
  const roleScope = watch('roleScope') || (isTenantRole ? 'UNIT' : 'GLOBAL')
  const integrationMappings = watch('integrationMappings') || {}
  const activeMappingsCount = Object.keys(integrationMappings).length

  useEffect(() => {
    register('roleScope')
    if (visible && role) {
      const derivedScope = role.roleScope || (role.isTenantRole ? 'UNIT' : 'GLOBAL')
      reset({
        name: role.name || '',
        description: role.description || '',
        isTenantRole: isTenantScope(derivedScope),
        roleScope: derivedScope,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      })
    } else if (!visible) {
      reset({
        name: '',
        description: '',
        isTenantRole: false,
        roleScope: 'GLOBAL',
        permissions: [],
        integrationMappings: {},
      })
    }
  }, [role, visible, reset, register])

  const handleSelectAllGroup = (groupCodes, checked) => {
    let newValue
    if (checked) {
      let filteredGroupCodes = [...groupCodes]
      const visitorCodes = groupCodes.filter((code) => code.startsWith('visitor:'))
      if (visitorCodes.length > 1) {
        filteredGroupCodes = groupCodes.filter((code) => !code.startsWith('visitor:') || code === visitorCodes[0])
      }
      newValue = Array.from(new Set([...selectedPermissions, ...filteredGroupCodes]))
    } else {
      let toRemove = new Set(groupCodes)
      const hasNoticeCodes = groupCodes.some((c) => String(c).toLowerCase().startsWith('notices'))
      if (hasNoticeCodes) {
        ALL_NOTICE_ACTIONS.forEach((a) => toRemove.add(a))
      }
      newValue = selectedPermissions.filter((code) => !toRemove.has(code))
    }
    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const handleTogglePermission = (permValue, checked) => {
    let newValue
    if (checked) {
      newValue = [...selectedPermissions, permValue]
      // Enforce mutual exclusivity for visitor context permissions (single select)
      if (permValue.startsWith('visitor:')) {
        newValue = newValue.filter((p) => !p.startsWith('visitor:') || p === permValue)
      }
    } else {
      const normalizedValue = String(permValue).toLowerCase()
      if (
        normalizedValue === 'notices:manage_notices' ||
        normalizedValue === 'notices.manage_notices' ||
        normalizedValue === 'manage_notices'
      ) {
        const purgeSet = new Set(NOTICE_ACTION_GROUPS['notices:manage_notices'])
        newValue = selectedPermissions.filter((p) => !purgeSet.has(p))
      } else if (
        normalizedValue === 'notices:active_board' ||
        normalizedValue === 'notices.active_board' ||
        normalizedValue === 'active_board'
      ) {
        const purgeSet = new Set(NOTICE_ACTION_GROUPS['notices:active_board'])
        newValue = selectedPermissions.filter((p) => !purgeSet.has(p))
      } else if (
        normalizedValue === 'notices:polls' ||
        normalizedValue === 'notices.polls' ||
        normalizedValue === 'polls'
      ) {
        const purgeSet = new Set(NOTICE_ACTION_GROUPS['notices:polls'])
        newValue = selectedPermissions.filter((p) => !purgeSet.has(p))
      } else {
        newValue = selectedPermissions.filter((p) => p !== permValue)
      }
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = async (data) => {
    const savedRole = await onSave(data)
    
    if (savedRole && savedRole.id) {
      await dispatch(syncRolePermissionsAsync({ 
        roleId: savedRole.id, 
        permissionIds: data.permissions 
      }))
    }
  }

  const handleSelectScope = (scope) => {
    setValue('roleScope', scope, { shouldValidate: true, shouldDirty: true })
    setValue('isTenantRole', isTenantScope(scope), { shouldValidate: true, shouldDirty: true })
    const defaultPerms = getRoleScopeOption(scope)?.defaultPermissions
    if (defaultPerms) {
      const merged = Array.from(new Set([...(getValues('permissions') || []), ...defaultPerms]))
      setValue('permissions', merged, { shouldValidate: true, shouldDirty: true })
    }
  }

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    control,
    selectedPermissions,
    isTenantRole,
    roleScope,
    handleSelectScope,
    integrationMappings,
    activeMappingsCount,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission
  }
}

export default useRoleForm
