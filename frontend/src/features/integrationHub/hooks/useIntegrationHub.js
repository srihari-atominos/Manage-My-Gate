import { useState, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  getCatalog as fetchCatalog,
  getConnections as fetchConnections,
  connectIntegration as createConnection,
  updateLabel,
  disconnectIntegration as deleteConnection,
  getBankDetails as fetchBankDetails,
  saveBankDetails as saveBankDetailsAction,
  clearError,
} from '../store/integrationHubSlice.js'

/**
 * Controller Hook for the Integration Hub feature.
 * Separates visual UI rendering from business logic, state selectors, and API actions.
 */
export const useIntegrationHub = () => {
  const dispatch = useDispatch()

  // Redux state selectors
  const { catalog, connections, bankDetails, pagination, isLoading, error } = useSelector(
    (state) => state.integrationHub,
  )

  // Local UI-only state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  // Auto-fetch catalog and bank details on mount
  useEffect(() => {
    dispatch(fetchCatalog())
    dispatch(fetchBankDetails())
  }, [dispatch])

  // Auto-fetch connections whenever the selected provider changes
  useEffect(() => {
    if (selectedProvider) {
      dispatch(fetchConnections({ provider: selectedProvider.id, page: 1, limit: 10 }))
    }
  }, [dispatch, selectedProvider])

  /**
   * Handle selecting a provider from the catalog
   */
  const handleSelectProvider = useCallback((provider) => {
    setSelectedProvider(provider)
    setIsModalOpen(true)
  }, [])

  /**
   * Handle pagination page change
   */
  const handlePageChange = useCallback(
    (newPage) => {
      if (selectedProvider) {
        dispatch(
          fetchConnections({
            provider: selectedProvider.id,
            page: newPage,
            limit: pagination.limit || 10,
          }),
        )
      }
    },
    [dispatch, selectedProvider, pagination.limit],
  )

  /**
   * Handle connection creation/validation submission
   */
  const handleCreateConnection = useCallback(
    async (formData) => {
      try {
        const result = await dispatch(createConnection(formData)).unwrap()
        setIsCreateModalOpen(false)
        if (selectedProvider) {
          dispatch(
            fetchConnections({
              provider: selectedProvider.id,
              page: pagination.currentPage || 1,
              limit: pagination.limit || 10,
            }),
          )
        }
        return { success: true, data: result }
      } catch (err) {
        console.error('Create connection error:', err)
        return { success: false, error: err }
      }
    },
    [dispatch, selectedProvider, pagination.currentPage, pagination.limit],
  )

  /**
   * Handle updating a connection label
   */
  const handleUpdateLabel = useCallback(
    async (id, newLabel) => {
      try {
        const result = await dispatch(updateLabel({ id, accountLabel: newLabel })).unwrap()
        return { success: true, data: result }
      } catch (err) {
        console.error('Update label error:', err)
        return { success: false, error: err }
      }
    },
    [dispatch],
  )

  /**
   * Handle deleting/disconnecting a connection
   */
  const handleDeleteConnection = useCallback(
    async (id) => {
      try {
        const result = await dispatch(deleteConnection(id)).unwrap()
        if (selectedProvider) {
          dispatch(
            fetchConnections({
              provider: selectedProvider.id,
              page: pagination.currentPage || 1,
              limit: pagination.limit || 10,
            }),
          )
        }
        return { success: true, data: result }
      } catch (err) {
        console.error('Delete connection error:', err)
        return { success: false, error: err }
      }
    },
    [dispatch, selectedProvider, pagination.currentPage, pagination.limit],
  )

  /**
   * Handle saving bank details and gateway credentials
   */
  const handleSaveBankDetails = useCallback(
    async (bankFormData) => {
      try {
        const result = await dispatch(saveBankDetailsAction(bankFormData)).unwrap()
        setIsBankModalOpen(false)
        return { success: true, data: result }
      } catch (err) {
        console.error('Save bank details error:', err)
        return { success: false, error: err }
      }
    },
    [dispatch],
  )

  /**
   * Clear error state
   */
  const handleClearError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    // Redux State
    catalog,
    connections,
    bankDetails,
    pagination,
    isLoading,
    error,

    // Local UI State
    searchQuery,
    setSearchQuery,
    selectedProvider,
    setSelectedProvider,
    isModalOpen,
    setIsModalOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isBankModalOpen,
    setIsBankModalOpen,
    isMaximized,
    setIsMaximized,

    // Handlers
    handleSelectProvider,
    handlePageChange,
    handleCreateConnection,
    handleUpdateLabel,
    handleDeleteConnection,
    handleSaveBankDetails,
    handleClearError,
  }
}

export default useIntegrationHub
