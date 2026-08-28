import { CommunityNote } from './communityNoteTypes';

export type DirectoryRole = 'resident' | 'guard' | 'staff' | 'admin' | string;

export interface DirectoryMember {
  id: string;
  userId: string;
  name: string;
  role: DirectoryRole;
  designation?: string;
  unitNumber?: string;
  phone?: string | null;
  intercomNumber?: string | null;
  avatarUrl?: string | null;
  isOnline?: boolean;
  allowDirectoryMessages?: boolean;
  showPhoneInDirectory?: boolean;
  allowIntercomCalls?: boolean;
  interests?: string[];
  activeCommunityNote?: CommunityNote | null;
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
