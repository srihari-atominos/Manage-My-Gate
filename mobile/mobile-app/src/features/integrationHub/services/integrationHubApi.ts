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
  /** 'platform' providers are only offered to platform administrators (the server hides them from communities). */
  scope?: 'platform' | 'community';
  fields: ProviderCatalogField[];
}

export interface ConnectionCheck {
  ok: boolean | null;
  at?: string | null;
  message?: string;
}

export interface IntegrationConnection {
  id: string;
  provider: string;
  accountLabel: string;
  status: 'connected' | 'disconnected';
  /** Names (never values) of the credentials that are stored. */
  configuredKeys?: string[];
  /** Result of the last verification with the provider. */
  lastCheck?: ConnectionCheck | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateConnectionPayload {
  accountLabel?: string;
  /** Only fields that should change; blank/missing ones keep the stored value. */
  credentials?: Record<string, string>;
}

export const integrationHubApi = {
  fetchCatalog: async (): Promise<ProviderCatalogItem[]> => {
    const response: any = await apiClient.get('/integrations/catalog');
    const payload = response?.data ?? response;
    return Array.isArray(payload) ? payload : payload?.data || [];
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
    const response: any = await apiClient.get('/integrations', { params });
    const payload = response?.data ?? response;
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length, page: 1, pages: 1 };
    }
    // The server answers { data: [...], pagination: { totalRecords, currentPage, totalPages } }
    const pagination = payload?.pagination || payload || {};
    const data = payload?.data || payload?.connections || [];
    return {
      data,
      total: pagination.totalRecords ?? pagination.total ?? data.length,
      page: pagination.currentPage ?? pagination.page ?? page,
      pages: pagination.totalPages ?? pagination.pages ?? 1,
    };
  },

  createConnection: async (payload: {
    provider: string;
    accountLabel: string;
    credentials: Record<string, any>;
  }): Promise<IntegrationConnection> => {
    const response: any = await apiClient.post('/integrations/connect', payload);
    return response?.data ?? response;
  },

  updateConnection: async (id: string, payload: UpdateConnectionPayload): Promise<IntegrationConnection> => {
    const response: any = await apiClient.put(`/integrations/${id}`, payload);
    return response?.data ?? response;
  },

  /** Re-verifies the stored credentials with the provider. */
  testConnection: async (id: string): Promise<ConnectionCheck & { id: string; provider: string }> => {
    const response: any = await apiClient.post(`/integrations/${id}/test`);
    return response?.data ?? response;
  },

  deleteConnection: async (id: string): Promise<void> => {
    await apiClient.delete(`/integrations/${id}`);
  },
};

export default integrationHubApi;
