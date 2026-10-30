import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { ROLE_SCOPE_VALUES, isTenantScope } from '../roleScopes'

export const BILLING_EXPENSE_PERMISSIONS = [
  'billing:expenses',
  'billing:view_expense',
  'billing:create_expense',
  'billing:record_expense_payment',
  'billing:reconcile_expense_payment',
  'billing:pay_online_expense',
]

const schema = yup.object().shape({
  name: yup.string().trim().required('Role name is required'),
  description: yup.string().trim().optional(),
  isTenantRole: yup.boolean().optional().default(false),
  roleScope: yup.string().oneOf(ROLE_SCOPE_VALUES).optional().default('GLOBAL'),
  permissions: yup.array().of(yup.string().required()).required('Permissions array is required'),
  integrationMappings: yup.object().optional().default({}),
})

export const useRoleForm = ({ role, visible, onSave, allowedPermissions = [] }) => {
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
    setError,
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
    register('permissions')
    register('integrationMappings')
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
  }, [role, visible, reset])

  const handleSelectAllGroup = (groupCodes, checked) => {
    const currentPermissions = getValues('permissions') || []

    // Expand any virtual full_access or canonical billing codes into their real backend permissions
    const expandedGroupCodes = groupCodes.flatMap((code) => {
      if (code === 'billing:expenses') return BILLING_EXPENSE_PERMISSIONS
      if (code === 'billing:assessments' || code === 'billing:assessment_manager') {
        return ['billing:assessments', 'billing:assessment_manager']
      }
      if (code === 'billing:ledger') {
        return ['billing:ledger', 'billing:financial_ledger', 'billing:reconciliation_manage']
      }
      if (code === 'billing:my_invoices') {
        return ['billing:my_invoices', 'billing:my_dues']
      }
      if (code === 'billing:dashboard') {
        return ['billing:dashboard', 'billing:community_finance']
      }
      if (code === 'billing:billing_hub') {
        return ['billing:billing_hub']
      }
      if (String(code).endsWith(':full_access')) {
        const category = code.split(':')[0]
        return [
          `${category}:create`,
          `${category}:read`,
          `${category}:update`,
          `${category}:delete`,
          `${category}:manage`,
          `${category}:super_admin`,
        ]
      }
      return code
    })

    let newValue
    if (checked) {
      newValue = Array.from(new Set([...currentPermissions, ...expandedGroupCodes]))
    } else {
      const toRemove = new Set(expandedGroupCodes)
      newValue = currentPermissions.filter((code) => !toRemove.has(code))
    }
    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const handleTogglePermission = (permValue, checked) => {
    const currentPermissions = getValues('permissions') || []
    let newValue

    if (String(permValue).endsWith(':full_access')) {
      const category = permValue.split(':')[0]
      const adminActions = ['create', 'read', 'update', 'delete', 'manage', 'super_admin']
      const permsToToggle = adminActions.map((a) => `${category}:${a}`)

      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...permsToToggle]))
      } else {
        const toRemove = new Set(permsToToggle)
        newValue = currentPermissions.filter(
          (p) => !toRemove.has(p) && !String(p).startsWith(`${category}:`),
        )
      }
    } else if (permValue === 'billing:expenses') {
      const targetCodes = BILLING_EXPENSE_PERMISSIONS
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]))
      } else {
        const toRemove = new Set(targetCodes)
        newValue = currentPermissions.filter((p) => !toRemove.has(p))
      }
    } else if (permValue === 'billing:assessments' || permValue === 'billing:assessment_manager') {
      const targetCodes = ['billing:assessments', 'billing:assessment_manager']
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]))
      } else {
        const toRemove = new Set(targetCodes)
        newValue = currentPermissions.filter((p) => !toRemove.has(p))
      }
    } else if (permValue === 'billing:ledger') {
      const targetCodes = ['billing:ledger', 'billing:financial_ledger', 'billing:reconciliation_manage']
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]))
      } else {
        const toRemove = new Set(targetCodes)
        newValue = currentPermissions.filter((p) => !toRemove.has(p))
      }
    } else if (permValue === 'billing:my_invoices') {
      const targetCodes = ['billing:my_invoices', 'billing:my_dues']
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]))
      } else {
        const toRemove = new Set(targetCodes)
        newValue = currentPermissions.filter((p) => !toRemove.has(p))
      }
    } else if (permValue === 'billing:dashboard') {
      const targetCodes = ['billing:dashboard', 'billing:community_finance']
      if (checked) {
        newValue = Array.from(new Set([...currentPermissions, ...targetCodes]))
      } else {
        const toRemove = new Set(targetCodes)
        newValue = currentPermissions.filter((p) => !toRemove.has(p))
      }
    } else if (checked) {
      newValue = Array.from(new Set([...currentPermissions, permValue]))
    } else {
      newValue = currentPermissions.filter((p) => p !== permValue)
    }

    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = async (data) => {
    const name = String(data.name || '').trim()
    if (!name) {
      setError('name', { type: 'manual', message: 'Role name is required' })
      return
    }

    const finalData = {
      ...data,
      name,
      permissions: getValues('permissions') || [],
      integrationMappings: getValues('integrationMappings') || {},
    }

    // The API correctly prevents a manager from granting a permission they do
    // not hold. Stop that request in the form as well, so the user gets a
    // useful message instead of a 403 after clicking Save.
    const normalizePermission = (value) => String(value || '').trim().replace(':', '.').toLowerCase()
    const held = new Set((allowedPermissions || []).map(normalizePermission))
    const existing = new Set((role?.permissions || []).map(normalizePermission))
    const isPlatformAdmin = held.has('*')
    const unauthorized = finalData.permissions.filter((permission) => {
      const normalized = normalizePermission(permission)
      return !existing.has(normalized) && !isPlatformAdmin && !held.has(normalized)
    })

    if (unauthorized.length > 0) {
      setError('permissions', {
        type: 'manual',
        message: `You can only grant permissions assigned to your account: ${unauthorized.join(', ')}`,
      })
      return
    }

    await onSave(finalData)
  }

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    control,
    selectedPermissions,
    isTenantRole,
    roleScope,
    integrationMappings,
    activeMappingsCount,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission,
  }
}

export default useRoleForm
