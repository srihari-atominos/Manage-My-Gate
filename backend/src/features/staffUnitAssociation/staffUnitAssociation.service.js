import staffUnitAssociationRepository from './staffUnitAssociation.repository.js';
import staffUnitAssociationEvents from './staffUnitAssociation.events.js';
import villaService from '../villa/villa.services.js';
import technicianService from '../technician/technician.service.js';
import orgMembershipService from '../orgMembership/orgMembership.services.js';
import HttpError from '../../utils/httpError.utils.js';
import { isResidentAssignable, residentAssignableFilter, staffCategoryOf } from '../technician/staffCategory.utils.js';

class StaffUnitAssociationService {
  /**
   * Resolves the list of villa IDs that the caller is authorized to manage.
   * Admins are authorized for all units within the active organization.
   * Residents are authorized for units where they are recorded in OrgMembership
   * or listed as owner/primary resident/resident in Villa.
   */
  async resolveUserAuthorizedUnitIds(userId, orgId, isAdmin = false) {
    if (isAdmin) {
      const allUnits = await villaService.getUnitsByOrgId(orgId);
      const activeUnits = allUnits.filter((u) => u.status !== 'Inactive');
      const unitIds = activeUnits.map((u) => String(u._id));
      return { unitIds, units: activeUnits };
    }

    // 1. Resolve and verify active OrgMembership in the active organization
    const membership = await orgMembershipService.getMembership(userId, orgId);
    if (!membership || membership.status !== 'Active') {
      return { unitIds: [], units: [] };
    }

    const unitIdSet = new Set();

    // Check membership units
    if (Array.isArray(membership.units) && membership.units.length > 0) {
      membership.units.forEach((u) => {
        if (u.villaId) unitIdSet.add(String(u.villaId));
      });
    }
    if (membership.villaId) {
      unitIdSet.add(String(membership.villaId));
    }

    // 2. Resolve via direct Villa residence/ownership records in this org
    const residentVillas = await villaService.getUnitsByResidentUserIds([userId]);
    if (Array.isArray(residentVillas)) {
      residentVillas.forEach((v) => {
        if (String(v.orgId) === String(orgId) && v.status !== 'Inactive') {
          const isOwner = v.ownerId && String(v.ownerId) === String(userId);
          const isPrimary = v.primaryResidentId && String(v.primaryResidentId) === String(userId);
          const isResident =
            Array.isArray(v.residents) &&
            v.residents.some(
              (r) =>
                String(r.userId) === String(userId) &&
                (!r.status || r.status === 'Active')
            );
          if (isOwner || isPrimary || isResident) {
            unitIdSet.add(String(v._id));
          }
        }
      });
    }

    const rawUnitIds = Array.from(unitIdSet);
    if (rawUnitIds.length === 0) {
      return { unitIds: [], units: [] };
    }

    // Verify all units belong strictly to active org and are not inactive
    const units = await villaService.getUnitsByVillaIds(rawUnitIds, orgId);
    const validUnits = (units || []).filter(
      (u) => String(u.orgId) === String(orgId) && u.status !== 'Inactive'
    );
    const unitIds = validUnits.map((u) => String(u._id));
    return { unitIds, units: validUnits };
  }

  /**
   * Returns sanitized units the user can manage within the active community.
   */
  async getMyAuthorizedUnits(userId, orgId, isAdmin = false) {
    const { units } = await this.resolveUserAuthorizedUnitIds(userId, orgId, isAdmin);
    return units.map((u) => ({
      _id: u._id,
      unitNumber: u.unitNumber,
      blockOrBuilding: u.blockOrBuilding || '',
      type: u.type,
      status: u.status,
      floor: u.floor || '',
    }));
  }

  /**
   * Returns sanitized list of active staff in the community eligible for association:
   * Unit Staff, plus Community Staff that are not restricted to community-only work.
   */
  async getEligibleStaff(orgId) {
    const technicians = await technicianService.getTechnicians(orgId, {
      status: 'Active',
      isDeleted: false,
      ...residentAssignableFilter(),
    });

    return (technicians || []).map((t) => ({
      _id: t._id,
      name: t.name,
      photoUrl: t.photoUrl || null,
      department: t.department,
      designation: t.designation || '',
      type: t.type,
      staffCategory: staffCategoryOf(t),
      staffCode: t.staffCode || '',
      phone: t.phone || '',
      email: t.email || '',
      status: t.status,
    }));
  }

