import mongoose from 'mongoose';

const uri = 'mongodb://127.0.0.1:27017/manage_my_gate';

async function run() {
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const subIds = [
    '6a83f16c18439a485829ffcc',
    '6a83f16c18439a485829ffd7',
    '6a83f16c18439a485829ffd8'
  ];

  const orgIds = [
    '6a3bb54a6013fee66c641398',
    '6a58bb6f67d4dfddbec32743',
    '6a620b0b74726e631b7294bb'
  ];

  const db = mongoose.connection.db;

  // Delete from platformsubscriptions
  const subResult = await db.collection('platformsubscriptions').deleteMany({
    _id: { $in: subIds.map(id => new mongoose.Types.ObjectId(id)) }
  });
  console.log(`Deleted ${subResult.deletedCount} platform subscriptions.`);

  // Find orders for these orgs
  const platformOrderResult = await db.collection('platformorders').deleteMany({
    organisationId: { $in: orgIds.map(id => new mongoose.Types.ObjectId(id)) }
  });
  console.log(`Deleted ${platformOrderResult.deletedCount} platform orders.`);

  // Also try simple 'orders' if it exists
  const orderResult = await db.collection('orders').deleteMany({
    organisationId: { $in: orgIds.map(id => new mongoose.Types.ObjectId(id)) }
  });
  console.log(`Deleted ${orderResult.deletedCount} orders.`);

  await mongoose.disconnect();
}

run().catch(console.error);
