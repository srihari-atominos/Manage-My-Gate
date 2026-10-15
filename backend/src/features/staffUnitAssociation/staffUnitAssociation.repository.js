import StaffUnitAssociation from './staffUnitAssociation.model.js';
import HttpError from '../../utils/httpError.utils.js';

class StaffUnitAssociationRepository {
  async create(data, session = null) {
    try {
      const doc = new StaffUnitAssociation(data);
      return await doc.save({ session });
    } catch (err) {
      if (err && (err.code === 11000 || err.codeName === 'DuplicateKey' || (err.message && err.message.includes('E11000')))) {
        const isPending = err.message && err.message.includes('unique_pending_unit_staff_association');
        throw new HttpError(
          409,
          isPending
            ? 'An association request for this unit is already awaiting approval from this staff member.'
            : 'Staff member is already actively associated with this unit.'
        );
      }
      throw err;
    }
  }

  async findById(id, orgId, session = null) {
    const query = { _id: id };
    if (orgId) query.orgId = orgId;
    return await StaffUnitAssociation.findOne(query)
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('associatedBy', 'name username email')
      .session(session);
  }

  async findActive(orgId, villaId, technicianId, session = null) {
    return await StaffUnitAssociation.findOne({
      orgId,
      villaId,
      technicianId,
      status: 'Active',
    }).session(session);
  }

  async findPending(orgId, villaId, technicianId, session = null) {
    return await StaffUnitAssociation.findOne({
      orgId,
      villaId,
      technicianId,
      status: 'Pending',
    }).session(session);
  }

  /**
   * Active associations whose optional validity window (accessSchedule.validFrom/validUntil)
   * includes the current moment. Expired or not-yet-started allocations are excluded.
   */
  async findActiveByTechnician(orgId, technicianId, session = null) {
    const now = new Date();
    return await StaffUnitAssociation.find({
      orgId,
      technicianId,
      status: 'Active',
      $and: [
        { $or: [{ 'accessSchedule.validFrom': null }, { 'accessSchedule.validFrom': { $lte: now } }] },
        { $or: [{ 'accessSchedule.validUntil': null }, { 'accessSchedule.validUntil': { $gte: now } }] },
      ],
    })
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .session(session);
  }

  async findActiveOrPendingByTechnician(orgId, technicianId, session = null) {
    return await StaffUnitAssociation.find({
      orgId,
      technicianId,
      status: { $in: ['Active', 'Pending'] },
    })
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .session(session);
  }

  async findByTechnicianAll(orgId, technicianId, session = null) {
    return await StaffUnitAssociation.find({
      orgId,
      technicianId,
      status: { $in: ['Active', 'Pending', 'Rejected'] },
    })
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .populate('associatedBy', 'name username email')
      .sort({ createdAt: -1 })
      .session(session);
  }

  async findAssociations(orgId, filter = {}, session = null) {
    const query = { orgId, ...filter };
    return await StaffUnitAssociation.find(query)
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('associatedBy', 'name username email')
      .sort({ createdAt: -1 })
      .session(session);
  }

  async update(id, orgId, updateData, session = null) {
    const query = { _id: id };
    if (orgId) query.orgId = orgId;
    return await StaffUnitAssociation.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true, session }
    )
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('associatedBy', 'name username email');
  }

  async deactivate(id, orgId, deactivatedBy, reason = '', session = null) {
    const query = { _id: id };
    if (orgId) query.orgId = orgId;
    return await StaffUnitAssociation.findOneAndUpdate(
      query,
      {
        $set: {
          status: 'Inactive',
          deactivatedAt: new Date(),
          deactivatedBy,
          deactivationReason: reason,
        },
      },
      { new: true, session }
    )
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .populate('technicianId', 'name department departmentOther designation type staffCode phone email status photoKey')
      .populate('associatedBy', 'name username email');
  }

  /**
   * Deactivates every live (Active/Pending/Suspended) allocation of a staff member.
   */
  async deactivateAllForTechnician(orgId, technicianId, reason = '') {
    return await StaffUnitAssociation.updateMany(
      { orgId, technicianId, status: { $in: ['Active', 'Pending', 'Suspended'] } },
      { $set: { status: 'Inactive', deactivatedAt: new Date(), deactivationReason: reason } }
    );
  }

  async countActive(orgId, filter = {}, session = null) {
    return await StaffUnitAssociation.countDocuments({
      orgId,
      status: 'Active',
      ...filter,
    }).session(session);
  }
}

export default new StaffUnitAssociationRepository();
