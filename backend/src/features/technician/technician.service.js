import technicianRepository from './technician.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import userService from '../user/user.services.js';

class TechnicianService {
  async createTechnician(orgId, data) {
    let userId = null;
    
    // Automatically create a user account
    const emailToUse = data.email ? data.email.trim().toLowerCase() : `${data.phone.replace(/\D/g, '')}@staff.local`;
    const roleName = data.type === 'External Vendor' ? 'Staff/Vendor' : 'Staff/Vendor';
    try {
      const roleService = (await import('../role/role.services.js')).default;
      let role = await roleService.getRoleByName(roleName, orgId);
      if (!role) {
         await roleService.createRole({ name: roleName, description: 'Auto-created role for Staff and Vendors', orgId, permissions: [] });
      }

      const result = await userService.inviteUser(emailToUse, orgId, null, 'None', roleName, data.phone, data.name);
      if (result && result.user) {
         userId = result.user._id;
         data.status = 'Pending';
      }
    } catch (err) {
      console.error('Error auto-inviting technician user:', err);
      const existingUser = await userService.getUserByEmail(emailToUse);
      if (existingUser) {
         userId = existingUser._id;
      }
    }

    // Check if syncTechnicianForStaffUser or existing entry already exists for this user/email
    const existingTech = await technicianRepository.findAll(orgId, {
      $or: [
        ...(userId ? [{ userId }] : []),
        ...(emailToUse ? [{ email: emailToUse }] : []),
        ...(data.phone && data.phone !== 'N/A' ? [{ phone: data.phone }] : [])
      ]
    });

    if (existingTech && existingTech.length > 0) {
      const targetTech = existingTech[0];
      const updated = await technicianRepository.update(targetTech._id, orgId, {
        ...data,
        userId: userId || targetTech.userId,
        isDeleted: false,
      });
      return updated;
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

    if (data.status && updated.userId) {
      if (data.status === 'Active') {
        const User = (await import('../user/user.model.js')).default;
        const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;

        await User.updateOne({ _id: updated.userId, status: 'Pending Verification' }, { $set: { status: 'Active' } });
        await OrgMembership.updateOne({ userId: updated.userId, orgId }, { $set: { status: 'Active' } });
      }
    }

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
