import apiClient from '../../../services/apiClient';

export const noticeBoardService = {
  getNotices: async (search: string = '', filters: any = {}, pagination: any = {}, sort: any = {}) => {
    const params = new URLSearchParams();

    if (search) params.append('search', search);
    if (filters.category) params.append('category', filters.category);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (filters.isPinned) params.append('isPinned', filters.isPinned);
    if (filters.isBookmarked) params.append('isBookmarked', filters.isBookmarked);
    if (filters.readStatus) params.append('readStatus', filters.readStatus);

    if (pagination.currentPage) params.append('page', pagination.currentPage);
    if (pagination.limit) params.append('limit', pagination.limit);

    if (sort.sortBy) params.append('sortBy', sort.sortBy);
    if (sort.sortOrder) params.append('sortOrder', sort.sortOrder);

    const queryString = params.toString();
    const url = `/notices${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getNoticeById: async (id: string) => {
    const response = await apiClient.get(`/notices/${id}`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  createNotice: async (noticeData: any) => {
    const response = await apiClient.post('/notices', noticeData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  updateNotice: async (id: string, noticeData: any) => {
    const response = await apiClient.put(`/notices/${id}`, noticeData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  deleteNotice: async (id: string) => {
    const response = await apiClient.delete(`/notices/${id}`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  togglePin: async (id: string, isPinned: boolean) => {
    const response = await apiClient.patch(`/notices/${id}/pin`, { isPinned });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  markAsRead: async (id: string) => {
    const response = await apiClient.patch(`/notices/${id}/read`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  bookmarkNotice: async (id: string, isBookmarked: boolean) => {
    const response = await apiClient.patch(`/notices/${id}/bookmark`, { isBookmarked });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },

  getNoticeStats: async () => {
    const response = await apiClient.get('/notices/stats');
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    return body?.data || body;
  },
};

export default noticeBoardService;
