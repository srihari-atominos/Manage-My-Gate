import mongoose from 'mongoose';
import Complaint from './complaint.model.js';

class ComplaintRepository {
  async create(complaintData) {
    const complaint = await Complaint.create(complaintData);
    return complaint;
  }

  async findById(id, orgId) {
    return await Complaint.findOne({ _id: id, orgId })
      .populate('assignedTechnicianId', 'name phone email avatar');
  }

  async findAll(orgId, filter, pagination, sort) {
    const { skip, limit } = pagination;
    const query = { orgId: new mongoose.Types.ObjectId(orgId), ...filter };
    
    if (query.residentId && typeof query.residentId === 'string') {
      query.residentId = new mongoose.Types.ObjectId(query.residentId);
    }

    // Cast ObjectIds in RBAC $or filters
    if (query.$or) {
      query.$or = query.$or.map(cond => {
        const newCond = { ...cond };
        if (newCond.residentId && typeof newCond.residentId === 'string') {
          newCond.residentId = new mongoose.Types.ObjectId(newCond.residentId);
        }
        if (newCond.assignedTechnicianId && typeof newCond.assignedTechnicianId === 'string') {
          newCond.assignedTechnicianId = new mongoose.Types.ObjectId(newCond.assignedTechnicianId);
        }
        if (newCond.broadcastTechnicianIds && typeof newCond.broadcastTechnicianIds === 'string') {
          newCond.broadcastTechnicianIds = new mongoose.Types.ObjectId(newCond.broadcastTechnicianIds);
        }
        return newCond;
      });
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      const searchOr = [
        { complaintNumber: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { assignedTechnicianName: searchRegex }
      ];
      
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
      delete query.search;
    }

    const aggregationPipeline = [
      { $match: query },
      { $sort: (sort && Object.keys(sort).length > 0) ? sort : { createdAt: -1 } },
      {
        $facet: {
          metadata: [ { $count: "totalRecords" } ],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'residentId',
                foreignField: '_id',
                pipeline: [
                  { $project: { username: 1, email: 1 } }
                ],
                as: 'residentId'
              }
            },
            {
              $unwind: {
                path: "$residentId",
                preserveNullAndEmptyArrays: true
              }
            }
          ]
        }
      }
    ];

    const result = await Complaint.aggregate(aggregationPipeline);
    const total = result[0]?.metadata[0]?.totalRecords || 0;
    const data = result[0]?.data || [];

    return { data, total };
  }

  async update(id, orgId, updateData, session = null) {
    const hasOperators = Object.keys(updateData).some(key => key.startsWith('$'));
    let updateQuery;
    
    if (hasOperators) {
      updateQuery = {};
      const setFields = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (key.startsWith('$')) {
          updateQuery[key] = value;
        } else {
          setFields[key] = value;
        }
      }
      if (Object.keys(setFields).length > 0) {
        updateQuery.$set = { ...(updateQuery.$set || {}), ...setFields };
      }
    } else {
      updateQuery = { $set: updateData };
    }

    return await Complaint.findOneAndUpdate(
      { _id: id, orgId },
      updateQuery,
      { returnDocument: 'after', runValidators: true, session }
    );
  }

  async updateStatus(id, orgId, status, additionalData = {}) {
    return await Complaint.findOneAndUpdate(
      { _id: id, orgId },
      { 
        $set: { status, ...additionalData },
        $push: { statusHistory: { status, timestamp: new Date() } }
      },
      { returnDocument: 'after', runValidators: true }
    );
  }

  async acceptAssignmentAtomic(id, orgId, userId, userName, timelineEvent) {
    return await Complaint.findOneAndUpdate(
      { _id: id, orgId, status: 'Waiting For Acceptance' },
      { 
        $set: { 
          status: 'Assigned',
          assignedTechnicianId: userId,
          assignedTechnicianName: userName,
          isBroadcast: false,
          broadcastTechnicianIds: []
        },
        $push: { 
          statusHistory: { status: 'Assigned', timestamp: new Date() },
          timeline: timelineEvent 
        }
      },
      { returnDocument: 'after' }
    );
  }

  async findFuzzyDuplicates(orgId, residentId, titleText) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await Complaint.find({
      orgId,
      residentId,
      createdAt: { $gte: twentyFourHoursAgo },
      $text: { $search: titleText }
    }).limit(1);
  }

  async addTimelineEvent(id, orgId, eventData) {
    return await Complaint.findOneAndUpdate(
      { _id: id, orgId },
      { $push: { timeline: eventData } },
      { returnDocument: 'after' }
    );
  }

  async getDashboardAnalytics(orgId, filters = {}) {
    const matchStage = { orgId, ...filters };

    const aggregation = await Complaint.aggregate([
      { $match: matchStage },
      {
        $facet: {
          kpis: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                open: { $sum: { $cond: [{ $in: ['$status', ['Submitted', 'Waiting For Assignment']] }, 1, 0] } },
                waitingForAcceptance: { $sum: { $cond: [{ $eq: ['$status', 'Waiting For Acceptance'] }, 1, 0] } },
                assigned: { $sum: { $cond: [{ $in: ['$status', ['Assigned', 'Accepted']] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
                waitingForResident: { $sum: { $cond: [{ $eq: ['$status', 'Waiting For Resident Confirmation'] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
                closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
                reopened: { $sum: { $cond: [{ $eq: ['$status', 'Reopened'] }, 1, 0] } },
                escalated: { $sum: { $cond: [{ $gt: ['$escalationLevel', 0] }, 1, 0] } },
                critical: { $sum: { $cond: [{ $eq: ['$priority', 'Critical'] }, 1, 0] } },
                slaBreached: {
                  $sum: {
                    $cond: [
                      { $and: [{ $lt: ['$slaDueDate', new Date()] }, { $nin: ['$status', ['Closed', 'Resolved', 'Cancelled']] }] },
                      1,
                      0
                    ]
                  }
                },
                today: { $sum: { $cond: [{ $gte: ['$createdAt', new Date(new Date().setHours(0,0,0,0))] }, 1, 0] } },
                totalResolutionTime: {
                  $sum: {
                    $cond: [
                      { $and: [{ $in: ['$status', ['Resolved', 'Closed']] }, { $ne: ['$resolvedAt', null] }] },
                      { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
                      0
                    ]
                  }
                },
                resolvedCountForAvg: {
                  $sum: { $cond: [{ $and: [{ $in: ['$status', ['Resolved', 'Closed']] }, { $ne: ['$resolvedAt', null] }] }, 1, 0] }
                },
                withinSla: {
                  $sum: {
                    $cond: [
                      { $and: [{ $in: ['$status', ['Resolved', 'Closed']] }, { $lte: ['$resolvedAt', '$slaDueDate'] }] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ],
          categoryBreakdown: [
            { $group: { 
                _id: '$category', 
                count: { $sum: 1 },
                open: { $sum: { $cond: [{ $nin: ['$status', ['Resolved', 'Closed', 'Cancelled']] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } }
            }}
          ],
          priorityBreakdown: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          statusBreakdown: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          trendData: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                created: { $sum: 1 },
                resolved: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } },
                escalated: { $sum: { $cond: [{ $gt: ['$escalationLevel', 0] }, 1, 0] } }
              }
            },
            { $sort: { _id: 1 } }
          ],
          technicianPerformance: [
            { $match: { assignedTechnicianId: { $ne: null } } },
            {
              $group: {
                _id: { id: '$assignedTechnicianId', name: '$assignedTechnicianName' },
                assigned: { $sum: 1 },
                completed: { $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] } },
                completedToday: {
                  $sum: {
                    $cond: [
                      { $and: [{ $in: ['$status', ['Resolved', 'Closed']] }, { $gte: ['$resolvedAt', new Date(new Date().setHours(0,0,0,0))] }] },
                      1, 0
                    ]
                  }
                },
                pending: { $sum: { $cond: [{ $nin: ['$status', ['Resolved', 'Closed', 'Cancelled']] }, 1, 0] } },
                totalTime: {
                  $sum: {
                    $cond: [
                      { $and: [{ $in: ['$status', ['Resolved', 'Closed']] }, { $ne: ['$resolvedAt', null] }] },
                      { $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000] },
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    const result = aggregation[0];
    const statsRaw = result.kpis || [];
    const categoryBreakdown = result.categoryBreakdown || [];
    const priorityBreakdown = result.priorityBreakdown || [];
    const statusBreakdown = result.statusBreakdown || [];
    const trendData = result.trendData || [];
    const technicianPerformance = result.technicianPerformance || [];

    // Separate calls for recent arrays that cannot easily be aggregated with full documents without huge memory usage.
    const recentComplaints = await Complaint.find(matchStage)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('complaintNumber residentName location category priority status assignedTechnicianName createdAt slaDueDate');

    const recentActivities = await Complaint.aggregate([
      { $match: matchStage },
      { $unwind: '$timeline' },
      { $sort: { 'timeline.date': -1 } },
      { $limit: 15 },
      {
        $project: {
          complaintNumber: 1,
          residentName: 1,
          category: 1,
          status: 1,
          assignedTechnicianName: 1,
          event: '$timeline'
        }
      }
    ]);

    const stats = statsRaw.length > 0 ? statsRaw[0] : {
      total: 0, open: 0, inProgress: 0,
      resolved: 0, closed: 0, cancelled: 0, escalated: 0, reopened: 0, slaBreached: 0, assigned: 0, critical: 0,
      today: 0, thisWeek: 0, thisMonth: 0,
      totalResolutionTime: 0, resolvedCountForAvg: 0, fastestResolutionTime: null, slowestResolutionTime: null,
      totalResponseTime: 0, respondedCountForAvg: 0,
      withinSla: 0, nearSlaBreach: 0, totalSatisfaction: 0, ratedCount: 0
    };

    return {
      kpis: {
        total: stats.total,
        open: stats.open,
        inProgress: stats.inProgress,
        resolved: stats.resolved,
        closed: stats.closed,
        cancelled: stats.cancelled,
        escalated: stats.escalated,
        assigned: stats.assigned,
        critical: stats.critical,
        reopened: stats.reopened,
        slaBreached: stats.slaBreached,
        today: stats.today,
        thisWeek: stats.thisWeek,
        thisMonth: stats.thisMonth,
        averageResolutionHours: stats.resolvedCountForAvg > 0 ? (stats.totalResolutionTime / stats.resolvedCountForAvg) : 0,
        averageResponseHours: stats.respondedCountForAvg > 0 ? (stats.totalResponseTime / stats.respondedCountForAvg) : 0,
        fastestResolutionHours: stats.fastestResolutionTime || 0,
        slowestResolutionHours: stats.slowestResolutionTime || 0,
        withinSla: stats.withinSla,
        nearSlaBreach: stats.nearSlaBreach,
        residentSatisfactionPercentage: stats.ratedCount > 0 ? ((stats.totalSatisfaction / stats.ratedCount) / 5) * 100 : 0
      },
      categoryBreakdown,
      priorityBreakdown,
      statusBreakdown,
      trendData,
      technicianPerformance,
      recentComplaints,
      recentActivities,
      notices: [
        {
          id: '1',
          type: 'Maintenance',
          title: 'Scheduled Elevator Maintenance',
          message: 'Block A Passenger Lift 2 will be under scheduled maintenance today from 2:00 PM to 5:00 PM. Please use Lift 1 during this time. We apologize for the inconvenience.',
          timestamp: new Date()
        }
      ]
    };
  }

  async getCalendarEvents(orgId, startDate, endDate) {
    // For calendar, we need complaints with an SLA due date within the range, or scheduled visits (which might be timeline events).
    // For simplicity, let's fetch complaints where slaDueDate is in range or createdAt is in range.
    const query = {
      orgId,
      $or: [
        { slaDueDate: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ]
    };
    return await Complaint.find(query).select('complaintNumber title status priority category slaDueDate createdAt assignedTechnicianName');
  }
}

export default new ComplaintRepository();
