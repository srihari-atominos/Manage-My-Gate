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

export type NoticePriority = 'Low' | 'Medium' | 'High' | 'Critical';

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
  acknowledgementDeadline?: string;
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

export type LedgerDatePreset =
  | 'ALL_TIME'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'PAST_30_DAYS'
  | 'CUSTOM';

export interface CommunityEngagementFilterValues {
  datePreset: LedgerDatePreset;
  startDate: string;
  endDate: string;
  priorities: NoticePriority[];
  categories: NoticeCategory[];
  audienceScope: 'ALL' | 'OWNERS_ONLY' | 'STAFF_ONLY' | 'SPECIFIC_ROLE';
  selectedRoleIds: string[];
  pollVotingModes: ('PUBLIC' | 'ANONYMOUS')[];
  pollChoiceTypes: ('SINGLE_CHOICE' | 'MULTIPLE_CHOICE')[];
  isPinnedOnly: boolean;
  requiresAcknowledgementOnly: boolean;
}

export const mapEngagementEntityToFormData = (
  entity: any,
  type: EngagementContentType = 'NOTICE'
): CommunityEngagementFormData => {
  const isNotice = type === 'NOTICE';

  let targetType: AudienceTargetType = 'ALL';
  let selectedRoleId: string | undefined = undefined;
  let selectedUserId: string | undefined = undefined;
  let selectedBlocks: string[] | undefined = undefined;
  let selectedUnits: string[] | undefined = undefined;

  const ta = entity.targetAudience || entity.audience;
  if (ta) {
    if (ta.targetType === 'ALL') {
      targetType = 'ALL';
    } else if (ta.targetType === 'RESIDENCY_TYPES') {
      const types = ta.targetResidencyTypes || [];
      if (types.some((t: string) => t.toLowerCase().includes('owner'))) {
        targetType = 'OWNERS_ONLY';
      } else if (
        types.some(
          (t: string) =>
            t.toLowerCase().includes('staff') || t.toLowerCase().includes('guard')
        )
      ) {
        targetType = 'STAFF_ONLY';
      }
    } else if (ta.targetType === 'ROLES') {
      targetType = 'SPECIFIC_ROLE';
      selectedRoleId = ta.targetRoles?.[0];
    } else if (ta.targetType === 'CUSTOM') {
      targetType = 'SPECIFIC_RESIDENT';
      selectedUserId = ta.targetUsers?.[0];
    } else if (ta.targetType === 'BLOCKS') {
      targetType = 'BLOCKS';
      selectedBlocks = ta.blocks || [];
    } else if (ta.targetType === 'UNITS') {
      targetType = 'UNITS';
      selectedUnits = ta.units || [];
    }
  }

  const defaultSchedule = new Date();
  defaultSchedule.setDate(defaultSchedule.getDate() + 1);

  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);

  if (isNotice) {
    const images: LocalAttachment[] = (entity.images || []).map(
      (img: any, idx: number) => ({
        id: img._id || `img-${idx}`,
        uri: img.url || img.uri,
        name: img.filename || img.name || `photo_${idx + 1}.jpg`,
        type: 'image/jpeg',
        isRemote: true,
      })
    );

    return {
      contentType: 'NOTICE',
      title: entity.title || '',
      description: entity.description || '',
      publishNow: entity.status === 'Published' || !entity.scheduleDate,
      scheduleDate: entity.scheduleDate
        ? new Date(entity.scheduleDate).toISOString()
        : defaultSchedule.toISOString(),
      expiryDate: entity.expiryDate
        ? new Date(entity.expiryDate).toISOString()
        : defaultExpiry.toISOString(),
      targetType,
      selectedRoleId,
      selectedUserId,
      selectedBlocks,
      selectedUnits,

      category: entity.category || 'General',
      priority: entity.priority || 'Medium',
      status: entity.status || 'Published',
      isPinned: Boolean(entity.isPinned),
      allowComments: entity.allowComments !== false,
      allowReactions: entity.allowReactions !== false,
      isCritical: Boolean(entity.isCritical),
      requiresAcknowledgement: Boolean(entity.requiresAcknowledgement),
      acknowledgementDeadline: entity.acknowledgementDeadline
        ? new Date(entity.acknowledgementDeadline).toISOString()
        : undefined,
      images,

      options: ['', ''],
      choiceType: 'SINGLE_CHOICE',
      maxChoices: 1,
      votingMode: 'ONE_PER_USER',
      resultsVisibility: 'ALWAYS',
      isAnonymous: false,
      quorumPercentage: 0,
    };
  } else {
    // Poll
    const rawOptions = entity.options || [];
    const options = rawOptions.map((opt: any) =>
      typeof opt === 'string' ? opt : opt.text || ''
    );

    return {
      contentType: 'POLL',
      title: entity.question || entity.title || '',
      description: entity.description || '',
      publishNow: entity.status === 'Active' || !entity.scheduleDate,
      scheduleDate: entity.scheduleDate
        ? new Date(entity.scheduleDate).toISOString()
        : defaultSchedule.toISOString(),
      expiryDate: entity.endDate
        ? new Date(entity.endDate).toISOString()
        : defaultExpiry.toISOString(),
      targetType,
      selectedRoleId,
      selectedUserId,
      selectedBlocks,
      selectedUnits,

      category: 'General',
      priority: 'Medium',
      status: 'Published',
      isPinned: false,
      allowComments: true,
      allowReactions: true,
      isCritical: false,
      requiresAcknowledgement: false,
      images: [],

      options: options.length >= 2 ? options : ['', ''],
      choiceType: entity.choiceType || 'SINGLE_CHOICE',
      maxChoices: entity.maxChoices || 1,
      votingMode: entity.votingMode || 'ONE_PER_USER',
      resultsVisibility: entity.resultsVisibility || 'ALWAYS',
      isAnonymous: Boolean(entity.isAnonymous),
      quorumPercentage: entity.quorumPercentage || 0,
    };
  }
};
