import { createAsyncThunk } from '@reduxjs/toolkit';
import visitorAdminService from '../services/visitorAdminService';
import { mapBackendWalkInToApprovalItem } from '../utils/mapBackendWalkInToApprovalItem';

export interface BlacklistVisitorItem {
  _id: string;
  visitorName: string;
  phone?: string;
  idProofNumber?: string;
  reason: string;
  blacklistedByName?: string;
  createdAt: string;
}

export interface VisitorAnalyticsData {
  totalEntriesToday: number;
  activeInsideCount: number;
  pendingApprovalsCount: number;
  totalBlacklistedCount: number;
  peakHour: string;
  categoryDistribution: Array<{ category: string; count: number }>;
}

export const fetchCommunityPasses = createAsyncThunk(
  'visitorPass/fetchCommunityPasses',
  async ({ orgId, params }: { orgId: string; params?: any }, { rejectWithValue }) => {
    try {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      const skip = (page - 1) * limit;

      const queryParams = { ...params, skip, limit };
      const response = await visitorAdminService.getCommunityPasses(orgId, queryParams);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const innerData = body?.data || body;
      const dataArray = Array.isArray(innerData) ? innerData : innerData?.data || [];
      const totalRecords = typeof innerData?.totalRecords === 'number' ? innerData.totalRecords : dataArray.length;

      return {
        data: dataArray,
        totalRecords,
        page,
        limit,
        append: Boolean(params?.append),
      };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to fetch community passes');
    }
  }
);

export const fetchAdminAnalytics = createAsyncThunk(
  'visitorPass/fetchAdminAnalytics',
  async (orgId: string, { rejectWithValue }) => {
    try {
      const response = await visitorAdminService.getGateAnalytics(orgId);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return (body?.data || body) as VisitorAnalyticsData;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to fetch gate analytics');
    }
  }
);

export const fetchBlacklist = createAsyncThunk(
  'visitorPass/fetchBlacklist',
  async (orgId: string, { rejectWithValue }) => {
    try {
      const response = await visitorAdminService.getBlacklist(orgId);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      const data = Array.isArray(body?.data || body) ? body?.data || body : [];
      return data as BlacklistVisitorItem[];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to fetch blacklist');
    }
  }
);

export const addBlacklistEntry = createAsyncThunk(
  'visitorPass/addBlacklistEntry',
  async (
    payload: { orgId: string; visitorName: string; phone?: string; idProofNumber?: string; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await visitorAdminService.addToBlacklist(payload);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return body?.data || body;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to add to blacklist');
    }
  }
);

export const removeBlacklistEntry = createAsyncThunk(
  'visitorPass/removeBlacklistEntry',
  async (id: string, { rejectWithValue }) => {
    try {
      await visitorAdminService.removeFromBlacklist(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to remove from blacklist');
    }
  }
);

export const forceRevokeAdminPass = createAsyncThunk(
  'visitorPass/forceRevokeAdminPass',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await visitorAdminService.forceRevokePass(id, reason);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return body?.data || body || { id, status: 'REVOKED' };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to force revoke pass');
    }
  }
);

export const forceCheckoutAdminVisitor = createAsyncThunk(
  'visitorPass/forceCheckoutAdminVisitor',
  async ({ logId, reason }: { logId: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await visitorAdminService.forceCheckoutVisitor(logId, reason);
      const body = response && (response as any).success !== undefined ? response : (response as any)?.data;
      return body?.data || body || { logId };
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to force checkout visitor');
    }
  }
);
