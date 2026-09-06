import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { pollApi } from '../services/pollApi';

// Types
export interface PollOption {
  _id?: string;
  text: string;
  votesCount: number;
}

export interface Poll {
  _id: string;
  title: string;
  description?: string;
  options: PollOption[];
  status: 'Active' | 'Closed' | 'Draft';
  hasVoted?: boolean;
  votedOptionIndex?: number | null;
  createdBy: any;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface PollStateList {
  data: Poll[];
  total: number;
  loading: boolean;
  error: string | null;
}

export interface PollState {
  activePolls: PollStateList;
  closedPolls: PollStateList;
  myPolls: PollStateList;
}

// Thunks
export const fetchActivePolls = createAsyncThunk(
  'poll/fetchActivePolls',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await pollApi.getActivePolls(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch active polls');
    }
  }
);

export const fetchClosedPolls = createAsyncThunk(
  'poll/fetchClosedPolls',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await pollApi.getClosedPolls(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch closed polls');
    }
  }
);

export const fetchMyPolls = createAsyncThunk(
  'poll/fetchMyPolls',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await pollApi.getMyPolls(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch my polls');
    }
  }
);

export const createPoll = createAsyncThunk(
  'poll/createPoll',
  async (pollData: any, { rejectWithValue }) => {
    try {
      const response = await pollApi.createPoll(pollData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create poll');
    }
  }
);

export const voteOnPoll = createAsyncThunk(
  'poll/voteOnPoll',
  async ({ id, optionIndex }: { id: string; optionIndex: number }, { rejectWithValue }) => {
    try {
      const response = await pollApi.voteOnPoll(id, optionIndex);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to record vote');
    }
  }
);

export const DEFAULT_MOCK_POLLS: Poll[] = [
  {
    _id: 'poll_mock_01',
    title: 'Installation of 8 Additional Fast EV Charging Stations in Basement 2',
    description: 'Should the society allocate reserve funds to install 8 dedicated 22kW AC EV charging bays?',
    options: [
      { text: 'Yes, strongly approve (allocate funds)', votesCount: 78 },
      { text: 'No, postpone to next fiscal year', votesCount: 14 },
      { text: 'Neutral / Need more vendor quotes', votesCount: 6 },
    ],
    status: 'Active',
    hasVoted: false,
    createdBy: { name: 'Managing Committee' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    _id: 'poll_mock_02',
    title: 'Extension of Clubhouse & Gym Weekend Operating Hours',
    description: 'Proposal to extend Saturday and Sunday closing time from 10:00 PM to 11:30 PM.',
    options: [
      { text: 'Agree - Extend till 11:30 PM', votesCount: 112 },
      { text: 'Disagree - Keep existing 10:00 PM', votesCount: 23 },
    ],
    status: 'Active',
    hasVoted: true,
    votedOptionIndex: 0,
    createdBy: { name: 'Sports & Amenities Sub-committee' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

const initialState: PollState = {
  activePolls: { data: DEFAULT_MOCK_POLLS, total: DEFAULT_MOCK_POLLS.length, loading: false, error: null },
  closedPolls: { data: [], total: 0, loading: false, error: null },
  myPolls: { data: DEFAULT_MOCK_POLLS, total: DEFAULT_MOCK_POLLS.length, loading: false, error: null },
};

const updatePollInList = (list: Poll[], updatedPoll: Poll) => {
  const index = list.findIndex((p) => p._id === updatedPoll._id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updatedPoll };
  }
};

const pollSlice = createSlice({
  name: 'poll',
  initialState,
  reducers: {
    pollCreatedSocket: (state, action: PayloadAction<Poll>) => {
      const poll = action.payload;
      if (poll.status === 'Active') {
        state.activePolls.data.unshift(poll);
        state.activePolls.total += 1;
      }
    },
    pollUpdatedSocket: (state, action: PayloadAction<Poll>) => {
      const poll = action.payload;
      updatePollInList(state.activePolls.data, poll);
      updatePollInList(state.closedPolls.data, poll);
      updatePollInList(state.myPolls.data, poll);
    },
    pollPublishedSocket: (state, action: PayloadAction<Poll>) => {
      const poll = action.payload;
      const exists = state.activePolls.data.find((p) => p._id === poll._id);
      if (!exists) {
        state.activePolls.data.unshift(poll);
        state.activePolls.total += 1;
      }
      updatePollInList(state.myPolls.data, poll);
    },
    pollClosedSocket: (state, action: PayloadAction<Poll>) => {
      const poll = action.payload;
      state.activePolls.data = state.activePolls.data.filter((p) => p._id !== poll._id);
      const exists = state.closedPolls.data.find((p) => p._id === poll._id);
      if (!exists) {
        state.closedPolls.data.unshift(poll);
        state.closedPolls.total += 1;
      }
      updatePollInList(state.myPolls.data, poll);
    },
    pollVoteAddedSocket: (state, action: PayloadAction<{ poll: Poll; residentId: string; optionIndex: number; currentUserId?: string }>) => {
      const { poll, residentId, optionIndex, currentUserId } = action.payload;
      const pollUpdate = { ...poll };
      if (residentId === currentUserId && currentUserId) {
        pollUpdate.hasVoted = true;
        pollUpdate.votedOptionIndex = optionIndex;
      }
      updatePollInList(state.activePolls.data, pollUpdate);
      updatePollInList(state.myPolls.data, pollUpdate);
      updatePollInList(state.closedPolls.data, pollUpdate);
    },
    pollVoteRemovedSocket: (state, action: PayloadAction<{ poll: Poll; residentId: string; currentUserId?: string }>) => {
      const { poll, residentId, currentUserId } = action.payload;
      const pollUpdate = { ...poll };
      if (residentId === currentUserId && currentUserId) {
        pollUpdate.hasVoted = false;
        pollUpdate.votedOptionIndex = null;
      }
      updatePollInList(state.activePolls.data, pollUpdate);
      updatePollInList(state.myPolls.data, pollUpdate);
      updatePollInList(state.closedPolls.data, pollUpdate);
    },
    pollDeletedSocket: (state, action: PayloadAction<{ pollId: string }>) => {
      const { pollId } = action.payload;
      const filterOut = (listState: PollStateList) => {
        const initialLength = listState.data.length;
        listState.data = listState.data.filter((p) => p._id !== pollId);
        if (listState.data.length < initialLength) {
          listState.total = Math.max(0, listState.total - 1);
        }
      };
      filterOut(state.activePolls);
      filterOut(state.closedPolls);
      filterOut(state.myPolls);
    },
  },
  extraReducers: (builder) => {
    // Active Polls
    builder.addCase(fetchActivePolls.pending, (state) => {
      state.activePolls.loading = true;
      state.activePolls.error = null;
    });
    builder.addCase(fetchActivePolls.fulfilled, (state, action) => {
      state.activePolls.loading = false;
      state.activePolls.data = action.payload.polls || [];
      state.activePolls.total = action.payload.totalCount || 0;
    });
    builder.addCase(fetchActivePolls.rejected, (state, action) => {
      state.activePolls.loading = false;
      state.activePolls.error = action.payload as string;
    });

    // Closed Polls
    builder.addCase(fetchClosedPolls.pending, (state) => {
      state.closedPolls.loading = true;
      state.closedPolls.error = null;
    });
    builder.addCase(fetchClosedPolls.fulfilled, (state, action) => {
      state.closedPolls.loading = false;
      state.closedPolls.data = action.payload.polls || [];
      state.closedPolls.total = action.payload.totalCount || 0;
    });
    builder.addCase(fetchClosedPolls.rejected, (state, action) => {
      state.closedPolls.loading = false;
      state.closedPolls.error = action.payload as string;
    });

    // My Polls
    builder.addCase(fetchMyPolls.pending, (state) => {
      state.myPolls.loading = true;
      state.myPolls.error = null;
    });
    builder.addCase(fetchMyPolls.fulfilled, (state, action) => {
      state.myPolls.loading = false;
      state.myPolls.data = action.payload.polls || [];
      state.myPolls.total = action.payload.totalCount || 0;
    });
    builder.addCase(fetchMyPolls.rejected, (state, action) => {
      state.myPolls.loading = false;
      state.myPolls.error = action.payload as string;
    });

    // Handle vote optimistically or just trust backend response. The web slice does some optimistic updates but handles .fulfilled directly.
    builder.addCase(voteOnPoll.fulfilled, (state, action) => {
      const poll = action.payload;
      updatePollInList(state.activePolls.data, poll);
      updatePollInList(state.myPolls.data, poll);
      updatePollInList(state.closedPolls.data, poll);
    });
  },
});

export const {
  pollCreatedSocket,
  pollUpdatedSocket,
  pollPublishedSocket,
  pollClosedSocket,
  pollVoteAddedSocket,
  pollVoteRemovedSocket,
  pollDeletedSocket,
} = pollSlice.actions;

export default pollSlice.reducer;
