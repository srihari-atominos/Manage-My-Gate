import apiClient from '@/src/services/apiClient';
import { CommunityNote, CreateNotePayload } from '../types/communityNoteTypes';

export const communityNoteApi = {
  async createNote(payload: CreateNotePayload): Promise<CommunityNote> {
    const response = await apiClient.post('/community-notes', payload);
    return response.data?.data || response.data;
  },

  async getMyActiveNote(): Promise<CommunityNote | null> {
    const response = await apiClient.get('/community-notes/my');
    return response.data?.data || null;
  },

  async deleteNote(noteId: string): Promise<boolean> {
    await apiClient.delete(`/community-notes/${noteId}`);
    return true;
  },
};

export default communityNoteApi;
