import apiClient from '../../../services/apiClient';

export interface ProviderCatalogField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  default?: any;
}

export interface ProviderCatalogItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  fields: ProviderCatalogField[];
}

export interface IntegrationConnection {
  id: string;
  provider: string;
  accountLabel: string;
  status: 'connected' | 'error' | 'disconnected';
  createdAt?: string;
  updatedAt?: string;
}

export const integrationHubApi = {
  fetchCatalog: async (): Promise<ProviderCatalogItem[]> => {
    const response = await apiClient.get('/integrations/catalog');
    return response.data?.data || response.data;
  },

  fetchConnections: async (
    provider?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: IntegrationConnection[]; total: number; page: number; pages: number }> => {
    const params: Record<string, any> = { page, limit };
    if (provider && provider !== 'all') {
      params.provider = provider;
    }
    const response = await apiClient.get('/integrations', { params });
    const payload = response.data;
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length, page: 1, pages: 1 };
    }
    return {
      data: payload.data || payload.connections || [],
      total: payload.totalRecords || payload.total || 0,
      page: payload.currentPage || payload.page || page,
      pages: payload.totalPages || payload.pages || 1,
    };
  },

  createConnection: async (payload: {
    provider: string;
    accountLabel: string;
    credentials: Record<string, any>;
  }): Promise<IntegrationConnection> => {
    const response = await apiClient.post('/integrations/connect', payload);
    return response.data?.data || response.data;
  },

  updateConnectionLabel: async (id: string, accountLabel: string): Promise<IntegrationConnection> => {
    const response = await apiClient.put(`/integrations/${id}`, { accountLabel });
    return response.data?.data || response.data;
  },

  deleteConnection: async (id: string): Promise<void> => {
    await apiClient.delete(`/integrations/${id}`);
  },
};

export default integrationHubApi;
