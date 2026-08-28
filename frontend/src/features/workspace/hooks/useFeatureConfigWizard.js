import { useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import useFeatureConfig from './useFeatureConfig.js'

/**
 * Custom hook acting as the controller for FeatureConfigWizard view.
 */
export const useFeatureConfigWizard = () => {
  const activeOrganizationId = useSelector((state) => state.workspace.activeOrganizationId)
  const location = useLocation()
  const isCreateIntent =
    location.search.includes('intent=create') ||
    window.location.href.includes('intent=create') ||
    location.state?.intent === 'create'

  const { selectedFeatures, loading, error, toggleFeature, submitFeatures } = useFeatureConfig()

  const showWorkspaceSetup = !activeOrganizationId || isCreateIntent

  return {
    showWorkspaceSetup,
    selectedFeatures,
    loading,
    error,
    toggleFeature,
    submitFeatures,
  }
}

export default useFeatureConfigWizard
