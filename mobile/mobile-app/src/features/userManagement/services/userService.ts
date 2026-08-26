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
  villaId?: string | null;
  residentType?: string;
  roleName?: string | null;
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
  const response: any = await apiClient.post('/users/invite', inviteData);
  return response.data || response;
};

/**
 * Bulk invite multiple users
 */
export const bulkInviteUsers = async (invitations: InviteUserData[]) => {
  const response: any = await apiClient.post('/users/bulk-invite', { invitations });
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

export default {
  fetchUsers,
  inviteUser,
  bulkInviteUsers,
  deleteUser,
  updateUserRoles,
};
