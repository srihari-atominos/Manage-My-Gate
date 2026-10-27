import QRCode from 'qrcode';
import technicianRepository from './technician.repository.js';
import HttpError from '../../utils/httpError.utils.js';
import userService from '../user/user.services.js';
import technicianEvents from './technician.events.js';
import { signStaffQr } from '../../utils/staffQr.utils.js';
import {
  assertValidPhoto,
  savePhoto,
  removePhoto,
  openPhotoStream,
  verifyPhotoSignature,
  mimeForKey,
} from '../../utils/staffPhoto.utils.js';
import { STAFF_CATEGORIES, STAFF_CATEGORY_VALUES, isResidentAssignable, isStaffRoleScope, staffCategoryForRoleScope } from './staffCategory.utils.js';

// Fields an admin may set through the create/update API. Anything else (orgId, userId, isDeleted, ...)
// is dropped so a request body can never move a record across tenants or re-link it to another user.
const WRITABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'department',
  'departmentOther',
  'type',
  'roleId',
  'staffCategory',
  'communityOnly',
  'status',
  'whatsappEnabled',
  'designation',
  'staffCode',
  'authorId',
  'qrValidFrom',
  'qrValidUntil',
  'shiftWindow',
];

/** One line of plain text: no control characters, collapsed spaces, capped length. */
export const cleanDepartmentOther = (value) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

const pickWritable = (data = {}) => {
  const out = {};
  for (const key of WRITABLE_FIELDS) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  if (out.departmentOther !== undefined) out.departmentOther = cleanDepartmentOther(out.departmentOther);
  // The custom trade only makes sense for the "Others" department; never keep a stale one.
  if (out.department !== undefined && out.department !== 'Others') out.departmentOther = '';
  if (out.staffCategory !== undefined && !STAFF_CATEGORY_VALUES.includes(out.staffCategory)) delete out.staffCategory;
  if (out.communityOnly !== undefined) out.communityOnly = out.communityOnly === true || out.communityOnly === 'true';
  // "Community only" is a community staff setting; unit staff exist to serve units.
  if (out.staffCategory === STAFF_CATEGORIES.UNIT) out.communityOnly = false;
  return out;
};

class TechnicianService {
  /**
   * staffCode is what guards type in and what scans resolve by, so it must be unique per community.
   */
  async assertStaffCodeAvailable(orgId, staffCode, excludeId = null) {
    const code = typeof staffCode === 'string' ? staffCode.trim() : '';
    if (!code) return;
    const clash = await technicianRepository.findAll(orgId, { staffCode: code });
    if (clash.some((t) => !excludeId || String(t._id) !== String(excludeId))) {
      throw new HttpError(409, `Staff code '${code}' is already assigned to another staff member.`);
    }
  }

  async createTechnician(orgId, rawData) {
    const data = pickWritable(rawData);
    const roleService = (await import('../role/role.services.js')).default;
    const selectedRole = await roleService.getRoleById(data.roleId);
    if (selectedRole.orgId && String(selectedRole.orgId) !== String(orgId)) {
      throw new HttpError(404, 'Selected role is not available in this community.');
    }
    if (!isStaffRoleScope(selectedRole.roleScope)) {
      throw new HttpError(400, 'Select a Community Staff or Unit Staff role from Role Builder.');
    }
    // Role Builder owns the staff scope. Legacy fields are kept only for old records.
    data.staffCategory = staffCategoryForRoleScope(selectedRole.roleScope);
    data.communityOnly = selectedRole.roleScope === 'COMMUNITY_STAFF' && selectedRole.communityOnly === true;
    data.type = data.type || 'In-House Staff';
    if (data.qrValidFrom && data.qrValidUntil && new Date(data.qrValidFrom) >= new Date(data.qrValidUntil)) {
      throw new HttpError(400, 'QR validity start must be earlier than its end.');
    }
    await this.assertStaffCodeAvailable(orgId, data.staffCode);

    let userId = null;
    
    // Automatically create a user account
    const emailToUse = data.email ? data.email.trim().toLowerCase() : `${data.phone.replace(/\D/g, '')}@staff.local`;
    const roleName = selectedRole.name;

    // Never silently overwrite a live staff member who already uses this email or phone.
    const liveClash = await technicianRepository.findByContactOrUserId(null, orgId, { email: emailToUse, phone: data.phone });
    if (liveClash) {
      throw new HttpError(409, 'A staff member with this email or phone number already exists in this community.');
    }
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
      // Without a login account the staff member could never sign in, so surface the real failure.
      if (!existingUser) throw err;
      userId = existingUser._id;
    }

