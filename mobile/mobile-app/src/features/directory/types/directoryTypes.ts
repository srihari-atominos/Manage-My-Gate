export type DirectoryRole = 'resident' | 'guard' | 'security' | 'staff' | 'maintenance' | 'management' | 'admin' | string;

export interface DirectoryMember {
  id: string;
  userId: string;
  name: string;
  role: DirectoryRole;
  designation?: string;
  unitNumber?: string;
  phone?: string | null;
  email?: string | null;
  intercomNumber?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  allowDirectoryMessages?: boolean;
  showPhoneInDirectory?: boolean;
  allowIntercomCalls?: boolean;
  interests?: string[];
  activeCommunityNote?: any;
}

export interface DirectoryPagination {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

export interface DirectoryResponse {
  success: boolean;
  data: DirectoryMember[];
  pagination: DirectoryPagination;
}
