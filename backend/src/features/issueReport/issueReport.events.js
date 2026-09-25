import { EventEmitter } from 'events';

/**
 * Event emitter for Issue Report lifecycle events.
 * Decouples write operations from async notifications and background triggers.
 */
export const ISSUE_REPORT_EVENTS = {
  REPORT_SUBMITTED: 'issueReport:submitted',
};

export const issueReportEventEmitter = new EventEmitter();
export default issueReportEventEmitter;
