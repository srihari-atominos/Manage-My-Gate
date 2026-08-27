import reducer, {
  setActivePass,
  clearPassStatus,
  walkInPendingReceived,
  walkInResolvedReceived,
  VisitorPass,
} from '../store/visitorPassSlice';

describe('visitorPassSlice Redux Reducers', () => {
  const initialState = {
    passes: [],
    activePass: null,
    dashboard: {
      recentPasses: [],
      activePassesCount: 0,
      pendingWalkIns: [],
      status: 'idle' as const,
      error: null,
    },
    walkIns: {
      pendingList: [],
      status: 'idle' as const,
      actionStatus: 'idle' as const,
      error: null,
    },
    admin: {
      communityPasses: [],
      blacklist: [],
      analytics: null,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0,
        limit: 10,
      },
      status: 'idle' as const,
      actionStatus: 'idle' as const,
      error: null,
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalRecords: 0,
      limit: 10,
    },
    status: 'idle' as const,
    actionStatus: 'idle' as const,
    error: null,
  };

  it('should return initial state when passed undefined', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setActivePass', () => {
    const mockPass: VisitorPass = {
      _id: 'pass-001',
      visitorName: 'Jane Doe',
      phone: '+966500000010',
      status: 'ACTIVE',
      code: '882910',
    };

    const nextState = reducer(initialState, setActivePass(mockPass));
    expect(nextState.activePass).toEqual(mockPass);
  });

  it('should handle clearPassStatus', () => {
    const dirtyState = {
      ...initialState,
      status: 'failed' as const,
      actionStatus: 'failed' as const,
      error: 'Something went wrong',
    };

    const nextState = reducer(dirtyState, clearPassStatus());
    expect(nextState.status).toBe('idle');
    expect(nextState.actionStatus).toBe('idle');
    expect(nextState.error).toBeNull();
  });

  it('should handle walkInPendingReceived idempotently', () => {
    const mappedItem: any = {
      id: 'walkin-1',
      visitorName: 'Guest 1',
      phone: '+966500000001',
      status: 'PENDING',
    };
    const rawLog = { _id: 'walkin-1', visitorName: 'Guest 1' };

    const state1 = reducer(
      initialState,
      walkInPendingReceived({ mappedItem, rawLog })
    );

    expect(state1.walkIns.pendingList.length).toBe(1);
    expect(state1.walkIns.pendingList[0].id).toBe('walkin-1');

    // Dispatching duplicate walk-in should update existing item without duplicating
    const updatedMappedItem: any = {
      ...mappedItem,
      visitorName: 'Guest 1 Updated',
    };
    const state2 = reducer(
      state1,
      walkInPendingReceived({ mappedItem: updatedMappedItem, rawLog })
    );

    expect(state2.walkIns.pendingList.length).toBe(1);
    expect(state2.walkIns.pendingList[0].visitorName).toBe('Guest 1 Updated');
  });

  it('should handle walkInResolvedReceived and remove item from pending lists', () => {
    const itemToResolve: any = {
      id: 'walkin-2',
      visitorName: 'Guest 2',
      status: 'PENDING',
    };
    const rawLog = { _id: 'walkin-2' };

    const stateWithWalkIn = reducer(
      initialState,
      walkInPendingReceived({ mappedItem: itemToResolve, rawLog })
    );
    expect(stateWithWalkIn.walkIns.pendingList.length).toBe(1);

    const resolvedState = reducer(
      stateWithWalkIn,
      walkInResolvedReceived({ id: 'walkin-2' })
    );
    expect(resolvedState.walkIns.pendingList.length).toBe(0);
    expect(resolvedState.dashboard.pendingWalkIns.length).toBe(0);
  });
});
