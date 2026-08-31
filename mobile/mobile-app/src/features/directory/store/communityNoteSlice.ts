import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import communityNoteApi from '../services/communityNoteApi';
import { CommunityNote, CreateNotePayload } from '../types/communityNoteTypes';

export interface CommunityNoteState {
  myActiveNote: CommunityNote | null;
  activeNotes: CommunityNote[];
  loading: boolean;
  error: string | null;
}

export const DEFAULT_ACTIVE_NOTE: CommunityNote = {
  _id: 'note-dummy-1',
  id: 'note-dummy-1',
  userId: 'user-dummy-1',
  orgId: 'org-dummy-1',
  text: 'Looking for a badminton partner this evening at 6 PM!',
  category: 'ACTIVITY',
  emoji: '🎾',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  expiresAt: new Date(Date.now() + 21 * 60 * 60 * 1000 + 57 * 60 * 1000).toISOString(),
  isActive: true,
};

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
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch active note');
    }
  }
);

export const fetchActiveNotes = createAsyncThunk(
  'communityNote/fetchActiveNotes',
  async (_, { rejectWithValue }) => {
    try {
      return await communityNoteApi.getActiveNotes();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch active notes');
    }
  }
);

export const createCommunityNote = createAsyncThunk(
  'communityNote/createCommunityNote',
  async (payload: CreateNotePayload, { rejectWithValue }) => {
    try {
      return await communityNoteApi.createNote(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to publish note');
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
      return rejectWithValue(err.response?.data?.message || 'Failed to delete note');
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
        if (action.payload) {
          state.activeNotes = [action.payload, ...state.activeNotes.filter((n) => n._id !== action.payload._id)];
        }
      })
      .addCase(createCommunityNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCommunityNote.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.myActiveNote = null;
        state.activeNotes = state.activeNotes.filter((n) => (n._id || n.id) !== deletedId);
      });
  },
});

export const { setMyActiveNote } = communityNoteSlice.actions;
export default communityNoteSlice.reducer;
