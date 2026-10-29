import { InteractionManager } from 'react-native';
import { useEffect, useCallback, useMemo, useRef } from 'react';
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

  features.filter((item) => item.dashboardVisible !== false).forEach((item) => {
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

  const { modules, allModules, loadWorkspaceModules } = useWorkspace();
  const authUser = useSelector((state: RootState) => (state as any).auth?.user);
  const currentUserId = authUser?._id || authUser?.id;
  const activeOrgId = authUser?.activeOrgId || authUser?.orgId || authUser?.organizationId;
  const activeVillaId = authUser?.activeVillaId || authUser?.villaId;
  const activeVillaNum = authUser?.activeVillaNumber || authUser?.villaNumber || authUser?.unitNumber;

  const lastFetchedCatalogOrgRef = useRef<string | null>(null);
  const lastFetchedModulesOrgRef = useRef<string | null>(null);
  const isFetchingCatalogRef = useRef<boolean>(false);
  const isFetchingModulesRef = useRef<boolean>(false);

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      const orgKey = activeOrgId || 'default';
      const needsCatalog = lastFetchedCatalogOrgRef.current !== orgKey;
      const needsModules = lastFetchedModulesOrgRef.current !== orgKey;

      if (!needsCatalog && !needsModules) return;

      const task = InteractionManager.runAfterInteractions(() => {
        if (needsCatalog && !isFetchingCatalogRef.current) {
          lastFetchedCatalogOrgRef.current = orgKey;
          isFetchingCatalogRef.current = true;
          dispatch(
            fetchQuickActionsThunk({
              orgId: activeOrgId,
              villaId: activeVillaId,
              villaNumber: activeVillaNum,
            })
          ).finally(() => {
            isFetchingCatalogRef.current = false;
          });
        }
        if (needsModules && !isFetchingModulesRef.current) {
          lastFetchedModulesOrgRef.current = orgKey;
          isFetchingModulesRef.current = true;
          loadWorkspaceModules('current')
            .catch(() => {})
            .finally(() => {
              isFetchingModulesRef.current = false;
            });
        }
      });

      return () => {
        task.cancel();
      };
    }
  }, [dispatch, isAuthenticated, currentUserId, activeOrgId, activeVillaId, activeVillaNum, loadWorkspaceModules]);

  const loadQuickActions = useCallback(() => {
    if (isAuthenticated) {
      dispatch(
        fetchQuickActionsThunk({
          orgId: activeOrgId,
          villaId: activeVillaId,
          villaNumber: activeVillaNum,
        })
      );
      loadWorkspaceModules('current');
    }
  }, [dispatch, isAuthenticated, activeOrgId, activeVillaId, activeVillaNum, loadWorkspaceModules]);

  const saveQuickActions = useCallback(
    async (selectedIds: string[]) => {
      const result = await dispatch(
        updateQuickActionsThunk({
          activeQuickActions: selectedIds,
          orgId: activeOrgId,
          villaId: activeVillaId,
          villaNumber: activeVillaNum,
        })
      );
      return result;
    },
    [dispatch, activeOrgId, activeVillaId, activeVillaNum]
  );

  const clearError = useCallback(() => {
    dispatch(clearDashboardError());
  }, [dispatch]);

  // Effective feature catalog: uses backend catalog if non-empty, otherwise falls back to built-in catalog,
  // then filters based on active workspace modules AND user role / permissions.
  const featureCatalog = useMemo<FeatureCategory[]>(() => {
    const validFeatureIds = new Set(ALL_AVAILABLE_FEATURES.map((item) => item.id));

    let baseCatalog = (rawCatalog && rawCatalog.length > 0) ? rawCatalog : BUILT_IN_FEATURE_CATALOG;
    if (rawCatalog && rawCatalog.length > 0) {
      const canonicalMap = new Map(ALL_AVAILABLE_FEATURES.map((f) => [f.id, f]));

      baseCatalog = BUILT_IN_FEATURE_CATALOG.map((builtinCat) => {
        const rawCat = rawCatalog.find((rc) => rc.categoryKey === builtinCat.categoryKey);
        if (!rawCat) return builtinCat;
        // Strictly filter raw items: must exist in canonical catalog and match this category
        const validRawItems: FeatureItem[] = (rawCat.items || [])
          .filter((item: FeatureItem) => {
            const canonical = canonicalMap.get(item.id);
            if (!canonical || canonical.dashboardVisible === false) return false;
            return (canonical.categoryKey || 'general') === builtinCat.categoryKey;
          })
          .map((item: FeatureItem): FeatureItem => {
            const canonical = canonicalMap.get(item.id)!;
            return {
              ...item,
              name: canonical.name || item.name,
              subtitle: canonical.subtitle || item.subtitle,
              iconName: canonical.iconName || item.iconName,
              permission: canonical.permission || item.permission,
              route: canonical.route || item.route,
            };
          });
        const mergedItems: FeatureItem[] = [...validRawItems];
        builtinCat.items.forEach((bi) => {
          if (!mergedItems.some((ri) => ri.id === bi.id)) {
            mergedItems.push(bi);
          }
        });
        return {
          ...builtinCat,
          ...rawCat,
          categoryKey: builtinCat.categoryKey,
          categoryName: builtinCat.categoryName,
          items: mergedItems,
        };
      });
    }
    
    const moduleSource = (allModules && allModules.length > 0) ? allModules : modules;
    if (moduleSource && moduleSource.length > 0) {
      const enabledModuleKeys = moduleSource.filter(m => m.enabled).map(m => m.moduleKey);
      
      const categoryToModuleMap: Record<string, string[]> = {
        'visitor_management': ['visitor'],
        'amenities_facilities': ['amenities'],
        'complaints_helpdesk': ['complaints'],
        'notice_board_polls': ['notices'],
        // digital_wallet is a core financial category — it is shown whenever billing OR amenities
        // is active. We never completely hide it based on module keys alone because wallet
        // top-up is always a valid resident & admin feature.
        'digital_wallet': ['billing', 'amenities', 'wallet'],
        'financial_billing': ['billing'],
        'staff_management': ['staff', 'staff_management'],
        'administration_security': ['administration_security', 'admin'],
      };
      
      const itemToModuleMap: Record<string, string[]> = {
        'admin_staff_directory': ['staff', 'staff_management'],
        'admin_staff_attendance': ['staff', 'staff_management'],
        'admin_staff_allocations': ['staff', 'staff_management'],
        'admin_staff_portal': ['staff', 'staff_management'],
      };
      
      baseCatalog = baseCatalog.map(category => {
        let requiredCategoryModules: string[] | undefined = categoryToModuleMap[category.categoryKey];

        // digital_wallet passthrough: if none of the billing/amenities/wallet module keys
        // exist in the workspace module list at all (e.g. workspace API returned unrelated keys),
        // treat the digital_wallet category as always-enabled — it's a core financial feature.
        if (
          category.categoryKey === 'digital_wallet' &&
          requiredCategoryModules &&
          !requiredCategoryModules.some(m => enabledModuleKeys.includes(m))
        ) {
          requiredCategoryModules = undefined;
        }

        // Filter items within the category by workspace modules
        const filteredItems = category.items.filter(item => {
          if (item.id === 'admin_workspace_settings' || item.id === 'admin_app_settings') return true;

          // Module Filtering
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
    
    // Authoritative RBAC & Catalog validity permission filtering per user role
    return baseCatalog.map(category => ({
      ...category,
      items: category.items.filter(item => validFeatureIds.has(item.id) && isFeatureAllowedForUser(item, user))
    })).filter(category => category.items.length > 0);
  }, [rawCatalog, modules, allModules, user]);

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
    return [];
  }, [featureCatalog]);

  // Role-filtered active quick action IDs (strictly permitted, max 7)
  const effectiveQuickActionIds = useMemo<string[]>(() => {
    const defaultIds = getDefaultQuickActionsForUser(user);
    const hasCustomized = Array.isArray(activeQuickActions) && activeQuickActions.length > 0;
    const candidateIds = hasCustomized ? activeQuickActions : defaultIds;

    const allowedIds = candidateIds.filter((id) => {
      const item = allFeaturesList.find((f) => f.id === id);
      return item ? isFeatureAllowedForUser(item, user) : false;
    });

    // If user explicitly configured their quick actions or has allowed candidate actions, take up to 7.
    if (allowedIds.length > 0) {
      return allowedIds.slice(0, 7);
    }

    // Otherwise, for fresh uncustomized defaults:
    const permittedDefaults = defaultIds.filter((id) => {
      const item = allFeaturesList.find((f) => f.id === id);
      return item ? isFeatureAllowedForUser(item, user) : false;
    });

    if (permittedDefaults.length > 0) {
      return permittedDefaults.slice(0, 7);
    }

    const allPermitted = allFeaturesList.map((item) => item.id);
    return Array.from(new Set(allPermitted)).slice(0, 7);
  }, [activeQuickActions, user, allFeaturesList]);


  // Equipped active quick action items (slots 1 through 7)
  const equippedFeatures = useMemo<FeatureItem[]>(() => {
    const itemMap = new Map<string, FeatureItem>();
    allFeaturesList.forEach((item) => itemMap.set(item.id, item));

    return effectiveQuickActionIds
      .map((id: string) => itemMap.get(id))
      .filter((item: FeatureItem | undefined): item is FeatureItem => Boolean(item && isFeatureAllowedForUser(item!, user)))
      .slice(0, 7);
  }, [effectiveQuickActionIds, allFeaturesList, user]);


  return {
    activeQuickActions: effectiveQuickActionIds,
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

