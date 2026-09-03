import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import communityNoteApi from '../services/communityNoteApi';
import { CommunityNote, CreateNotePayload } from '../types/communityNoteTypes';

export interface CommunityNoteState {
  myActiveNote: CommunityNote | null;
  activeNotes: CommunityNote[];
  loading: boolean;
  error: string | null;
}

const initialState: CommunityNoteState = {
  myActiveNote: null,
  activeNotes: [],
  loading: false,
  error: null,
};

export const fetchMyActiveNote = createAsyncThunk(
  'communityNote/fetchMyActiveNote',
  async (_, { rejectWithValue }) => {
    try {
      return await communityNoteApi.getMyActiveNote();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch active note');
    }
  }
);

export const fetchActiveNotes = createAsyncThunk(
  'communityNote/fetchActiveNotes',
  async (_, { rejectWithValue }) => {
    try {
      return await communityNoteApi.getActiveNotes();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch active notes');
    }
  }
);

export const createCommunityNote = createAsyncThunk(
  'communityNote/createCommunityNote',
  async (payload: CreateNotePayload, { rejectWithValue }) => {
    try {
      return await communityNoteApi.createNote(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to publish note');
    }
  }
);

export const deleteCommunityNote = createAsyncThunk(
  'communityNote/deleteCommunityNote',
  async (noteId: string, { rejectWithValue }) => {
    try {
      await communityNoteApi.deleteNote(noteId);
      return noteId;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to delete note');
    }
  }
);

const communityNoteSlice = createSlice({
  name: 'communityNote',
  initialState,
  reducers: {
    setMyActiveNote(state, action: PayloadAction<CommunityNote | null>) {
      state.myActiveNote = action.payload;
    },
    noteCreatedRealtime(state, action: PayloadAction<CommunityNote>) {
      const newNote = action.payload;
      if (!newNote) return;

      const newNoteId = newNote._id || newNote.id;
      const newNoteUserId = typeof newNote.userId === 'object' ? (newNote.userId as any)._id : newNote.userId;

      state.activeNotes = [
        newNote,
        ...state.activeNotes.filter((n) => {
          const currentId = n._id || n.id;
          const currentUserId = typeof n.userId === 'object' ? (n.userId as any)._id : n.userId;
          if (currentId && currentId === newNoteId) return false;
          if (currentUserId && newNoteUserId && String(currentUserId) === String(newNoteUserId)) return false;
          return true;
        }),
      ];
    },
    noteExpiredRealtime(state, action: PayloadAction<{ noteId: string; userId?: string }>) {
      const { noteId, userId } = action.payload || {};
      state.activeNotes = state.activeNotes.filter((n) => {
        const currentId = n._id || n.id;
        const currentUserId = typeof n.userId === 'object' ? (n.userId as any)._id : n.userId;
        if (noteId && currentId === noteId) return false;
        if (userId && currentUserId && String(currentUserId) === String(userId)) return false;
        return true;
      });
      if (
        state.myActiveNote &&
        ((noteId && (state.myActiveNote._id === noteId || state.myActiveNote.id === noteId)) ||
          (userId && state.myActiveNote.userId === userId))
      ) {
        state.myActiveNote = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyActiveNote.fulfilled, (state, action) => {
        state.myActiveNote = action.payload;
      })
      .addCase(fetchActiveNotes.fulfilled, (state, action) => {
        state.activeNotes = action.payload || [];
      })
      .addCase(createCommunityNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCommunityNote.fulfilled, (state, action) => {
        state.loading = false;
        state.myActiveNote = action.payload;
        const newNote = action.payload;
        if (newNote) {
          const newNoteId = newNote._id || newNote.id;
          const newNoteUserId = typeof newNote.userId === 'object' ? (newNote.userId as any)._id : newNote.userId;

          state.activeNotes = [
            newNote,
            ...state.activeNotes.filter((n) => {
              const currentId = n._id || n.id;
              const currentUserId = typeof n.userId === 'object' ? (n.userId as any)._id : n.userId;
              if (currentId && currentId === newNoteId) return false;
              if (currentUserId && newNoteUserId && String(currentUserId) === String(newNoteUserId)) return false;
              return true;
            }),
          ];
        }
      })
      .addCase(createCommunityNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCommunityNote.fulfilled, (state, action) => {
        const deletedId = action.payload;
        if (state.myActiveNote && (state.myActiveNote._id === deletedId || state.myActiveNote.id === deletedId)) {
          state.myActiveNote = null;
        }
        state.activeNotes = state.activeNotes.filter((n) => (n._id || n.id) !== deletedId);
      });
  },
});

export const { setMyActiveNote, noteCreatedRealtime, noteExpiredRealtime } = communityNoteSlice.actions;
export default communityNoteSlice.reducer;
