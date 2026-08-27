import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchQuickActionsThunk,
  updateQuickActionsThunk,
  clearDashboardError,
} from '../dashboardSlice';
import { FeatureCategory, FeatureItem } from '../dashboardService';

export const useQuickActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { activeQuickActions, featureCatalog, loading, updating, error } = useSelector(
    (state: RootState) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchQuickActionsThunk());
  }, [dispatch]);

  const loadQuickActions = useCallback(() => {
    dispatch(fetchQuickActionsThunk());
  }, [dispatch]);

  const saveQuickActions = useCallback(
    async (selectedIds: string[]) => {
      const result = await dispatch(updateQuickActionsThunk(selectedIds));
      return result;
    },
    [dispatch]
  );

  const clearError = useCallback(() => {
    dispatch(clearDashboardError());
  }, [dispatch]);

  // Flattened array of all available items across categories for easy lookup
  const allFeaturesList = useMemo<FeatureItem[]>(() => {
    if (!featureCatalog || featureCatalog.length === 0) return [];
    const list: FeatureItem[] = [];
    featureCatalog.forEach((category: FeatureCategory) => {
      if (Array.isArray(category.items)) {
        list.push(...category.items);
      }
    });
    return list;
  }, [featureCatalog]);

  // Equipped active quick action items (slots 1 through 7)
  const equippedFeatures = useMemo<FeatureItem[]>(() => {
    if (!activeQuickActions || activeQuickActions.length === 0) return [];
    const itemMap = new Map<string, FeatureItem>();
    allFeaturesList.forEach((item) => itemMap.set(item.id, item));

    return activeQuickActions
      .map((id) => itemMap.get(id))
      .filter((item): item is FeatureItem => Boolean(item))
      .slice(0, 7);
  }, [activeQuickActions, allFeaturesList]);

  return {
    activeQuickActions,
    featureCatalog,
    allFeaturesList,
    equippedFeatures,
    loading,
    updating,
    error,
    loadQuickActions,
    saveQuickActions,
    clearError,
  };
};

export default useQuickActions;
