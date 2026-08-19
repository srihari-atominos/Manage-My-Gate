import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import apiClient from '../../../services/apiClient.js'
const updateOrganizationFeatures = async (id, features) => {
  return await apiClient.patch(`/organizations/${id}/features`, { features })
}
import { setActiveWorkspace } from '../store/workspaceSlice.js'
import { updateTokenAndUser } from '../../auth/store/authSlice.js'

/**
 * Custom hook acting as the controller for Feature Configuration Wizard.
 */
export const useFeatureConfig = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  
  const searchParams = new URLSearchParams(location.search)
  const isFeaturesStep = searchParams.get('step') === 'features'

  const activeOrganizationId = useSelector((state) => state.workspace.activeOrganizationId)
  const activeRole = useSelector((state) => state.workspace.activeRole)
  const allowedFeatures = useSelector((state) => state.workspace.allowedFeatures) || []
  const currentUser = useSelector((state) => state.auth.user)

  const [selectedFeatures, setSelectedFeatures] = useState(() => {
    if (allowedFeatures.length === 0) {
      return ['users', 'roles', 'integrations', 'villas', 'amenities']
    }
    const initial = []
    if (
      allowedFeatures.includes('users') ||
      allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('users:'))
    )
      initial.push('users')
    if (
      allowedFeatures.includes('roles') ||
      allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('roles:'))
    )
      initial.push('roles')
    if (
      allowedFeatures.includes('integrations') ||
      allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('integrations:'))
    )
      initial.push('integrations')
    if (
      allowedFeatures.includes('villas') ||
      allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('villas:'))
    )
      initial.push('villas')
    if (
      allowedFeatures.includes('amenities') ||
      allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('amenities:'))
    )
      initial.push('amenities')
    return initial
  })

  // Keep selectedFeatures in sync if allowedFeatures updates or resolves
  useEffect(() => {
    if (allowedFeatures.length > 0) {
      const initial = []
      if (
        allowedFeatures.includes('users') ||
        allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('users:'))
      )
        initial.push('users')
      if (
        allowedFeatures.includes('roles') ||
        allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('roles:'))
      )
        initial.push('roles')
      if (
        allowedFeatures.includes('integrations') ||
        allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('integrations:'))
      )
        initial.push('integrations')
      if (
        allowedFeatures.includes('villas') ||
        allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('villas:'))
      )
        initial.push('villas')
      if (
        allowedFeatures.includes('amenities') ||
        allowedFeatures.some((f) => typeof f === 'string' && f.startsWith('amenities:'))
      )
        initial.push('amenities')
      setSelectedFeatures(initial)
    } else {
      setSelectedFeatures(['users', 'roles', 'integrations', 'villas', 'amenities'])
    }
  }, [allowedFeatures])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const toggleFeature = (featureId) => {
    setSelectedFeatures((prevSelected) => {
      if (prevSelected.includes(featureId)) {
        return prevSelected.filter((id) => id !== featureId)
      } else {
        return [...prevSelected, featureId]
      }
    })
  }

  const submitFeatures = async () => {
    if (isFeaturesStep) {
      setLoading(true)
      setError(null)
      try {
        const { orgName, totalUnits } = location.state || {}
        
        if (!orgName) {
          setError('Organization name is missing. Please restart setup.')
          setLoading(false)
          return
        }

        const userPhone = currentUser?.phone || location.state?.phone || location.state?.userPhone || '';
        const payload = {
          username: currentUser?.name || currentUser?.username || currentUser?.email?.split('@')[0] || 'admin',
          email: currentUser?.email,
          phone: (userPhone && userPhone !== '0000000000') ? userPhone : (currentUser?.phone || '0000000000'),
          organizationName: orgName,
          totalUnits: totalUnits ? parseInt(totalUnits, 10) : 1,
          selectedFeatures,
        }
        
        await apiClient.post('/platform-crm/enquiry', payload)
        setLoading(false)
        navigate('/enquiry-pending')
      } catch (err) {
        setLoading(false)
        setError(err.response?.data?.message || err.message || 'workspace.wizard.error')
      }
      return
    }

    if (!activeOrganizationId) {
      setError('workspace.wizard.errors.noOrganization')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await updateOrganizationFeatures(activeOrganizationId, selectedFeatures)

      const dataPayload = response?.data
      const organization = dataPayload?.organization || dataPayload
      const allowedFeatures = organization?.allowedFeatures || selectedFeatures
      const newToken = dataPayload?.token

      // Update allowedFeatures in Redux store
      dispatch(
        setActiveWorkspace({
          activeOrganizationId: activeOrganizationId,
          activeRole: activeRole,
          allowedFeatures: allowedFeatures,
        }),
      )

      // Update Redux and LocalStorage if updated user data and token are returned
      const updatedUser = dataPayload?.user
      if (newToken && updatedUser) {
        dispatch(updateTokenAndUser({ token: newToken, user: updatedUser }))
      }

      setLoading(false)
      navigate('/dashboard')
    } catch (err) {
      setLoading(false)
      setError(err.message || 'workspace.wizard.error')
    }
  }

  return {
    selectedFeatures,
    loading,
    error,
    toggleFeature,
    submitFeatures,
  }
}

export default useFeatureConfig
