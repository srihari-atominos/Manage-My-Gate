import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import communityNoteApi from '../services/communityNoteApi';
import { CommunityNote, CreateNotePayload } from '../types/communityNoteTypes';

export interface CommunityNoteState {
  myActiveNote: CommunityNote | null;
  loading: boolean;
  error: string | null;
}

const initialState: CommunityNoteState = {
  myActiveNote: null,
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
      .addCase(createCommunityNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCommunityNote.fulfilled, (state, action) => {
        state.loading = false;
        state.myActiveNote = action.payload;
      })
      .addCase(createCommunityNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteCommunityNote.fulfilled, (state) => {
        state.myActiveNote = null;
      });
  },
});

export const { setMyActiveNote } = communityNoteSlice.actions;
export default communityNoteSlice.reducer;
