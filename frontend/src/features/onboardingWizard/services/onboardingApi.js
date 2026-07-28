import apiClient from '../../../services/apiClient.js'

export const onboardingApi = {
  /**
   * Upload and validate .csv / .xlsx file.
   * Sends multipart/form-data with file attached.
   * @param {File} file
   */
  uploadAndValidate: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return await apiClient.post('/onboarding/upload-validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * Execute final import for pre-validated data array.
   * Sends JSON payload { validDataArray }.
   * @param {Array} validDataArray
   */
  executeImport: async (validDataArray) => {
    return await apiClient.post('/onboarding/execute-import', {
      validDataArray,
    })
  },
}

export default onboardingApi
