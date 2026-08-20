import { complaintEvents } from './complaint.events.js';
import { complaintSettingsEvents } from '../complaintSettings/complaintSettings.service.js';
import notificationService from '../notification/notification.service.js';
import Role from '../role/role.model.js';
import OrgMembership from '../orgMembership/orgMembership.model.js';
import User from '../user/user.model.js';
import logger from '../../utils/logger.utils.js';

// Helper to notify a role
async function notifyRole(orgId, roleName, title, body, actionUrl) {
  try {
    const roles = await Role.find({ orgId, name: roleName });
    if (!roles || roles.length === 0) return;

    const roleIds = roles.map(r => r._id);
    const memberships = await OrgMembership.find({
      orgId,
      $or: [
        { roleId: { $in: roleIds } },
        { roleIds: { $in: roleIds } }
      ]
    });

    for (const member of memberships) {
      if (member.userId) {
        await notificationService.createNotification({
          recipientId: member.userId,
          title,
          body,
          actionUrl,
          type: 'INFO'
        });
      }
    }
  } catch (error) {
    logger.error(`Error notifying role ${roleName}:`, error);
  }
}

// Setup Event Listeners

complaintEvents.on('complaint.created', async ({ orgId, complaint }) => {
  logger.info(`Complaint ${complaint.complaintNumber} created in org ${orgId}`);
  
  // Notify Resident
  try {
    await notificationService.createNotification({
      recipientId: complaint.residentId,
      title: 'Complaint Submitted Successfully',
      body: `Your complaint (${complaint.complaintNumber}) has been submitted successfully.`,
      actionUrl: `/complaints`,
      type: 'SUCCESS'
    });
  } catch (error) {
    logger.error('Failed to notify resident:', error);
  }

  // Notify Admin
  await notifyRole(orgId, 'Admin', 'New Complaint Received', `A new complaint (${complaint.complaintNumber}) has been received.`);
  
// Notify Facility Manager
  await notifyRole(orgId, 'FacilityManager', 'Complaint Waiting For Assignment', `Complaint ${complaint.complaintNumber} is waiting for assignment.`);
});

