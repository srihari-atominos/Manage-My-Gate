import { useState, useCallback } from 'react'
import { getAmenitySettings, updateAmenitySettings } from '../services/amenitySettingsApi.js'
import toast from 'react-hot-toast'

export const useAdminSettings = () => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getAmenitySettings()
      setSettings(response.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load settings')
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSettings = useCallback(async (data) => {
    setSaving(true)
    setError(null)
    try {
      const response = await updateAmenitySettings(data)
      setSettings(response.data)
      toast.success('Settings saved successfully')
      return true
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save settings'
      setError(errorMsg)
      toast.error(errorMsg)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    saveSettings,
  }
}

export default useAdminSettings
