import apiClient from '../../services/apiClient';

export interface FeatureItem {
  id: string;
  name: string;
  subtitle?: string;
  iconName: string;
  colorBg: string;
  colorIcon: string;
  route: string;
  permission?: string;
  badge?: string;
  badgeColor?: string;
}

export interface FeatureCategory {
  categoryKey: string;
  categoryName: string;
  actionButton?: {
    label: string;
    type: 'alert' | 'link';
    action?: string;
    route?: string;
  };
  items: FeatureItem[];
}

export interface UserPreferencesResponse {
  activeQuickActions: string[];
  featureCatalog: FeatureCategory[];
}

export const fetchQuickActions = async (): Promise<UserPreferencesResponse> => {
  const response = await apiClient.get('/users/preferences');
  const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
  const innerData = body?.data || body;
  return innerData as UserPreferencesResponse;
};

export const updateQuickActions = async (
  activeQuickActions: string[]
): Promise<UserPreferencesResponse> => {
  const response = await apiClient.patch('/users/preferences/quick-actions', {
    activeQuickActions,
  });
  const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
  const innerData = body?.data || body;
  return innerData as UserPreferencesResponse;
};

const dashboardService = {
  fetchQuickActions,
  updateQuickActions,
};

export default dashboardService;
