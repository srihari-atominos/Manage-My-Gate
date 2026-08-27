import reducer, {
  clearComplaintErrors,
  updateComplaintInList,
  fetchComplaints,
  updateComplaintStatus,
  acceptAssignment,
  rejectAssignment,
  startWork,
  pauseWork,
  resumeWork,
  markWorkCompleted,
  addComplaintComment,
  addFeedback,
} from '../store/complaintSlice';
import { Complaint } from '../types';

describe('complaintSlice Redux Reducers & Async Actions', () => {
  const initialState = {
    list: [],
    pagination: {
      totalRecords: 0,
      currentPage: 1,
      totalPages: 1,
      limit: 10,
    },
    currentComplaint: null,
    dashboardAnalytics: null,
    status: 'idle' as const,
    error: null,
  };

  const mockComplaint: Complaint = {
    _id: 'cmp-001',
    complaintNumber: 'CMP-1001',
    residentId: 'res-001',
    residentName: 'Test Resident',
    title: 'Water Pipe Leakage in Kitchen',
    description: 'Leaking tap under the sink',
    category: 'Plumbing',
    priority: 'High',
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should return initial state when passed undefined', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearComplaintErrors', () => {
    const dirtyState = {
      ...initialState,
      status: 'failed' as const,
      error: 'Network connection error',
    };

    const nextState = reducer(dirtyState, clearComplaintErrors());
    expect(nextState.error).toBeNull();
  });

  it('should handle updateComplaintInList for new item', () => {
    const nextState = reducer(initialState, updateComplaintInList(mockComplaint));
    expect(nextState.list.length).toBe(1);
    expect(nextState.list[0]._id).toBe('cmp-001');
  });

  it('should handle updateComplaintInList for existing item', () => {
    const stateWithItem = {
      ...initialState,
      list: [mockComplaint],
      currentComplaint: mockComplaint,
    };

    const updatedComplaint = { ...mockComplaint, status: 'In Progress' as const };
    const nextState = reducer(stateWithItem, updateComplaintInList(updatedComplaint));

    expect(nextState.list[0].status).toBe('In Progress');
    expect(nextState.currentComplaint?.status).toBe('In Progress');
  });

  it('should handle fetchComplaints.fulfilled', () => {
    const payload = {
      complaints: [mockComplaint],
      pagination: { totalRecords: 1, currentPage: 1, totalPages: 1, limit: 10 },
    };

    const action = { type: fetchComplaints.fulfilled.type, payload };
    const nextState = reducer(initialState, action);

    expect(nextState.status).toBe('succeeded');
    expect(nextState.list.length).toBe(1);
    expect(nextState.pagination.totalRecords).toBe(1);
  });

  it('should handle fetchComplaints.rejected', () => {
    const action = { type: fetchComplaints.rejected.type, payload: 'Failed to fetch complaints' };
    const nextState = reducer(initialState, action);

    expect(nextState.status).toBe('failed');
    expect(nextState.error).toBe('Failed to fetch complaints');
  });

  it('should handle updateComplaintStatus.fulfilled and update list & current complaint', () => {
    const stateWithItem = {
      ...initialState,
      list: [mockComplaint],
      currentComplaint: mockComplaint,
    };

    const updated = { ...mockComplaint, status: 'Closed' as const };
    const action = { type: updateComplaintStatus.fulfilled.type, payload: updated };
    const nextState = reducer(stateWithItem, action);

    expect(nextState.list[0].status).toBe('Closed');
    expect(nextState.currentComplaint?.status).toBe('Closed');
  });

  it('should handle startWork.fulfilled', () => {
    const stateWithItem = {
      ...initialState,
      list: [mockComplaint],
    };

    const updated = { ...mockComplaint, status: 'In Progress' as const };
    const action = { type: startWork.fulfilled.type, payload: updated };
    const nextState = reducer(stateWithItem, action);

    expect(nextState.list[0].status).toBe('In Progress');
  });

  it('should handle rejectAssignment.fulfilled', () => {
    const stateWithItem = {
      ...initialState,
      list: [mockComplaint],
    };

    const updated = { ...mockComplaint, status: 'Rejected' as const };
    const action = { type: rejectAssignment.fulfilled.type, payload: updated };
    const nextState = reducer(stateWithItem, action);

    expect(nextState.list[0].status).toBe('Rejected');
  });

  it('should handle pauseWork.fulfilled', () => {
    const stateWithItem = {
      ...initialState,
      list: [mockComplaint],
    };

    const updated = { ...mockComplaint, status: 'On Hold' as const };
    const action = { type: pauseWork.fulfilled.type, payload: updated };
    const nextState = reducer(stateWithItem, action);

    expect(nextState.list[0].status).toBe('On Hold');
  });

  it('should handle resumeWork.fulfilled', () => {
    const stateWithItem = {
      ...initialState,
      list: [{ ...mockComplaint, status: 'On Hold' as const }],
    };

    const updated = { ...mockComplaint, status: 'In Progress' as const };
    const action = { type: resumeWork.fulfilled.type, payload: updated };
    const nextState = reducer(stateWithItem, action);

    expect(nextState.list[0].status).toBe('In Progress');
  });

  it('should handle addComplaintComment.fulfilled', () => {
    const stateWithItem = {
      ...initialState,
      list: [mockComplaint],
    };

    const updated = {
      ...mockComplaint,
      timeline: [{ status: 'Comment Added', action: 'Comment', remarks: 'Plumber on the way' }],
    };
    const action = { type: addComplaintComment.fulfilled.type, payload: updated };
    const nextState = reducer(stateWithItem, action);

    expect(nextState.list[0].timeline?.length).toBe(1);
    expect(nextState.list[0].timeline?.[0].remarks).toBe('Plumber on the way');
  });
});
