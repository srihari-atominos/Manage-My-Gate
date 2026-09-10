import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import organizationApi from '../services/organizationApi';
import { updateTokenAndUser, setActiveCommunityOrg } from '../../auth/store/authSlice';

export interface CreatedOrganizationData {
  id?: string;
  _id?: string;
  name: string;
  organizationType?: string;
  timezone?: string;
  [key: string]: any;
}

export interface OrganizationState {
  createLoading: boolean;
  createError: string | null;
  currentCreatedOrganization: CreatedOrganizationData | null;
}

const initialState: OrganizationState = {
  createLoading: false,
  createError: null,
  currentCreatedOrganization: null,
};

export const createOrganization = createAsyncThunk(
  'organization/createOrganization',
  async (workspaceData: Parameters<typeof organizationApi.setupWorkspace>[0], { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await organizationApi.setupWorkspace(workspaceData);
      const resBody = response && (response as any).data !== undefined ? (response as any).data : response;

      if (resBody && resBody.success === false) {
        return rejectWithValue(resBody.message || 'Failed to create organization');
      }

      const payloadData = resBody?.data || resBody;
      const token = payloadData?.token;
      const refreshToken = payloadData?.refreshToken;
      const rawUser = payloadData?.user;
      const rawOrg = payloadData?.organization;
      const availableWorkspaces =
        payloadData?.availableWorkspaces || rawUser?.availableWorkspaces || [];

      const orgId = rawOrg?._id || rawOrg?.id || rawUser?.orgId || rawUser?.activeOrgId;
      const orgName = rawOrg?.name || rawUser?.organizationName || workspaceData.name;

      // Extract existing workspaces from Redux state to guarantee multi-workspace preservation
      const rootState: any = typeof getState === 'function' ? getState() : null;
      const existingWorkspaces: any[] =
        rootState?.auth?.user?.availableWorkspaces || [];

      let mergedWorkspaces = Array.isArray(availableWorkspaces) && availableWorkspaces.length > 0
        ? [...availableWorkspaces]
        : [...existingWorkspaces];

      if (orgId && orgName) {
        const alreadyInList = mergedWorkspaces.some((w: any) => (w.orgId || w._id || w.id) === String(orgId));
        if (!alreadyInList) {
          const newWsEntry = {
            orgId: String(orgId),
            name: String(orgName),
            roleName: rawUser?.role || 'Community Admin',
          };
          mergedWorkspaces = [...mergedWorkspaces, newWsEntry];
        }
      }

      // Synchronize authenticated session state and token storage
      if (token || rawUser) {
        const userToSync = rawUser
          ? {
              ...rawUser,
              orgId: orgId || rawUser.orgId,
              activeOrgId: orgId || rawUser.activeOrgId,
              availableWorkspaces: mergedWorkspaces,
            }
          : undefined;

        dispatch(
          updateTokenAndUser({
            token,
            refreshToken,
            user: userToSync as any,
          })
        );
      }

      // Synchronize active community context
      if (orgId && orgName) {
        dispatch(
          setActiveCommunityOrg({
            orgId: String(orgId),
            orgName: String(orgName),
          })
        );
      }

      return {
        organization: rawOrg || { id: orgId, name: orgName },
        token,
        refreshToken,
        user: rawUser,
        availableWorkspaces: mergedWorkspaces,
      };
    } catch (error: any) {
      const status = error.response?.status;
      const apiMessage =
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.errors) ? error.response.data.errors[0]?.msg : null) ||
        error.message;

      if (status === 409) {
        return rejectWithValue('An organization with this name already exists.');
      }
      if (status === 429) {
        return rejectWithValue('Too many requests. Please try again later.');
      }
      return rejectWithValue(apiMessage || 'Failed to create organization');
    }
  }
);

const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearCreateOrganizationState: (state) => {
      state.createLoading = false;
      state.createError = null;
      state.currentCreatedOrganization = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrganization.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createOrganization.fulfilled, (state, action) => {
        state.createLoading = false;
        state.createError = null;
        state.currentCreatedOrganization = action.payload.organization;
      })
      .addCase(createOrganization.rejected, (state, action) => {
        state.createLoading = false;
        state.createError = (action.payload as string) || 'Failed to create organization';
      });
  },
});

export const { clearCreateOrganizationState } = organizationSlice.actions;
export default organizationSlice.reducer;
