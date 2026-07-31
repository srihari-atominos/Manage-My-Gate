import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { createWorkspace } from '../../auth/store/authSlice.js'
import useAuthRouting from '../../auth/hooks/useAuthRouting.js'
import { checkOrganizationName } from '../services/workspaceApi.js'

export const useSetupWorkspace = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const authUser = useSelector((state) => state.auth.user)

  const { loading, error } = useAuthRouting()

  const [checking, setChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState(null)
  const [checkError, setCheckError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      timezone: 'Asia/Kolkata',
      contactEmail: authUser?.email || '',
      contactPhone: authUser?.phone || '',
    },
    mode: 'onTouched',
  })

  const orgName = watch('name')

  // Debounced live validation for organization name uniqueness
  useEffect(() => {
    if (!orgName || orgName.trim().length < 3) {
      setIsAvailable(null)
      setCheckError('')
      setChecking(false)
      return
    }

    setChecking(true)
    setIsAvailable(null)
    setCheckError('')

    const handler = setTimeout(async () => {
      try {
        const response = await checkOrganizationName(orgName)
        const nameAvailable = response.data?.available
        setIsAvailable(!!nameAvailable)
      } catch (err) {
        setCheckError(
          t('workspace.setup.checkError', { defaultValue: 'Failed to verify name availability.' }),
        )
        setIsAvailable(false)
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => clearTimeout(handler)
  }, [orgName, t])

  const onSubmit = (data) => {
    dispatch(
      createWorkspace({
        name: data.name.trim(),
        organizationType: 'Residential', // Default to Residential since UI field is removed
        timezone: data.timezone,
        contactEmail: data.contactEmail?.trim(),
        contactPhone: data.contactPhone?.trim(),
      }),
    ).then((action) => {
      if (createWorkspace.fulfilled.match(action)) {
        navigate('/workspace-setup')
      }
    })
  }

  const isSubmitDisabled =
    loading ||
    checking ||
    isAvailable !== true ||
    !orgName ||
    orgName.trim().length < 3 ||
    Object.keys(errors).length > 0

  return {
    register,
    handleSubmit,
    errors,
    loading,
    error,
    checking,
    isAvailable,
    checkError,
    isSubmitDisabled,
    onSubmit,
  }
}

export default useSetupWorkspace
