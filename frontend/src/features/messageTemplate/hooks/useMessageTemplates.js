import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  getTemplatesAsync,
  createTemplateAsync,
  updateTemplateAsync,
  deleteTemplateAsync,
  clearError,
} from '../store/messageTemplateSlice'

/**
 * useMessageTemplates Custom Hook
 *
 * Exposes template state selectors and dispatch actions following the "Thin View" pattern.
 */
export const useMessageTemplates = () => {
  const dispatch = useDispatch()

  const {
    templates = [],
    isLoading = false,
    error = null,
  } = useSelector((state) => state.messageTemplate || {})

  const loadTemplates = useCallback(() => {
    dispatch(getTemplatesAsync())
  }, [dispatch])

  const saveTemplate = useCallback(
    async (templateId, templateData) => {
      try {
        let result
        if (templateId) {
          result = await dispatch(updateTemplateAsync({ id: templateId, templateData })).unwrap()
        } else {
          result = await dispatch(createTemplateAsync(templateData)).unwrap()
        }
        return { success: true, data: result }
      } catch (err) {
        console.error('Save template error:', err)
        return { success: false, error: err }
      }
    },
    [dispatch],
  )

  const removeTemplate = useCallback(
    async (id) => {
      try {
        const result = await dispatch(deleteTemplateAsync(id)).unwrap()
        return { success: true, id: result }
      } catch (err) {
        console.error('Delete template error:', err)
        return { success: false, error: err }
      }
    },
    [dispatch],
  )

  const handleClearError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  return {
    templates,
    isLoading,
    error,
    loadTemplates,
    saveTemplate,
    removeTemplate,
    clearError: handleClearError,
  }
}

export default useMessageTemplates
