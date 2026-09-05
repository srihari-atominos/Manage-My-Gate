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
  categoryKey?: string;
  categoryName?: string;
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
  activeQuickActions: string[] | null;
  isCustomized?: boolean;
  featureCatalog: FeatureCategory[];
}

export const fetchQuickActions = async (
  context?: { orgId?: string; villaId?: string }
): Promise<UserPreferencesResponse> => {
  const params: any = {};
  if (context?.orgId) params.orgId = context.orgId;
  if (context?.villaId) params.villaId = context.villaId;

  const response = await apiClient.get('/users/preferences', { params });
  const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
  const innerData = body?.data || body;
  return innerData as UserPreferencesResponse;
};

export const updateQuickActions = async (
  activeQuickActions: string[],
  context?: { orgId?: string; villaId?: string }
): Promise<UserPreferencesResponse> => {
  const payload: any = { activeQuickActions };
  if (context?.orgId) payload.orgId = context.orgId;
  if (context?.villaId) payload.villaId = context.villaId;

  const response = await apiClient.patch('/users/preferences/quick-actions', payload);
  const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
  const innerData = body?.data || body;
  return innerData as UserPreferencesResponse;
};

const dashboardService = {
  fetchQuickActions,
  updateQuickActions,
};

export default dashboardService;
