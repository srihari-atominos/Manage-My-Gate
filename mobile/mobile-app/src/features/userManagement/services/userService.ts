import apiClient from '../../../services/apiClient';

export interface AssignedUnit {
  villaId?: string;
  villaNumber?: string;
  villaBlock?: string;
  residentType?: string;
  role?: string;
  status?: string;
}

export interface UserData {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  role?: string;
  assignedUnits?: AssignedUnit[];
  createdAt?: string;
}

export interface FetchUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  roles?: string[];
  status?: string[];
}

export interface InviteUserData {
  email: string;
  phone?: string;
  villaId?: string | null;
  residentType?: string;
  roleName?: string | null;
  invitationSource?: 'WEB' | 'APP';
}

export interface BulkInviteData {
  invitations: InviteUserData[];
}

/**
 * Fetch users from backend with pagination and filters
 */
export const fetchUsers = async (params: FetchUsersParams = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const searchParams = new URLSearchParams();

  searchParams.append('page', String(page));
  searchParams.append('limit', String(limit));
  if (params.search) searchParams.append('search', params.search);
  if (params.roles && params.roles.length > 0) searchParams.append('roles', params.roles.join(','));
  if (params.status && params.status.length > 0) searchParams.append('status', params.status.join(','));

  const response: any = await apiClient.get(`/users?${searchParams.toString()}`);
  return response.data || response;
};

/**
 * Invite a new user
 */
export const inviteUser = async (inviteData: InviteUserData) => {
  const payload = { ...inviteData, invitationSource: 'APP' as const };
  const response: any = await apiClient.post('/users/invite', payload);
  return response.data || response;
};

/**
 * Bulk invite multiple users
 */
export const bulkInviteUsers = async (invitations: InviteUserData[]) => {
  const formatted = invitations.map((inv) => ({ ...inv, invitationSource: 'APP' as const }));
  const response: any = await apiClient.post('/users/bulk-invite', {
    invitations: formatted,
    invitationSource: 'APP',
  });
  return response.data || response;
};

/**
 * Delete user (organization wide or specific villa resident)
 */
export const deleteUser = async (userId: string, villaId?: string | null) => {
  if (villaId) {
    await apiClient.delete(`/villas/${villaId}/residents/${userId}`);
    return { userId, villaId };
  }
  await apiClient.delete(`/users/${userId}`);
  return { userId, villaId: null };
};

/**
 * Update user roles
 */
export const updateUserRoles = async (userId: string, roles: string[], villaId?: string | null) => {
  const payload: any = { roles };
  if (villaId) payload.villaId = villaId;

  const response: any = await apiClient.put(`/users/${userId}/roles`, payload);
  return { userId, roles, villaId, data: response.data || response };
};

export interface InvitationItem {
  _id: string;
  userId?: string;
  orgId?: string;
  inviterId?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED';
  rawStatus?: string;
  invitationSource?: string;
  expiresAt?: string;
  usedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  recipient?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
    username?: string;
    status?: string;
  };
  inviter?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  role?: {
    _id?: string;
    name?: string;
  };
  residencyType?: string;
}

export interface FetchInvitationsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Fetch organization invitations
 */
export const fetchInvitations = async (params: FetchInvitationsParams = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const searchParams = new URLSearchParams();

  searchParams.append('page', String(page));
  searchParams.append('limit', String(limit));
  if (params.status && params.status !== 'ALL') searchParams.append('status', params.status);
  if (params.search) searchParams.append('search', params.search);
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

  const response: any = await apiClient.get(`/users/invitations?${searchParams.toString()}`);
  return response.data || response;
};

/**
 * Resend an eligible invitation
 */
export const resendInvitation = async (invitationId: string) => {
  const response: any = await apiClient.post(`/users/invitations/${invitationId}/resend`);
  return response.data || response;
};

/**
 * Revoke an unconsumed invitation
 */
export const revokeInvitation = async (invitationId: string) => {
  const response: any = await apiClient.post(`/users/invitations/${invitationId}/revoke`);
  return response.data || response;
};

export default {
  fetchUsers,
  inviteUser,
  bulkInviteUsers,
  deleteUser,
  updateUserRoles,
  fetchInvitations,
  resendInvitation,
  revokeInvitation,
};

