import StaffUnitAssociation from './staffUnitAssociation.model.js';
import HttpError from '../../utils/httpError.utils.js';

class StaffUnitAssociationRepository {
  async create(data, session = null) {
    try {
      const doc = new StaffUnitAssociation(data);
      return await doc.save({ session });
    } catch (err) {
      if (err && (err.code === 11000 || err.codeName === 'DuplicateKey' || (err.message && err.message.includes('E11000')))) {
        throw new HttpError(409, 'Staff member is already actively associated with this unit.');
      }
      throw err;
    }
  }

  async findById(id, orgId, session = null) {
    const query = { _id: id };
    if (orgId) query.orgId = orgId;
    return await StaffUnitAssociation.findOne(query)
      .populate('villaId', 'unitNumber blockOrBuilding type status floor')
      .populate('technicianId', 'name department designation type staffCode phone email status')
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

  async findActiveByTechnician(orgId, technicianId, session = null) {
    return await StaffUnitAssociation.find({
      orgId,
      technicianId,
      status: 'Active',
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
      .populate('technicianId', 'name department designation type staffCode phone email status')
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
      .populate('technicianId', 'name department designation type staffCode phone email status')
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
      .populate('technicianId', 'name department designation type staffCode phone email status')
      .populate('associatedBy', 'name username email');
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
