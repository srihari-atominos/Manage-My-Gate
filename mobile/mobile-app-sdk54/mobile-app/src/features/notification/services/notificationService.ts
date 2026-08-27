import apiClient from '../../../services/apiClient';

export interface NotificationItemData {
  _id?: string;
  id?: string;
  title: string;
  body: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface GetNotificationsResponse {
  notifications: NotificationItemData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    unreadRecords: number;
  };
}

export const notificationService = {
  async getNotifications(page = 1, limit = 10): Promise<GetNotificationsResponse> {
    const response = await apiClient.get('/notifications', {
      params: { page, limit },
    });
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    const innerData = body?.data || body;

    const notifications: NotificationItemData[] = Array.isArray(innerData)
      ? innerData
      : (Array.isArray(innerData?.notifications) ? innerData.notifications : []);

    const pagination = innerData?.pagination || {
      currentPage: page,
      totalPages: 1,
      totalRecords: notifications.length,
      unreadRecords: notifications.filter((n) => !n.isRead).length,
    };

    return {
      notifications,
      pagination,
    };
  },

  async markAsRead(id: string): Promise<NotificationItemData> {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    const innerData = body?.data || body;
    return innerData as NotificationItemData;
  },

  async markAllAsRead(): Promise<{ matchedCount: number; modifiedCount: number }> {
    const response = await apiClient.patch('/notifications/read-all');
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    const innerData = body?.data || body;
    return innerData;
  },

  async deleteNotification(id: string): Promise<any> {
    const response = await apiClient.delete(`/notifications/${id}`);
    const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
    const innerData = body?.data || body;
    return innerData;
  },
};

export default notificationService;
