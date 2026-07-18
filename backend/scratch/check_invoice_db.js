import mongoose from 'mongoose';
import Invoice from '../src/features/invoice/invoice.model.js';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/manage_my_gate_dev', { retryWrites: false });
  console.log('DB Connected');
  
  const invoice = await Invoice.findOne({ invoiceNumber: '0c5e97f8-d5d1-43d6-9254-58a59a1b8e25' });
  console.log('Invoice details:', JSON.stringify(invoice, null, 2));

  if (!invoice) {
    console.log('No invoice found with that number.');
    process.exit(1);
  }

  // Find the assessment template
  const assessment = await mongoose.connection.db.collection('assessments').findOne({ _id: invoice.assessmentId });
  console.log('Assessment details:', JSON.stringify(assessment, null, 2));

  // Let's run the exact aggregation pipeline matching assessment.communityId
  const communityId = assessment.communityId;
  console.log('Target Community ID:', communityId);

  const result = await Invoice.aggregate([
    {
      $lookup: {
        from: 'assessments',
        localField: 'assessmentId',
        foreignField: '_id',
        as: 'assessment',
      },
    },
    { $unwind: '$assessment' },
    {
      $match: {
        'assessment.communityId': new mongoose.Types.ObjectId(communityId)
      }
    },
    {
      $facet: {
        grossDemand: [
          { $match: { status: { $ne: 'CANCELLED' } } },
          { $group: { _id: null, total: { $sum: '$totalDue' } } },
        ],
        totalCollected: [
          { $match: { status: 'PAID', paid_at: { $ne: null } } },
          { $group: { _id: null, total: { $sum: '$totalDue' } } },
        ],
        inTransitGateway: [
          { $match: { status: 'PAID', paid_at: { $ne: null }, settled_at: null } },
          { $group: { _id: null, total: { $sum: '$totalDue' } } },
        ],
        totalUnpaidArrears: [
          { $match: { status: { $in: ['UNPAID', 'VERIFICATION_PENDING'] } } },
          { $group: { _id: null, total: { $sum: '$totalDue' } } },
        ],
      },
    },
  ]);
  console.log('Aggregation result:', JSON.stringify(result[0], null, 2));

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