complaintEvents.on('complaint.assigned', async ({ orgId, complaint, adminId, previousAssigneeName }) => {
  logger.info(`Complaint ${complaint.complaintNumber} assigned in org ${orgId}`);

  if (complaint.isBroadcast && complaint.broadcastTechnicianIds && complaint.broadcastTechnicianIds.length > 0) {
    // Notify all broadcasted technicians
    for (const techId of complaint.broadcastTechnicianIds) {
      try {
        await notificationService.createNotification({
          recipientId: techId,
          title: 'New Complaint Assignment Request',
          body: `You have a new assignment pending acceptance: ${complaint.complaintNumber}.`,
          actionUrl: `/admin/complaints/assignee`,
          type: 'INFO'
        });
      } catch (err) { logger.error('Failed to notify broadcast assignee:', err); }
    }
  } else if (complaint.assignedTechnicianId) {
    // Direct Assignment (Assign Employee)
    const techIdStr = complaint.assignedTechnicianId._id 
      ? complaint.assignedTechnicianId._id.toString() 
      : complaint.assignedTechnicianId.toString();

    try {
      await notificationService.createNotification({
        recipientId: techIdStr,
        title: 'New Complaint Assignment',
        body: `You have been directly assigned to complaint: ${complaint.complaintNumber}.`,
        actionUrl: `/admin/complaints/assignee`,
        type: 'INFO'
      });

      // Send email notification
      const assigneeUser = await User.findById(techIdStr);
      if (assigneeUser && assigneeUser.email) {
        const { sendEmail } = await import('../../utils/email.utils.js');
        const emailBody = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Admin Allocated Work</h2>
          <p>You have been assigned to a new complaint/task.</p>
          <p><strong>Ticket #:</strong> ${complaint.complaintNumber}</p>
          <p><strong>Title:</strong> ${complaint.title}</p>
          <p>Please log in to the application to view details in the Assignee tab.</p>
        </div>`;
        await sendEmail(orgId, assigneeUser.email, 'New Task Assignment', emailBody);
      }
    } catch (err) { logger.error('Failed to notify assignee:', err); }

    // Notify Resident
    try {
      await notificationService.createNotification({
        recipientId: complaint.residentId,
        title: 'Technician Assigned',
        body: `Your complaint (${complaint.complaintNumber}) has been assigned to ${complaint.assignedTechnicianName || complaint.vendor}.`,
        actionUrl: `/complaints`,
        type: 'INFO'
      });
    } catch (err) { logger.error('Failed to notify resident:', err); }
  }
});

complaintEvents.on('complaint.updated', async ({ orgId, complaint, action, previousBroadcastIds, acceptedById }) => {
  logger.info(`Complaint ${complaint.complaintNumber} updated with action ${action} in org ${orgId}`);
  
  // Helper to notify resident
  const notifyResident = async (title, body) => {
    try {
      await notificationService.createNotification({
        recipientId: complaint.residentId,
        title, body,
        actionUrl: `/complaints`,
        type: 'INFO'
      });
    } catch (err) { logger.error('Failed to notify resident:', err); }
  };

  // Helper to notify admin
  const notifyAdmin = async (title, body) => {
    await notifyRole(orgId, 'Admin', title, body);
  };

  if (action === 'Assignment Accepted') {
    await notifyResident('Technician Assigned', `Your complaint (${complaint.complaintNumber}) has been assigned and accepted by ${complaint.assignedTechnicianName}.`);
    await notifyAdmin('Assignment Accepted', `Technician ${complaint.assignedTechnicianName} accepted complaint ${complaint.complaintNumber}.`);

    // Notify other broadcast technicians who missed it
    if (previousBroadcastIds && previousBroadcastIds.length > 0) {
      for (const techId of previousBroadcastIds) {
        if (String(techId) !== String(acceptedById)) {
          try {
            await notificationService.createNotification({
              recipientId: techId,
              title: 'Assignment No Longer Available',
              body: `The complaint (${complaint.complaintNumber}) has already been accepted by another technician.`,
              actionUrl: `/admin/complaints/assignee`,
              type: 'INFO'
            });
          } catch (err) { logger.error('Failed to notify missed assignee:', err); }
        }
      }
    }
  }

  if (action === 'Assignment Rejected') {
    await notifyAdmin('Assignment Rejected', `Technician rejected assignment for complaint ${complaint.complaintNumber}.`);
  }

  if (action === 'Work Started') {
    await notifyResident('Work Started', `Work has started on your complaint (${complaint.complaintNumber}).`);
  }

  if (action === 'Work Paused') {
    await notifyAdmin('Work Paused', `Work has been paused on complaint ${complaint.complaintNumber}.`);
  }

  if (action === 'Work Resumed') {
    await notifyResident('Work Resumed', `Work has resumed on your complaint (${complaint.complaintNumber}).`);
  }

  if (action === 'Work Completed') {
    await notifyResident('Work Completed', `Work on your complaint (${complaint.complaintNumber}) has been completed. Please review and confirm.`);
    await notifyAdmin('Work Completed', `Technician marked complaint ${complaint.complaintNumber} as completed.`);
  }

  if (action === 'Resident Confirmed') {
    await notifyAdmin('Resident Confirmed', `Resident confirmed completion of complaint ${complaint.complaintNumber}.`);
  }

  if (action === 'Complaint Closed') {
    await notifyResident('Complaint Closed', `Your complaint (${complaint.complaintNumber}) has been closed.`);
  }
});

complaintEvents.on('complaint.commentAdded', ({ orgId, complaint }) => {
  logger.info(`Comment added to complaint ${complaint.complaintNumber} in org ${orgId}`);
});

complaintSettingsEvents.on('settings.updated', ({ orgId, settings }) => {
  logger.info(`Complaint Settings updated in org ${orgId}`);
});
