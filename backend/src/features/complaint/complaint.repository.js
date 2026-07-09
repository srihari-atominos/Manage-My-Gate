import Complaint from './complaint.model.js';

class ComplaintRepository {
  async create(complaintData) {
    const complaint = await Complaint.create(complaintData);
    return complaint;
  }

  async findById(id, orgId) {
    return await Complaint.findOne({ _id: id, orgId });
  }

  async findAll(orgId, filter, pagination, sort) {
    const { skip, limit } = pagination;
    const query = { orgId, ...filter };

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      query.$or = [
        { complaintNumber: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { assignedTechnicianName: searchRegex }
      ];
      delete query.search;
    }

    const [data, total] = await Promise.all([
      Complaint.find(query).sort(sort).skip(skip).limit(limit),
      Complaint.countDocuments(query)
    ]);

    return { data, total };
  }

  async update(id, orgId, updateData) {
    return await Complaint.findOneAndUpdate(
      { _id: id, orgId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  async updateStatus(id, orgId, status, additionalData = {}) {
    return await Complaint.findOneAndUpdate(
      { _id: id, orgId },
      { $set: { status, ...additionalData } },
      { new: true, runValidators: true }
    );
  }

  async addTimelineEvent(id, orgId, eventData) {
    return await Complaint.findOneAndUpdate(
      { _id: id, orgId },
      { $push: { timeline: eventData } },
      { new: true }
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
