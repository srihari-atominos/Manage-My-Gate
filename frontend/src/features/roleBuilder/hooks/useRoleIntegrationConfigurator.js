import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getConnections } from '../../integrationHub/store/integrationHubSlice'

export const useRoleIntegrationConfigurator = (isOpen, mappings, onApply, onClose) => {
  const dispatch = useDispatch()

  const { connections, isLoading } = useSelector((state) => state.integrationHub)

  const [selectedProvider, setSelectedProvider] = useState('smtp')
  const [tempMappings, setTempMappings] = useState({})

  // Fetch all connections on mount
  useEffect(() => {
    if (isOpen) {
      dispatch(getConnections({ limit: 100 }))
    }
  }, [dispatch, isOpen])

  // Initialize/Reset local temporary mappings when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempMappings(mappings || {})
    }
  }, [mappings, isOpen])

  // Filter connections by currently selected provider
  const filteredConnections = connections.filter(
    (conn) => conn.provider === selectedProvider
  )

  const handleSelectConnection = (connectionId) => {
    setTempMappings((prev) => ({
      ...prev,
      [selectedProvider]: connectionId || undefined,
    }))
  }

  const handleApply = () => {
    const cleaned = {}
    Object.entries(tempMappings).forEach(([key, val]) => {
      if (val) cleaned[key] = val
    })
    onApply(cleaned)
    onClose()
  }

  return {
    isLoading,
    connections,
    filteredConnections,
    selectedProvider,
    setSelectedProvider,
    tempMappings,
    handleSelectConnection,
    handleApply,
  }
}

export default useRoleIntegrationConfigurator
