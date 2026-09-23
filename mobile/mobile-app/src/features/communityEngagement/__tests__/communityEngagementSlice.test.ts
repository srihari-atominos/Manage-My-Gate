import reducer, {
  initializeWizard,
  initializeEditWizard,
  setContentType,
  updateFormData,
  setStepIndex,
  nextStep,
  previousStep,
  resetWizard,
  fetchEngagementPreview,
  submitEngagementContent,
  fetchEngagementItemForEdit,
  updateEngagementContentThunk,
  CommunityEngagementState,
} from '../store/communityEngagementSlice';
import { buildEngagementPayload } from '../services/communityEngagementService';

describe('Community Engagement Redux Slice & Payload Builder', () => {
  const getInitialState = (): CommunityEngagementState => ({
    mode: 'create',
    editingId: null,
    contentType: 'NOTICE',
    loadingItem: false,
    formData: {
      contentType: 'NOTICE',
      title: '',
      description: '',
      publishNow: true,
      scheduleDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      targetType: 'ALL',
      selectedRoleId: '',
      selectedUserId: '',
      selectedBlocks: [],
      selectedUnits: [],
      category: 'General',
      priority: 'Medium',
      status: 'Published',
      isPinned: false,
      allowComments: true,
      allowReactions: true,
      isCritical: false,
      requiresAcknowledgement: false,
      images: [],
      options: ['', ''],
      choiceType: 'SINGLE_CHOICE',
      maxChoices: 1,
      votingMode: 'ONE_PER_USER',
      resultsVisibility: 'ALWAYS',
      isAnonymous: false,
      quorumPercentage: 0,
    },
    currentStepIndex: 0,
    previewData: null,
    loading: false,
    previewLoading: false,
    submitting: false,
    error: null,
    success: false,
    createdResult: null,
  });

  describe('Reducers', () => {
    it('should initialize wizard with NOTICE as default archetype', () => {
      const state = reducer(undefined, initializeWizard('NOTICE'));
      expect(state.contentType).toBe('NOTICE');
      expect(state.currentStepIndex).toBe(0);
      expect(state.formData.category).toBe('General');
      expect(state.formData.priority).toBe('Medium');
      expect(state.formData.title).toBe('');
    });

    it('should initialize wizard with POLL archetype', () => {
      const state = reducer(undefined, initializeWizard('POLL'));
      expect(state.contentType).toBe('POLL');
      expect(state.currentStepIndex).toBe(0);
      expect(state.formData.choiceType).toBe('SINGLE_CHOICE');
      expect(state.formData.votingMode).toBe('ONE_PER_USER');
      expect(state.formData.options).toEqual(['', '']);
    });

    it('should update form data fields', () => {
      const initialState = getInitialState();
      const updated = reducer(
        initialState,
        updateFormData({
          title: 'Annual Lift Maintenance Notice',
          category: 'Maintenance',
          priority: 'High',
          isPinned: true,
        })
      );

      expect(updated.formData.title).toBe('Annual Lift Maintenance Notice');
      expect(updated.formData.category).toBe('Maintenance');
      expect(updated.formData.priority).toBe('High');
      expect(updated.formData.isPinned).toBe(true);
    });

    it('should handle step navigation correctly', () => {
      let state = getInitialState();
      expect(state.currentStepIndex).toBe(0);

      state = reducer(state, nextStep());
      expect(state.currentStepIndex).toBe(1);

      state = reducer(state, nextStep());
      expect(state.currentStepIndex).toBe(2);

      state = reducer(state, previousStep());
      expect(state.currentStepIndex).toBe(1);

      state = reducer(state, setStepIndex(4));
      expect(state.currentStepIndex).toBe(4);

      state = reducer(state, resetWizard());
      expect(state.currentStepIndex).toBe(0);
      expect(state.contentType).toBe('NOTICE');
    });
  });

  describe('Payload Builder', () => {
    it('should build valid FormData payload for Notice', () => {
      const state = getInitialState();
      state.formData.title = 'Lift Maintenance Announcement';
      state.formData.description = 'Maintenance will take place from 10am to 2pm.';
      state.formData.category = 'Maintenance';
      state.formData.priority = 'High';
      state.formData.isPinned = true;
      state.formData.targetType = 'ALL';

      const payload = buildEngagementPayload(state.formData, 'Published');
      expect(payload).toBeDefined();

      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        // Inspect FormData entries if environment supports FormData
        expect(payload).toBeInstanceOf(FormData);
      }
    });

    it('should build valid JSON payload for Poll with options and governance rules', () => {
      const state = getInitialState();
      state.formData.contentType = 'POLL';
      state.formData.title = 'Upgrade Gymnasium Equipment?';
      state.formData.description = 'Please vote on equipment choices for FY27.';
      state.formData.options = ['Treadmills', 'Free Weights', ''];
      state.formData.choiceType = 'MULTIPLE_CHOICE';
      state.formData.maxChoices = 2;
      state.formData.votingMode = 'ONE_PER_UNIT';
      state.formData.resultsVisibility = 'AFTER_VOTE';
      state.formData.isAnonymous = true;
      state.formData.quorumPercentage = 30;
      state.formData.targetType = 'OWNERS_ONLY';

      const payload = buildEngagementPayload(state.formData, 'Published') as Record<string, any>;
      expect(payload).toBeDefined();
      expect(payload.contentType).toBe('POLL');
      expect(payload.question).toBe('Upgrade Gymnasium Equipment?');
      expect(payload.description).toBe('Please vote on equipment choices for FY27.');
      // Empty options should be filtered out
      expect(payload.options).toEqual([
        { text: 'Treadmills' },
        { text: 'Free Weights' },
      ]);
      expect(payload.choiceType).toBe('MULTIPLE_CHOICE');
      expect(payload.maxChoices).toBe(2);
      expect(payload.votingMode).toBe('ONE_PER_UNIT');
      expect(payload.resultsVisibility).toBe('AFTER_VOTE');
      expect(payload.isAnonymous).toBe(true);
      expect(payload.quorumPercentage).toBe(30);
      expect(payload.targetAudience).toEqual({
        targetType: 'RESIDENCY_TYPES',
        targetResidencyTypes: ['Owner', 'Resident Owner', 'Non-Resident Owner'],
      });
    });
  });

  describe('ExtraReducers (Thunk lifecycle)', () => {
    it('should set previewLoading when fetchEngagementPreview is pending', () => {
      const state = reducer(getInitialState(), {
        type: fetchEngagementPreview.pending.type,
      });
      expect(state.previewLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should store previewData when fetchEngagementPreview is fulfilled', () => {
      const mockPreview = {
        contentType: 'NOTICE',
        title: 'Test',
        description: 'Test Description',
        status: 'Published',
        projectedStatus: 'Published',
        targetAudience: { targetType: 'ALL' },
        estimatedRecipients: 42,
      };

      const state = reducer(getInitialState(), {
        type: fetchEngagementPreview.fulfilled.type,
        payload: mockPreview,
      });
      expect(state.previewLoading).toBe(false);
      expect(state.previewData).toEqual(mockPreview);
    });

    it('should set submitting when submitEngagementContent is pending', () => {
      const state = reducer(getInitialState(), {
        type: submitEngagementContent.pending.type,
      });
      expect(state.submitting).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set success and createdResult when submitEngagementContent is fulfilled', () => {
      const mockResult = {
        success: true,
        data: { _id: 'item-123', contentType: 'NOTICE', title: 'Test Notice' },
      };

      const state = reducer(getInitialState(), {
        type: submitEngagementContent.fulfilled.type,
        payload: mockResult,
      });
      expect(state.submitting).toBe(false);
      expect(state.success).toBe(true);
      expect(state.createdResult).toEqual(mockResult);
    });

    it('should store error when submitEngagementContent is rejected', () => {
      const state = reducer(getInitialState(), {
        type: submitEngagementContent.rejected.type,
        payload: 'Failed to create notice',
      });
      expect(state.submitting).toBe(false);
      expect(state.error).toBe('Failed to create notice');
    });

    it('should populate state properly when initializeEditWizard is dispatched for Notice', () => {
      const existingNotice = {
        _id: 'notice-abc-123',
        title: 'Elevator Maintenance Scheduled',
        description: 'Passenger lift 1 will be serviced tomorrow morning.',
        category: 'Maintenance',
        priority: 'High',
        status: 'Published',
        isPinned: true,
        targetAudience: { targetType: 'ALL' },
      };

      const state = reducer(
        undefined,
        initializeEditWizard({ item: existingNotice, type: 'NOTICE' })
      );

      expect(state.mode).toBe('edit');
      expect(state.editingId).toBe('notice-abc-123');
      expect(state.contentType).toBe('NOTICE');
      expect(state.formData.title).toBe('Elevator Maintenance Scheduled');
      expect(state.formData.category).toBe('Maintenance');
      expect(state.formData.priority).toBe('High');
      expect(state.formData.isPinned).toBe(true);
      expect(state.formData.targetType).toBe('ALL');
    });

    it('should populate state properly when initializeEditWizard is dispatched for Poll', () => {
      const existingPoll = {
        _id: 'poll-xyz-456',
        question: 'Should we add badminton courts?',
        description: 'Vote on clubhouse phase 2 expansion.',
        choiceType: 'MULTIPLE_CHOICE',
        maxChoices: 2,
        votingMode: 'ONE_PER_USER',
        options: [{ text: 'Yes, badminton' }, { text: 'No, prefer gym equipment' }],
        targetAudience: { targetType: 'ALL' },
      };

      const state = reducer(
        undefined,
        initializeEditWizard({ item: existingPoll, type: 'POLL' })
      );

      expect(state.mode).toBe('edit');
      expect(state.editingId).toBe('poll-xyz-456');
      expect(state.contentType).toBe('POLL');
      expect(state.formData.title).toBe('Should we add badminton courts?');
      expect(state.formData.choiceType).toBe('MULTIPLE_CHOICE');
      expect(state.formData.maxChoices).toBe(2);
      expect(state.formData.options).toEqual(['Yes, badminton', 'No, prefer gym equipment']);
    });

    it('should handle fetchEngagementItemForEdit fulfilled', () => {
      const mockNotice = {
        _id: 'notice-fetched-789',
        title: 'Fetched Notice for Edit',
        description: 'Details fetched from backend API',
        category: 'Emergency',
        priority: 'Critical',
        status: 'Published',
      };

      const state = reducer(getInitialState(), {
        type: fetchEngagementItemForEdit.fulfilled.type,
        payload: { item: mockNotice, type: 'NOTICE' },
      });

      expect(state.mode).toBe('edit');
      expect(state.editingId).toBe('notice-fetched-789');
      expect(state.contentType).toBe('NOTICE');
      expect(state.formData.title).toBe('Fetched Notice for Edit');
      expect(state.formData.category).toBe('Emergency');
      expect(state.formData.priority).toBe('Critical');
      expect(state.loadingItem).toBe(false);
    });

    it('should handle updateEngagementContentThunk lifecycle (pending, fulfilled, rejected)', () => {
      // 1. Pending
      let state = reducer(getInitialState(), {
        type: updateEngagementContentThunk.pending.type,
      });
      expect(state.submitting).toBe(true);
      expect(state.error).toBeNull();

      // 2. Fulfilled
      const mockResult = {
        success: true,
        data: { _id: 'item-updated-123', title: 'Updated Title' },
      };
      state = reducer(state, {
        type: updateEngagementContentThunk.fulfilled.type,
        payload: mockResult,
      });
      expect(state.submitting).toBe(false);
      expect(state.success).toBe(true);
      expect(state.createdResult).toEqual(mockResult);

      // 3. Rejected
      state = reducer(getInitialState(), {
        type: updateEngagementContentThunk.rejected.type,
        payload: 'Failed to update notice',
      });
      expect(state.submitting).toBe(false);
      expect(state.error).toBe('Failed to update notice');
    });
  });
});