  /**
   * Returns staff associations scoped to authorized units or organization.
   */
  async getAssociations(userId, orgId, query = {}, isAdmin = false) {
    const { unitIds } = await this.resolveUserAuthorizedUnitIds(userId, orgId, isAdmin);

    const filter = {};
    const asText = (value) => (typeof value === 'string' && value ? value : '');
    query = { ...query, status: asText(query.status), technicianId: asText(query.technicianId), villaId: asText(query.villaId) };
    if (query.status && query.status.toUpperCase() === 'ALL') {
      filter.status = { $in: ['Active', 'Pending', 'Rejected'] };
    } else if (query.status) {
      filter.status = query.status;
    } else {
      // Default: show both Active and Pending so residents see their invitations
      filter.status = { $in: ['Active', 'Pending'] };
    }

    if (query.technicianId) {
      filter.technicianId = query.technicianId;
    }

    if (isAdmin) {
      if (query.villaId) {
        filter.villaId = query.villaId;
      }
      return await staffUnitAssociationRepository.findAssociations(orgId, filter);
    }

    // Resident workflow: Must have authorized units
    if (unitIds.length === 0) {
      return [];
    }

    if (query.villaId) {
      const targetVillaIdStr = String(query.villaId);
      if (!unitIds.includes(targetVillaIdStr)) {
        throw new HttpError(403, 'Forbidden. You are not authorized to view associations for this unit.');
      }
      filter.villaId = targetVillaIdStr;
    } else {
      filter.villaId = { $in: unitIds };
    }

    return await staffUnitAssociationRepository.findAssociations(orgId, filter);
  }

  /**
   * Associates an existing active staff member with an authorized unit.
   */
  async createAssociation(userId, orgId, data, isAdmin = false, session = null) {
    const targetVillaId = String(data.villaId);

    // 1. Authorize unit access
    if (!isAdmin) {
      const { unitIds } = await this.resolveUserAuthorizedUnitIds(userId, orgId, isAdmin);
      if (!unitIds.includes(targetVillaId)) {
        throw new HttpError(403, 'Forbidden. You are not authorized to associate staff with this unit.');
      }
    }

    // 2. Validate unit exists in this organization and is active
    const villa = await villaService.getUnitById(targetVillaId, orgId, session);
    if (!villa || String(villa.orgId) !== String(orgId) || villa.status === 'Inactive') {
      throw new HttpError(404, 'Unit not found in this community.');
    }

    // 3. Validate staff exists in this organization and is active
    let technician = data.technicianDoc || null;
    if (!technician) {
      technician = await technicianService.getTechnicianById(data.technicianId, orgId);
    }
    if (
      !technician ||
      String(technician.orgId) !== String(orgId) ||
      technician.status === 'Inactive' ||
      technician.isDeleted
    ) {
      throw new HttpError(400, 'Selected staff member is not active or does not belong to this community.');
    }
    if (!isResidentAssignable(technician)) {
      throw new HttpError(400, 'This staff member is assigned to community work only and cannot be allocated to a unit.');
    }

    // 4. Ensure no duplicate active or pending association exists for this unit + technician
    const existingActive = await staffUnitAssociationRepository.findActive(
      orgId,
      targetVillaId,
      technician._id,
      session
    );
    if (existingActive) {
      throw new HttpError(409, 'Staff member is already actively associated with this unit.');
    }

    const existingPending = await staffUnitAssociationRepository.findPending(
      orgId,
      targetVillaId,
      technician._id,
      session
    );
    if (existingPending) {
      throw new HttpError(409, 'An association request for this unit is already awaiting approval from this staff member.');
    }

    // 4b. Perform Schedule Conflict Detection across other allocated units
    if (data.accessSchedule && data.accessSchedule.timeWindow) {
      const conflict = await this.checkScheduleConflict(
        technician._id,
        orgId,
        data.accessSchedule,
        targetVillaId
      );
      if (conflict && conflict.hasConflict) {
        throw new HttpError(
          409,
          `Schedule Conflict: ${conflict.conflictMessage}`
        );
      }
    }

    // Admin allocations are Active immediately. A resident's request waits for the staff member to accept,
    // but staff without a linked login have nobody who could ever accept it, so it would stay Pending forever.
    const initialStatus = isAdmin || !technician.userId ? 'Active' : 'Pending';

    // 5. Create association document
    const association = await staffUnitAssociationRepository.create(
      {
        orgId,
        villaId: targetVillaId,
        technicianId: technician._id,
        userId: technician.userId || null,
        associatedBy: userId,
        status: initialStatus,
        roleOrTrade: data.roleOrTrade || technician.designation || technician.department || '',
        accessSchedule: data.accessSchedule || {},
        notes: data.notes || '',
      },
      session
    );

    // 6. Emit domain event
    staffUnitAssociationEvents.emit('staff_associated_to_unit', {
      associationId: association._id,
      orgId,
      villaId: targetVillaId,
      technicianId: technician._id,
      technicianUserId: technician.userId || null,
      associatedBy: userId,
      status: initialStatus,
    });

    return await staffUnitAssociationRepository.findById(association._id, orgId, session);
  }

