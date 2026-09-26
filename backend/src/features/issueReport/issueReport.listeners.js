import issueReportEventEmitter, { ISSUE_REPORT_EVENTS } from './issueReport.events.js';
import notificationService from '../notification/notification.service.js';
import Role from '../role/role.model.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';
import logger from '../../utils/logger.utils.js';

/**
 * Helper to notify Community Admins within a target organization.
 *
 * @param {string} orgId - Organization ID
 * @param {string} title - Notification title
 * @param {string} body - Notification text body
 * @param {string} actionUrl - Deep link destination URI
 */
export async function notifyCommunityAdmins(orgId, title, body, actionUrl) {
  try {
    if (!orgId) return;
    const adminRoleNames = ['Admin', 'Community Admin', 'Facility Manager', 'FacilityManager'];
    
    // 1. Resolve role ObjectIds for the organization matching admin role names
    const roles = await Role.find({ orgId, name: { $in: adminRoleNames } }).lean();
    
    let memberUserIds = [];
    if (roles && roles.length > 0) {
      const roleIds = roles.map((r) => r._id);
      const memberships = await OrgMembership.find({
        orgId,
        status: 'Active',
        $or: [
          { roleId: { $in: roleIds } },
          { roleIds: { $in: roleIds } },
        ],
      }).lean();
      memberUserIds = memberships.map((m) => m.userId).filter(Boolean);
    }

    // 2. Fallback: Find memberships where populated role names match admin definitions
    if (memberUserIds.length === 0) {
      const allMemberships = await OrgMembership.find({ orgId, status: 'Active' })
        .populate('roleId')
        .populate('roleIds')
        .lean();

      for (const m of allMemberships) {
        const roleNames = [
          m.roleId?.name,
          ...(Array.isArray(m.roleIds) ? m.roleIds.map((r) => r?.name) : []),
        ].filter(Boolean);

        if (roleNames.some((rn) => adminRoleNames.some((ar) => ar.toLowerCase() === rn.toLowerCase()))) {
          if (m.userId) memberUserIds.push(m.userId);
        }
      }
    }

    const uniqueUserIds = [...new Set(memberUserIds.map((id) => id.toString()))];

    logger.info(`[IssueReportListener] Found ${uniqueUserIds.length} Community Admin(s) in org ${orgId} to notify.`);

    // 3. Create persistent in-app notifications with deduplication check
    const Notification = (await import('../notification/notification.model.js')).default;
    for (const userId of uniqueUserIds) {
      try {
        const existingNotif = await Notification.findOne({
          recipientId: userId,
          actionUrl,
        }).lean();

        if (existingNotif) {
          logger.info(`[IssueReportListener] Duplicate notification suppressed for recipient ${userId} with actionUrl ${actionUrl}`);
          continue;
        }

        await notificationService.createNotification({
          recipientId: userId,
          orgId,
          title,
          body,
          actionUrl,
          type: 'INFO',
        });
      } catch (err) {
        logger.error(`[IssueReportListener] Failed to create notification for user ${userId}:`, err.message);
      }
    }
  } catch (error) {
    logger.error(`[IssueReportListener] Error notifying Community Admins for org ${orgId}:`, error);
  }
}

/**
 * Register Event Subscriber for REPORT_SUBMITTED lifecycle event.
 */
issueReportEventEmitter.on(ISSUE_REPORT_EVENTS.REPORT_SUBMITTED, async (payload) => {
  try {
    const { reportId, reportNumber, organisationId, title } = payload || {};
    if (!organisationId || !reportId) {
      logger.warn('[IssueReportListener] Received REPORT_SUBMITTED event missing required attributes:', payload);
      return;
    }

    logger.info(`[IssueReportListener] Processing REPORT_SUBMITTED event for report ${reportNumber || reportId} in org ${organisationId}`);

    const notifTitle = 'New Resident Issue Report';
    const notifBody = title
      ? `A resident has reported an issue: "${title}"`
      : `A new issue report (${reportNumber || 'Report'}) has been submitted.`;
    const actionUrl = `/admin/complaints/issue-reports?reportId=${reportId}`;

    await notifyCommunityAdmins(organisationId, notifTitle, notifBody, actionUrl);
  } catch (err) {
    logger.error('[IssueReportListener] Error handling REPORT_SUBMITTED event:', err);
  }
});
