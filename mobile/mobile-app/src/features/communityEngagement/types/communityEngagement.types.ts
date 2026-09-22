export type EngagementContentType = 'NOTICE' | 'POLL';

export type WizardStepKey =
  | 'basic-info'
  | 'audience'
  | 'schedule'
  | 'type-config'
  | 'review';

export interface WizardStepMeta {
  key: WizardStepKey;
  title: string;
  subtitle: string;
}

export type NoticeCategory =
  | 'General'
  | 'Maintenance'
  | 'Events'
  | 'Emergency'
  | 'Meetings'
  | 'Rules';

export type NoticePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type NoticeStatus = 'Draft' | 'Published' | 'Scheduled' | 'Archived';

export type AudienceTargetType =
  | 'ALL'
  | 'OWNERS_ONLY'
  | 'STAFF_ONLY'
  | 'SPECIFIC_ROLE'
  | 'SPECIFIC_RESIDENT'
  | 'BLOCKS'
  | 'UNITS';

export type PollChoiceType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export type PollVotingMode = 'ONE_PER_USER' | 'ONE_PER_UNIT';

export type PollResultsVisibility =
  | 'ALWAYS'
  | 'AFTER_VOTE'
  | 'AFTER_EXPIRY'
  | 'ADMIN_ONLY';

export interface LocalAttachment {
  id: string;
  uri: string;
  name: string;
  type: string;
  isRemote?: boolean;
  file?: any;
}

export interface CommunityEngagementFormData {
  // Common
  contentType: EngagementContentType;
  title: string;
  description: string;
  publishNow: boolean;
  scheduleDate: string; // ISO string
  expiryDate: string; // ISO string for Notice expiry / Poll endDate
  targetType: AudienceTargetType;
  selectedRoleId?: string;
  selectedUserId?: string;
  selectedBlocks?: string[];
  selectedUnits?: string[];

  // Notice-specific
  category: NoticeCategory;
  priority: NoticePriority;
  status: NoticeStatus;
  isPinned: boolean;
  allowComments: boolean;
  allowReactions: boolean;
  isCritical: boolean;
  requiresAcknowledgement: boolean;
  images: LocalAttachment[];

  // Poll-specific
  options: string[];
  choiceType: PollChoiceType;
  maxChoices: number;
  votingMode: PollVotingMode;
  resultsVisibility: PollResultsVisibility;
  isAnonymous: boolean;
  quorumPercentage: number;
}

export interface PreviewRecipientProjection {
  contentType: EngagementContentType;
  title: string;
  description: string;
  status: string;
  projectedStatus: string;
  scheduleDate?: string | null;
  expiryDate?: string | null;
  targetAudience: any;
  estimatedRecipients: number;
  images?: any[];
  category?: string;
  priority?: string;
  options?: any[];
  quorumPercentage?: number;
  votingMode?: string;
  resultsVisibility?: string;
  isAnonymous?: boolean;
  requiresAcknowledgement?: boolean;
  allowComments?: boolean;
}
