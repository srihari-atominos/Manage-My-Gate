import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Staff {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
}

export interface StaffState {
  staffList: Staff[];
  loading: boolean;
  error: string | null;
}

const initialState: StaffState = {
  staffList: [],
  loading: false,
  error: null,
};

export const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setStaffList: (state, action: PayloadAction<Staff[]>) => {
      state.staffList = action.payload;
    },
  },
});

export const { setLoading, setError, setStaffList } = staffSlice.actions;

export default staffSlice.reducer;
