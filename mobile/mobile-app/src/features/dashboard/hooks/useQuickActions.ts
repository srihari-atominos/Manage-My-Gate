import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchQuickActionsThunk,
  updateQuickActionsThunk,
  clearDashboardError,
} from '../dashboardSlice';
import { FeatureCategory, FeatureItem } from '../dashboardService';
import { ALL_AVAILABLE_FEATURES } from '../dashboardCatalog';
import { useWorkspace } from '../../workspace/hooks/useWorkspace';

import { useAuth } from '../../auth/hooks/useAuth';
import { isFeatureAllowedForUser, getDefaultQuickActionsForUser } from '../../../utils/rbac';

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
  const { user, isAuthenticated } = useAuth();

  const { activeQuickActions, featureCatalog: rawCatalog, loading, updating, error } = useSelector(
    (state: RootState) => state.dashboard
  );

  const { modules, loadWorkspaceModules } = useWorkspace();
  const authUser = useSelector((state: RootState) => (state as any).auth?.user);
  const userPermissions = authUser?.permissions || [];

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchQuickActionsThunk());
      loadWorkspaceModules('current');
    }
  }, [dispatch, isAuthenticated, loadWorkspaceModules]);

  const loadQuickActions = useCallback(() => {
    if (isAuthenticated) {
      dispatch(fetchQuickActionsThunk());
      loadWorkspaceModules('current');
    }
  }, [dispatch, isAuthenticated, loadWorkspaceModules]);

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
  // then filters based on active workspace modules AND user role / permissions.
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
        'admin_audit_logs': ['administration_security']
      };
      
      baseCatalog = baseCatalog.map(category => {
        let requiredCategoryModules = categoryToModuleMap[category.categoryKey];
        
        // Filter items within the category by workspace modules
        const filteredItems = category.items.filter(item => {
          if (item.id === 'admin_workspace_settings') return true;
          
          // 1. RBAC Filtering
          if (item.permission && userPermissions.length > 0) {
            const hasAccess = userPermissions.includes('owner:*') || 
                              userPermissions.includes('admin:*') || 
                              userPermissions.includes('platform:super_admin') ||
                              userPermissions.includes(item.permission);
            if (!hasAccess) return false;
          }

          // 2. Module Filtering
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
    
    // RBAC permission filtering per user role & permissions and filter out excluded items
    return baseCatalog.map(category => ({
      ...category,
      items: category.items.filter(item => item.id !== 'admin_organizations' && item.id !== 'admin_audit_logs' && isFeatureAllowedForUser(item, user))
    })).filter(category => category.items.length > 0);
  }, [rawCatalog, modules, userPermissions, user]);

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
    return (ALL_AVAILABLE_FEATURES as FeatureItem[]).filter(item => isFeatureAllowedForUser(item, user));
  }, [featureCatalog, user]);

  // Equipped active quick action items (slots 1 through 7)
  const equippedFeatures = useMemo<FeatureItem[]>(() => {
    const defaultIds = getDefaultQuickActionsForUser(user);
    const targetIds = (activeQuickActions && activeQuickActions.length > 0) ? activeQuickActions : defaultIds;

    const itemMap = new Map<string, FeatureItem>();
    (ALL_AVAILABLE_FEATURES as FeatureItem[]).forEach((item) => itemMap.set(item.id, item));

    const allowedItems = targetIds
      .map((id: string) => itemMap.get(id))
      .filter((item: FeatureItem | undefined): item is FeatureItem => Boolean(item) && isFeatureAllowedForUser(item!, user));

    if (allowedItems.length > 0) {
      return allowedItems.slice(0, 7);
    }

    // Fallback to role-appropriate defaults
    return defaultIds
      .map((id: string) => itemMap.get(id))
      .filter((item: FeatureItem | undefined): item is FeatureItem => Boolean(item) && isFeatureAllowedForUser(item!, user))
      .slice(0, 7);
  }, [activeQuickActions, user]);

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
