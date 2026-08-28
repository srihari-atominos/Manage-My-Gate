import apiClient from '@/src/services/apiClient';
import { Conversation, Message } from '../types/messagingTypes';

export const directoryMessagingApi = {
  async getOrCreateConversation(receiverId: string): Promise<Conversation> {
    const response = await apiClient.post('/directory-messages/conversation', { receiverId });
    return response.data?.data || response.data;
  },

  async fetchConversations(): Promise<Conversation[]> {
    const response = await apiClient.get('/directory-messages/conversations');
    return response.data?.data || [];
  },

  async sendMessage(payload: {
    receiverId?: string;
    conversationId?: string;
    text: string;
    messageType?: string;
  }): Promise<Message> {
    const response = await apiClient.post('/directory-messages/send', payload);
    return response.data?.data || response.data;
  },

  async fetchMessages(conversationId: string, page = 1, limit = 50): Promise<{ items: Message[]; total: number }> {
    const response = await apiClient.get(`/directory-messages/conversation/${conversationId}/messages`, {
      params: { page, limit },
    });
    return {
      items: response.data?.data || [],
      total: response.data?.pagination?.totalRecords || 0,
    };
  },

  async markAsRead(conversationId: string): Promise<boolean> {
    await apiClient.post(`/directory-messages/conversation/${conversationId}/read`);
    return true;
  },
};

export default directoryMessagingApi;
