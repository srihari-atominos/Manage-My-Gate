import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { pollService, Poll } from '../services/pollService';

export interface PollListState {
  data: Poll[];
  total: number;
  loading: boolean;
  error: string | null;
}

interface PollState {
  activePolls: PollListState;
  closedPolls: PollListState;
  myPolls: PollListState;
  voters: Record<number, any[]>;
  votersLoading: boolean;
  votersError: string | null;
}

const initialState: PollState = {
  activePolls: { data: [], total: 0, loading: false, error: null },
  closedPolls: { data: [], total: 0, loading: false, error: null },
  myPolls: { data: [], total: 0, loading: false, error: null },
  voters: {},
  votersLoading: false,
  votersError: null,
};

// Async Thunks
export const fetchActivePolls = createAsyncThunk(
  'poll/fetchActivePolls',
  async (params: any | undefined, { rejectWithValue }) => {
    try {
      const response = await pollService.getActivePolls(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch active polls');
    }
  }
);

export const fetchClosedPolls = createAsyncThunk(
  'poll/fetchClosedPolls',
  async (params: any | undefined, { rejectWithValue }) => {
    try {
      const response = await pollService.getClosedPolls(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch closed polls');
    }
  }
);

export const fetchMyPolls = createAsyncThunk(
  'poll/fetchMyPolls',
  async (params: any | undefined, { rejectWithValue }) => {
    try {
      const response = await pollService.getMyPolls(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch my polls');
    }
  }
);

export const createPoll = createAsyncThunk(
  'poll/createPoll',
  async (pollData: any, { rejectWithValue }) => {
    try {
      const response = await pollService.createPoll(pollData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create poll');
    }
  }
);

export const voteOnPoll = createAsyncThunk(
  'poll/voteOnPoll',
  async ({ id, optionIndex }: { id: string; optionIndex: number }, { rejectWithValue }) => {
    try {
      const response = await pollService.voteOnPoll(id, optionIndex);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to record vote');
    }
  }
);

export const fetchPollVoters = createAsyncThunk(
  'poll/fetchPollVoters',
  async (pollId: string, { rejectWithValue }) => {
    try {
      const response = await pollService.getPollVoters(pollId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch voters');
    }
  }
);

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
        const exists = state.activePolls.data.find((p) => p._id === poll._id);
        if (!exists) {
          state.activePolls.data.unshift(poll);
          state.activePolls.total += 1;
        }
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
      const initialLength = state.activePolls.data.length;
      state.activePolls.data = state.activePolls.data.filter((p) => p._id !== poll._id);
      if (state.activePolls.data.length < initialLength) {
        state.activePolls.total = Math.max(0, state.activePolls.total - 1);
      }
      const exists = state.closedPolls.data.find((p) => p._id === poll._id);
      if (!exists) {
        state.closedPolls.data.unshift(poll);
        state.closedPolls.total += 1;
      }
      updatePollInList(state.myPolls.data, poll);
    },
    pollReopenedSocket: (state, action: PayloadAction<Poll>) => {
      const poll = action.payload;
      const initialLength = state.closedPolls.data.length;
      state.closedPolls.data = state.closedPolls.data.filter((p) => p._id !== poll._id);
      if (state.closedPolls.data.length < initialLength) {
        state.closedPolls.total = Math.max(0, state.closedPolls.total - 1);
      }
      const exists = state.activePolls.data.find((p) => p._id === poll._id);
      if (!exists) {
        state.activePolls.data.unshift(poll);
        state.activePolls.total += 1;
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
      const filterOut = (listState: PollListState) => {
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

    // Vote On Poll
    builder.addCase(voteOnPoll.pending, (state, action) => {
      const { id, optionIndex } = action.meta.arg;
      const lists = [state.activePolls.data, state.myPolls.data, state.closedPolls.data];
      lists.forEach((list) => {
        const index = list.findIndex((p) => p._id === id);
        if (index !== -1) {
          const poll = list[index];
          const updatedOptions = [...poll.options];
          let isUnvoting = false;
          if (poll.hasVoted && poll.votedOptionIndex === optionIndex) {
            isUnvoting = true;
          }

          if (isUnvoting) {
            if (updatedOptions[optionIndex].votesCount > 0) {
              updatedOptions[optionIndex] = {
                ...updatedOptions[optionIndex],
                votesCount: updatedOptions[optionIndex].votesCount - 1,
              };
            }
            list[index] = {
              ...poll,
              hasVoted: false,
              votedOptionIndex: null,
              options: updatedOptions,
            };
          } else {
            if (poll.hasVoted && poll.votedOptionIndex !== undefined && poll.votedOptionIndex !== null) {
              const oldIdx = poll.votedOptionIndex;
              if (updatedOptions[oldIdx] && updatedOptions[oldIdx].votesCount > 0) {
                updatedOptions[oldIdx] = {
                  ...updatedOptions[oldIdx],
                  votesCount: updatedOptions[oldIdx].votesCount - 1,
                };
              }
            }
            updatedOptions[optionIndex] = {
              ...updatedOptions[optionIndex],
              votesCount: updatedOptions[optionIndex].votesCount + 1,
            };
            list[index] = {
              ...poll,
              hasVoted: true,
              votedOptionIndex: optionIndex,
              options: updatedOptions,
            };
          }
        }
      });
    });

    builder.addCase(voteOnPoll.fulfilled, (state, action) => {
      const poll = action.payload;
      updatePollInList(state.activePolls.data, poll);
      updatePollInList(state.myPolls.data, poll);
      updatePollInList(state.closedPolls.data, poll);
    });

    // Fetch Poll Voters
    builder.addCase(fetchPollVoters.pending, (state) => {
      state.votersLoading = true;
      state.votersError = null;
    });
    builder.addCase(fetchPollVoters.fulfilled, (state, action) => {
      state.votersLoading = false;
      state.voters = action.payload;
    });
    builder.addCase(fetchPollVoters.rejected, (state, action) => {
      state.votersLoading = false;
      state.votersError = action.payload as string;
    });
  },
});

export const {
  pollCreatedSocket,
  pollUpdatedSocket,
  pollPublishedSocket,
  pollClosedSocket,
  pollReopenedSocket,
  pollVoteAddedSocket,
  pollVoteRemovedSocket,
  pollDeletedSocket,
} = pollSlice.actions;

export default pollSlice.reducer;
