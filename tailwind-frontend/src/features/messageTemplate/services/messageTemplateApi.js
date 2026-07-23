import apiClient from '../../../services/apiClient'

/**
 * Fetch all message templates for the organization.
 */
export const fetchTemplates = async () => {
  return await apiClient.get('/templates')
}

/**
 * Create a new message template.
 */
export const createTemplate = async (templateData) => {
  return await apiClient.post('/templates', templateData)
}

/**
 * Update an existing message template.
 */
export const updateTemplate = async (templateId, templateData) => {
  return await apiClient.put(`/templates/${templateId}`, templateData)
}

/**
 * Delete a template.
 */
export const deleteTemplate = async (templateId) => {
  return await apiClient.delete(`/templates/${templateId}`)
}

export default {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
}
