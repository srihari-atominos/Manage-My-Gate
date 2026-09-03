import apiClient from '@/src/services/apiClient';
import { CommunityNote, CreateNotePayload } from '../types/communityNoteTypes';

export const communityNoteApi = {
  async createNote(payload: CreateNotePayload): Promise<CommunityNote> {
    const res: any = await apiClient.post('/community-notes', payload);
    const data = res?.data || res;
    if (data && (data._id || data.id || data.text)) {
      return data;
    }
    throw new Error(res?.message || 'Failed to create community note');
  },

  async getMyActiveNote(): Promise<CommunityNote | null> {
    try {
      const res: any = await apiClient.get('/community-notes/my');
      const data = res?.data;
      if (data && (data._id || data.id || data.text)) {
        return data;
      }
      return null;
    } catch (e) {
      console.error('Failed to fetch my active note:', e);
      return null;
    }
  },

  async getActiveNotes(): Promise<CommunityNote[]> {
    try {
      const res: any = await apiClient.get('/community-notes');
      const data = res?.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray(res)) {
        return res;
      }
      return [];
    } catch (e) {
      console.error('Failed to fetch active community notes:', e);
      return [];
    }
  },

  async deleteNote(noteId: string): Promise<boolean> {
    await apiClient.delete(`/community-notes/${noteId}`);
    return true;
  },
};

export default communityNoteApi;
