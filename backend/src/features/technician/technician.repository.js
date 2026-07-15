import Technician from './technician.model.js';

class TechnicianRepository {
  async create(data) {
    const technician = await Technician.create(data);
    return technician;
  }

  async findById(id, orgId) {
    return await Technician.findOne({ _id: id, orgId, isDeleted: false });
  }

  async findAll(orgId, filter = {}) {
    return await Technician.find({ orgId, isDeleted: false, ...filter }).sort({ name: 1 });
  }

  async update(id, orgId, updateData) {
    return await Technician.findOneAndUpdate(
      { _id: id, orgId, isDeleted: false },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
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
                $expr: { $eq: ['$assignedTechnicianId', '$$userId'] },
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
