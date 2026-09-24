import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  EngagementContentType,
  CommunityEngagementFormData,
  PreviewRecipientProjection,
  mapEngagementEntityToFormData,
} from '../types/communityEngagement.types';
import {
  buildEngagementPayload,
  createEngagementContent,
  previewEngagementContent,
  getEngagementContent,
  updateEngagementContent,
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
  mode: 'create' | 'edit';
  editingId: string | null;
  contentType: EngagementContentType;
  formData: CommunityEngagementFormData;
  currentStepIndex: number;
  previewData: PreviewRecipientProjection | null;
  loading: boolean;
  loadingItem: boolean;
  previewLoading: boolean;
  submitting: boolean;
  error: string | null;
  success: boolean;
  createdResult: any | null;
}

const initialState: CommunityEngagementState = {
  mode: 'create',
  editingId: null,
  contentType: 'NOTICE',
  formData: getDefaultFormData('NOTICE'),
  currentStepIndex: 0,
  previewData: null,
  loading: false,
  loadingItem: false,
  previewLoading: false,
  submitting: false,
  error: null,
  success: false,
  createdResult: null,
};

// Async Thunk: Fetch single item for edit hydration
export const fetchEngagementItemForEdit = createAsyncThunk(
  'communityEngagement/fetchItemForEdit',
  async (
    { id, type }: { id: string; type: EngagementContentType },
    { rejectWithValue }
  ) => {
    try {
      const item = await getEngagementContent(id, type);
      const resolvedType: EngagementContentType =
        item?.question || item?.choiceType || item?.votingMode
          ? 'POLL'
          : item?.title || item?.category
          ? 'NOTICE'
          : type;
      return { item, type: resolvedType };
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to load content for editing'
      );
    }
  }
);

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

// Async Thunk: Update Existing Content
export const updateEngagementContentThunk = createAsyncThunk(
  'communityEngagement/updateContent',
  async (
    statusOverride: 'Draft' | 'Published' | 'Scheduled' | undefined,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = (getState() as any).communityEngagement as CommunityEngagementState;
      if (!state.editingId) {
        throw new Error('Missing editingId for update operation');
      }
      const payload = buildEngagementPayload(state.formData, statusOverride);
      const result = await updateEngagementContent(
        state.editingId,
        state.contentType,
        payload
      );
      return result;
    } catch (error: any) {
      return rejectWithValue(
        error?.response?.data?.message || error?.message || 'Failed to update content'
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
      state.mode = 'create';
      state.editingId = null;
      state.contentType = type;
      state.formData = getDefaultFormData(type);
      state.currentStepIndex = 0;
      state.previewData = null;
      state.error = null;
      state.success = false;
      state.createdResult = null;
      state.loadingItem = false;
    },
    initializeEditWizard: (
      state,
      action: PayloadAction<{ item: any; type?: EngagementContentType }>
    ) => {
      const { item, type } = action.payload;
      const resolvedType: EngagementContentType =
        type || (item?.question ? 'POLL' : 'NOTICE');
      state.mode = 'edit';
      state.editingId = item?._id || item?.id || null;
      state.contentType = resolvedType;
      state.formData = mapEngagementEntityToFormData(item, resolvedType);
      state.currentStepIndex = 0;
      state.previewData = null;
      state.error = null;
      state.success = false;
      state.createdResult = null;
      state.loadingItem = false;
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
      state.mode = 'create';
      state.editingId = null;
      state.contentType = 'NOTICE';
      state.formData = getDefaultFormData('NOTICE');
      state.currentStepIndex = 0;
      state.previewData = null;
      state.error = null;
      state.success = false;
      state.createdResult = null;
      state.loadingItem = false;
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
      // Fetch Item for Edit
      .addCase(fetchEngagementItemForEdit.pending, (state) => {
        state.loadingItem = true;
        state.error = null;
      })
      .addCase(fetchEngagementItemForEdit.fulfilled, (state, action) => {
        state.loadingItem = false;
        const { item, type } = action.payload;
        const resolvedType = type || (item?.question ? 'POLL' : 'NOTICE');
        state.mode = 'edit';
        state.editingId = item?._id || item?.id || null;
        state.contentType = resolvedType;
        state.formData = mapEngagementEntityToFormData(item, resolvedType);
        state.currentStepIndex = 0;
        state.previewData = null;
      })
      .addCase(fetchEngagementItemForEdit.rejected, (state, action) => {
        state.loadingItem = false;
        state.error = action.payload as string;
      })
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
      // Submit Create
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
      })
      // Submit Update
      .addCase(updateEngagementContentThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateEngagementContentThunk.fulfilled, (state, action) => {
        state.submitting = false;
        state.success = true;
        state.createdResult = action.payload;
      })
      .addCase(updateEngagementContentThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  initializeWizard,
  initializeEditWizard,
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
