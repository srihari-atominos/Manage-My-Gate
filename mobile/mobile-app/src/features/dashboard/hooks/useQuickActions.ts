import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchQuickActionsThunk,
  updateQuickActionsThunk,
  clearDashboardError,
} from '../dashboardSlice';
import { FeatureCategory, FeatureItem } from '../dashboardService';
import { ALL_AVAILABLE_FEATURES } from '../../../../components/dashboard/CustomiseSheetModal';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';

// Helper to construct built-in feature catalog from local definitions
const buildFallbackCatalog = (features: any[]): FeatureCategory[] => {
  const map = new Map<string, { key: string; name: string; items: FeatureItem[] }>();

  features.forEach((item) => {
    const key = item.categoryKey || 'general';
    const name = item.categoryName || 'General';
    if (!map.has(key)) {
      map.set(key, { key, name, items: [] });
    }
    map.get(key)!.items.push({
      id: item.id,
      name: item.name,
      subtitle: item.subtitle,
      iconName: item.iconName,
      colorBg: item.colorBg,
      colorIcon: item.colorIcon,
      route: item.route || '',
      permission: item.permission,
      badge: item.badge,
      badgeColor: item.badgeColor,
    });
  });

  return Array.from(map.values()).map((cat) => ({
    categoryKey: cat.key,
    categoryName: cat.name,
    items: cat.items,
  }));
};

export const BUILT_IN_FEATURE_CATALOG = buildFallbackCatalog(ALL_AVAILABLE_FEATURES);

export const useQuickActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { activeQuickActions, featureCatalog: rawCatalog, loading, updating, error } = useSelector(
    (state: RootState) => state.dashboard
  );

  const { modules, loadWorkspaceModules } = useWorkspace();

  useEffect(() => {
    dispatch(fetchQuickActionsThunk());
    loadWorkspaceModules('current');
  }, [dispatch, loadWorkspaceModules]);

  const loadQuickActions = useCallback(() => {
    dispatch(fetchQuickActionsThunk());
    loadWorkspaceModules('current');
  }, [dispatch, loadWorkspaceModules]);

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

  // Effective feature catalog: uses backend catalog if non-empty, otherwise falls back to built-in catalog,
  // then filters based on active workspace modules.
  const featureCatalog = useMemo<FeatureCategory[]>(() => {
    let baseCatalog = (rawCatalog && rawCatalog.length > 0) ? rawCatalog : BUILT_IN_FEATURE_CATALOG;
    
    if (modules && modules.length > 0) {
      const enabledModuleKeys = modules.filter(m => m.enabled).map(m => m.moduleKey);
      
      const categoryToModuleMap: Record<string, string[]> = {
        'visitor_management': ['visitor'],
        'amenities_facilities': ['amenities'],
        'complaints_helpdesk': ['complaints'],
        'notice_board_polls': ['notices'],
        'financial_billing': ['billing'],
        'administration_security': ['administration_security']
      };
      
      const itemToModuleMap: Record<string, string[]> = {
        'admin_users': ['administration_security', 'users'],
        'admin_villas': ['administration_security', 'villas'],
        'admin_role_builder': ['administration_security', 'roles'],
        'admin_integrations': ['administration_security', 'integrations'],
        'admin_organizations': ['administration_security'],
        'admin_audit_logs': ['administration_security']
        // 'admin_workspace_settings' is intentionally omitted so it never gets hidden
      };
      
      baseCatalog = baseCatalog.map(category => {
        let requiredCategoryModules = categoryToModuleMap[category.categoryKey];
        
        // Filter items within the category
        const filteredItems = category.items.filter(item => {
          if (item.id === 'admin_workspace_settings') return true; // Never hide workspace settings
          
          const requiredItemModules = itemToModuleMap[item.id];
          if (requiredItemModules) {
            return requiredItemModules.some(m => enabledModuleKeys.includes(m));
          }
          if (requiredCategoryModules) {
             return requiredCategoryModules.some(m => enabledModuleKeys.includes(m));
          }
          return true;
        });
        
        return { ...category, items: filteredItems };
      }).filter(category => category.items.length > 0);
    }
    
    return baseCatalog;
  }, [rawCatalog, modules]);

  // Flattened array of all available items across categories for easy lookup
  const allFeaturesList = useMemo<FeatureItem[]>(() => {
    if (featureCatalog && featureCatalog.length > 0) {
      const list: FeatureItem[] = [];
      featureCatalog.forEach((category: FeatureCategory) => {
        if (Array.isArray(category.items)) {
          const mappedItems = category.items.map((item) => ({
            ...item,
            categoryKey: category.categoryKey,
            categoryName: category.categoryName,
          }));
          list.push(...mappedItems);
        }
      });
      if (list.length > 0) return list;
    }
    return ALL_AVAILABLE_FEATURES as FeatureItem[];
  }, [featureCatalog]);

  // Equipped active quick action items (slots 1 through 7)
  const equippedFeatures = useMemo<FeatureItem[]>(() => {
    if (!activeQuickActions || activeQuickActions.length === 0) {
      return (ALL_AVAILABLE_FEATURES as FeatureItem[]).slice(0, 4);
    }
    const itemMap = new Map<string, FeatureItem>();
    allFeaturesList.forEach((item) => itemMap.set(item.id, item));

    const result = activeQuickActions
      .map((id) => itemMap.get(id))
      .filter((item): item is FeatureItem => Boolean(item))
      .slice(0, 7);

    if (result.length > 0) return result;

    // Direct fallback from ALL_AVAILABLE_FEATURES
    const fallbackMap = new Map<string, FeatureItem>();
    (ALL_AVAILABLE_FEATURES as FeatureItem[]).forEach((item) => fallbackMap.set(item.id, item));
    return activeQuickActions
      .map((id) => fallbackMap.get(id))
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
