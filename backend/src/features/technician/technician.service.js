import crypto from 'crypto';
import QRCode from 'qrcode';
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

  async syncOrUpsertTechnicianFromUser(
    {
      userId,
      orgId,
      name,
      email,
      phone,
      department = 'Others',
      type = 'In-House Staff',
      designation = '',
      staffCode = null,
      status = 'Active',
    },
    session = null
  ) {
    const existing = await technicianRepository.findByContactOrUserId(
      userId,
      orgId,
      { email, phone },
      session
    );

    if (existing) {
      const updateData = {
        userId: userId || existing.userId,
        isDeleted: false,
        status: status || existing.status,
      };
      if (name && name.trim()) updateData.name = name.trim();
      if (phone && phone !== 'N/A') updateData.phone = phone;
      if (department) updateData.department = department;
      if (type) updateData.type = type;
      if (designation) updateData.designation = designation;
      if (staffCode) updateData.staffCode = staffCode;
      return await technicianRepository.update(existing._id, orgId, updateData, session);
    }

    const newDoc = {
      orgId,
      userId: userId || null,
      name: name || (email ? email.split('@')[0] : 'Staff Member'),
      email: email || '',
      phone: phone || 'N/A',
      department: department || 'Others',
      type: type || 'In-House Staff',
      designation: designation || '',
      ...(staffCode ? { staffCode } : {}),
      status: status || 'Active',
      whatsappEnabled: true,
      isDeleted: false,
    };
    return await technicianRepository.create(newDoc, session);
  }

  async getTechnicians(orgId, filter) {
    return await technicianRepository.findAll(orgId, filter);
  }

  async getMyProfile(userId, orgId, userDetails = {}) {
    if (!userId || !orgId) {
      throw new HttpError(400, 'User ID and Organization ID are required');
    }

    let technician = await technicianRepository.findByUserId(userId, orgId);

    // If not found directly by userId, attempt self-healing link using verified email/phone
    if (!technician && (userDetails.email || userDetails.phone)) {
      technician = await technicianRepository.findByContactOrUserId(userId, orgId, {
        email: userDetails.email,
        phone: userDetails.phone
      });

      if (technician && (!technician.userId || String(technician.userId) !== String(userId))) {
        await technicianRepository.update(technician._id, orgId, { userId });
        technician.userId = userId;
      }
    }

    if (!technician) {
      throw new HttpError(404, 'No staff profile found for this user in the active community');
    }

    return technician;
  }

  generateStaffQrPayload(technician, orgId) {
    const rawStaffCode = technician.staffCode || String(technician._id);
    const techId = String(technician._id);
    const safeName = (technician.name || 'Staff').trim().replace(/\s+/g, '_');

    // Cryptographic signature using HMAC-SHA256 for tamper resistance
    let activeSecret = process.env.QR_HMAC_SECRET;
    if (!activeSecret && process.env.NODE_ENV === 'production') {
      throw new HttpError(
        500,
        'Cryptographic configuration error: QR_HMAC_SECRET must be explicitly configured in production.'
      );
    }
    activeSecret = activeSecret || process.env.JWT_SECRET || 'secret';
    if (process.env.NODE_ENV === 'production') {
      if (activeSecret === 'secret' || activeSecret.length < 32) {
        throw new HttpError(500, 'Cryptographic secret does not meet security requirements.');
      }
    }

    const validUntilIso = technician.qrValidUntil ? new Date(technician.qrValidUntil).toISOString() : '';
    const signature = crypto
      .createHmac('sha256', activeSecret)
      .update(`${orgId}:${techId}:${rawStaffCode}:${validUntilIso}`)
      .digest('hex')
      .slice(0, 16);

    // Canonical Nahom barcode protocol: MMG:SERVICE:{CODE}:{TECHNICIAN_ID}:{STAFF_NAME}:{SIGNATURE}[:{VALID_UNTIL}]
    const barcodePayload = validUntilIso
      ? `MMG:SERVICE:${rawStaffCode}:${techId}:${safeName}:${signature}:${validUntilIso}`
      : `MMG:SERVICE:${rawStaffCode}:${techId}:${safeName}:${signature}`;

    return {
      technicianId: techId,
      staffCode: technician.staffCode || null,
      name: technician.name,
      department: technician.department,
      designation: technician.designation || '',
      type: technician.type,
      status: technician.status,
      qrValidFrom: technician.qrValidFrom || null,
      qrValidUntil: technician.qrValidUntil || null,
      shiftWindow: technician.shiftWindow || null,
      barcodePayload,
      signature,
      token: `STF:${techId}:${signature}`,
    };
  }

  async getMyQr(userId, orgId, userDetails = {}) {
    const technician = await this.getMyProfile(userId, orgId, userDetails);
    if (technician.status !== 'Active' || technician.isDeleted) {
      throw new HttpError(403, 'Staff account is not active');
    }
    const qrData = this.generateStaffQrPayload(technician, orgId);
    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(qrData.barcodePayload, { margin: 2, width: 300 });
    } catch {
      // Fallback if rendering fails
    }
    return { ...qrData, qrDataUrl };
  }

  async getStaffQrById(technicianId, orgId) {
    const technician = await this.getTechnicianById(technicianId, orgId);
    if (!technician || technician.isDeleted) {
      throw new HttpError(404, 'Staff member not found');
    }
    if (technician.status !== 'Active') {
      throw new HttpError(400, 'Staff member is not active');
    }
    const qrData = this.generateStaffQrPayload(technician, orgId);
    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(qrData.barcodePayload, { margin: 2, width: 300 });
    } catch {
      // Fallback
    }
    return { ...qrData, qrDataUrl };
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
