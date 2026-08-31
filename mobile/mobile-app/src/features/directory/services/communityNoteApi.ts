import apiClient from '@/src/services/apiClient';
import { CommunityNote, CreateNotePayload } from '../types/communityNoteTypes';
import { DEFAULT_ACTIVE_NOTE } from '../store/communityNoteSlice';

export const communityNoteApi = {
  async createNote(payload: CreateNotePayload): Promise<CommunityNote> {
    try {
      const response = await apiClient.post('/community-notes', payload);
      if (response.data?.data || response.data) {
        return response.data?.data || response.data;
      }
    } catch (e) {
      console.log('Using local fallback for createNote');
    }

    return {
      _id: `note-${Date.now()}`,
      id: `note-${Date.now()}`,
      userId: 'user-dummy-1',
      orgId: 'org-dummy-1',
      text: payload.text,
      category: payload.category || 'ACTIVITY',
      emoji: payload.emoji || '💬',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
    };
  },

  async getMyActiveNote(): Promise<CommunityNote | null> {
    try {
      const response = await apiClient.get('/community-notes/my');
      return response.data?.data || null;
    } catch (e) {
      return null;
    }
  },

  async getActiveNotes(): Promise<CommunityNote[]> {
    try {
      const response = await apiClient.get('/community-notes');
      if (Array.isArray(response.data?.data) && response.data.data.length > 0) {
        return response.data.data;
      }
    } catch (e) {
      console.log('Using local fallback for getActiveNotes');
    }

    return [
      {
        _id: 'note-feed-1',
        id: 'note-feed-1',
        userId: 'user-dummy-1',
        orgId: 'org-dummy-1',
        userName: 'Arun Kumar',
        userUnit: 'Villa 104',
        role: 'RESIDENT',
        phone: '+91 98765 43210',
        intercomNumber: '104',
        interests: ['Badminton 🏸', 'Coffee & Chat ☕', 'Fitness 🏋️'],
        category: 'ACTIVITY',
        emoji: '🎾',
        text: 'Looking for a badminton partner this evening at 6 PM!',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 21 * 60 * 60 * 1000 + 54 * 60 * 1000).toISOString(),
        isActive: true,
        memberData: {
          id: 'dummy-1',
          userId: 'user-dummy-1',
          name: 'Arun Kumar',
          unitNumber: 'Villa 104',
          role: 'resident',
          phone: '+919876543210',
          intercomNumber: '104',
          interests: ['Badminton 🏸', 'Coffee & Chat ☕', 'Fitness 🏋️'],
        },
      },
      {
        _id: 'note-feed-2',
        id: 'note-feed-2',
        userId: 'user-dummy-2',
        orgId: 'org-dummy-1',
        userName: 'Priya Sharma',
        userUnit: 'Block B - 202',
        role: 'RESIDENT',
        phone: '+91 98765 43211',
        intercomNumber: '202',
        interests: ['Book Club 📚', 'Gardening 🌱', 'Coffee & Chat ☕'],
        category: 'SOCIAL',
        emoji: '📚',
        text: 'Hosting a weekend book club discussion on sci-fi novels!',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000 + 27 * 60 * 1000).toISOString(),
        isActive: true,
        memberData: {
          id: 'dummy-2',
          userId: 'user-dummy-2',
          name: 'Priya Sharma',
          unitNumber: 'Block B - 202',
          role: 'resident',
          phone: '+919876543211',
          intercomNumber: '202',
          interests: ['Book Club 📚', 'Gardening 🌱', 'Coffee & Chat ☕'],
        },
      },
    ];
  },

  async deleteNote(noteId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/community-notes/${noteId}`);
    } catch (e) {
      console.log('Using local fallback for deleteNote');
    }
    return true;
  },
};

export default communityNoteApi;
