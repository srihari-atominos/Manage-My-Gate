import cron from 'node-cron';
import Complaint from './complaint.model.js';
import complaintService from './complaint.service.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

class ComplaintCron {
  init() {
    // Run every hour to check for SLA breaches
    cron.schedule('0 * * * *', async () => {
      logger.info('[CRON] Running SLA Breach Check Cron Job...');
      try {
        const now = new Date();
        const breachedComplaints = await Complaint.find({
          // Finished work waiting for the resident must not be escalated (it would erase the "Completed" state)
          status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Rejected', 'Escalated', 'Completed', 'Work Completed', 'Waiting For Resident Confirmation'] },
          slaDueDate: { $lt: now },
          escalationLevel: { $lt: 1 } // Only escalate if not already escalated by cron
        });

        for (const complaint of breachedComplaints) {
          const compOrgId = complaint.orgId?.toString();
          const cronJobId = `cron-complaint-sla-${complaint._id}`;

          await loggerStorage.run({ requestId: cronJobId, orgId: compOrgId }, async () => {
            try {
              await complaintService.escalateComplaint(complaint._id, complaint.orgId, {
                ipAddress: 'System',
                browser: 'Cron',
                device: 'Server'
              });
              logger.info(`Successfully escalated complaint ${complaint.complaintNumber}`, { orgId: compOrgId });
            } catch (err) {
              logger.error(`Failed to escalate complaint ${complaint.complaintNumber}: ${err.message}`, { orgId: compOrgId });
            }
          });
        }
      } catch (error) {
        logger.error('Error in SLA Breach Check Cron Job:', error);
      }
    });

    // Hourly: remind residents to confirm finished work, and auto-close what they never answer.
    cron.schedule('30 * * * *', async () => {
      try {
        const result = await complaintService.processAwaitingConfirmations();
        if (result.reminded || result.autoClosed) {
          console.log(`Complaint confirmation job: reminded ${result.reminded}, auto-closed ${result.autoClosed}`);
        }
      } catch (error) {
        console.error('Error in complaint confirmation cron job:', error);
      }
    });
  }
}

export default new ComplaintCron();
