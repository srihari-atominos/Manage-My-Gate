import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import useFeatureConfig from './useFeatureConfig.js';

/**
 * Controller hook for the FeatureConfigWizard view.
 * Encapsulates store selectors and URL parameters.
 */
export const useFeatureConfigWizard = () => {
  const activeOrganizationId = useSelector((state) => state.workspace.activeOrganizationId);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isCreateIntent = searchParams.get('intent') === 'create';

  const {
    selectedFeatures,
    loading,
    error,
    toggleFeature,
    submitFeatures,
  } = useFeatureConfig();

  const showWorkspaceSetup = !activeOrganizationId || isCreateIntent;

  return {
    showWorkspaceSetup,
    selectedFeatures,
    loading,
    error,
    toggleFeature,
    submitFeatures,
  };
};

export default useFeatureConfigWizard;
