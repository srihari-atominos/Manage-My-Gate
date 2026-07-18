import { useEffect } from 'react'
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

export const useRoleForm = ({ role, visible, onSave }) => {
  const dispatch = useDispatch()

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
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
      reset({
        name: role.name || '',
        description: role.description || '',
        isTenantRole: role.isTenantRole || false,
        permissions: role.permissions || [],
        integrationMappings: role.integrationMappings || {},
      })
    } else if (!visible) {
      reset({
        name: '',
        description: '',
        isTenantRole: false,
        permissions: [],
        integrationMappings: {},
      })
    }
  }, [role, visible, reset])

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
      newValue = selectedPermissions.filter((code) => !groupCodes.includes(code))
    }
    setValue('permissions', newValue, { shouldDirty: true, shouldValidate: true })
  }

  const handleTogglePermission = (permValue, checked) => {
    let newValue

    if (checked && permValue.startsWith('visitor:')) {
      // For visitor radio: replace ALL existing visitor permissions with only the newly selected one
      newValue = [
        ...selectedPermissions.filter((p) => !p.startsWith('visitor:')),
        permValue,
      ]
    } else if (!checked) {
      // Deselect (only applies to checkboxes — visitor radios always pass checked=true)
      newValue = selectedPermissions.filter((p) => p !== permValue)
    } else {
      newValue = [...selectedPermissions, permValue]
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
    integrationMappings,
    activeMappingsCount,
    setValue,
    handleSelectAllGroup,
    handleTogglePermission
  }
}

export default useRoleForm
