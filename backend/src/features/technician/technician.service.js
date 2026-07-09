import technicianRepository from './technician.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import userService from '../user/user.services.js';

class TechnicianService {
  async createTechnician(orgId, data) {
    let userId = null;
    
    // Automatically create a user account if an email is provided
    if (data.email) {
      const roleName = data.type === 'External Vendor' ? 'Staff/Vendor' : 'Staff/Vendor'; // Can be customized later
      try {
        const result = await userService.inviteUser(data.email, orgId, null, 'None', roleName);
        if (result && result.user) {
           userId = result.user._id;
        }
      } catch (err) {
        console.error('Error auto-inviting technician user:', err);
        // We'll proceed even if invite fails, maybe they already exist
        const existingUser = await userService.getUserByEmail(data.email);
        if (existingUser) {
           userId = existingUser._id;
        }
      }
    }

    const technician = await technicianRepository.create({ orgId, userId, ...data });
    return technician;
  }

  async getTechnicians(orgId, filter) {
    return await technicianRepository.findAll(orgId, filter);
  }

  async getTechnicianById(id, orgId) {
    const technician = await technicianRepository.findById(id, orgId);
    if (!technician) throw new HttpError(404, 'Technician not found');
    return technician;
  }

  async updateTechnician(id, orgId, data) {
    const updated = await technicianRepository.update(id, orgId, data);
    if (!updated) throw new HttpError(404, 'Technician not found');
    return updated;
  }

  async deleteTechnician(id, orgId) {
    const deleted = await technicianRepository.softDelete(id, orgId);
    if (!deleted) throw new HttpError(404, 'Technician not found');
    return deleted;
  }

  async getWorkloadAnalytics(orgId, filter) {
    const technicians = await technicianRepository.getWorkloadAnalytics(orgId, filter);
    
    // Calculate dashboard summary
    const summary = {
      totalStaff: 0,
      totalVendors: 0,
      activeStaff: 0,
      availableStaff: 0,
      busyStaff: 0,
      activeVendors: 0,
      assignedComplaints: 0,
      completedToday: 0,
      totalResolved: 0,
      totalSlaCompliant: 0
    };

    technicians.forEach(t => {
      if (t.type === 'In-House Staff') {
        summary.totalStaff++;
        if (t.status === 'Active') {
          summary.activeStaff++;
          if (t.activeComplaintsCount === 0) summary.availableStaff++;
          if (t.activeComplaintsCount > 0) summary.busyStaff++;
        }
      } else if (t.type === 'External Vendor') {
        summary.totalVendors++;
        if (t.status === 'Active') summary.activeVendors++;
      }

      summary.assignedComplaints += t.assignedComplaintsCount || 0;
      summary.completedToday += t.completedTodayCount || 0;
      
      // We estimate global SLA compliance by accumulating compliant and resolved
      // However, we didn't project the raw resolved count. Let's rely on technician level stats,
      // or just re-calculate from raw arrays if needed. Since we don't have global SLA here easily,
      // we'll approximate or calculate from complaint stats in the future.
    });

    return {
      technicians,
      summary
    };
  }
}

export default new TechnicianService();
