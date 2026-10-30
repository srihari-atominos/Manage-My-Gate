import { expandUserPermissions, mapPermission } from '../../utils/permissionMapper.js';

/**
 * The sole capability catalogue for the AI boundary.  Gemini may suggest a
 * tool, but this registry decides whether that tool is even visible or may run.
 * `tenant` is trusted middleware context; callers must never supply it.
 */
const selfService = { any: [] };
const admin = { any: ['*', 'billing:dashboard', 'billing:view_expense'] };

const define = (feature, intent, options = {}) => Object.freeze({
  feature,
  intent,
  required: [],
  optional: [],
  mutation: false,
  confirmationRequired: false,
  tenantScope: 'active_tenant',
  resourceScope: 'self',
  permission: selfService,
  allowResidentFallback: true,
  exposeWhenUnauthorized: false,
  enabled: true,
  ...options,
});

export const AI_OPERATION_REGISTRY = Object.freeze({
  get_community_finance_summary: define('community_finance', 'community_finance', { permission: admin, resourceScope: 'tenant', allowResidentFallback: false, exposeWhenUnauthorized: true }),
  get_personal_expense_summary: define('personal_expenses', 'personal_expense'),
  prepare_personal_expense: define('personal_expenses', 'personal_expense_create', { required: ['amount'], mutation: true, confirmationRequired: true }),
  preview_receipt_ocr: define('personal_expenses', 'receipt_ocr', { required: ['receiptText'] }),
  get_resident_dues_and_invoices: define('billing', 'resident_dues', { permission: { any: ['*', 'billing:my_invoices'] } }),
  prepare_assessment_creation: define('billing', 'assessment_create', { required: ['name', 'flatAmount'], mutation: true, confirmationRequired: true, permission: admin, resourceScope: 'tenant', allowResidentFallback: false }),
  get_amenities_catalog: define('amenities', 'amenity_inquiry', { permission: { any: ['*', 'amenities:discover', 'amenities:read', 'amenities:my_booking'] } }),
  check_amenity_availability: define('amenities', 'amenity_availability', { required: ['amenityName'], permission: { any: ['*', 'amenities:discover', 'amenities:my_booking'] } }),
  get_my_bookings: define('amenities', 'my_bookings', { permission: { any: ['*', 'amenities:my_booking'] } }),
  prepare_amenity_booking: define('amenities', 'amenity_booking', { required: ['amenityName', 'date'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'amenities:my_booking', 'amenities:book'] } }),
  prepare_amenity_booking_cancellation: define('amenities', 'amenity_cancellation', { mutation: true, confirmationRequired: true, permission: { any: ['*', 'amenities:my_booking'] } }),
  prepare_amenity_creation: define('amenities', 'amenity_create', { required: ['name'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'amenities:master', 'amenities:create', 'amenities:manage'] }, resourceScope: 'tenant', allowResidentFallback: false }),
  get_my_complaints: define('complaints', 'complaints_helpdesk', { permission: { any: ['*', 'complaints:my_tickets', 'complaints:raise_ticket'] } }),
  prepare_complaint: define('complaints', 'complaint_create', { required: ['title'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'complaints:raise_ticket', 'complaints:create'] } }),
  prepare_maintenance_request: define('complaints', 'maintenance_create', { required: ['title'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'complaints:raise_ticket', 'complaints:create'] } }),
  prepare_complaint_cancellation: define('complaints', 'complaint_cancel', { required: ['complaintId'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'complaints:my_tickets', 'complaints:raise_ticket'] } }),
  escalate_complaint: define('complaints', 'complaint_escalate', { required: ['complaintId'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'complaints:my_tickets', 'complaints:raise_ticket'] } }),
  reopen_complaint: define('complaints', 'complaint_reopen', { required: ['complaintId'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'complaints:my_tickets', 'complaints:raise_ticket'] } }),
  add_complaint_comment: define('complaints', 'complaint_comment', { required: ['complaintId', 'comment'], mutation: true, confirmationRequired: false, permission: { any: ['*', 'complaints:my_tickets', 'complaints:raise_ticket'] } }),
  get_my_visitor_passes: define('visitor_management', 'visitor_management', { permission: { any: ['*', 'visitor:resident', 'visitor:admin'] } }),
  get_visitor_history: define('visitor_management', 'visitor_history', { permission: { any: ['*', 'visitor:resident', 'visitor:guard', 'visitor:admin'] } }),
  get_pending_gate_approvals: define('visitor_management', 'gate_approvals', { permission: { any: ['*', 'visitor:resident', 'visitor:guard', 'visitor:admin'] } }),
  prepare_visitor_pass: define('visitor_management', 'visitor_pass_create', { required: ['visitorName', 'date'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'visitor:resident', 'visitor:admin'] } }),
  prepare_visitor_pass_revocation: define('visitor_management', 'visitor_pass_revoke', { mutation: true, confirmationRequired: true, permission: { any: ['*', 'visitor:resident', 'visitor:admin'] } }),
  get_community_notices: define('notices', 'community_notices', { permission: { any: ['*', 'notices:active_board', 'notices:read'] } }),
  get_notice_details: define('notices', 'notice_details', { permission: { any: ['*', 'notices:active_board', 'notices:read'] } }),
  prepare_notice_acknowledgement: define('notices', 'notice_acknowledgement', { mutation: true, confirmationRequired: true, permission: { any: ['*', 'notices:acknowledge', 'notices:active_board'] } }),
  prepare_notice_creation: define('notices', 'notice_create', { required: ['title', 'description'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'notices:manage_notices', 'notices:create'] }, resourceScope: 'tenant', allowResidentFallback: false }),
  get_active_polls: define('polls', 'community_polls', { permission: { any: ['*', 'notices:polls', 'polls:read'] } }),
  get_poll_details: define('polls', 'poll_details', { permission: { any: ['*', 'notices:polls', 'polls:read'] } }),
  prepare_poll_vote: define('polls', 'poll_vote', { mutation: true, confirmationRequired: true, permission: { any: ['*', 'notices:polls', 'polls:vote'] } }),
  prepare_poll_creation: define('polls', 'poll_create', { required: ['question'], mutation: true, confirmationRequired: true, permission: { any: ['*', 'notices:manage_notices', 'polls:create'] }, resourceScope: 'tenant', allowResidentFallback: false }),
  search_staff_directory: define('staff', 'staff_directory', { permission: { any: ['*', 'staff:view', 'staff:attendance'] }, resourceScope: 'tenant' }),
  get_my_unit_staff: define('staff', 'unit_staff', { permission: { any: ['*', 'staff:view', 'staff:attendance'] } }),
  get_active_staff_attendance: define('staff', 'staff_attendance', { permission: { any: ['*', 'staff:attendance'] }, resourceScope: 'tenant' }),
  get_my_household_members: define('household', 'household_members'),
  get_my_vehicles_and_parking: define('household', 'household_vehicles'),
  get_my_settings_and_preferences: define('settings', 'user_settings'),
  get_admin_analytics_summary: define('admin_analytics', 'admin_analytics', { permission: admin, resourceScope: 'tenant', allowResidentFallback: false, exposeWhenUnauthorized: true }),
  get_wallet_balance: define('wallet', 'wallet_balance'),
  get_wallet_transactions: define('wallet', 'wallet_transactions'),
  get_my_notifications: define('notifications', 'notifications'),
  prepare_notifications_mark_read: define('notifications', 'notifications_mark_read', { mutation: true, confirmationRequired: true }),
  get_issue_reports: define('issue_reports', 'issue_reports_list'),
  prepare_issue_report: define('issue_reports', 'issue_report_create', { mutation: true, confirmationRequired: true }),
  get_emergency_contacts: define('directory', 'emergency_contacts'),
  confirm_pending_action: define('assistant', 'confirm_pending_action', { mutation: true, confirmationRequired: false, resourceScope: 'action_owner' }),
  cancel_pending_action: define('assistant', 'cancel_pending_action', { mutation: true, confirmationRequired: false, resourceScope: 'action_owner' }),
  navigate_to_screen: define('navigation', 'navigation'),
  // Product decision: no feedback collection or automatic learning.
  submit_ai_feedback: define('assistant', 'ai_feedback', { enabled: false }),
});