  /**
   * Approves a pending association (called by the staff member or admin).
   */
  async acceptAssociation(id, userId, orgId, isAdmin = false) {
    const association = await staffUnitAssociationRepository.findById(id, orgId);
    if (!association) {
      throw new HttpError(404, 'Staff unit association not found.');
    }

    if (association.status === 'Active') {
      return association;
    }

    if (association.status !== 'Pending') {
      throw new HttpError(400, `Cannot accept an association in status '${association.status}'.`);
    }

    // Verification: Must be the designated staff member (technician.userId) or an admin
    const techUserId = association.technicianId?.userId
      ? String(association.technicianId.userId)
      : association.userId
      ? String(association.userId)
      : null;

    if (!isAdmin && (!techUserId || techUserId !== String(userId))) {
      throw new HttpError(403, 'Forbidden. Only the invited staff member can accept this household allocation.');
    }

    const updated = await staffUnitAssociationRepository.update(
      id,
      orgId,
      { status: 'Active' }
    );

    staffUnitAssociationEvents.emit('staff_association_accepted', {
      associationId: id,
      orgId,
      villaId: association.villaId?._id || association.villaId,
      technicianId: association.technicianId?._id || association.technicianId,
      technicianUserId: techUserId,
      associatedBy: association.associatedBy ? String(association.associatedBy) : null,
      acceptedBy: userId,
    });

    return updated;
  }

  /**
   * Rejects a pending association (called by the staff member or admin).
   */
  async rejectAssociation(id, userId, orgId, reason = '', isAdmin = false) {
    const association = await staffUnitAssociationRepository.findById(id, orgId);
    if (!association) {
      throw new HttpError(404, 'Staff unit association not found.');
    }

    if (association.status === 'Rejected') {
      return association;
    }

    if (association.status !== 'Pending') {
      throw new HttpError(400, `Cannot reject an association in status '${association.status}'.`);
    }

    const techUserId = association.technicianId?.userId
      ? String(association.technicianId.userId)
      : association.userId
      ? String(association.userId)
      : null;

    if (!isAdmin && (!techUserId || techUserId !== String(userId))) {
      throw new HttpError(403, 'Forbidden. Only the invited staff member can reject this household allocation.');
    }

    const updated = await staffUnitAssociationRepository.update(
      id,
      orgId,
      {
        status: 'Rejected',
        deactivationReason: reason || 'Declined by staff member',
        deactivatedAt: new Date(),
        deactivatedBy: userId,
      }
    );

    staffUnitAssociationEvents.emit('staff_association_rejected', {
      associationId: id,
      orgId,
      villaId: association.villaId?._id || association.villaId,
      technicianId: association.technicianId?._id || association.technicianId,
      technicianUserId: techUserId,
      associatedBy: association.associatedBy ? String(association.associatedBy) : null,
      rejectedBy: userId,
      reason,
    });

    return updated;
  }

  /**
   * Staff self-service: Returns all household allocations (both Active and Pending requests)
   * for the authenticated staff member.
   */
  async getMyAllocatedUnits(userId, orgId, userDetails = {}) {
    const technician = await technicianService.getMyProfile(userId, orgId, userDetails);
    return await staffUnitAssociationRepository.findByTechnicianAll(orgId, technician._id);
  }

