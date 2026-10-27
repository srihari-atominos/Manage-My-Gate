import Technician from './technician.model.js';

class TechnicianRepository {
  async create(data, session = null) {
    if (session) {
      const [technician] = await Technician.create([data], { session });
      return technician;
    }
    const technician = await Technician.create(data);
    return technician;
  }

  async findById(id, orgId) {
    return await Technician.findOne({ _id: id, orgId, isDeleted: false });
  }

  async findActiveByUserId(userId, orgId) {
    return await Technician.findOne({ userId, orgId, status: 'Active', isDeleted: false });
  }

  async findByUserId(userId, orgId) {
    return await Technician.findOne({ userId, orgId, isDeleted: false });
  }

  async findByContactOrUserId(userId, orgId, { email, phone } = {}, session = null) {
    const conditions = [];
    if (userId) conditions.push({ userId });
    if (email) conditions.push({ email: email.toLowerCase() });
    if (phone && phone !== 'N/A') conditions.push({ phone });
    if (conditions.length === 0) return null;

    const query = Technician.findOne({
      orgId,
      isDeleted: false,
      $or: conditions
    });
    if (session) query.session(session);
    return await query;
  }

  async findAnyByContactOrUserId(userId, orgId, { email, phone } = {}, session = null) {
    const conditions = [];
    if (userId) conditions.push({ userId });
    if (email) conditions.push({ email: email.toLowerCase() });
    if (phone && phone !== 'N/A') conditions.push({ phone });
    if (conditions.length === 0) return null;

    const query = Technician.findOne({
      orgId,
      $or: conditions
    }).sort({ createdAt: -1 });
    if (session) query.session(session);
    return await query;
  }

  async existsDeletedByUserId(userId, orgId) {
    if (!userId) return false;
    return !!(await Technician.exists({ userId, orgId, isDeleted: true }));
  }

  async existsDeletedByUserIdOrContact(userId, orgId, { email, phone } = {}) {
    const conditions = [];
    if (userId) conditions.push({ userId });
    if (email) conditions.push({ email: email.toLowerCase() });
    if (phone && phone !== 'N/A') conditions.push({ phone });
    if (conditions.length === 0) return false;

    return !!(await Technician.exists({
      orgId,
      isDeleted: true,
      $or: conditions
    }));
  }

  async findAll(orgId, filter = {}) {
    return await Technician.find({ orgId, isDeleted: false, ...filter }).sort({ name: 1 });
  }

  /** Keeps staff-directory eligibility aligned when a Role Builder staff role changes. */
  async updateByRoleId(orgId, roleId, updateData, session = null) {
    const query = Technician.updateMany(
      { orgId, roleId, isDeleted: false },
      { $set: updateData },
      { runValidators: true }
    );
    if (session) query.session(session);
    return await query;
  }
  async update(id, orgId, updateData, session = null) {
    const query = Technician.findOneAndUpdate(
      { _id: id, orgId, isDeleted: false },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );
    if (session) query.session(session);
    return await query;
  }

  async restoreOrUpdate(id, orgId, updateData, session = null) {
    const query = Technician.findOneAndUpdate(
      { _id: id, orgId },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );
    if (session) query.session(session);
    return await query;
  }

  /**
   * Atomically swaps the photo key and returns { before, after } so the caller can delete the old file.
   */
  async setPhotoKey(id, orgId, photoKey) {
    const before = await Technician.findOneAndUpdate(
      { _id: id, orgId, isDeleted: false },
      { $set: { photoKey } },
      { returnDocument: 'before' }
    );
    return before;
  }

  /** Internal read of the raw key for the signed-URL file route (not tenant scoped: access is the signature). */
  async findPhotoKeyById(id) {
    return await Technician.findOne({ _id: id, isDeleted: false }).select('photoKey').lean();
  }

  async incrementQrVersion(id, orgId) {
    return await Technician.findOneAndUpdate(
      { _id: id, orgId, isDeleted: false },
      { $inc: { qrVersion: 1 } },
      { returnDocument: 'after' }
    );
  }

