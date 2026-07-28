import { useDispatch, useSelector } from 'react-redux'
import {
  validateFile,
  executeImport,
  setStep as setStepAction,
  setFile as setFileAction,
  resetWizard as resetWizardAction,
  clearError as clearErrorAction,
} from '../store/onboardingSlice.js'

/**
 * Controller hook for the Onboarding Data Import Wizard UI.
 * Connects visual components to Redux store actions and state selectors.
 */
export const useOnboardingWizard = () => {
  const dispatch = useDispatch()
  const { step, file, validationResults, isImporting, loading, error, importResult } = useSelector(
    (state) => state.onboardingWizard || state.onboarding || {},
  )

  const handleFileUpload = (selectedFile) => {
    if (!selectedFile) return
    const fileLabel = selectedFile.name ? selectedFile.name : selectedFile
    dispatch(setFileAction(fileLabel))
    dispatch(validateFile(selectedFile))
  }

  const handleConfirmImport = () => {
    const validRows = validationResults?.valid || []
    if (validRows.length === 0) return
    dispatch(executeImport(validRows))
  }

  const resetWizard = () => {
    dispatch(resetWizardAction())
  }

  const setStep = (newStep) => {
    dispatch(setStepAction(newStep))
  }

  const clearError = () => {
    dispatch(clearErrorAction())
  }

  return {
    step,
    file,
    validationResults,
    isImporting,
    loading,
    error,
    importResult,
    handleFileUpload,
    handleConfirmImport,
    resetWizard,
    setStep,
    clearError,
  }
}

export default useOnboardingWizard