    // Check if an existing entry (active or soft-deleted) already exists for this user/email/phone
    const existingTech = await technicianRepository.findAnyByContactOrUserId(
      userId,
      orgId,
      { email: emailToUse, phone: data.phone }
    );

    const { orgId: _ignoredOrg, ...cleanData } = data;

    // The invite above already created a directory row for this user (or an earlier, removed one exists);
    // complete that row with the submitted details instead of creating a duplicate.
    if (existingTech) {
      const targetTech = existingTech;
      const updated = await technicianRepository.update(targetTech._id, orgId, {
        ...cleanData,
        orgId,
        userId: userId || targetTech.userId,
        isDeleted: false,
        status: data.status || 'Active',
      });
      technicianEvents.emit('technician_created', { orgId, technician: updated });
      return updated;
    }

    const technician = await technicianRepository.create({ ...cleanData, orgId, userId });
    technicianEvents.emit('technician_created', { orgId, technician });
    return technician;
  }

  async syncOrUpsertTechnicianFromUser(
    {
      userId,
      orgId,
      name,
      email,
      phone,
      department = null,
      departmentOther = '',
      type = null,
      roleId = null,
      staffCategory = null,
      communityOnly = false,
      designation = '',
      defaultDesignation = '',
      staffCode = null,
      status = 'Active',
      allowReactivateDeleted = false,
    },
    session = null
  ) {
    const existing = await technicianRepository.findAnyByContactOrUserId(
      userId,
      orgId,
      { email, phone },
      session
    );

    if (existing) {
      if (existing.isDeleted) {
        if (!allowReactivateDeleted) {
          // Soft-deleted staff member remains deleted during automated background syncs
          return null;
        }
        const updateData = {
          userId: userId || existing.userId,
          isDeleted: false,
          status: status || 'Active',
        };
        if (name && name.trim()) updateData.name = name.trim();
        if (phone && phone !== 'N/A') updateData.phone = phone;
        if (department) updateData.department = department;
        if (department) updateData.departmentOther = department === 'Others' ? cleanDepartmentOther(departmentOther) : '';
        if (type) updateData.type = type;
        if (roleId) updateData.roleId = roleId;
        if (STAFF_CATEGORY_VALUES.includes(staffCategory)) updateData.staffCategory = staffCategory;
        if (STAFF_CATEGORY_VALUES.includes(staffCategory)) {
          updateData.communityOnly = staffCategory === STAFF_CATEGORIES.UNIT ? false : communityOnly === true;
        }
        if (designation) updateData.designation = designation;
        if (staffCode) updateData.staffCode = staffCode;
        return await technicianRepository.restoreOrUpdate(existing._id, orgId, updateData, session);
      }

      // A deactivated staff member stays deactivated until an admin reactivates them; a role sync must not.
      const updateData = {
        userId: userId || existing.userId,
        isDeleted: false,
        status: existing.status === 'Inactive' ? 'Inactive' : (status || existing.status),
      };
      if (name && name.trim()) updateData.name = name.trim();
      if (phone && phone !== 'N/A') updateData.phone = phone;
      if (department) updateData.department = department;
      if (department) updateData.departmentOther = department === 'Others' ? cleanDepartmentOther(departmentOther) : '';
      if (type) updateData.type = type;
      if (roleId) updateData.roleId = roleId;
      if (STAFF_CATEGORY_VALUES.includes(staffCategory)) updateData.staffCategory = staffCategory;
      if (STAFF_CATEGORY_VALUES.includes(staffCategory)) {
        updateData.communityOnly = staffCategory === STAFF_CATEGORIES.UNIT ? false : communityOnly === true;
      }
      if (designation) updateData.designation = designation;
      if (staffCode) updateData.staffCode = staffCode;
      return await technicianRepository.update(existing._id, orgId, updateData, session);
    }

    const wasDeleted = await technicianRepository.existsDeletedByUserIdOrContact(
      userId,
      orgId,
      { email, phone }
    );
    if (wasDeleted && !allowReactivateDeleted) {
      return null;
    }

    const newDoc = {
      orgId,
      userId: userId || null,
      name: name || (email ? email.split('@')[0] : 'Staff Member'),
      email: email || '',
      phone: phone || 'N/A',
      department: department || 'Others',
      departmentOther: (department || 'Others') === 'Others' ? cleanDepartmentOther(departmentOther) : '',
      type: type || 'In-House Staff',
      ...(roleId ? { roleId } : {}),
      staffCategory: STAFF_CATEGORY_VALUES.includes(staffCategory) ? staffCategory : STAFF_CATEGORIES.COMMUNITY,
      communityOnly: staffCategory === STAFF_CATEGORIES.UNIT ? false : communityOnly === true,
      designation: designation || defaultDesignation || '',
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

    // An admin deleted this staff record on purpose: do not silently re-create it on the next profile
    // fetch. Re-adding goes through explicit create / invite paths.
    const hasDeletedProfile = await technicianRepository.existsDeletedByUserIdOrContact(
      userId,
      orgId,
      { email: userDetails.email, phone: userDetails.phone }
    );
    if (!technician && hasDeletedProfile) {
      throw new HttpError(404, 'No staff profile found for this user in the active community');
    }

    if (!technician) {
      throw new HttpError(404, 'No staff profile found for this user in the active community');
    }

    // Staff Portal and digital passes are only for the two Staff Builder scopes.
    // Legacy directory records without a roleId remain supported via their staff category.
    if (technician.roleId) {
      const roleService = (await import('../role/role.services.js')).default;
      const role = await roleService.getRoleById(technician.roleId);
      if (!isStaffRoleScope(role.roleScope)) {
        throw new HttpError(403, 'Staff Portal is available only to Community Staff and Unit Staff roles.');
      }
    }

    return technician;
  }

  generateStaffQrPayload(technician, orgId) {
    // ':' separates the barcode fields, so it must not appear inside the name or code or the scan would mis-split.
    const rawStaffCode = (technician.staffCode || String(technician._id)).replace(/:/g, '-');
    const techId = String(technician._id);
    const safeName = (technician.name || 'Staff').trim().replace(/:/g, ' ').replace(/\s+/g, '_');

    // Cryptographic signature using HMAC-SHA256 for tamper resistance (shared signer)
    const validUntilIso = technician.qrValidUntil ? new Date(technician.qrValidUntil).toISOString() : '';
    const signature = signStaffQr(orgId, technician);

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
      staffCategory: technician.staffCategory || STAFF_CATEGORIES.COMMUNITY,
      status: technician.status,
      qrValidFrom: technician.qrValidFrom || null,
      qrValidUntil: technician.qrValidUntil || null,
      qrVersion: Number(technician.qrVersion) || 0,
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

  /**
   * Revokes every previously issued pass for a staff member (lost phone, shared QR, ...) by bumping
   * the pass version. The signature binds the version, so older QR codes stop verifying immediately.
   */
  async rotateStaffQr(id, orgId) {
    const rotated = await technicianRepository.incrementQrVersion(id, orgId);
    if (!rotated) throw new HttpError(404, 'Technician not found');
    technicianEvents.emit('technician_updated', { orgId, technician: rotated });
    return await this.getStaffQrById(id, orgId);
  }

  /**
   * Replaces (or sets) a staff member's photo. The old file is deleted only after the new one is saved
   * and linked, so a failed upload never leaves a staff member without their previous photo.
   */
  async setStaffPhoto(id, orgId, file) {
    const ext = assertValidPhoto(file);
    const newKey = await savePhoto(file.buffer, ext);
    let before;
    try {
      before = await technicianRepository.setPhotoKey(id, orgId, newKey);
    } catch (err) {
      await removePhoto(newKey);
      throw err;
    }
    if (!before) {
      await removePhoto(newKey);
      throw new HttpError(404, 'Technician not found');
    }
    if (before.photoKey) await removePhoto(before.photoKey);

    const updated = await technicianRepository.findById(id, orgId);
    technicianEvents.emit('technician_updated', { orgId, technician: updated });
    return updated;
  }

  async setStaffPhotoForUser(userId, orgId, file) {
    const technician = await technicianRepository.findByUserId(userId, orgId);
    if (!technician) throw new HttpError(404, 'No staff profile found for this user');
    return await this.setStaffPhoto(technician._id, orgId, file);
  }

  async setMyPhoto(userId, orgId, file, userDetails = {}) {
    const technician = await this.getMyProfile(userId, orgId, userDetails);
    return await this.setStaffPhoto(technician._id, orgId, file);
  }

  async removeStaffPhoto(id, orgId) {
    const before = await technicianRepository.setPhotoKey(id, orgId, null);
    if (!before) throw new HttpError(404, 'Technician not found');
    if (before.photoKey) await removePhoto(before.photoKey);
    const updated = await technicianRepository.findById(id, orgId);
    technicianEvents.emit('technician_updated', { orgId, technician: updated });
    return updated;
  }

  /**
   * Resolves a signed photo link to a readable stream. The signature binds staff id + current photo
   * version, so stale links (after replace/remove) stop working.
   */
  async openSignedPhoto(id, version, signature) {
    const record = await technicianRepository.findPhotoKeyById(id);
    if (!record?.photoKey || record.photoKey !== version || !verifyPhotoSignature(id, version, signature)) {
      throw new HttpError(404, 'Photo not found');
    }
    const stream = openPhotoStream(record.photoKey);
    if (!stream) throw new HttpError(404, 'Photo not found');
    return { stream, mime: mimeForKey(record.photoKey) };
  }

  async getTechnicianById(id, orgId) {
    const technician = await technicianRepository.findById(id, orgId);
    if (!technician) throw new HttpError(404, 'Technician not found');
    return technician;
  }

  async updateTechnician(id, orgId, rawData) {
    const data = pickWritable(rawData);
    let roleChangedTo = null;
    if (data.roleId) {
      const roleService = (await import('../role/role.services.js')).default;
      const selectedRole = await roleService.getRoleById(data.roleId);
      if (selectedRole.orgId && String(selectedRole.orgId) !== String(orgId)) {
        throw new HttpError(404, 'Selected role is not available in this community.');
      }
      if (!isStaffRoleScope(selectedRole.roleScope)) {
        throw new HttpError(400, 'Select a Community Staff or Unit Staff role from Role Builder.');
      }
      data.staffCategory = staffCategoryForRoleScope(selectedRole.roleScope);
      data.communityOnly = selectedRole.roleScope === 'COMMUNITY_STAFF' && selectedRole.communityOnly === true;
      roleChangedTo = selectedRole;
    }
    if (data.staffCode !== undefined) {
      await this.assertStaffCodeAvailable(orgId, data.staffCode, id);
    }
    const current = await technicianRepository.findById(id, orgId);
    if (!current) throw new HttpError(404, 'Technician not found');
    const from = data.qrValidFrom !== undefined ? data.qrValidFrom : current.qrValidFrom;
    const until = data.qrValidUntil !== undefined ? data.qrValidUntil : current.qrValidUntil;
    if (from && until && new Date(from) >= new Date(until)) {
      throw new HttpError(400, 'QR validity start must be earlier than its end.');
    }

    const updated = await technicianRepository.update(id, orgId, data);
    if (!updated) throw new HttpError(404, 'Technician not found');

    if (roleChangedTo && updated.userId && String(current.roleId || '') !== String(roleChangedTo._id)) {
      await this.syncMembershipStaffRole(updated.userId, orgId, current.roleId, roleChangedTo._id);
    }

    if (data.status === 'Inactive') {
      await this.cascadeOffboarding(updated, orgId, 'Staff member deactivated');
    } else if (isResidentAssignable(current) && !isResidentAssignable(updated)) {
      // Switched to "community only": residents can no longer hold this staff member on their units.
      const { default: associationRepository } = await import('../staffUnitAssociation/staffUnitAssociation.repository.js');
      await associationRepository.deactivateAllForTechnician(orgId, updated._id, 'Staff member set to community-only work');
    }

    if (data.status && updated.userId) {
      if (data.status === 'Active') {
        const User = (await import('../user/user.model.js')).default;
        const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;

        await User.updateOne({ _id: updated.userId, status: 'Pending Verification' }, { $set: { status: 'Active' } });
        await OrgMembership.updateOne({ userId: updated.userId, orgId }, { $set: { status: 'Active' } });
      }
    }

    technicianEvents.emit('technician_updated', { orgId, technician: updated });
    return updated;
  }

  /**
   * The directory role decides what the staff member can do in the app, so a role change here must reach
   * the login's membership too. Only the previous staff role is swapped; any other roles stay as they are.
   */
  async syncMembershipStaffRole(userId, orgId, previousRoleId, newRoleId) {
    const OrgMembership = (await import('../orgMembership/orgMembership.model.js')).default;
    const membership = await OrgMembership.findOne({ userId, orgId });
    if (!membership) return;
    const ids = (membership.roleIds || []).map(String).filter((roleId) => roleId !== String(previousRoleId || ''));
    if (!ids.includes(String(newRoleId))) ids.push(String(newRoleId));
    membership.roleIds = ids;
    membership.roleId = ids[0];
    await membership.save();
    const rolePermissionService = (await import('../rolePermission/rolePermission.services.js')).default;
    rolePermissionService.clearCache();
  }

  /**
   * A staff member who is deactivated or removed must not keep unit access, remain "inside" the gate,
   * or keep triggering resident notifications. Association and attendance repositories are imported
   * lazily to avoid a circular dependency with the services that depend on this one.
   */
  async cascadeOffboarding(technician, orgId, reason) {
    const [{ default: associationRepository }, { default: attendanceRepository }] = await Promise.all([
      import('../staffUnitAssociation/staffUnitAssociation.repository.js'),
      import('../staffAttendance/staffAttendance.repository.js'),
    ]);
    await associationRepository.deactivateAllForTechnician(orgId, technician._id, reason);
    await attendanceRepository.autoCloseOpenSessionsForTechnician(
      orgId,
      technician._id,
      `Auto-closed: ${reason}.`
    );
  }

  async deleteTechnician(id, orgId) {
    const deleted = await technicianRepository.softDelete(id, orgId);
    if (!deleted) throw new HttpError(404, 'Technician not found');
    await this.cascadeOffboarding(deleted, orgId, 'Staff member removed');

    technicianEvents.emit('technician_deleted', { orgId, technicianId: id, technician: deleted });
    return deleted;
  }

  async getWorkloadAnalytics(orgId, filter) {
    const technicians = await technicianRepository.getWorkloadAnalytics(orgId, filter);
    
    // Calculate dashboard summary
    const summary = {
      totalStaff: 0,
      totalVendors: 0,
      communityStaff: 0,
      unitStaff: 0,
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
      if (t.type === 'In-House Staff' || t.type === 'Community Staff') {
        summary.totalStaff++;
        if (t.staffCategory === STAFF_CATEGORIES.UNIT) summary.unitStaff++;
        else summary.communityStaff++;
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
      summary.totalResolved += t.resolvedCount || 0;
      summary.totalSlaCompliant += t.slaCompliantCount || 0;
      
      // We estimate global SLA compliance by accumulating compliant and resolved
      // However, we didn't project the raw resolved count. Let's rely on technician level stats,
      // or just re-calculate from raw arrays if needed. Since we don't have global SLA here easily,
      // we'll approximate or calculate from complaint stats in the future.
    });

    summary.slaCompliancePercent = summary.totalResolved > 0
      ? Math.round((summary.totalSlaCompliant / summary.totalResolved) * 1000) / 10
      : 0;

    return {
      technicians,
      summary
    };
  }
}

export default new TechnicianService();
