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
          orgId,
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
      orgId,
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

const handleAssignmentNotification = async ({ orgId, complaint, previousAssigneeName, previousAssigneeId }) => {
  const isReassignment = Boolean(previousAssigneeId || previousAssigneeName);
  logger.info(`Complaint ${complaint.complaintNumber} ${isReassignment ? 'reassigned' : 'assigned'} in org ${orgId}`);

  if (previousAssigneeId) {
    try {
      await notificationService.createNotification({
        recipientId: previousAssigneeId,
        orgId,
        title: 'Complaint Reassigned',
        body: `Complaint ${complaint.complaintNumber} has been reassigned and is no longer in your work queue.`,
        actionUrl: `/admin/complaints/assignee`,
        type: 'INFO'
      });
    } catch (err) { logger.error('Failed to notify previous assignee:', err); }
  }

  if (complaint.isBroadcast && complaint.broadcastTechnicianIds && complaint.broadcastTechnicianIds.length > 0) {
    // Notify all broadcasted technicians
    for (const techId of complaint.broadcastTechnicianIds) {
      try {
        await notificationService.createNotification({
          recipientId: techId,
          orgId,
          title: 'New Complaint Assignment Request',
          body: `You have a new assignment pending acceptance: ${complaint.complaintNumber}.`,
          actionUrl: `/admin/complaints/assignee?ticketId=${complaint.complaintNumber}`,
          type: 'INFO'
        });
      } catch (err) { logger.error('Failed to notify broadcast assignee:', err); }
    }
  } else if (complaint.assignedTechnicianId) {
    // Direct Assignment (Assign Employee)
    const techIdStr = complaint.assignedTechnicianId._id 
      ? complaint.assignedTechnicianId._id.toString() 
      : complaint.assignedTechnicianId.toString();

    let recipientUserId = techIdStr;
    try {
      const Technician = (await import('../technician/technician.model.js')).default;
      const techDoc = await Technician.findById(techIdStr);
      if (techDoc && techDoc.userId) {
        recipientUserId = techDoc.userId.toString();
      }
    } catch (err) {}

    try {
      await notificationService.createNotification({
        recipientId: recipientUserId,
        orgId,
        title: 'New Complaint Assignment',
        body: `You have been directly assigned to complaint: ${complaint.complaintNumber}.`,
        actionUrl: `/admin/complaints/assignee?ticketId=${complaint.complaintNumber}`,
        type: 'INFO'
      });

      // Send email notification
      const assigneeUser = await User.findById(techIdStr);
      if (assigneeUser && assigneeUser.email) {
        const { sendEmail, getEmailLogoHtml } = await import('../../utils/email.utils.js');
        const emailBody = `
        <div style="font-family: 'Hanken Grotesk', sans-serif; padding: 30px; color: #171717; background-color: #FFF8EF; max-width: 500px; margin: 0 auto; border: 1px solid #EFE6DC; border-radius: 18px;">
${getEmailLogoHtml()}
          <h2 style="color: #F45A0A; margin-top: 0;">Admin Allocated Work</h2>
          <p>You have been assigned to a new complaint/task.</p>
          <div style="background-color: #FFF0E5; border-radius: 12px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Ticket #:</strong> ${complaint.complaintNumber}</p>
            <p style="margin: 0;"><strong>Title:</strong> ${complaint.title}</p>
          </div>
          <p>Please log in to the application to view details in the Assignee tab.</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #EFE6DC;">
            <p style="margin: 0; font-size: 14px; color: #6F6A64;">
              Thank you,<br/>
              <strong style="color: #F45A0A;">Nahom Team</strong>
            </p>
          </div>
        </div>`;
        await sendEmail(orgId, assigneeUser.email, 'New Task Assignment', emailBody);
      }
    } catch (err) { logger.error('Failed to notify assignee:', err); }

    // Notify Resident
    try {
      await notificationService.createNotification({
        recipientId: complaint.residentId,
        orgId,
        title: 'Technician Assigned',
        body: `Your complaint (${complaint.complaintNumber}) has been assigned to ${complaint.assignedTechnicianName || complaint.vendor}.`,
        actionUrl: `/complaints`,
        type: 'INFO'
      });
    } catch (err) { logger.error('Failed to notify resident:', err); }
  }
};

complaintEvents.on('complaint.assigned', handleAssignmentNotification);
complaintEvents.on('complaint.reassigned', handleAssignmentNotification);

complaintEvents.on('complaint.updated', async ({ orgId, complaint, action, previousBroadcastIds, acceptedById }) => {
  logger.info(`Complaint ${complaint.complaintNumber} updated with action ${action} in org ${orgId}`);
  
  // Helper to notify resident
  const notifyResident = async (title, body) => {
    try {
      await notificationService.createNotification({
        recipientId: complaint.residentId,
        orgId,
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

  // Helper to notify the employee working on the ticket
  const notifyAssignee = async (title, body) => {
    const assignee = complaint.assignedTechnicianId;
    const assigneeId = assignee && typeof assignee === 'object' ? (assignee._id || assignee.id) : assignee;
    if (!assigneeId) return;
    try {
      await notificationService.createNotification({
        recipientId: assigneeId,
        orgId,
        title, body,
        actionUrl: `/admin/complaints/assignee`,
        type: 'INFO'
      });
    } catch (err) { logger.error('Failed to notify assignee:', err); }
  };

  if (action === 'Complaint Reopened') {
    await notifyAssignee('Complaint Reopened', `The resident says complaint ${complaint.complaintNumber} is not fully fixed. Please check the reason and finish the work.`);
    await notifyAdmin('Complaint Reopened', `Resident reopened complaint ${complaint.complaintNumber}.`);
  }

  if (action === 'Confirmation Reminder') {
    await notifyResident('Please confirm your complaint', `The work on complaint ${complaint.complaintNumber} is finished. Please confirm it is fixed, or reopen it if not.`);
  }

  if (action === 'Complaint Auto-Closed') {
    await notifyResident('Complaint Closed', `Complaint ${complaint.complaintNumber} was closed automatically because there was no response after the work was completed.`);
    await notifyAssignee('Complaint Closed', `Complaint ${complaint.complaintNumber} was closed automatically.`);
  }

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
              orgId,
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
    await notifyAssignee('Work Confirmed', `The resident confirmed your work on complaint ${complaint.complaintNumber}. Well done!`);
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