  /**
   * Soft-deactivates an association for an authorized unit without altering the staff record.
   */
  async removeAssociation(id, userId, orgId, reason = '', isAdmin = false) {
    const association = await staffUnitAssociationRepository.findById(id, orgId);
    if (!association) {
      throw new HttpError(404, 'Staff unit association not found.');
    }

    if (association.status === 'Inactive') {
      return association;
    }

    // Authorize unit access
    const assocVillaId = association.villaId?._id ? String(association.villaId._id) : String(association.villaId);
    if (!isAdmin) {
      const { unitIds } = await this.resolveUserAuthorizedUnitIds(userId, orgId, isAdmin);
      if (!unitIds.includes(assocVillaId)) {
        throw new HttpError(403, 'Forbidden. You are not authorized to remove staff from this unit.');
      }
    }

    const deactivated = await staffUnitAssociationRepository.deactivate(
      id,
      orgId,
      userId,
      reason || 'Removed by resident'
    );

    const techUserId = association.technicianId?.userId
      ? String(association.technicianId.userId)
      : association.userId
      ? String(association.userId)
      : null;

    // Emit domain event
    staffUnitAssociationEvents.emit('staff_dissociated_from_unit', {
      associationId: id,
      orgId,
      villaId: assocVillaId,
      technicianId: association.technicianId?._id || association.technicianId,
      technicianUserId: techUserId,
      associatedBy: association.associatedBy ? String(association.associatedBy) : null,
      deactivatedBy: userId,
    });

    return deactivated;
  }

  /**
   * Evaluates if a proposed time window clashes with existing active unit allocations for this staff member.
   */
  async checkScheduleConflict(technicianId, orgId, proposedSchedule, excludeVillaId = null) {
    if (!proposedSchedule || !proposedSchedule.timeWindow) {
      return { hasConflict: false };
    }

    const { start: propStart, end: propEnd } = proposedSchedule.timeWindow;
    if (!propStart || !propEnd) {
      return { hasConflict: false };
    }

    const propDays = Array.isArray(proposedSchedule.days) ? proposedSchedule.days.map((d) => d.toLowerCase().trim()) : [];

    const activeAssocs = await staffUnitAssociationRepository.findActiveOrPendingByTechnician(orgId, technicianId);
    if (!activeAssocs || activeAssocs.length === 0) {
      return { hasConflict: false };
    }

    const toMinutes = (timeStr) => {
      if (!timeStr || !timeStr.includes(':')) return null;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const propStartMin = toMinutes(propStart);
    const propEndMin = toMinutes(propEnd);
    if (propStartMin === null || propEndMin === null || propStartMin >= propEndMin) {
      return { hasConflict: false };
    }

    for (const assoc of activeAssocs) {
      const vId = assoc.villaId?._id ? String(assoc.villaId._id) : String(assoc.villaId);
      if (excludeVillaId && String(excludeVillaId) === vId) {
        continue;
      }

      const existingSched = assoc.accessSchedule;
      if (!existingSched || !existingSched.timeWindow) continue;

      const existStart = existingSched.timeWindow.start;
      const existEnd = existingSched.timeWindow.end;
      const existStartMin = toMinutes(existStart);
      const existEndMin = toMinutes(existEnd);
      if (existStartMin === null || existEndMin === null) continue;

      // Check day intersection
      const existDays = Array.isArray(existingSched.days) ? existingSched.days.map((d) => d.toLowerCase().trim()) : [];
      const hasCommonDay = propDays.length === 0 || existDays.length === 0 || propDays.some((d) => existDays.includes(d));

      if (hasCommonDay) {
        // Check time interval overlap: (StartA < EndB) && (EndA > StartB)
        const overlaps = propStartMin < existEndMin && propEndMin > existStartMin;
        if (overlaps) {
          const unitNumber = assoc.villaId?.unitNumber || 'another unit';
          return {
            hasConflict: true,
            conflictingAssociation: assoc,
            conflictMessage: `Staff is already allocated to ${unitNumber} during ${existStart} - ${existEnd}.`,
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * Internal domain method: Returns active unit associations for a staff member.
   * Cross-feature callers (such as StaffAttendance) call this service method.
   */
  async getActiveAssociationsForStaff(technicianId, orgId) {
    return await staffUnitAssociationRepository.findActiveByTechnician(orgId, technicianId);
  }
}

export default new StaffUnitAssociationService();

