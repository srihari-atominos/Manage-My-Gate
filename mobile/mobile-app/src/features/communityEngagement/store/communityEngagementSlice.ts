import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  EngagementContentType,
  CommunityEngagementFormData,
  PreviewRecipientProjection,
} from '../types/communityEngagement.types';
import {
  buildEngagementPayload,
  createEngagementContent,
  previewEngagementContent,
} from '../services/communityEngagementService';

const getDefaultFormData = (
  type: EngagementContentType = 'NOTICE'
): CommunityEngagementFormData => {
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);

  const defaultSchedule = new Date();
  defaultSchedule.setDate(defaultSchedule.getDate() + 1);

  return {
    contentType: type,
    title: '',
    description: '',
    publishNow: true,
    scheduleDate: defaultSchedule.toISOString(),
    expiryDate: defaultExpiry.toISOString(),
    targetType: 'ALL',
    selectedRoleId: '',
    selectedUserId: '',
    selectedBlocks: [],
    selectedUnits: [],

    // Notice
    category: 'General',
    priority: 'Medium',
    status: 'Published',
    isPinned: false,
    allowComments: true,
    allowReactions: true,
    isCritical: false,
    requiresAcknowledgement: false,
    images: [],

    // Poll
    options: ['', ''],
    choiceType: 'SINGLE_CHOICE',
    maxChoices: 1,
    votingMode: 'ONE_PER_USER',
    resultsVisibility: 'ALWAYS',
    isAnonymous: false,
    quorumPercentage: 0,
  };
};

export interface CommunityEngagementState {
  contentType: EngagementContentType;
  formData: CommunityEngagementFormData;
  currentStepIndex: number;
  previewData: PreviewRecipientProjection | null;
  loading: boolean;
  previewLoading: boolean;
  submitting: boolean;
  error: string | null;
  success: boolean;
  createdResult: any | null;
}

const initialState: CommunityEngagementState = {
  contentType: 'NOTICE',
  formData: getDefaultFormData('NOTICE'),
  currentStepIndex: 0,
  previewData: null,
  loading: false,
  previewLoading: false,
  submitting: false,
  error: null,
  success: false,
  createdResult: null,
};

// Async Thunk: Generate Backend Preview
export const fetchEngagementPreview = createAsyncThunk(
  'communityEngagement/fetchPreview',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = (getState() as any).communityEngagement as CommunityEngagementState;
      const payload = buildEngagementPayload(state.formData);
      const preview = await previewEngagementContent(payload);
      return preview;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to generate preview'
      );
    }
  }
);

// Async Thunk: Submit Unified Content (Publish or Draft or Schedule)
export const submitEngagementContent = createAsyncThunk(
  'communityEngagement/submitContent',
  async (
    statusOverride: 'Draft' | 'Published' | 'Scheduled' | undefined,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = (getState() as any).communityEngagement as CommunityEngagementState;
      const payload = buildEngagementPayload(state.formData, statusOverride);
      const result = await createEngagementContent(payload);
      return result;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to create content'
      );
    }
  }
);

export const communityEngagementSlice = createSlice({
  name: 'communityEngagement',
  initialState,
  reducers: {
    initializeWizard: (
      state,
      action: PayloadAction<EngagementContentType | undefined>
    ) => {
      const type = action.payload || 'NOTICE';
      state.contentType = type;
      state.formData = getDefaultFormData(type);
      state.currentStepIndex = 0;
      state.previewData = null;
      state.error = null;
      state.success = false;
      state.createdResult = null;
    },
    setContentType: (state, action: PayloadAction<EngagementContentType>) => {
      state.contentType = action.payload;
      state.formData.contentType = action.payload;
    },
    updateFormData: (
      state,
      action: PayloadAction<Partial<CommunityEngagementFormData>>
    ) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    setStepIndex: (state, action: PayloadAction<number>) => {
      state.currentStepIndex = Math.max(0, action.payload);
    },
    nextStep: (state) => {
      state.currentStepIndex += 1;
    },
    previousStep: (state) => {
      state.currentStepIndex = Math.max(0, state.currentStepIndex - 1);
    },
    resetWizard: (state) => {
      state.contentType = 'NOTICE';
      state.formData = getDefaultFormData('NOTICE');
      state.currentStepIndex = 0;
      state.previewData = null;
      state.error = null;
      state.success = false;
      state.createdResult = null;
    },
    clearEngagementError: (state) => {
      state.error = null;
    },
    clearEngagementSuccess: (state) => {
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Preview
      .addCase(fetchEngagementPreview.pending, (state) => {
        state.previewLoading = true;
        state.error = null;
      })
      .addCase(fetchEngagementPreview.fulfilled, (state, action) => {
        state.previewLoading = false;
        state.previewData = action.payload;
      })
      .addCase(fetchEngagementPreview.rejected, (state, action) => {
        state.previewLoading = false;
        state.error = action.payload as string;
      })
      // Submit
      .addCase(submitEngagementContent.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitEngagementContent.fulfilled, (state, action) => {
        state.submitting = false;
        state.success = true;
        state.createdResult = action.payload;
      })
      .addCase(submitEngagementContent.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  initializeWizard,
  setContentType,
  updateFormData,
  setStepIndex,
  nextStep,
  previousStep,
  resetWizard,
  clearEngagementError,
  clearEngagementSuccess,
} = communityEngagementSlice.actions;

export default communityEngagementSlice.reducer;
