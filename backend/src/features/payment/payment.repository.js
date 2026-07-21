import Payment from './payment.model.js';

export class PaymentRepository {
  async getPaymentStats(orgId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const stats = await Payment.aggregate([
      { $match: { orgId } },
      {
        $facet: {
          todayRevenue: [
            { $match: { status: 'success', createdAt: { $gte: todayStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          weeklyRevenue: [
            { $match: { status: 'success', createdAt: { $gte: weekStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          monthlyRevenue: [
            { $match: { status: 'success', createdAt: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
          success: [{ $match: { status: 'success' } }, { $count: 'count' }],
          failed: [{ $match: { status: 'failed' } }, { $count: 'count' }],
          refunded: [{ $match: { status: 'refunded' } }, { $count: 'count' }]
        }
      }
    ]);

    return {
      todayRevenue: stats[0].todayRevenue[0]?.total || 0,
      weeklyRevenue: stats[0].weeklyRevenue[0]?.total || 0,
      monthlyRevenue: stats[0].monthlyRevenue[0]?.total || 0,
      pending: stats[0].pending[0]?.count || 0,
      success: stats[0].success[0]?.count || 0,
      failed: stats[0].failed[0]?.count || 0,
      refunded: stats[0].refunded[0]?.count || 0,
    };
  }

  async getRevenueTrend(orgId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trend = await Payment.aggregate([
      { $match: { orgId, status: 'success', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return trend.map(t => ({
      month: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
      revenue: t.total
    }));
  }

  async createPayment(data, session = null) {
    const payment = new Payment(data);
    return await payment.save(session ? { session } : undefined);
  }

  async findByGatewayTransactionId(gatewayTransactionId, session = null) {
    const query = Payment.findOne({ gatewayTransactionId });
    if (session) query.session(session);
    return await query;
  }

  async findById(paymentId, session = null) {
    const query = Payment.findById(paymentId);
    if (session) query.session(session);
    return await query;
  }

  async getRecentActivity(orgId, limit = 10) {
    return await Payment.find({ orgId }).sort({ updatedAt: -1 }).limit(limit).populate('userId', 'name email');
  }
}

export default new PaymentRepository();
