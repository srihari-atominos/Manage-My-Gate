import apiClient from '@/src/services/apiClient';
import { DirectoryResponse } from '../types/directoryTypes';

export const directoryApi = {
  async fetchDirectory(params: {
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<DirectoryResponse> {
    const res: any = await apiClient.get('/directory', { params });
    // apiClient interceptor already returns response.data (the backend response object)
    if (res && Array.isArray(res.data)) {
      return {
        success: res.success ?? true,
        data: res.data,
        pagination: res.pagination || {
          currentPage: params.page || 1,
          totalPages: 1,
          totalRecords: res.data.length,
          limit: params.limit || 50,
        },
      };
    }
    // Fallback if res itself is the data array
    if (Array.isArray(res)) {
      return {
        success: true,
        data: res,
        pagination: {
          currentPage: params.page || 1,
          totalPages: 1,
          totalRecords: res.length,
          limit: params.limit || 50,
        },
      };
    }
    return {
      success: false,
      data: [],
      pagination: {
        currentPage: params.page || 1,
        totalPages: 1,
        totalRecords: 0,
        limit: params.limit || 50,
      },
    };
  },
};

export default directoryApi;

