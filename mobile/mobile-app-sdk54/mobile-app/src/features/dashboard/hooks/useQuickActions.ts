import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import {
  fetchQuickActionsThunk,
  updateQuickActionsThunk,
  clearDashboardError,
} from '../dashboardSlice';
import { FeatureCategory, FeatureItem } from '../dashboardService';
import {
  ALL_AVAILABLE_FEATURES,
  isFeatureAllowedForUser,
  getRoleDefaultQuickActions,
} from '../dashboardCatalog';

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
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    dispatch(fetchQuickActionsThunk());
  }, [dispatch, user?.role, user?.id]);

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

  // Effective feature catalog: uses backend catalog if non-empty, otherwise falls back to built-in catalog
  const featureCatalog = useMemo<FeatureCategory[]>(() => {
    const catalog = (rawCatalog && rawCatalog.length > 0) ? rawCatalog : BUILT_IN_FEATURE_CATALOG;
    return catalog
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => isFeatureAllowedForUser(item, user)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [rawCatalog, user]);

  // Flattened array of all available items across categories for easy lookup
  const allFeaturesList = useMemo<FeatureItem[]>(() => {
    if (featureCatalog && featureCatalog.length > 0) {
      const list: FeatureItem[] = [];
      featureCatalog.forEach((category: FeatureCategory) => {
        if (Array.isArray(category.items)) {
          list.push(...category.items);
        }
      });
      if (list.length > 0) return list;
    }
    return (ALL_AVAILABLE_FEATURES as FeatureItem[]).filter((item) =>
      isFeatureAllowedForUser(item, user)
    );
  }, [featureCatalog, user]);

  // Role-filtered active quick action IDs
  const effectiveQuickActionIds = useMemo<string[]>(() => {
    const roleDefaults = getRoleDefaultQuickActions(user);
    const candidateIds =
      activeQuickActions && activeQuickActions.length > 0 ? activeQuickActions : roleDefaults;

    // Filter candidate IDs to strictly only those permitted for the user's active role
    const allowedIds = candidateIds.filter((id) => {
      const item =
        allFeaturesList.find((f) => f.id === id) ||
        ALL_AVAILABLE_FEATURES.find((f) => f.id === id);
      return item ? isFeatureAllowedForUser(item, user) : false;
    });

    if (allowedIds.length >= 5) {
      return allowedIds.slice(0, 5);
    }

    // Backfill with role-permitted defaults
    const permittedDefaults = roleDefaults.filter((id) => {
      const item =
        allFeaturesList.find((f) => f.id === id) ||
        ALL_AVAILABLE_FEATURES.find((f) => f.id === id);
      return item ? isFeatureAllowedForUser(item, user) : false;
    });

    const combined = Array.from(new Set([...allowedIds, ...permittedDefaults]));
    if (combined.length >= 5) {
      return combined.slice(0, 5);
    }

    // Secondary backfill from all permitted features
    const allPermitted = allFeaturesList.map((item) => item.id);
    return Array.from(new Set([...combined, ...allPermitted])).slice(0, 5);
  }, [activeQuickActions, user, allFeaturesList]);

  // Equipped active quick action items (slots 1 through 5)
  const equippedFeatures = useMemo<FeatureItem[]>(() => {
    const itemMap = new Map<string, FeatureItem>();
    allFeaturesList.forEach((item) => itemMap.set(item.id, item));
    ALL_AVAILABLE_FEATURES.forEach((item) => {
      if (!itemMap.has(item.id)) {
        itemMap.set(item.id, item as FeatureItem);
      }
    });

    return effectiveQuickActionIds
      .map((id) => itemMap.get(id))
      .filter((item): item is FeatureItem => Boolean(item && isFeatureAllowedForUser(item, user)))
      .slice(0, 5);
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
