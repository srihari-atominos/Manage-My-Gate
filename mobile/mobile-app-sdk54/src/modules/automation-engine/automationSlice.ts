import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  nodes: any[];
}

export interface AutomationState {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
}

const initialState: AutomationState = {
  workflows: [],
  loading: false,
  error: null,
};

export const automationSlice = createSlice({
  name: 'automation',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setWorkflows: (state, action: PayloadAction<Workflow[]>) => {
      state.workflows = action.payload;
    },
  },
});

export const { setLoading, setError, setWorkflows } = automationSlice.actions;

export default automationSlice.reducer;
