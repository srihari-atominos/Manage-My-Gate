import axios from 'axios';
import organizationApi from '../services/organizationApi';
import organizationReducer, {
  createOrganization,
  clearCreateOrganizationState,
} from '../store/organizationSlice';
import { createOrganizationSchema, ORGANIZATION_TYPES } from '../hooks/useCreateOrganization';
import apiClient from '../../../services/apiClient';

describe('Mobile Organization Feature Test Suite', () => {
  describe('1. API Service Contract Tests', () => {
    let originalGet: any;
    let originalPost: any;

    beforeEach(() => {
      originalGet = apiClient.get;
      originalPost = apiClient.post;
    });

    afterEach(() => {
      apiClient.get = originalGet;
      apiClient.post = originalPost;
    });

    it('routes checkOrganizationName through GET /organizations/check-name with params', async () => {
      let capturedUrl = '';
      let capturedConfig: any = null;

      apiClient.get = jest.fn().mockImplementation(async (url: string, config: any) => {
        capturedUrl = url;
        capturedConfig = config;
        return { data: { success: true, data: { available: true } } };
      });

      const res = await organizationApi.checkOrganizationName('Palm Meadows Community');

      expect(capturedUrl).toContain('/organizations/check-name');
      expect(capturedConfig).toEqual({ params: { name: 'Palm Meadows Community' } });
      expect((res as any).data.data.available).toBe(true);
    });

    it('routes setupWorkspace through POST /organizations/setup with workspace payload', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      const payload = {
        name: 'Grand Horizon Estate',
        organizationType: 'Residential',
        timezone: 'Asia/Kolkata',
      };

      apiClient.post = jest.fn().mockImplementation(async (url: string, body: any) => {
        capturedUrl = url;
        capturedBody = body;
        return {
          data: {
            success: true,
            data: {
              token: 'scoped-jwt-token-123',
              organization: { id: 'org-99', name: 'Grand Horizon Estate' },
            },
          },
        };
      });

      const res = await organizationApi.setupWorkspace(payload);

      expect(capturedUrl).toBe('/organizations/setup');
      expect(capturedBody).toEqual(payload);
      expect((res as any).data.success).toBe(true);
    });
  });

  describe('2. Redux Slice Lifecycle & Session Sync Tests', () => {
    const baseInitialState = organizationReducer(undefined, { type: '@@INIT' });

    it('initializes with createLoading false, createError null, and currentCreatedOrganization null', () => {
      expect(baseInitialState.createLoading).toBe(false);
      expect(baseInitialState.createError).toBeNull();
      expect(baseInitialState.currentCreatedOrganization).toBeNull();
    });

    it('handles createOrganization.pending by setting createLoading to true', () => {
      const state = organizationReducer(baseInitialState, {
        type: createOrganization.pending.type,
      });
      expect(state.createLoading).toBe(true);
      expect(state.createError).toBeNull();
    });

    it('handles createOrganization.fulfilled by storing created organization and clearing loading', () => {
      const payload = {
        organization: { id: 'org-456', name: 'Palm Meadows' },
        token: 'scoped-token',
        user: { id: 'user-1', orgId: 'org-456', role: 'Community Admin' },
        availableWorkspaces: [{ orgId: 'org-456', name: 'Palm Meadows' }],
      };

      const state = organizationReducer(
        { ...baseInitialState, createLoading: true },
        {
          type: createOrganization.fulfilled.type,
          payload,
        }
      );

      expect(state.createLoading).toBe(false);
      expect(state.createError).toBeNull();
      expect(state.currentCreatedOrganization).toEqual({ id: 'org-456', name: 'Palm Meadows' });
    });

    it('handles createOrganization.rejected by storing error message and setting createLoading to false', () => {
      const state = organizationReducer(
        { ...baseInitialState, createLoading: true },
        {
          type: createOrganization.rejected.type,
          payload: 'An organization with this name already exists.',
        }
      );

      expect(state.createLoading).toBe(false);
      expect(state.createError).toBe('An organization with this name already exists.');
    });

    it('resets state when clearCreateOrganizationState is dispatched', () => {
      const dirtyState = {
        createLoading: false,
        createError: 'Some previous error',
        currentCreatedOrganization: { id: 'org-old', name: 'Old Org' },
      };

      const cleaned = organizationReducer(dirtyState, clearCreateOrganizationState());
      expect(cleaned.createLoading).toBe(false);
      expect(cleaned.createError).toBeNull();
      expect(cleaned.currentCreatedOrganization).toBeNull();
    });

    it('dispatches session sync actions updateTokenAndUser and setActiveCommunityOrg on thunk fulfillment', async () => {
      const dispatch = jest.fn();
      const getState = jest.fn();

      const mockResponse = {
        data: {
          success: true,
          data: {
            token: 'new-scoped-jwt',
            refreshToken: 'new-refresh-jwt',
            organization: { _id: 'org-777', name: 'Azure Heights' },
            user: {
              id: 'user-88',
              email: 'admin@azure.com',
              role: 'Community Admin',
              orgId: 'org-777',
              availableWorkspaces: [{ orgId: 'org-777', name: 'Azure Heights', role: 'Community Admin' }],
            },
          },
        },
      };

      jest.spyOn(organizationApi, 'setupWorkspace').mockResolvedValueOnce(mockResponse as any);

      const thunk = createOrganization({
        name: 'Azure Heights',
        organizationType: 'Residential',
        timezone: 'Asia/Kolkata',
      });

      const result = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe('organization/createOrganization/fulfilled');
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/updateTokenAndUser',
          payload: expect.objectContaining({
            token: 'new-scoped-jwt',
            refreshToken: 'new-refresh-jwt',
          }),
        })
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth/setActiveCommunityOrg',
          payload: {
            orgId: 'org-777',
            orgName: 'Azure Heights',
          },
        })
      );
    });

    it('translates HTTP 409 into specific organization conflict error message', async () => {
      const dispatch = jest.fn();
      const getState = jest.fn();

      const conflictError = {
        response: {
          status: 409,
          data: { message: 'Organization name taken' },
        },
      };

      jest.spyOn(organizationApi, 'setupWorkspace').mockRejectedValueOnce(conflictError);

      const thunk = createOrganization({
        name: 'Taken Name',
        organizationType: 'Residential',
      });

      const result: any = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe('organization/createOrganization/rejected');
      expect(result.payload).toBe('An organization with this name already exists.');
    });

    it('translates HTTP 429 into rate limit error message', async () => {
      const dispatch = jest.fn();
      const getState = jest.fn();

      const rateLimitError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' },
        },
      };

      jest.spyOn(organizationApi, 'setupWorkspace').mockRejectedValueOnce(rateLimitError);

      const thunk = createOrganization({
        name: 'Rate Limited Org',
        organizationType: 'Commercial',
      });

      const result: any = await thunk(dispatch, getState, undefined);

      expect(result.type).toBe('organization/createOrganization/rejected');
      expect(result.payload).toBe('Too many requests. Please try again later.');
    });
  });

  describe('3. Validation Bounds & Schema Contract Tests', () => {
    it('rejects empty or whitespace-only organization name', async () => {
      await expect(
        createOrganizationSchema.validate({
          name: '',
          organizationType: 'Residential',
        })
      ).rejects.toThrow();

      await expect(
        createOrganizationSchema.validate({
          name: '   ',
          organizationType: 'Residential',
        })
      ).rejects.toThrow();
    });

    it('rejects organization name with fewer than 3 characters', async () => {
      await expect(
        createOrganizationSchema.validate({
          name: 'ab',
          organizationType: 'Residential',
        })
      ).rejects.toThrow('name_min_length');
    });

    it('accepts organization name with exactly 3 characters', async () => {
      const validated = await createOrganizationSchema.validate({
        name: 'abc',
        organizationType: 'Residential',
      });
      expect(validated.name).toBe('abc');
    });

    it('accepts organization name with 100 characters', async () => {
      const hundredChars = 'a'.repeat(100);
      const validated = await createOrganizationSchema.validate({
        name: hundredChars,
        organizationType: 'Residential',
      });
      expect(validated.name).toBe(hundredChars);
    });

    it('rejects organization name with more than 100 characters', async () => {
      const hundredOneChars = 'a'.repeat(101);
      await expect(
        createOrganizationSchema.validate({
          name: hundredOneChars,
          organizationType: 'Residential',
        })
      ).rejects.toThrow('name_max_length');
    });

    it('accepts authoritative organization types: Residential, Commercial, Mixed', async () => {
      for (const type of ['Residential', 'Commercial', 'Mixed'] as const) {
        const validated = await createOrganizationSchema.validate({
          name: 'Valid Name',
          organizationType: type,
        });
        expect(validated.organizationType).toBe(type);
      }
    });

    it('rejects non-authoritative types (e.g. Corporate, Educational, Other)', async () => {
      for (const invalidType of ['Corporate', 'Educational', 'Other', 'Industrial']) {
        await expect(
          createOrganizationSchema.validate({
            name: 'Valid Name',
            organizationType: invalidType as any,
          })
        ).rejects.toThrow('invalid_org_type');
      }
    });

    it('ORGANIZATION_TYPES constant exposes exactly Residential, Commercial, Mixed', () => {
      const values = ORGANIZATION_TYPES.map((t) => t.value);
      expect(values).toEqual(['Residential', 'Commercial', 'Mixed']);
    });
  });

  describe('4. Organization Switcher & Context Accessibility Tests', () => {
    const canSwitchContext = (user: any, reduxWorkspaces: any[]) => {
      const userUnits = user?.accessibleUnits || [];
      const hasMultipleOrgs = Array.isArray(reduxWorkspaces) && reduxWorkspaces.length > 1;
      const hasOrgs = (Array.isArray(reduxWorkspaces) && reduxWorkspaces.length > 0) || Boolean(user?.orgId);
      const hasMultipleUnits = Array.isArray(userUnits) && userUnits.length > 1;
      const hasUnit = Boolean(user?.activeVillaNumber || user?.villaNumber);

      return hasUnit || hasOrgs || hasMultipleUnits;
    };

    it('disables context switcher when user has 0 workspaces and no unit assigned', () => {
      expect(canSwitchContext(null, [])).toBe(false);
      expect(canSwitchContext({ orgId: null }, [])).toBe(false);
    });

    it('enables context switcher for users with exactly 1 organization so they can access Create New Organization', () => {
      const singleOrgUser = { orgId: 'org-1', organizationName: 'First Community' };
      const workspaces = [{ orgId: 'org-1', name: 'First Community', roleName: 'Admin' }];

      expect(canSwitchContext(singleOrgUser, workspaces)).toBe(true);
    });

    it('enables context switcher for users with multiple organizations', () => {
      const multiOrgUser = { orgId: 'org-1', organizationName: 'First Community' };
      const workspaces = [
        { orgId: 'org-1', name: 'First Community', roleName: 'Admin' },
        { orgId: 'org-2', name: 'Second Community', roleName: 'Resident' },
      ];

      expect(canSwitchContext(multiOrgUser, workspaces)).toBe(true);
    });

    it('constructs correct navigation parameters for Create New Organization CTA', () => {
      const buildCreateOrgRoute = () => ({
        pathname: '/(auth)/setup-organization',
        params: { intent: 'create-org', canGoBack: 'true' },
      });

      const target = buildCreateOrgRoute();
      expect(target.pathname).toBe('/(auth)/setup-organization');
      expect(target.params.intent).toBe('create-org');
      expect(target.params.canGoBack).toBe('true');
    });
  });

  describe('5. Full Redux Session Synchronization Integration (Flows A, B, C)', () => {
    const { configureStore } = require('@reduxjs/toolkit');
    const authReducer = require('../../auth/store/authSlice').default;
    const { updateTokenAndUser } = require('../../auth/store/authSlice');

    let store: any;

    beforeEach(() => {
      store = configureStore({
        reducer: {
          auth: authReducer,
          organization: organizationReducer,
        },
      });
    });

    it('Flow A: Authenticated user with 1 organization creates second organization; both are preserved in switcher', async () => {
      // 1. Seed user with 1 organization (Org A)
      store.dispatch(
        updateTokenAndUser({
          token: 'initial-scoped-token',
          user: {
            id: 'user-001',
            email: 'user@multiorg.com',
            role: 'Community Admin',
            orgId: 'org-A',
            organizationName: 'Palm Haven A',
            availableWorkspaces: [{ orgId: 'org-A', name: 'Palm Haven A', roleName: 'Community Admin' }],
          } as any,
        })
      );

      expect(store.getState().auth.user.availableWorkspaces).toHaveLength(1);
      expect(store.getState().auth.user.orgId).toBe('org-A');

      // 2. User creates Org B
      const mockSetupResponse = {
        data: {
          success: true,
          data: {
            token: 'new-scoped-token-B',
            organization: { _id: 'org-B', name: 'Cedar Ridge B' },
            user: {
              id: 'user-001',
              email: 'user@multiorg.com',
              role: 'Community Admin',
              orgId: 'org-B',
              organizationName: 'Cedar Ridge B',
              availableWorkspaces: [
                { orgId: 'org-A', name: 'Palm Haven A', roleName: 'Community Admin' },
                { orgId: 'org-B', name: 'Cedar Ridge B', roleName: 'Community Admin' },
              ],
            },
          },
        },
      };

      jest.spyOn(organizationApi, 'setupWorkspace').mockResolvedValueOnce(mockSetupResponse as any);

      await store.dispatch(
        createOrganization({
          name: 'Cedar Ridge B',
          organizationType: 'Residential',
        })
      );

      // 3. Assert session and switcher list
      const updatedUser = store.getState().auth.user;
      expect(updatedUser.orgId).toBe('org-B');
      expect(updatedUser.organizationName).toBe('Cedar Ridge B');
      expect(updatedUser.availableWorkspaces).toHaveLength(2);
      expect(updatedUser.availableWorkspaces.map((w: any) => w.orgId)).toEqual(['org-A', 'org-B']);
      expect(store.getState().auth.token).toBe('new-scoped-token-B');
      expect(store.getState().organization.createLoading).toBe(false);
      expect(store.getState().organization.createError).toBeNull();
    });

    it('Flow B: Multi-organization user (2 orgs) creates third organization; all 3 orgs preserved', async () => {
      // 1. Seed user with 2 organizations (Org A, Org B)
      store.dispatch(
        updateTokenAndUser({
          token: 'token-two-orgs',
          user: {
            id: 'user-001',
            email: 'user@multiorg.com',
            role: 'Community Admin',
            orgId: 'org-B',
            organizationName: 'Cedar Ridge B',
            availableWorkspaces: [
              { orgId: 'org-A', name: 'Palm Haven A', roleName: 'Community Admin' },
              { orgId: 'org-B', name: 'Cedar Ridge B', roleName: 'Community Admin' },
            ],
          } as any,
        })
      );

      expect(store.getState().auth.user.availableWorkspaces).toHaveLength(2);

      // 2. User creates Org C
      const mockSetupResponseC = {
        data: {
          success: true,
          data: {
            token: 'new-scoped-token-C',
            organization: { _id: 'org-C', name: 'Emerald Heights C' },
            user: {
              id: 'user-001',
              email: 'user@multiorg.com',
              role: 'Community Admin',
              orgId: 'org-C',
              organizationName: 'Emerald Heights C',
              availableWorkspaces: [
                { orgId: 'org-A', name: 'Palm Haven A', roleName: 'Community Admin' },
                { orgId: 'org-B', name: 'Cedar Ridge B', roleName: 'Community Admin' },
                { orgId: 'org-C', name: 'Emerald Heights C', roleName: 'Community Admin' },
              ],
            },
          },
        },
      };

      jest.spyOn(organizationApi, 'setupWorkspace').mockResolvedValueOnce(mockSetupResponseC as any);

      await store.dispatch(
        createOrganization({
          name: 'Emerald Heights C',
          organizationType: 'Commercial',
        })
      );

      // 3. Assert all 3 organizations exist in switcher list
      const updatedUser = store.getState().auth.user;
      expect(updatedUser.orgId).toBe('org-C');
      expect(updatedUser.organizationName).toBe('Emerald Heights C');
      expect(updatedUser.availableWorkspaces).toHaveLength(3);
      expect(updatedUser.availableWorkspaces.map((w: any) => w.orgId)).toEqual(['org-A', 'org-B', 'org-C']);
      expect(store.getState().auth.token).toBe('new-scoped-token-C');
    });

    it('Flow C: New user with 0 organizations creates first organization; becomes active with 1 org', async () => {
      // 1. Seed new verified user with 0 organizations
      store.dispatch(
        updateTokenAndUser({
          token: 'onboarding-unscoped-token',
          user: {
            id: 'user-new',
            email: 'newbie@gated.com',
            availableWorkspaces: [],
          } as any,
        })
      );

      expect(store.getState().auth.user.availableWorkspaces).toHaveLength(0);

      // 2. User creates First Org
      const mockSetupResponseFirst = {
        data: {
          success: true,
          data: {
            token: 'scoped-first-token',
            organization: { _id: 'org-1st', name: 'Green Valley' },
            user: {
              id: 'user-new',
              email: 'newbie@gated.com',
              role: 'Community Admin',
              orgId: 'org-1st',
              organizationName: 'Green Valley',
              availableWorkspaces: [{ orgId: 'org-1st', name: 'Green Valley', roleName: 'Community Admin' }],
            },
          },
        },
      };

      jest.spyOn(organizationApi, 'setupWorkspace').mockResolvedValueOnce(mockSetupResponseFirst as any);

      await store.dispatch(
        createOrganization({
          name: 'Green Valley',
          organizationType: 'Residential',
        })
      );

      // 3. Assert active org and available workspaces
      const updatedUser = store.getState().auth.user;
      expect(updatedUser.orgId).toBe('org-1st');
      expect(updatedUser.organizationName).toBe('Green Valley');
      expect(updatedUser.availableWorkspaces).toHaveLength(1);
      expect(store.getState().auth.token).toBe('scoped-first-token');
    });
  });
});
