import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/src/store/store';
import {
  fetchDirectory,
  setSearchQuery,
  setActiveTab,
} from '../store/directorySlice';
import { Alert, Linking } from 'react-native';

export const useDirectory = () => {
  const dispatch = useDispatch<AppDispatch>();
  const directoryState = useSelector((state: RootState) => (state as any).directory);
  const {
    members = [],
    pagination = { currentPage: 1, totalPages: 1, totalRecords: 0, limit: 50 },
    searchQuery = '',
    activeTab = 'all',
    loading = false,
    refreshing = false,
    error = null,
  } = directoryState || {};

  const safeMembers = Array.isArray(members) ? members : [];

  const loadData = useCallback(
    (page = 1, isRefreshing = false) => {
      const validRoles = ['resident', 'guard', 'staff', 'admin'];
      const roleFilter = validRoles.includes(activeTab.toLowerCase()) ? activeTab.toLowerCase() : undefined;

      dispatch(
        fetchDirectory({
          role: roleFilter,
          search: searchQuery.trim() || undefined,
          page,
          limit: 50,
          refreshing: isRefreshing,
        })
      );
    },
    [dispatch, activeTab, searchQuery]
  );

  useEffect(() => {
    // Debounced search / tab change trigger
    const timer = setTimeout(() => {
      loadData(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    loadData(1, true);
  }, [loadData]);

  const handleLoadMore = useCallback(() => {
    if (!loading && (pagination?.currentPage || 1) < (pagination?.totalPages || 1)) {
      loadData((pagination?.currentPage || 1) + 1);
    }
  }, [loading, pagination, loadData]);

  const handleCall = useCallback((phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  }, []);

  const handleIntercom = useCallback((intercom: string) => {
    if (!intercom) return;
    Alert.alert(
      'Calling Community Intercom',
      `Initiating direct voice intercom call to Unit #${intercom}...`,
      [{ text: 'End Call', style: 'cancel' }]
    );
  }, []);

  return {
    members: safeMembers,
    pagination,
    searchQuery,
    setSearchQuery: (q: string) => dispatch(setSearchQuery(q)),
    activeTab,
    setActiveTab: (t: string) => dispatch(setActiveTab(t)),
    loading,
    refreshing,
    error,
    totalCount: pagination?.totalRecords ?? safeMembers.length,
    onRefresh: handleRefresh,
    onLoadMore: handleLoadMore,
    onCall: handleCall,
    onIntercom: handleIntercom,
  };
};

export default useDirectory;