export function getEffectivePermissions(user, tenant) {
  const raw = Array.isArray(tenant?.permissions)
    ? tenant.permissions
    : (Array.isArray(user?.permissions) ? user.permissions : []);
  return expandUserPermissions(raw.map(mapPermission));
}

export function getOperation(toolName) {
  return AI_OPERATION_REGISTRY[toolName] || null;
}

export function isOperationAuthorized(toolName, user, tenant) {
  const operation = getOperation(toolName);
  if (!operation || !operation.enabled || !user || !(tenant?.orgId || user?.orgId)) return false;
  if (user.isPlatform === true || tenant?.isPlatform === true || ['Admin', 'Community Admin', 'Super Admin', 'Platform Super Admin'].includes(user.role)) return true;
  const allowed = operation.permission?.any || [];
  if (allowed.length === 0) return true;
  const permissions = new Set(getEffectivePermissions(user, tenant));
  if (allowed.some((permission) => permissions.has(permission))) return true;
  const role = String(user.role || '').toLowerCase();
  // Self-scoped services perform their own ownership checks.  This keeps
  // authenticated legacy users (whose role document has not yet been expanded
  // into granular permissions) working without opening tenant-wide actions.
  return operation.allowResidentFallback && (!role || /resident|tenant|owner|family/.test(role));
}

export function canAttemptOperation(toolName, user, tenant) {
  const operation = getOperation(toolName);
  return Boolean(operation && (isOperationAuthorized(toolName, user, tenant) || operation.exposeWhenUnauthorized));
}

export function getAuthorizedOperations(user, tenant) {
  return Object.entries(AI_OPERATION_REGISTRY)
    .filter(([toolName]) => isOperationAuthorized(toolName, user, tenant))
    .map(([toolName, operation]) => ({ toolName, ...operation }));
}
