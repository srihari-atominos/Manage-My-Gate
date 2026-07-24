import workspaceEvents from './workspace.events.js';
import auditLogService from '../auditLog/auditLog.services.js';
import logger from '../../utils/logger.utils.js';

const logWorkspaceAudit = async (action, actorId, targetId, metadata = {}) => {
  try {
    await auditLogService.logEvent({
      actorId,
      action,
      targetId,
      metadata,
      ipAddress: 'System Event',
    });
    logger.info(`Audit Log: ${action} logged for target workspace ${targetId} by actor ${actorId}`);
  } catch (error) {
    logger.error(`Failed to write audit log for ${action} event: `, error);
  }
};

workspaceEvents.on('WORKSPACE_CREATED', async ({ actorId, targetId, workspaceName }) => {
  await logWorkspaceAudit('Workspace Created', actorId, targetId, { workspaceName });
});

workspaceEvents.on('WORKSPACE_UPDATED', async ({ actorId, targetId, updateData }) => {
  await logWorkspaceAudit('Workspace Updated', actorId, targetId, { updateData });
});

workspaceEvents.on('WORKSPACE_DELETED', async ({ actorId, targetId, workspaceName }) => {
  await logWorkspaceAudit('Workspace Deleted', actorId, targetId, { workspaceName });
});

workspaceEvents.on('MODULE_ENABLED', async ({ actorId, targetId, moduleKey }) => {
  await logWorkspaceAudit('Module Enabled', actorId, targetId, { moduleKey });
});

workspaceEvents.on('MODULE_DISABLED', async ({ actorId, targetId, moduleKey }) => {
  await logWorkspaceAudit('Module Disabled', actorId, targetId, { moduleKey });
});

workspaceEvents.on('MODULE_ADDED', async ({ actorId, targetId, moduleKey }) => {
  await logWorkspaceAudit('Module Added', actorId, targetId, { moduleKey });
});

workspaceEvents.on('MODULE_UPDATED', async ({ actorId, targetId, moduleKey }) => {
  await logWorkspaceAudit('Module Updated', actorId, targetId, { moduleKey });
});

workspaceEvents.on('MODULE_DELETED', async ({ actorId, targetId, moduleKey }) => {
  await logWorkspaceAudit('Module Deleted', actorId, targetId, { moduleKey });
});

workspaceEvents.on('MODULES_REORDERED', async ({ actorId, targetId }) => {
  await logWorkspaceAudit('Modules Reordered', actorId, targetId);
});

workspaceEvents.on('SETTINGS_UPDATED', async ({ actorId, targetId }) => {
  await logWorkspaceAudit('Settings Updated', actorId, targetId);
});

workspaceEvents.on('MEMBER_ADDED', async ({ actorId, targetId, userId }) => {
  await logWorkspaceAudit('Member Added', actorId, targetId, { userId });
});

workspaceEvents.on('MEMBER_REMOVED', async ({ actorId, targetId, userId }) => {
  await logWorkspaceAudit('Member Removed', actorId, targetId, { userId });
});
