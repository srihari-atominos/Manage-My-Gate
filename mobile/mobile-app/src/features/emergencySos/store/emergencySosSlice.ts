import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import emergencySosService from '../services/emergencySosService';
import {
  EmergencySosAlert,
  EmergencySosState,
  TriggerSosPayload,
} from '../types/emergencySos.types';

const initialState: EmergencySosState = {
  activeAlert: null,
  history: [],
  isLoading: false,
  isTriggering: false,
  error: null,
  isModalOpen: false,
};

export const fetchActiveSos = createAsyncThunk(
  'emergencySos/fetchActiveSos',
  async (_, { rejectWithValue }) => {
    try {
      return await emergencySosService.getActiveSos();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch active SOS.');
    }
  }
);

export const triggerEmergencySos = createAsyncThunk(
  'emergencySos/triggerSos',
  async (payload: TriggerSosPayload, { rejectWithValue }) => {
    try {
      return await emergencySosService.triggerSos(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to trigger emergency SOS.');
    }
  }
);

export const cancelEmergencySos = createAsyncThunk(
  'emergencySos/cancelSos',
  async (id: string, { rejectWithValue }) => {
    try {
      return await emergencySosService.cancelSos(id);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to cancel emergency SOS.');
    }
  }
);

export const emergencySosSlice = createSlice({
  name: 'emergencySos',
  initialState,
  reducers: {
    openSosModal: (state) => {
      state.isModalOpen = true;
      state.error = null;
    },
    closeSosModal: (state) => {
      state.isModalOpen = false;
    },
    sosStatusUpdatedFromSocket: (state, action: PayloadAction<EmergencySosAlert>) => {
      const alert = action.payload;
      if (alert.status === 'RESOLVED' || alert.status === 'CANCELLED') {
        if (state.activeAlert?._id === alert._id) {
          state.activeAlert = null;
        }
      } else {
        state.activeAlert = alert;
      }
    },
    clearSosError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Active
    builder.addCase(fetchActiveSos.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchActiveSos.fulfilled, (state, action) => {
      state.isLoading = false;
      state.activeAlert = action.payload;
    });
    builder.addCase(fetchActiveSos.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Trigger SOS
    builder.addCase(triggerEmergencySos.pending, (state) => {
      state.isTriggering = true;
      state.error = null;
    });
    builder.addCase(triggerEmergencySos.fulfilled, (state, action) => {
      state.isTriggering = false;
      state.activeAlert = action.payload;
    });
    builder.addCase(triggerEmergencySos.rejected, (state, action) => {
      state.isTriggering = false;
      state.error = action.payload as string;
    });

    // Cancel SOS
    builder.addCase(cancelEmergencySos.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(cancelEmergencySos.fulfilled, (state, action) => {
      state.isLoading = false;
      if (state.activeAlert?._id === action.payload._id) {
        state.activeAlert = null;
      }
    });
    builder.addCase(cancelEmergencySos.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const {
  openSosModal,
  closeSosModal,
  sosStatusUpdatedFromSocket,
  clearSosError,
} = emergencySosSlice.actions;

export default emergencySosSlice.reducer;
