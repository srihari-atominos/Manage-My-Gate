import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { syncRolePermissionsAsync } from '../store/roleSlice'

const schema = yup.object().shape({
  name: yup.string().trim().required('Role name is required'),
  description: yup.string().trim().optional(),
  isTenantRole: yup.boolean().optional().default(false),
  permissions: yup.array().of(yup.string().required()).required('Permissions array is required'),
  integrationMappings: yup.object().optional().default({}),
})

export const AMENITY_V2_TIER_PERMISSIONS = {
  resident: [
    'amenities:discover',
    'amenities:my_booking',
    'amenities:wallet',
  ],
  security_guard: [
    'amenities:scanner',
    'amenities:security_logs',
  ],
  admin: [
    'amenities:amenities',
    'amenities:admin_calander',
    'amenities:maintenance',
    'amenities:settings',
    'amenities:dashboard',
    'amenities:ledgers',
  ],
  none: [],
}

export const detectInitialAmenityTier = (permissions = []) => {
  const amenityPerms = (permissions || []).filter((p) => String(p).toLowerCase().startsWith('amenities:'))
  if (amenityPerms.length === 0) return 'none'

  const normalized = amenityPerms.map((p) => String(p).toLowerCase())
  const hasExact = (tierSet) =>
    tierSet.length === normalized.length &&
    tierSet.every((p) => normalized.includes(p.toLowerCase()))

  if (hasExact(AMENITY_V2_TIER_PERMISSIONS.admin)) return 'admin'
  if (hasExact(AMENITY_V2_TIER_PERMISSIONS.security_guard)) return 'security_guard'
  if (hasExact(AMENITY_V2_TIER_PERMISSIONS.resident)) return 'resident'

  // Safe fallback for ambiguous mixtures
  return 'none'
}

export const useRoleForm = ({ role, visible, onSave }) => {
  const dispatch = useDispatch()
  const [amenityTier, setAmenityTier] = useState('none')

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
      permissions: [],
      integrationMappings: {},
    },
  })

  const selectedPermissions = watch('permissions') || []
  const integrationMappings = watch('integrationMappings') || {}
  const activeMappingsCount = Object.keys(integrationMappings).length

  useEffect(() => {
    if (visible && role) {
      const rolePerms = role.permissions || []
      reset({
        name: role.name || '',
        description: role.description || '',
        isTenantRole: role.isTenantRole || false,
        permissions: rolePerms,
        integrationMappings: role.integrationMappings || {},
      })
      setAmenityTier(detectInitialAmenityTier(rolePerms))
    } else if (!visible) {
      reset({
        name: '',
        description: '',
        isTenantRole: false,
        permissions: [],
        integrationMappings: {},
      })
      setAmenityTier('none')
    }
  }, [role, visible, reset])

const NOTICE_ACTION_GROUPS = {
  active_board: ['active_board', 'resident_feed', 'read'],
  resident_feed: ['active_board', 'resident_feed', 'read'],
  polls: ['polls', 'community_engagement'],
  community_engagement: ['polls', 'community_engagement'],
  manage_notices: ['manage_notices', 'manage_engagement', 'dashboard', 'create', 'update', 'delete', 'publish', 'acknowledge'],
  manage_engagement: ['manage_notices', 'manage_engagement', 'dashboard', 'create', 'update', 'delete', 'publish', 'acknowledge'],
  dashboard: ['manage_notices', 'manage_engagement', 'dashboard', 'create', 'update', 'delete', 'publish', 'acknowledge'],
}

const ALL_NOTICE_ACTIONS = [
  'active_board',
  'resident_feed',
  'polls',
  'community_engagement',
  'manage_notices',
  'manage_engagement',
  'dashboard',
  'create',
  'update',
  'delete',
  'publish',
  'acknowledge',
  'read',
]

const getPermAction = (p) => {
  const str = typeof p === 'object' ? String(p.name || p._id || '') : String(p)
  return (str.includes(':') ? str.split(':')[1] : str).toLowerCase().trim()
}

  const handleSelectAllGroup = (groupCodes, checked) => {
    const currentPermissions = getValues('permissions') || []
    let newValue
    if (checked) {
      let filteredGroupCodes = [...groupCodes]
      const visitorCodes = groupCodes.filter((code) =>
        String(code).toLowerCase().startsWith('visitor:'),
      )
      if (visitorCodes.length > 1) {
        filteredGroupCodes = groupCodes.filter(
          (code) => !String(code).toLowerCase().startsWith('visitor:') || code === visitorCodes[0],
        )
      }
      newValue = Array.from(new Set([...currentPermissions, ...filteredGroupCodes]))
    } else {
      const groupActions = groupCodes.map((c) => getPermAction(c))
      const allRelatedActions = groupActions.flatMap((a) => NOTICE_ACTION_GROUPS[a] || [a])
      newValue = currentPermissions.filter((p) => {
        if (groupCodes.includes(p)) return false
        const pStr = String(p).toLowerCase().trim()
        const action = getPermAction(p)
        const isNoticePerm =
          pStr.startsWith('notices:') ||
          pStr.includes('notice') ||
          ALL_NOTICE_ACTIONS.includes(action)
        if (isNoticePerm && allRelatedActions.includes(action)) {
          return false
        }
        return true
      })
    }
    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const handleTogglePermission = (permValue, checked) => {
    const currentPermissions = getValues('permissions') || []
    let newValue

    if (String(permValue).startsWith('amenities_tier:')) {
      const tier = permValue.replace('amenities_tier:', '')
      setAmenityTier(tier)
      const nonAmenity = currentPermissions.filter((p) => !String(p).toLowerCase().startsWith('amenities:'))
      const tierPermissions = AMENITY_V2_TIER_PERMISSIONS[tier] || []
      newValue = [...nonAmenity, ...tierPermissions]
      setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
      return
    }

    const targetAction = getPermAction(permValue)

    if (checked) {
      if (String(permValue).toLowerCase().startsWith('visitor:')) {
        // Replace all visitor permissions with the newly selected one
        newValue = [
          ...currentPermissions.filter((p) => !String(p).toLowerCase().startsWith('visitor:')),
          permValue,
        ]
      } else {
        newValue = Array.from(new Set([...currentPermissions, permValue]))
      }
    } else {
      // Remove permission and any related alias actions for notices
      const relatedActions = NOTICE_ACTION_GROUPS[targetAction] || [targetAction]
      
      newValue = currentPermissions.filter((p) => {
        if (p === permValue) return false
        const pStr = String(p).toLowerCase().trim()
        const action = getPermAction(p)
        const isNoticePerm =
          pStr.startsWith('notices:') ||
          pStr.includes('notice') ||
          ALL_NOTICE_ACTIONS.includes(action)
        if (isNoticePerm && relatedActions.includes(action)) {
          return false
        }
        return action !== targetAction
      })
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = async (data) => {
    await onSave(data)
  }

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    control,
    selectedPermissions,
    amenityTier,
    integrationMappings,
    activeMappingsCount,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission,
  }
}

export default useRoleForm