  async softDelete(id, orgId) {
    return await Technician.findOneAndUpdate(
      { _id: id, orgId },
      { $set: { isDeleted: true, status: 'Inactive' } },
      { returnDocument: 'after' }
    );
  }

  async getWorkloadAnalytics(orgId, filter = {}) {
    const mongoose = (await import('mongoose')).default;
    const matchStage = { orgId: new mongoose.Types.ObjectId(orgId), isDeleted: false, ...filter };

    return await Technician.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'complaints',
          let: { userId: '$userId' },
          pipeline: [
            { $match: { 
                // Staff without a login (userId null) must not pick up every complaint whose assignee is also null.
                $expr: { $and: [{ $ne: ['$$userId', null] }, { $eq: ['$assignedTechnicianId', '$$userId'] }] },
                orgId: new mongoose.Types.ObjectId(orgId)
            }}
          ],
          as: 'complaints'
        }
      },
      {
        $addFields: {
          assignedComplaintsCount: { $size: '$complaints' },
          activeComplaintsCount: {
            $size: {
              $filter: {
                input: '$complaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['Assigned', 'In Progress', 'Escalated']] }
              }
            }
          },
          pendingComplaintsCount: {
            $size: {
              $filter: {
                input: '$complaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['Waiting For Vendor', 'Waiting For Resident Confirmation']] }
              }
            }
          },
          completedComplaintsCount: {
            $size: {
              $filter: {
                input: '$complaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['Resolved', 'Work Completed', 'Completed', 'Closed']] }
              }
            }
          },
          resolvedComplaints: {
            $filter: {
              input: '$complaints',
              as: 'c',
              cond: { $and: [{ $in: ['$$c.status', ['Resolved', 'Work Completed', 'Completed', 'Closed']] }, { $ne: ['$$c.resolvedAt', null] }] }
            }
          },
          slaCompliantComplaints: {
            $filter: {
              input: '$complaints',
              as: 'c',
              cond: { $and: [
                { $in: ['$$c.status', ['Resolved', 'Work Completed', 'Completed', 'Closed']] }, 
                { $ne: ['$$c.resolvedAt', null] },
                { $ne: ['$$c.slaDueDate', null] },
                { $lte: ['$$c.resolvedAt', '$$c.slaDueDate'] }
              ] }
            }
          },
          completedTodayCount: {
             $size: {
                $filter: {
                   input: '$complaints',
                   as: 'c',
                   cond: {
                      $and: [
                         { $in: ['$$c.status', ['Resolved', 'Work Completed', 'Completed', 'Closed']] },
                         { $gte: ['$$c.resolvedAt', new Date(new Date().setHours(0,0,0,0))] }
                      ]
                   }
                }
             }
          }
        }
      },
      {
        $addFields: {
          resolvedCount: { $size: '$resolvedComplaints' },
          slaCompliantCount: { $size: '$slaCompliantComplaints' },
          averageResolutionTime: {
            $cond: [
              { $gt: [{ $size: '$resolvedComplaints' }, 0] },
              { $avg: {
                $map: {
                  input: '$resolvedComplaints',
                  as: 'c',
                  in: { $divide: [{ $subtract: ['$$c.resolvedAt', '$$c.createdAt'] }, 3600000] }
                }
              }},
              0
            ]
          },
          slaCompliancePercent: {
            $cond: [
              { $gt: [{ $size: '$resolvedComplaints' }, 0] },
              { $multiply: [{ $divide: [{ $size: '$slaCompliantComplaints' }, { $size: '$resolvedComplaints' }] }, 100] },
              0
            ]
          }
        }
      },
      { $project: { complaints: 0, resolvedComplaints: 0, slaCompliantComplaints: 0 } },
      { $sort: { name: 1 } }
    ]);
  }
}

export default new TechnicianRepository();
