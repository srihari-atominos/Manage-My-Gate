import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import communityPulseService from '../services/communityPulseService';
import {
  CommunityPulseState,
  PulseItem,
  CommunityMoodOption,
  PulseCategory,
} from '../types/communityPulseTypes';

const initialState: CommunityPulseState = {
  activePulses: [],
  userActivePulse: null,
  communityMood: {
    userVote: null,
    totalResponses: 141,
    results: [],
  },
  dailyQuestion: null,
  userInterests: ['badminton', 'coffee', 'walking'],
  loading: false,
  error: null,
};

export const fetchPulsesThunk = createAsyncThunk(
  'communityPulse/fetchPulses',
  async (_, { rejectWithValue }) => {
    try {
      const data = await communityPulseService.fetchActivePulses();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load pulses');
    }
  }
);

export const createPulseThunk = createAsyncThunk(
  'communityPulse/createPulse',
  async (
    payload: { text: string; contextText?: string; emoji?: string; category?: PulseCategory; userName?: string; userVilla?: string },
    { rejectWithValue }
  ) => {
    try {
      const newPulse = await communityPulseService.createPulse(payload);
      return newPulse;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to create pulse');
    }
  }
);

export const removePulseThunk = createAsyncThunk(
  'communityPulse/removePulse',
  async (pulseId: string, { rejectWithValue }) => {
    try {
      await communityPulseService.removePulse(pulseId);
      return pulseId;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to remove pulse');
    }
  }
);

export const fetchDailyQuestionThunk = createAsyncThunk(
  'communityPulse/fetchDailyQuestion',
  async (_, { rejectWithValue }) => {
    try {
      const data = await communityPulseService.fetchDailyQuestion();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch daily question');
    }
  }
);

export const voteDailyQuestionThunk = createAsyncThunk(
  'communityPulse/voteDailyQuestion',
  async (optionId: string, { rejectWithValue }) => {
    try {
      const data = await communityPulseService.voteDailyQuestion(optionId);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to vote on question');
    }
  }
);

export const fetchCommunityMoodThunk = createAsyncThunk(
  'communityPulse/fetchCommunityMood',
  async (_, { rejectWithValue }) => {
    try {
      const data = await communityPulseService.fetchCommunityMood();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch community mood');
    }
  }
);

export const voteCommunityMoodThunk = createAsyncThunk(
  'communityPulse/voteCommunityMood',
  async (option: CommunityMoodOption, { rejectWithValue }) => {
    try {
      const data = await communityPulseService.voteCommunityMood(option);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to vote on mood');
    }
  }
);

export const fetchInterestsThunk = createAsyncThunk(
  'communityPulse/fetchInterests',
  async (_, { rejectWithValue }) => {
    try {
      const data = await communityPulseService.fetchUserInterests();
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch interests');
    }
  }
);

export const saveInterestsThunk = createAsyncThunk(
  'communityPulse/saveInterests',
  async (interests: string[], { rejectWithValue }) => {
    try {
      const data = await communityPulseService.saveUserInterests(interests);
      return data;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to save interests');
    }
  }
);

const communityPulseSlice = createSlice({
  name: 'communityPulse',
  initialState,
  reducers: {
    clearPulseError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Pulses
      .addCase(fetchPulsesThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPulsesThunk.fulfilled, (state, action: PayloadAction<PulseItem[]>) => {
        state.loading = false;
        state.activePulses = action.payload;
        const myPulse = action.payload.find((p) => p.userId === 'u_current');
        state.userActivePulse = myPulse || null;
      })
      .addCase(fetchPulsesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create Pulse
      .addCase(createPulseThunk.fulfilled, (state, action: PayloadAction<PulseItem>) => {
        state.activePulses = [action.payload, ...state.activePulses];
        state.userActivePulse = action.payload;
      })
      // Remove Pulse
      .addCase(removePulseThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.activePulses = state.activePulses.filter((p) => p.id !== action.payload);
        if (state.userActivePulse?.id === action.payload) {
          state.userActivePulse = null;
        }
      })
      // Daily Question
      .addCase(fetchDailyQuestionThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.dailyQuestion = action.payload;
      })
      .addCase(voteDailyQuestionThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.dailyQuestion = action.payload;
      })
      // Community Mood
      .addCase(fetchCommunityMoodThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.communityMood = action.payload;
      })
      .addCase(voteCommunityMoodThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.communityMood = action.payload;
      })
      // User Interests
      .addCase(fetchInterestsThunk.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.userInterests = action.payload;
      })
      .addCase(saveInterestsThunk.fulfilled, (state, action: PayloadAction<string[]>) => {
        state.userInterests = action.payload;
      });
  },
});

export const { clearPulseError } = communityPulseSlice.actions;
export default communityPulseSlice.reducer;
