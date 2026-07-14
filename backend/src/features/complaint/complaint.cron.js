import cron from 'node-cron';
import Complaint from './complaint.model.js';
import complaintService from './complaint.service.js';

class ComplaintCron {
  init() {
    // Run every hour to check for SLA breaches
    cron.schedule('0 * * * *', async () => {
      console.log('Running SLA Breach Check Cron Job...');
      try {
        const now = new Date();
        const breachedComplaints = await Complaint.find({
          status: { $nin: ['Closed', 'Resolved', 'Cancelled', 'Escalated'] },
          slaDueDate: { $lt: now },
          escalationLevel: { $lt: 1 } // Only escalate if not already escalated by cron
        });

        for (const complaint of breachedComplaints) {
          try {
            await complaintService.escalateComplaint(complaint._id, complaint.orgId, {
              ipAddress: 'System',
              browser: 'Cron',
              device: 'Server'
            });
            console.log(`Successfully escalated complaint ${complaint.complaintNumber}`);
          } catch (err) {
            console.error(`Failed to escalate complaint ${complaint.complaintNumber}:`, err.message);
          }
        }
      } catch (error) {
        console.error('Error in SLA Breach Check Cron Job:', error);
      }
    });
  }
}

export default new ComplaintCron();
