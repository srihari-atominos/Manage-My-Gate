import reducer, {
  acknowledgeNoticeThunk,
  fetchNoticeAcknowledgements,
} from '../store/noticeBoardSlice';

describe('noticeAcknowledgement Redux Reducers & Async Actions (Pure JS)', () => {
  const mockNoticeId = 'ntc-critical-001';

  const initialNoticeBoardState = {
    notices: [
      {
        _id: mockNoticeId,
        title: 'Urgent: Water Supply Disruption Tomorrow',
        priority: 'Urgent',
        requiresAcknowledgement: true,
        hasAcknowledged: false,
        acknowledgementCount: 12,
      },
      {
        _id: 'ntc-normal-002',
        title: 'Garden Maintenance Notice',
        priority: 'Normal',
        requiresAcknowledgement: false,
        hasAcknowledged: false,
        acknowledgementCount: 0,
      },
    ],
    selectedNotice: {
      _id: mockNoticeId,
      title: 'Urgent: Water Supply Disruption Tomorrow',
      priority: 'Urgent',
      requiresAcknowledgement: true,
      hasAcknowledged: false,
      acknowledgementCount: 12,
      userAcknowledgement: null,
    },
    loading: false,
    error: null,
    success: null,
    acknowledging: false,
    acknowledgeError: null,
    acknowledgements: [],
    acknowledgementsLoading: false,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalRecords: 2,
      limit: 10,
    },
    search: '',
    filters: {},
    activeKpiCard: null,
    sort: {
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    dashboardStats: {},
    dashboardLoading: false,
    dashboardError: null,
  };

  test('acknowledgeNoticeThunk.pending: sets acknowledging flag and clears prior errors', () => {
    const dirtyState = {
      ...initialNoticeBoardState,
      acknowledgeError: 'Previous timeout failure',
    };

    const nextState = reducer(dirtyState, { type: acknowledgeNoticeThunk.pending.type });
    expect(nextState.acknowledging).toBe(true);
    expect(nextState.acknowledgeError).toBeNull();
  });

  test('acknowledgeNoticeThunk.fulfilled: updates hasAcknowledged flag and increments counts', () => {
    const ackPayload = {
      id: mockNoticeId,
      data: {
        data: {
          noticeId: mockNoticeId,
          residentId: 'res-101',
          acknowledgedAt: '2026-09-10T14:30:00.000Z',
          unitId: 'unit-502',
        },
      },
    };

    const state = reducer(initialNoticeBoardState, {
      type: acknowledgeNoticeThunk.fulfilled.type,
      payload: ackPayload,
    });

    expect(state.acknowledging).toBe(false);
    expect(state.acknowledgeError).toBeNull();

    // Check selectedNotice update
    expect(state.selectedNotice.hasAcknowledged).toBe(true);
    expect(state.selectedNotice.acknowledgementCount).toBe(13);
    expect(state.selectedNotice.userAcknowledgement).toEqual(ackPayload.data.data);

    // Check list item update
    const targetNoticeInList = state.notices.find((n) => n._id === mockNoticeId);
    expect(targetNoticeInList.hasAcknowledged).toBe(true);
    expect(targetNoticeInList.acknowledgementCount).toBe(13);

    // Non-targeted notice remains untouched
    const untargeted = state.notices.find((n) => n._id === 'ntc-normal-002');
    expect(untargeted.hasAcknowledged).toBe(false);
    expect(untargeted.acknowledgementCount).toBe(0);
  });

  test('acknowledgeNoticeThunk.rejected: handles error and resets acknowledging flag', () => {
    const failureState = reducer(initialNoticeBoardState, {
      type: acknowledgeNoticeThunk.rejected.type,
      payload: 'Already acknowledged this notice',
    });

    expect(failureState.acknowledging).toBe(false);
    expect(failureState.acknowledgeError).toBe('Already acknowledged this notice');
    expect(failureState.selectedNotice.hasAcknowledged).toBe(false);
  });

  test('fetchNoticeAcknowledgements: handles pending, fulfilled, and rejected lifecycles', () => {
    // Pending
    let state = reducer(initialNoticeBoardState, {
      type: fetchNoticeAcknowledgements.pending.type,
    });
    expect(state.acknowledgementsLoading).toBe(true);

    // Fulfilled
    const sampleAcks = [
      { residentName: 'Alice Johnson', unitNumber: 'A-101', acknowledgedAt: '2026-09-10T12:00:00Z' },
      { residentName: 'Bob Smith', unitNumber: 'B-204', acknowledgedAt: '2026-09-10T12:15:00Z' },
    ];
    state = reducer(state, {
      type: fetchNoticeAcknowledgements.fulfilled.type,
      payload: { data: sampleAcks },
    });
    expect(state.acknowledgementsLoading).toBe(false);
    expect(state.acknowledgements).toEqual(sampleAcks);
    expect(state.acknowledgements.length).toBe(2);

    // Rejected
    state = reducer(state, {
      type: fetchNoticeAcknowledgements.rejected.type,
    });
    expect(state.acknowledgementsLoading).toBe(false);
  });
});
