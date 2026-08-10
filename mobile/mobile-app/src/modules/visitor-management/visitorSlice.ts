import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Visitor {
  id: string;
  name: string;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  arrivalTime: string;
}

export interface VisitorState {
  visitors: Visitor[];
  activeWalkIns: Visitor[];
  loading: boolean;
  error: string | null;
}

const initialState: VisitorState = {
  visitors: [],
  activeWalkIns: [],
  loading: false,
  error: null,
};

export const visitorSlice = createSlice({
  name: 'visitor',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setVisitors: (state, action: PayloadAction<Visitor[]>) => {
      state.visitors = action.payload;
    },
    setActiveWalkIns: (state, action: PayloadAction<Visitor[]>) => {
      state.activeWalkIns = action.payload;
    },
    updateVisitorStatus: (
      state,
      action: PayloadAction<{ id: string; status: Visitor['status'] }>
    ) => {
      const { id, status } = action.payload;
      const walkInIndex = state.activeWalkIns.findIndex((v) => v.id === id);
      if (walkInIndex !== -1) {
        state.activeWalkIns[walkInIndex].status = status;
      }
      
      const visitorIndex = state.visitors.findIndex((v) => v.id === id);
      if (visitorIndex !== -1) {
        state.visitors[visitorIndex].status = status;
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setVisitors,
  setActiveWalkIns,
  updateVisitorStatus,
} = visitorSlice.actions;

export default visitorSlice.reducer;
