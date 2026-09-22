/**
 * Community Engagement Domain Constants & Contracts.
 * Serves as the foundation for Phase 2 unification.
 */

export const COMMUNITY_ENGAGEMENT_CONTENT_TYPES = Object.freeze({
  NOTICE: 'NOTICE',
  POLL: 'POLL',
});

export const VALID_CONTENT_TYPES = Object.freeze(
  Object.values(COMMUNITY_ENGAGEMENT_CONTENT_TYPES)
);

export const ENGAGEMENT_STATUSES = Object.freeze({
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  EXPIRED: 'Expired',
  ARCHIVED: 'Archived',
});

export const ENGAGEMENT_OUTBOX_EVENT_TYPES = Object.freeze({
  NOTICE_PUBLISHED: 'NOTICE_PUBLISHED',
  NOTICE_ACKNOWLEDGEMENT_REMINDER: 'NOTICE_ACKNOWLEDGEMENT_REMINDER',
  POLL_ACTIVATED: 'POLL_ACTIVATED',
  POLL_CLOSED: 'POLL_CLOSED',
  POLL_FINALIZED: 'POLL_FINALIZED',
  POLL_CLOSING_SOON: 'POLL_CLOSING_SOON',
});
