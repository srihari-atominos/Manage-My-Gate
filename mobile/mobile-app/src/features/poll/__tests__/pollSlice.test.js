import reducer, {
  selectPoll,
  clearPollErrors,
  clearPollSuccess,
  socketPollCreated,
  socketPollUpdated,
  socketPollClosed,
  socketVoteAdded,
  fetchActivePolls,
  fetchClosedPolls,
  fetchMyPolls,
  fetchPollById,
  castVoteThunk,
  createPollThunk,
  closePollThunk,
  deletePollThunk,
  fetchPollResults,
  fetchPollVoters,
} from '../store/pollSlice';

describe('pollSlice Redux Reducers & Async Actions (Pure JS)', () => {
  const initialPollState = {
    activePolls: {
      data: [],
      total: 0,
      loading: false,
      error: null,
    },
    closedPolls: {
      data: [],
      total: 0,
      loading: false,
      error: null,
    },
    myPolls: {
      data: [],
      total: 0,
      loading: false,
      error: null,
    },
    selectedPoll: null,
    results: null,
    voters: null,
    loading: false,
    voting: false,
    submitting: false,
    error: null,
    success: null,
  };

  const samplePoll = {
    _id: 'poll-001',
    title: 'Install EV Chargers in Basement',
    status: 'Active',
    category: 'Amenities',
    options: [
      { text: 'Yes, full installation', voteCount: 15 },
      { text: 'No, too expensive', voteCount: 5 },
    ],
    totalVotes: 20,
    hasVoted: false,
  };

  test('should return default initial state when passed undefined', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual(initialPollState);
  });

  test('should handle selectPoll', () => {
    const nextState = reducer(initialPollState, selectPoll(samplePoll));
    expect(nextState.selectedPoll).toEqual(samplePoll);
  });

  test('should handle clearPollErrors and clearPollSuccess', () => {
    const dirtyState = {
      ...initialPollState,
      error: 'Something went wrong',
      activePolls: { ...initialPollState.activePolls, error: 'Network error' },
      success: 'Vote recorded',
    };

    const stateAfterErrorClear = reducer(dirtyState, clearPollErrors());
    expect(stateAfterErrorClear.error).toBeNull();
    expect(stateAfterErrorClear.activePolls.error).toBeNull();

    const stateAfterSuccessClear = reducer(stateAfterErrorClear, clearPollSuccess());
    expect(stateAfterSuccessClear.success).toBeNull();
  });

  describe('Real-time Socket Reducers', () => {
    test('socketPollCreated: adds new active poll to front of list and increments count', () => {
      const newPoll = { _id: 'poll-002', title: 'Swimming Pool Timings', status: 'Active' };
      const nextState = reducer(initialPollState, socketPollCreated(newPoll));
      expect(nextState.activePolls.data.length).toBe(1);
      expect(nextState.activePolls.data[0]._id).toBe('poll-002');
      expect(nextState.activePolls.total).toBe(1);

      // Deduplication: sending same poll does not add duplicate
      const duplicateState = reducer(nextState, socketPollCreated(newPoll));
      expect(duplicateState.activePolls.data.length).toBe(1);
    });

    test('socketPollUpdated: updates existing poll in activePolls and selectedPoll', () => {
      const stateWithPoll = {
        ...initialPollState,
        activePolls: { ...initialPollState.activePolls, data: [samplePoll], total: 1 },
        selectedPoll: samplePoll,
      };

      const updatedPayload = { _id: 'poll-001', title: 'Updated Title: EV Charger Project' };
      const nextState = reducer(stateWithPoll, socketPollUpdated(updatedPayload));

      expect(nextState.activePolls.data[0].title).toBe('Updated Title: EV Charger Project');
      expect(nextState.selectedPoll.title).toBe('Updated Title: EV Charger Project');
    });

    test('socketPollClosed: moves poll from active to closed list and updates selectedPoll status', () => {
      const stateWithPoll = {
        ...initialPollState,
        activePolls: { ...initialPollState.activePolls, data: [samplePoll], total: 1 },
        closedPolls: { ...initialPollState.closedPolls, data: [], total: 0 },
        selectedPoll: samplePoll,
      };

      const closedPayload = { ...samplePoll, status: 'Closed' };
      const nextState = reducer(stateWithPoll, socketPollClosed(closedPayload));

      expect(nextState.activePolls.data.length).toBe(0);
      expect(nextState.closedPolls.data.length).toBe(1);
      expect(nextState.closedPolls.data[0]._id).toBe('poll-001');
      expect(nextState.selectedPoll.status).toBe('Closed');
    });

    test('socketVoteAdded: updates poll data upon incoming vote broadcast', () => {
      const stateWithPoll = {
        ...initialPollState,
        activePolls: { ...initialPollState.activePolls, data: [samplePoll] },
        selectedPoll: samplePoll,
      };

      const voteUpdatePayload = {
        pollId: 'poll-001',
        updatedPoll: { ...samplePoll, totalVotes: 21 },
        residentId: 'res-999',
        optionIndex: 0,
      };

      const nextState = reducer(stateWithPoll, socketVoteAdded(voteUpdatePayload));
      expect(nextState.activePolls.data[0].totalVotes).toBe(21);
      expect(nextState.selectedPoll.totalVotes).toBe(21);
    });
  });

  describe('Async Thunk Extra Reducers', () => {
    test('fetchActivePolls: pending, fulfilled, rejected lifecycle', () => {
      // Pending
      let state = reducer(initialPollState, { type: fetchActivePolls.pending.type });
      expect(state.activePolls.loading).toBe(true);
      expect(state.activePolls.error).toBeNull();

      // Fulfilled with envelope data
      const payload = {
        data: {
          data: [samplePoll],
          total: 1,
        },
      };
      state = reducer(state, { type: fetchActivePolls.fulfilled.type, payload });
      expect(state.activePolls.loading).toBe(false);
      expect(state.activePolls.data.length).toBe(1);
      expect(state.activePolls.total).toBe(1);

      // Rejected
      state = reducer(state, {
        type: fetchActivePolls.rejected.type,
        payload: 'Network Error',
      });
      expect(state.activePolls.loading).toBe(false);
      expect(state.activePolls.error).toBe('Network Error');
    });

    test('fetchClosedPolls: fulfilled sets closed poll list', () => {
      const payload = { data: [{ ...samplePoll, status: 'Closed' }], total: 1 };
      const nextState = reducer(initialPollState, {
        type: fetchClosedPolls.fulfilled.type,
        payload,
      });
      expect(nextState.closedPolls.loading).toBe(false);
      expect(nextState.closedPolls.data.length).toBe(1);
    });

    test('fetchMyPolls: fulfilled sets user poll list', () => {
      const payload = { data: [samplePoll], total: 1 };
      const nextState = reducer(initialPollState, {
        type: fetchMyPolls.fulfilled.type,
        payload,
      });
      expect(nextState.myPolls.loading).toBe(false);
      expect(nextState.myPolls.data.length).toBe(1);
    });

    test('fetchPollById: fulfilled sets selectedPoll', () => {
      const nextState = reducer(initialPollState, {
        type: fetchPollById.fulfilled.type,
        payload: { data: samplePoll },
      });
      expect(nextState.selectedPoll).toEqual(samplePoll);
    });

    test('castVoteThunk: pending and fulfilled updates vote status and list', () => {
      const stateWithPoll = {
        ...initialPollState,
        activePolls: { ...initialPollState.activePolls, data: [samplePoll] },
        selectedPoll: samplePoll,
      };

      // Pending
      let state = reducer(stateWithPoll, { type: castVoteThunk.pending.type });
      expect(state.voting).toBe(true);

      // Fulfilled
      const votePayload = {
        id: 'poll-001',
        data: {
          data: {
            poll: { ...samplePoll, totalVotes: 21 },
          },
        },
      };
      state = reducer(state, { type: castVoteThunk.fulfilled.type, payload: votePayload });
      expect(state.voting).toBe(false);
      expect(state.success).toBe('Vote successfully recorded!');
      expect(state.selectedPoll.hasVoted).toBe(true);
      expect(state.selectedPoll.totalVotes).toBe(21);
      expect(state.activePolls.data[0].hasVoted).toBe(true);
    });

    test('createPollThunk: fulfilled prepends active poll', () => {
      const newActivePoll = { _id: 'poll-999', title: 'New Gate Access Policy', status: 'Active' };
      const nextState = reducer(initialPollState, {
        type: createPollThunk.fulfilled.type,
        payload: { data: newActivePoll },
      });
      expect(nextState.submitting).toBe(false);
      expect(nextState.success).toBe('Poll created successfully!');
      expect(nextState.activePolls.data[0]._id).toBe('poll-999');
      expect(nextState.activePolls.total).toBe(1);
    });

    test('closePollThunk: fulfilled removes from active list and marks selectedPoll Closed', () => {
      const stateWithPoll = {
        ...initialPollState,
        activePolls: { ...initialPollState.activePolls, data: [samplePoll] },
        selectedPoll: samplePoll,
      };

      const nextState = reducer(stateWithPoll, {
        type: closePollThunk.fulfilled.type,
        payload: { id: 'poll-001', data: {} },
      });
      expect(nextState.activePolls.data.length).toBe(0);
      expect(nextState.selectedPoll.status).toBe('Closed');
    });

    test('deletePollThunk: fulfilled removes poll from all lists', () => {
      const stateWithPoll = {
        ...initialPollState,
        activePolls: { ...initialPollState.activePolls, data: [samplePoll] },
        selectedPoll: samplePoll,
      };

      const nextState = reducer(stateWithPoll, {
        type: deletePollThunk.fulfilled.type,
        payload: 'poll-001',
      });
      expect(nextState.activePolls.data.length).toBe(0);
      expect(nextState.selectedPoll).toBeNull();
    });

    test('fetchPollResults and fetchPollVoters: fulfilled stores analytics data', () => {
      const resultsPayload = {
        data: {
          pollId: 'poll-001',
          totalVotes: 25,
          quorumReached: true,
          options: [{ text: 'Yes', count: 20 }, { text: 'No', count: 5 }],
        },
      };
      let state = reducer(initialPollState, {
        type: fetchPollResults.fulfilled.type,
        payload: resultsPayload,
      });
      expect(state.results.totalVotes).toBe(25);
      expect(state.results.quorumReached).toBe(true);

      const votersPayload = {
        data: [{ residentName: 'John Doe', optionText: 'Yes', votedAt: '2026-09-10T12:00:00Z' }],
      };
      state = reducer(state, {
        type: fetchPollVoters.fulfilled.type,
        payload: votersPayload,
      });
      expect(state.voters.length).toBe(1);
    });
  });
});
